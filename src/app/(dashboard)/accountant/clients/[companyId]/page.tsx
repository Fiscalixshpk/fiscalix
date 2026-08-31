import { createClient }    from '@/lib/supabase/server'
import { redirect }        from 'next/navigation'
import { RESTAURANT_TYPES } from '@/lib/business-categories'
import ClientWorkspace      from '@/components/accountant/client-workspace'
import LightweightClientDetail from '@/components/accountant/lightweight-client-detail'

const POS_TYPES = [...RESTAURANT_TYPES, 'market','pharmacy','bakery','salon','health','barber','beauty','spa','gym']

export default async function AccountantClientPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role, full_name').eq('id', user.id).single()
  if (!['accountant', 'admin'].includes(profile?.role || '')) redirect('/dashboard')

  const { data: rel } = await supabase
    .from('accountant_clients')
    .select('id')
    .eq('accountant_id', user.id)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .eq('status', 'active')
    .maybeSingle()

  if (!rel && profile?.role !== 'admin') redirect('/accountant')

  const { data: company } = await supabase.from('companies').select('*').eq('id', companyId).single()
  if (!company) redirect('/accountant')

  // Bizneset me POS → LightweightClientDetail (kuponë fiskalë, raportet Z)
  if (POS_TYPES.includes(company.business_type || '')) {
    const client = {
      id:               company.id,
      business_name:    company.name,
      business_type:    company.business_type || '',
      pos_enabled:      company.pos_enabled ?? true,
      vat_number:       company.vat_number || company.nui || '',
      is_vat_registered: !!(company.vat_number || company.nui),
      phone:            company.phone || '',
      address:          company.address || '',
    }
    return <LightweightClientDetail client={client} />
  }

  // Bizneset e tjera → workspace i vjetër
  return (
    <ClientWorkspace
      accountantId={user.id}
      company={company}
    />
  )
}
