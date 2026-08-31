import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import POSOnboardingClient from './pos-onboarding-client'

export const metadata = { title: 'POS Onboarding — Fiscalix' }

export default async function POSOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, companies(id, name, nui, location_city, pos_enabled, business_type)')
    .eq('id', user.id)
    .single()

  const company = Array.isArray(userData?.companies)
    ? userData.companies[0]
    : userData?.companies as { id: string; name: string; nui: string | null; location_city: string | null; pos_enabled: boolean } | null

  if (!company) redirect('/dashboard')
  if (!company.pos_enabled) redirect('/dashboard')

  const { data: devices } = await supabase
    .from('pos_devices')
    .select('*')
    .eq('company_id', company.id)
    .order('pos_id')

  return (
    <POSOnboardingClient
      company={{
        id:           company.id,
        name:         company.name,
        nui:          company.nui ?? '',
        locationCity: company.location_city ?? '',
      }}
      devices={devices ?? []}
    />
  )
}
