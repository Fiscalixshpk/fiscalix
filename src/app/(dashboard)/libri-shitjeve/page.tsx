import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LibriShitjeveClient from '@/components/accounting/libri-shitjeve-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Libri i Shitjeve — Fiscalix' }

export default async function LibriShitjevePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('company_id, role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const currentYear = new Date().getFullYear()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('company_id', profile.company_id)
    .gte('issue_date', `${currentYear}-01-01`)
    .order('issue_date', { ascending: false })

  const { data: company } = await supabase
    .from('companies').select('*').eq('id', profile.company_id).single()

  return <LibriShitjeveClient invoices={invoices || []} company={company} />
}
