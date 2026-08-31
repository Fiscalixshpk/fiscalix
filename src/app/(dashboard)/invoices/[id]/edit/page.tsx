import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import InvoiceForm from "@/components/invoices/invoice-form"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Edito Faturën — Fiscalix" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function InvoiceEditPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  // Fetch invoice with items
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single()

  if (!invoice) notFound()

  // Fetch company for invoice prefix and details
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .single()

  if (!company) redirect("/login")

  // Fetch subscription for plan check
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("company_id", profile.company_id)
    .maybeSingle()

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
          Edito Faturën
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
          {invoice.invoice_number} · {invoice.client_name}
        </p>
      </div>
      <InvoiceForm
        company={company}
        userId={user.id}
        subscription={subscription}
        editInvoice={invoice}
      />
    </div>
  )
}
