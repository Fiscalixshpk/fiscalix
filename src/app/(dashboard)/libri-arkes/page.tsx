import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CashBankBookClient from '@/components/accounting/cash-bank-book-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Libri i Arkës — Fiscalix' }

export default async function LibriArkesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('company_id, role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: company } = await supabase
    .from('companies').select('id, name').eq('id', profile.company_id).maybeSingle()

  return <CashBankBookClient company={company} entryType="cash" />
}
