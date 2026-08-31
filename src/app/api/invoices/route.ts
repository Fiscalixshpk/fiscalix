import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");

  let query = supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`invoice:create:${user.id}`, 30, 60_000);
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { items, ...invoiceData } = body;

  // Check invoice limit for basic plan
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("company_id", profile.company_id)
    .single();

  if (subscription?.plan === "basic") {
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("company_id", profile.company_id)
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    if ((count || 0) >= 50) {
      return NextResponse.json(
        { error: "Keni arritur limitin e faturave për planin Basic (50/muaj)" },
        { status: 403 }
      );
    }
  }

  // Get next invoice number
  const { data: company } = await supabase
    .from("companies")
    .select("invoice_prefix")
    .eq("id", profile.company_id)
    .single();

  const { count: invCount } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("company_id", profile.company_id);

  const seq = (invCount || 0) + 1;
  const invoiceNumber = `${company?.invoice_prefix || "INV"}-${String(seq).padStart(4, "0")}`;

  // Create invoice
  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .insert({
      ...invoiceData,
      company_id: profile.company_id,
      invoice_number: invoiceNumber,
    })
    .select()
    .single();

  if (invError) return NextResponse.json({ error: invError.message }, { status: 500 });

  // Create items
  if (items && items.length > 0) {
    const itemsData = items.map((item: {
      description: string;
      quantity: number;
      unit_price: number;
    }) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    await supabase.from("invoice_items").insert(itemsData);
  }

  // Activity log
  await supabase.from("activity_logs").insert({
    company_id: profile.company_id,
    user_id: user.id,
    action: "create_invoice",
    entity_type: "invoice",
    entity_id: invoice.id,
    metadata: { invoice_number: invoiceNumber },
  });

  return NextResponse.json(invoice, { status: 201 });

  } catch (err) {
    console.error('API error:', err)
    const msg = err instanceof Error ? err.message : 'Gabim i brendshëm'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}