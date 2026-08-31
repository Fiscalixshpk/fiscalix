import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuotesClient from './quotes-client'

export const metadata = { title: 'Ofertat — Fiscalix' }

export default async function QuotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id) redirect('/login')

  const { data: quotes } = await supabase
    .from('quotes')
    .select('*, items:quote_items(*)')
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email')
    .eq('company_id', userData.company_id)
    .order('name')

  return (
    <QuotesClient
      quotes={quotes || []}
      clients={clients || []}
      companyId={userData.company_id}
    />
  )
}
