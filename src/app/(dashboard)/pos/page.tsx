import { createClient }                       from '@/lib/supabase/server'
import { redirect }                           from 'next/navigation'
import { categoryNeedsPos, RESTAURANT_TYPES, SALON_TYPES, HEALTH_TYPES } from '@/lib/business-categories'
import MarketPOSClient                        from './market-pos-client'
import POSClient                              from './pos-client'
import ServicePOSClient                       from './service-pos-client'

export const metadata = { title: 'POS — Fiscalix' }
const MARKET_TYPES = ['market']

export default async function POSPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('id, role, company_id, full_name, companies(id, name, business_type, nui, location_city, pos_enabled, logo_url)')
    .eq('id', user.id)
    .maybeSingle()

  if (!userData) redirect('/login')

  const company = Array.isArray(userData.companies)
    ? userData.companies[0]
    : userData.companies as { id: string; name: string; business_type: string | null; nui: string | null; location_city: string | null; pos_enabled: boolean } | null

  if (!company?.pos_enabled) redirect('/dashboard')
  if (!categoryNeedsPos(company.business_type)) redirect('/dashboard')

  // Kontrollo planin — 'arka' → shko direkt te ServicePOS
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('company_id', company.id)
    .eq('status', 'active')
    .maybeSingle()

  const isMockEnv = false // Mock mode i çaktivizuar

  // Nëse ka pajisje reale (jo mock) — çaktivizo mock mode automatikisht
  const { data: realDevice } = await supabase
    .from('pos_devices')
    .select('id, environment')
    .eq('company_id', company.id)
    .eq('status', 'active')
    .neq('environment', 'MOCK')
    .maybeSingle()

  const isMock = false // Gjithmonë real

  if (subData?.plan === 'arka') {
    const { default: ServicePOSClient } = await import('./service-pos-client')
    return (
      <ServicePOSClient
        userId={user.id}
        cashierName={userData?.full_name || 'Kasier'}
        company={{
          id:              company.id,
          name:            company.name,
          nui:             company.nui ?? '',
          isVatRegistered: (company as any).is_vat_registered !== false,
          businessType:    company.business_type ?? 'other',
        }}
        isMockMode={isMock}
        deviceId={realDevice?.id || null}
      />
    )
  }
  const { data: allDevices } = await supabase
    .from('pos_devices')
    .select('id, pos_id, device_name, cashier_name, environment, status')
    .eq('company_id', company.id)
    .in('status', ['active', 'onboarded'])
    .order('pos_id')

  const devices = (allDevices ?? []).map(d => ({
    id:          d.id,
    posId:       d.pos_id,
    name:        d.device_name,
    cashierName: d.cashier_name ?? userData.full_name ?? 'Operator',
    environment: d.environment as 'TEST' | 'PROD',
  }))

  const { data: products } = await supabase
    .from('pos_products')
    .select('id, name, price, category, emoji, tax_rate, unit, stock, barcode, is_active, image_url, expiry_date, buy_price, discount')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('sort_order').order('category').order('name')

  const companyProp = {
    id: company.id, name: company.name,
    businessType: company.business_type ?? 'market',
    nui: company.nui ?? '', locationCity: company.location_city ?? 'Kosovë',
  }

  // Restorant/Kafe → ridrejto te Tavolinat
  if (RESTAURANT_TYPES.includes(company.business_type ?? '')) {
    redirect('/pos/tables')
  }

  // Sallon/Mjek/Gym/Spa → Service POS (vetëm kupon fiskal)
  if (SALON_TYPES.includes(company.business_type ?? '')) {
    return (
      <ServicePOSClient
        userId={user.id}
        cashierName={userData?.full_name || 'Kasier'}
        company={{
          id:             companyProp.id,
          name:           companyProp.name,
          nui:            companyProp.nui,
          isVatRegistered: (company as any).is_vat_registered !== false,
          businessType:   company.business_type ?? 'other',
        }}
        isMockMode={isMock}
      />
    )
  }

  const prods    = products ?? []
  const isMarket = MARKET_TYPES.includes(company.business_type ?? '')

  if (isMarket) {
    // Merr kasierët dhe klientët me borxh
    const { data: marketCashiers } = await supabase
      .from('market_cashiers')
      .select('*')
      .eq('company_id', company.id)
      .eq('is_active', true)
      .order('created_at')

    const { data: debtClientsList } = await supabase
      .from('debt_clients')
      .select('*')
      .eq('company_id', company.id)
      .order('name')

    return (
      <MarketPOSClient
        userId={user.id}
        company={{ id: companyProp.id, name: companyProp.name, nui: companyProp.nui, locationCity: companyProp.locationCity, logo_url: (company as any).logo_url || null }}
        devices={devices}
        initialProducts={prods}
        isMockMode={isMock}
        cashiers={marketCashiers || []}
        debtClients={debtClientsList || []}
        ownerName={userData?.full_name || 'Pronari'}
        ownerEmail={user.email || ''}
      />
    )
  }

  return (
    <POSClient
      userId={user.id}
      company={companyProp}
      device={devices[0] ?? null}
      initialProducts={prods}
      isMockMode={isMock}
    />
  )
}
