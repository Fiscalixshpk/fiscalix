import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "100");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("expenses")
    .select("*, expense_categories(id, name, color, icon)")
    .eq("company_id", profile?.company_id)
    .order("expense_date", { ascending: false })
    .limit(limit);

  if (from) query = query.gte("expense_date", from);
  if (to) query = query.lte("expense_date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`expense:create:${user.id}`, 60, 60_000);
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const receiptFile = formData.get("receipt") as File | null;

  const expenseData = {
    company_id: profile.company_id,
    created_by: user.id,
    vendor_name: formData.get("vendor_name") as string,
    amount: parseFloat(formData.get("amount") as string),
    expense_date: formData.get("expense_date") as string,
    category_id: (() => {
      const cat = formData.get("category_id") as string
      return cat && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cat) ? cat : null
    })(),
    category: (() => {
      const cat = formData.get("category_id") as string
      return cat && cat.trim() ? cat.trim() : null
    })(),
    description: (formData.get("description") as string) || null,
    notes: (formData.get("notes") as string) || null,
    payment_method: (formData.get("payment_method") as string) || "cash",
    reference_number: (formData.get("reference_number") as string) || null,
    
    receipt_url: null as string | null,
  };

  // Upload receipt if provided
  if (receiptFile && receiptFile.size > 0) {
    const adminClient = await createAdminClient();
    const ext = receiptFile.name.split(".").pop();
    const path = `${profile.company_id}/receipts/${Date.now()}.${ext}`;
    const buffer = await receiptFile.arrayBuffer();

    const { data: uploadData } = await adminClient.storage
      .from("receipts")
      .upload(path, buffer, {
        contentType: receiptFile.type,
        upsert: false,
      });

    if (uploadData) {
      const { data: urlData } = adminClient.storage
        .from("receipts")
        .getPublicUrl(path);
      expenseData.receipt_url = urlData.publicUrl;
    }
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert(expenseData)
    .select("*, expense_categories(id, name, color, icon)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("activity_logs").insert({
    company_id: profile.company_id,
    user_id: user.id,
    action: "create_expense",
    entity_type: "expense",
    entity_id: data.id,
    metadata: { amount: expenseData.amount, vendor: expenseData.vendor_name },
  });

  return NextResponse.json(data, { status: 201 });

  } catch (err) {
    console.error('API error:', err)
    const msg = err instanceof Error ? err.message : 'Gabim i brendshëm'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}