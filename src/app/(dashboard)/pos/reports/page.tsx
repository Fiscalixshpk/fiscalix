import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import POSReportsClient from './reports-client'

export const metadata = { title: 'Raportet POS — Fiscalix' }

export default async function POSReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, companies(id, name, pos_enabled, nui, business_type)')
    .eq('id', user.id)
    .single()

  const company = Array.isArray(userData?.companies)
    ? userData.companies[0]
    : userData?.companies as { id: string; name: string; pos_enabled: boolean; nui: string | null; business_type: string | null } | null

  if (!company?.pos_enabled) redirect('/dashboard')

  const now            = new Date()
  const todayStart     = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: todaySales } = await supabase
    .from('sales')
    .select('*, sale_items(name, price, quantity, total, tax_rate)')
    .eq('company_id', company.id)
    .eq('status', 'fiscalized')
    .gte('issued_at', todayStart)
    .order('issued_at', { ascending: false })

  const { data: monthSales } = await supabase
    .from('sales')
    .select('total_amount, total_tax, total_no_tax, payment_method, issued_at')
    .eq('company_id', company.id)
    .eq('status', 'fiscalized')
    .gte('issued_at', monthStart)

  return (
    <POSReportsClient
      company={{ id: company.id, name: company.name, nui: company.nui ?? '' }}
      todaySales={todaySales ?? []}
      monthSales={monthSales ?? []}
      businessType={company.business_type ?? 'other'}
    />
  )
}
