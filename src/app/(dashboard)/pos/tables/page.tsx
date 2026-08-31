import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import TableManagementClient from './table-client'

export const metadata = { title: 'Tavolinat — Fiscalix POS' }

export default async function TablesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('id, full_name, company_id, companies(id, name, business_type, pos_enabled, nui, owner_pin, address, city, phone, vat_number, tax_number, is_vat_registered)')
    .eq('id', user.id).single()

  const company = Array.isArray(userData?.companies)
    ? userData.companies[0]
    : userData?.companies as { id: string; name: string; nui: string | null; pos_enabled: boolean; business_type: string | null } | null

  if (!company?.pos_enabled) redirect('/dashboard')

  const { data: products } = await supabase
    .from('pos_products')
    .select('id, name, price, category, emoji, tax_rate, unit, is_active, image_url')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('category').order('name')

  const isMock = false

  return (
    <TableManagementClient
      userId={user.id}
      cashierName={userData?.full_name || 'Kamerieri'}
      company={{
          id:         company.id,
          name:       company.name,
          nui:        (company as any).tax_number || (company as any).nui || '',
          ownerPin:   (company as any).owner_pin || '1234',
          address:    (company as any).address || '',
          city:       (company as any).city || '',
          phone:      (company as any).phone || '',
          vatNumber:  (company as any).vat_number || '',
          isVatRegistered: (company as any).is_vat_registered !== false,
          businessType: (company as any).business_type || '',
        }}
      initialProducts={products || []}
      isMockMode={isMock}
    />
  )
}
