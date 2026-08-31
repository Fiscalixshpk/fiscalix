import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PensionClient from '@/components/accounting/pension-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Kontributet Pensionale — Fiscalix' }

export default async function PensionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: company } = await supabase
    .from('companies').select('*').eq('id', profile.company_id).single()

  return <PensionClient company={company} />
}
