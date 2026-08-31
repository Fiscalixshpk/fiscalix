import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LegalDocEditor from './legal-doc-editor'

export default async function LegalDocsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()

  const { data: company } = await supabase
    .from('companies').select('name, address, vat_number, phone, email')
    .eq('id', profile?.company_id).single()

  return <LegalDocEditor company={company} />
}
