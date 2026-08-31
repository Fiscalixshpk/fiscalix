import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MjetetLibriClient from '../libri-client'

export default async function LibriShitjevePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single()
  if (profile?.role !== 'accountant') redirect('/dashboard')

  const { data: company } = await supabase.from('companies').select('*').eq('id', profile.company_id).single()
  const { data: invoices } = await supabase.from('invoices').select('*').eq('company_id', profile.company_id).order('issue_date', { ascending: false })

  return <MjetetLibriClient type="shitjeve" company={company} invoices={invoices || []} expenses={[]} />
}
