import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InvoiceListClient from '@/components/invoices/invoice-list-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Faturat' }

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('company_id, role').eq('id', user.id).single()
  if (!userData) redirect('/login')

  const params = await searchParams
  const isAccountant = userData.role === 'accountant' || userData.role === 'admin'

  // If accountant viewing a specific client's company
  let targetCompanyId = userData.company_id
  let clientCompany = null

  if (isAccountant && params.company) {
    // Verify accountant has access to this company
    const { data: clientRel } = await supabase
      .from('accountant_clients')
      .select('id')
      .eq('accountant_id', user.id)
      .eq('company_id', params.company)
      .maybeSingle()

    // Admin can see any company
    if (clientRel || userData.role === 'admin') {
      targetCompanyId = params.company
      const { data: cc } = await supabase
        .from('companies').select('*').eq('id', targetCompanyId).single()
      clientCompany = cc
    }
  }

  if (!targetCompanyId) {
    if (isAccountant) {
      // Auto-provision a personal company for the accountant's own invoicing
      const { data: accProfile } = await supabase
        .from('users').select('full_name, email, phone').eq('id', user.id).single()

      const baseName = accProfile?.full_name || 'Kontabilist'

      const { data: newCompany, error: companyErr } = await supabase
        .from('companies')
        .insert({
          name: baseName,
          email: accProfile?.email || user.email,
          phone: accProfile?.phone || null,
          country: 'Kosovo',
          is_active: true,
        })
        .select()
        .single()

      if (!companyErr && newCompany) {
        await supabase.from('users').update({ company_id: newCompany.id }).eq('id', user.id)
        targetCompanyId = newCompany.id
      }
    }
  }

  if (!targetCompanyId) redirect('/accountant')

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*)')
    .eq('company_id', targetCompanyId)
    .order('created_at', { ascending: false })

  const { data: company } = clientCompany
    ? { data: clientCompany }
    : await supabase.from('companies').select('*').eq('id', targetCompanyId).single()

  return (
    <InvoiceListClient
      invoices={invoices || []}
      company={company}
      isAccountantView={isAccountant && !!params.company}
      clientCompanyId={params.company}
    />
  )
}
