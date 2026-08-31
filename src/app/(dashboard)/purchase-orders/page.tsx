import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PurchaseOrdersClient from './purchase-orders-client'

export const metadata = { title: 'Porositë e Blerjes — Fiscalix' }

export default async function PurchaseOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('company_id, role').eq('id', user.id).single()
  if (!profile?.company_id) redirect('/login')

  const { data: orders } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })

  const { data: company } = await supabase
    .from('companies').select('*').eq('id', profile.company_id).single()

  return (
    <PurchaseOrdersClient
      orders={orders || []}
      company={company}
      companyId={profile.company_id}
    />
  )
}
