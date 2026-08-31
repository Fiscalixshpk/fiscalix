import { createClient }  from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import ProductsClient    from './products-client'

export const metadata = { title: 'Produktet — Fiscalix POS' }

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, companies(id, business_type, pos_enabled)')
    .eq('id', user.id).single()

  const company = Array.isArray(userData?.companies)
    ? userData.companies[0]
    : userData?.companies as { id: string; business_type: string | null; pos_enabled: boolean } | null

  if (!company?.pos_enabled) redirect('/dashboard')

  const params = await searchParams
  const initialView = params.view || 'products'

  return (
    <ProductsClient
      initialView={initialView}
      companyId={company.id}
      businessType={company.business_type}
    />
  )
}
