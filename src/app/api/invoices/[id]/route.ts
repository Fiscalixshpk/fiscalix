import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("company_id, role").eq("id", user.id).single();

  // Fetch invoice without company filter
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .single();

  if (error || !invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Access check
  if (profile?.role === 'accountant') {
    const { data: rel } = await supabase
      .from('accountant_clients').select('id')
      .eq('accountant_id', user.id).eq('company_id', invoice.company_id).maybeSingle();
    if (!rel) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (invoice.company_id !== profile?.company_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch company for PDF
  const { data: company } = await supabase
    .from("companies").select("*").eq("id", invoice.company_id).single();

  return NextResponse.json({ invoice, company });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();

  const body = await req.json();
  const { items, ...invoiceData } = body;

  const { data, error } = await supabase
    .from("invoices")
    .update({ ...invoiceData })
    .eq("id", id)
    .eq("company_id", profile?.company_id)
    .select()
    .single();

  if (error) { console.error('PATCH error:', error); return NextResponse.json({ error: error.message }, { status: 500 }); }

  // Update items if provided
  if (items) {
    await supabase.from("invoice_items").delete().eq("invoice_id", id);
    if (items.length > 0) {
      await supabase.from("invoice_items").insert(
        items.map((item: { description: string; quantity: number; unit_price: number }) => ({
          invoice_id: id,
          ...item,
        }))
      );
    }
  }

  await supabase.from("activity_logs").insert({
    company_id: profile?.company_id,
    user_id: user.id,
    action: "update_invoice",
    entity_type: "invoice",
    entity_id: id,
    metadata: { changes: Object.keys(invoiceData) },
  });

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("company_id, role").eq("id", user.id).single();

  // Check invoice belongs to company
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", id)
    .eq("company_id", profile?.company_id)
    .single();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only allow deleting drafts unless admin
  if (invoice.status !== "draft" && profile?.role === "staff") {
    return NextResponse.json(
      { error: "Vetëm draftet mund të fshihen nga stafi" },
      { status: 403 }
    );
  }

  await supabase.from("invoice_items").delete().eq("invoice_id", id);
  await supabase.from("invoices").delete().eq("id", id);

  await supabase.from("activity_logs").insert({
    company_id: profile?.company_id,
    user_id: user.id,
    action: "delete_invoice",
    entity_type: "invoice",
    entity_id: id,
  });

  return NextResponse.json({ success: true });
}
