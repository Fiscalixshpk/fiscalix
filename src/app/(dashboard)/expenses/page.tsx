import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ExpenseListClient } from "@/components/expenses/expense-list-client"

export const metadata = { title: "Shpenzimet – Fiscalix" }

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; category?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users").select("company_id, role").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const params = await searchParams
  const isAccountant = profile.role === 'accountant' || profile.role === 'admin'
  const defaultCategory = params.category || null

  let targetCompanyId = profile.company_id

  if (isAccountant && params.company) {
    const { data: clientRel } = await supabase
      .from('accountant_clients')
      .select('id')
      .eq('accountant_id', user.id)
      .eq('company_id', params.company)
      .maybeSingle()
    if (clientRel || profile.role === 'admin') {
      targetCompanyId = params.company
    }
  }

  if (!targetCompanyId) redirect('/accountant')

  const { data: expenses } = await supabase
    .from("expenses")
    .select(`*, expense_categories(id, name_sq, name, color, icon)`)
    .eq("company_id", targetCompanyId)
    .order("expense_date", { ascending: false })
    .limit(200)

  const { data: categories } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("company_id", targetCompanyId)

  const { data: company } = await supabase
    .from("companies").select("name").eq("id", targetCompanyId).single()

  return (
    <ExpenseListClient
      expenses={expenses || []}
      categories={categories || []}
      companyId={targetCompanyId}
      userId={user.id}
      companyName={company?.name}
      monthlyRawData={expenses || []}
      isAccountantView={isAccountant && !!params.company}
      defaultCategory={defaultCategory}
      pageTitle={defaultCategory === 'furnitor' ? 'Furnitorët' : undefined}
    />
  )
}
