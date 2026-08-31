import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LibriBlerjeveClient from '@/components/accounting/libri-blerjeve-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Libri i Blerjeve — Fiscalix' }

export default async function LibriBlerjevePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const currentYear = new Date().getFullYear()

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, expense_categories(name_sq, name_en)')
    .eq('company_id', profile.company_id)
    .gte('expense_date', `${currentYear}-01-01`)
    .order('expense_date', { ascending: false })

  const { data: company } = await supabase
    .from('companies').select('*').eq('id', profile.company_id).single()

  return <LibriBlerjeveClient expenses={expenses || []} company={company} />
}
