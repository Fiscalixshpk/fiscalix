import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("payments")
    .select("*, companies(name, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { payment_id, action, notes } = await req.json();

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("id", payment_id)
    .single();

  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const newStatus = action === "confirm" ? "confirmed" : "rejected";

  await supabase
    .from("payments")
    .update({
      status: newStatus,
      notes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", payment_id);

  // If confirmed, extend subscription
  if (action === "confirm") {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("company_id", payment.company_id)
      .single();

    const startDate = sub?.end_date && new Date(sub.end_date) > new Date()
      ? new Date(sub.end_date)
      : new Date();

    const endDate = new Date(startDate);
    if (payment.billing_period === "yearly") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    if (sub) {
      await supabase
        .from("subscriptions")
        .update({
          plan: payment.plan,
          status: "active",
          end_date: endDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
    } else {
      await supabase.from("subscriptions").insert({
        company_id: payment.company_id,
        plan: payment.plan,
        status: "active",
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
      });
    }

    // Gjej user_id te business owner dhe dërgo njoftim
    const { data: bizOwner } = await supabase
      .from('users').select('id').eq('company_id', payment.company_id).eq('role', 'business_owner').maybeSingle()
    if (bizOwner?.id) {
      await supabase.from("notifications").insert({
        user_id: bizOwner.id,
        company_id: payment.company_id,
        title: "Pagesa u konfirmua ✅",
        message: `Pagesa juaj për planin ${payment.plan} u konfirmua. Subscription aktiv deri më ${endDate.toLocaleDateString("sq-AL")}.`,
        type: "success",
      })
    }
  } else {
    const { data: bizOwner } = await supabase
      .from('users').select('id').eq('company_id', payment.company_id).eq('role', 'business_owner').maybeSingle()
    if (bizOwner?.id) {
      await supabase.from("notifications").insert({
        user_id: bizOwner.id,
        company_id: payment.company_id,
        title: "Pagesa u refuzua ❌",
        message: notes || "Pagesa juaj nuk u konfirmua. Kontaktoni mbështetjen.",
        type: "error",
      })
    }
  }

  await supabase.from("activity_logs").insert({
    company_id: null,
    user_id: user.id,
    action: `payment.${newStatus}`,
    entity_type: "payment",
    entity_id: payment_id,
    metadata: { company_id: payment.company_id, plan: payment.plan },
  });

  return NextResponse.json({ success: true, status: newStatus });
}
