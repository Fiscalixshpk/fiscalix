import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuotesClient from './quotes-client'

export default async function QuotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role, company_id').eq('id', user.id).single()
  if (!profile?.company_id) redirect('/dashboard')
  const { data: company } = await supabase.from('companies').select('is_vat_registered').eq('id', profile.company_id).single()
  const { data: quotes } = await supabase
    .from('quotes').select('*, items:quote_items(*)').eq('company_id', profile.company_id).order('created_at', { ascending: false })
  return <QuotesClient quotes={quotes || []} companyId={profile.company_id} isVatRegistered={company?.is_vat_registered ?? false} />
}
