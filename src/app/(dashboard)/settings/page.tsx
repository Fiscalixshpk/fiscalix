import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SettingsClient from "@/components/settings/settings-client"

export const metadata: Metadata = { title: "Cilësimet — Fiscalix" }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("*, company_id, role, full_name, email")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  // Fetch company separately
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .single()

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("company_id", profile.company_id)
    .maybeSingle()

  const { data: categories } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("name_sq")

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(10)

  // POS devices — vetëm për bizneset me pos_enabled
  const { data: posDevices } = company?.pos_enabled
    ? await supabase
        .from("pos_devices")
        .select("id, pos_id, device_name, cashier_name, status, environment, certificate_pem, private_key_enc, application_id")
        .eq("company_id", profile.company_id)
        .neq("status", "suspended")
        .order("pos_id")
    : { data: [] }

  // Kamarierët — vetëm për restorante
  const isRestaurant = ['restaurant','cafe','bar','fastfood'].includes(company?.business_type || '')
  const { data: waiters } = isRestaurant && company?.pos_enabled
    ? await supabase
        .from("pos_waiters")
        .select("id, name, pin, color, rfid_tag")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("name")
    : { data: [] }

  return (
    <SettingsClient
      user={user}
      profile={profile}
      company={company}
      subscription={subscription}
      categories={categories || []}
      payments={payments || []}
      posDevices={posDevices || []}
      initialWaiters={waiters || []}
    />
  )
}
