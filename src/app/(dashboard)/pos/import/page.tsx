import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import ProductImportClient from './import-client'

export const metadata = { title: 'Import Produktesh — Fiscalix' }

export default async function ProductImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('company_id, companies(id, name, pos_enabled, business_type)')
    .eq('id', user.id).single()

  const company = Array.isArray(userData?.companies)
    ? userData.companies[0]
    : userData?.companies as { id: string; name: string; pos_enabled: boolean } | null

  if (!company?.pos_enabled) redirect('/dashboard')

  return <ProductImportClient companyId={company.id} companyName={company.name} />
}
