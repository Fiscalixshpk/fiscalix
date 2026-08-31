import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("company_id", profile?.company_id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {

  // Submit manual payment request
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { plan, billing_period, payment_method, notes } = body;

  const PLAN_PRICES: Record<string, Record<string, number>> = {
    basic: { monthly: 19, yearly: 190 },
    premium: { monthly: 39, yearly: 390 },
    advanced: { monthly: 79, yearly: 790 },
  };

  const amount = PLAN_PRICES[plan]?.[billing_period];
  if (!amount) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  // Check if there's already a pending payment
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("company_id", profile.company_id)
    .eq("status", "pending")
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Keni tashmë një pagesë në pritje" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("payments")
    .insert({
      company_id: profile.company_id,
      amount,
      plan,
      billing_period,
      payment_method: payment_method || "bank_transfer",
      status: "pending",
      notes,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify admins me user_id të saktë
  try {
    const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin')
    if (admins && admins.length > 0) {
      await supabase.from("notifications").insert(
        admins.map(a => ({
          user_id: a.id,
          company_id: null,
          title: "Pagesë e re në pritje",
          message: `Kompania ka dërguar pagesë për planin ${plan} (€${amount})`,
          type: "info",
        }))
      )
    }
  } catch {}

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