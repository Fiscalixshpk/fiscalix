import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import POSHistoryClient from './history-client'

export const metadata = { title: 'Historia e Shitjeve — Fiscalix' }

export default async function POSHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, companies(id, name, pos_enabled, nui, location_city)')
    .eq('id', user.id)
    .single()

  const company = Array.isArray(userData?.companies)
    ? userData.companies[0]
    : userData?.companies as { id: string; name: string; pos_enabled: boolean; nui: string | null; location_city: string | null } | null

  if (!company?.pos_enabled) redirect('/dashboard')

  // Shitjet e 30 ditëve të fundit
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: sales } = await supabase
    .from('sales')
    .select(`
      id, coupon_id, coupon_type, receipt_number,
      atk_transaction_id, total_amount, total_tax,
      total_no_tax, payment_method, status,
      operator_id, issued_at, qr_code_data,
      sale_items(id, name, price, unit, quantity, total, tax_rate)
    `)
    .eq('company_id', company.id)
    .gte('issued_at', thirtyDaysAgo.toISOString())
    .order('issued_at', { ascending: false })
    .limit(200)

  return (
    <POSHistoryClient
      company={{ id: company.id, name: company.name, nui: company.nui ?? '' }}
      sales={sales ?? []}
    />
  )
}
