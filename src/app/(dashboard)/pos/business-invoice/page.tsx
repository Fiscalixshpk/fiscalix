import { createClient } from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import BusinessInvoiceClient from './business-invoice-client'

export const metadata = { title: 'Faturë për Biznes — Fiscalix POS' }

export default async function BusinessInvoicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('company_id, companies(id, name, address, city, phone, tax_number, vat_number, is_vat_registered)')
    .eq('id', user.id).single()

  const company = Array.isArray(userData?.companies) ? userData.companies[0] : userData?.companies as any

  const { data: history } = await supabase
    .from('business_invoices')
    .select('*')
    .eq('company_id', company?.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return <BusinessInvoiceClient
    companyId={company?.id}
    userId={user.id}
    company={company}
    history={history || []}
  />
}
