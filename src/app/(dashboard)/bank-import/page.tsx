import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BankImportClient from '@/components/bank/bank-import-client'

export const metadata: Metadata = { title: 'Import Bankar — Fiscalix' }

export default async function BankImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('company_id, role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: categories } = await supabase
    .from('expense_categories').select('*').eq('company_id', profile.company_id).order('name_sq')

  const { data: sub } = await supabase
    .from('subscriptions').select('plan').eq('company_id', profile.company_id).maybeSingle()

  return (
    <BankImportClient
      userId={user.id}
      companyId={profile.company_id}
      categories={categories || []}
      plan={sub?.plan || 'basic'}
    />
  )
}
