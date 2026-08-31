import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExpenseForm } from "@/components/expenses/expense-form";

export const metadata = { title: "Shpenzim i Ri – Fiscalix" };

export default async function NewExpensePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: categories } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("name");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-1)]">Shpenzim i Ri</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>Regjistro një shpenzim të ri</p>
      </div>
      <ExpenseForm categories={categories || []} />
    </div>
  );
}
