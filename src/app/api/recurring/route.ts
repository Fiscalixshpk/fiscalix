import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();

  const { data, error } = await supabase
    .from("recurring_invoices")
    .select("*")
    .eq("company_id", profile?.company_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check plan
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("company_id", profile.company_id)
    .single();

  if (sub?.plan === "basic") {
    return NextResponse.json(
      { error: "Faturat periodike kërkojnë planin Premium ose Advanced" },
      { status: 403 }
    );
  }

  const body = await req.json();

  // Calculate next invoice date
  const nextDate = new Date(body.start_date);
  const today = new Date();
  while (nextDate <= today) {
    if (body.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
    else if (body.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
    else if (body.frequency === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);
    else break;
  }

  const { data, error } = await supabase
    .from("recurring_invoices")
    .insert({
      name: body.client_name || body.name || "Faturë Periodike",
      client_name: body.client_name,
      client_email: body.client_email || null,
      amount: parseFloat(body.amount) || 0,
      frequency: body.frequency || "monthly",
      start_date: body.start_date,
      end_date: body.end_date || null,
      notes: body.notes || body.description || null,
      tax_rate: 18,
      currency: "EUR",
      company_id: profile.company_id,
      created_by: user.id,
      status: "active",
      next_invoice_date: nextDate.toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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