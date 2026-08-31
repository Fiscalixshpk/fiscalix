import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RecurringClient } from "@/components/recurring/recurring-client";

export const metadata = { title: "Faturat Periodike – Fiscalix" };

export default async function RecurringPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("company_id", profile.company_id)
    .single();

  if (subscription?.plan === "basic") {
    redirect("/billing?upgrade=recurring");
  }

  const { data: recurring } = await supabase
    .from("recurring_invoices")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .single();

  return (
    <RecurringClient
      recurring={recurring || []}
      company={company!}
    />
  );
}
