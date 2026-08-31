import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TerminetClient from './terminet-client'

export default async function TerminetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const companyId = profile?.company_id || ''

  const [{ data: services }, { data: appointments }, { data: bookingLink }, { data: company }] = await Promise.all([
    supabase.from('business_services').select('*').eq('company_id', companyId).eq('is_active', true).order('name'),
    supabase.from('appointments').select('*, business_services(name)').eq('company_id', companyId).order('appointment_date', { ascending: false }).limit(100),
    supabase.from('booking_links').select('*').eq('company_id', companyId).maybeSingle(),
    supabase.from('companies').select('name, business_type').eq('id', companyId).single(),
  ])

  return <TerminetClient
    companyId={companyId}
    companyName={company?.name || ''}
    businessType={company?.business_type || ''}
    services={services || []}
    appointments={appointments || []}
    bookingLink={bookingLink}
  />
}
