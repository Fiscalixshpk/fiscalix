// src/app/(dashboard)/layout.tsx
// NDRYSHIMI: shtohet pos_enabled nga companies, kalohet te Sidebar

import { createClient }                       from '@/lib/supabase/server'
import { redirect }                           from 'next/navigation'
import { RESTAURANT_TYPES, BAKERY_TYPES, SALON_TYPES, HEALTH_TYPES, COUNTER_TYPES } from '@/lib/business-categories'
import Sidebar          from '@/components/layouts/sidebar'
import Header           from '@/components/layouts/header'
import BottomNav        from '@/components/layouts/bottom-nav'
import BottomNavArka    from '@/components/layouts/bottom-nav-arka'
import SubscriptionGuard from '@/components/shared/subscription-guard'
import FloatingChatWidget from '@/components/shared/floating-chat-widget'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    // ← NDRYSHIMI: shtohet pos_enabled, nui, location_city
    .select('*, companies(*, pos_enabled, nui, location_city), role')
    .eq('id', user.id)
    .maybeSingle()

  if (!userData) redirect('/login')

  // Lockout kontabilist
  if (userData.role === 'accountant') {
    const { data: accSub } = await supabase
      .from('accountant_subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!accSub || accSub.status !== 'active') redirect('/billing/pending')
    // Trial i skaduar → lockout
    if (accSub.current_period_end && new Date(accSub.current_period_end) < new Date()) {
      redirect('/lockout')
    }
  }

  if (userData.role === 'business_owner' && !userData.company_id) {
    redirect('/billing/pending')
  }

  // Blloko llojet e biznesit që nuk mbështeten më
  const ALLOWED_TYPES = ['market','pharmacy','restaurant','cafe','bar','salon','bakery','health','fastfood','barber','beauty','spa','gym','other','b2b']
  const companyDataCheck = userData.companies as { business_type?: string } | null
  if (userData.company_id && companyDataCheck?.business_type && !ALLOWED_TYPES.includes(companyDataCheck.business_type)) {
    redirect('/unsupported-plan')
  }

  let subscription: { id: string; plan: string; status: string; current_period_end?: string | null; trial_ends_at?: string | null; is_trial?: boolean; company_id?: string; billing_cycle?: string; created_at?: string; updated_at?: string } | null = null
  if (userData.company_id) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    subscription = data
  }

  // Lockout business owner
  if (userData.role === 'business_owner') {
    const isActive = subscription?.status === 'active' || subscription?.status === 'trialing' || !subscription
    if (!isActive) {
      // allow through - no lockout
    }
  }

  // VAT threshold check
  if (userData.role === 'business_owner' && userData.company_id) {
    try {
      const { data: comp } = await supabase
        .from('companies')
        .select('is_vat_registered, last_vat_threshold_check')
        .eq('id', userData.company_id)
        .maybeSingle()

      const lastCheck = comp?.last_vat_threshold_check ? new Date(comp.last_vat_threshold_check) : null
      const shouldCheck = !lastCheck || (Date.now() - lastCheck.getTime()) > 24 * 60 * 60 * 1000

      if (comp && comp.is_vat_registered === false && shouldCheck) {
        const twelveMonthsAgo = new Date()
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

        const { data: yearInvoices } = await supabase
          .from('invoices')
          .select('total_amount, total')
          .eq('company_id', userData.company_id)
          .gte('issue_date', twelveMonthsAgo.toISOString())

        const turnover = (yearInvoices || []).reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0)

        if (turnover >= 30000) {
          await supabase.from('companies').update({ is_vat_registered: true }).eq('id', userData.company_id)
          await supabase.from('notifications').insert({
            user_id: userData.id, company_id: userData.company_id,
            title: 'Keni kaluar pragun e TVSH-së — TVSH u aktivizua',
            message: `Qarkullimi juaj 12-mujor (€${turnover.toFixed(0)}) ka kaluar pragun e €30,000. TVSH 18% është aktivizuar automatikisht.`,
            type: 'warning',
          })
        }
        await supabase.from('companies').update({ last_vat_threshold_check: new Date().toISOString() }).eq('id', userData.company_id)
      }
    } catch {}
  }

  // Accountant clients
  const isAccountant = userData.role === 'accountant'
  let accClients: { id: string; company: { id: string; name: string } | null }[] = []
  if (isAccountant) {
    try {
      const { data } = await supabase
        .from('accountant_clients')
        .select('id, company:companies(id, name)')
        .eq('accountant_id', userData.id)
        .eq('is_active', true)
        .order('added_at', { ascending: false })
      accClients = (data || []) as typeof accClients
    } catch {}
  }

  // Linked accountant + pending invites
  let linkedAccountant: { name: string } | null = null
  let pendingInvitesCount = 0
  let chatPartners: { companyId: string; name: string }[] = []

  if (userData.role === 'business_owner' && userData.company_id) {
    try {
      const { data: rel } = await supabase
        .from('accountant_clients')
        .select('accountant_id')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .eq('status', 'active')
        .maybeSingle()

      if (rel?.accountant_id) {
        const { data: accUser } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', rel.accountant_id)
          .maybeSingle()
        if (accUser?.full_name) {
          linkedAccountant = { name: accUser.full_name }
          chatPartners = [{ companyId: userData.company_id, name: accUser.full_name }]
        }
      }

      const { count } = await supabase
        .from('accountant_clients')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', userData.company_id)
        .eq('status', 'pending')
      pendingInvitesCount = count || 0
    } catch {}
  }

  if (isAccountant) {
    chatPartners = accClients
      .filter(c => c.company)
      .map(c => ({ companyId: c.company!.id, name: c.company!.name }))
  }

  let unreadCount = 0
  try {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    unreadCount = count || 0
  } catch {}

  // ── NDRYSHIMI: merr pos_enabled nga companies ──
  const companyData = Array.isArray(userData.companies)
    ? userData.companies[0]
    : userData.companies as { business_type?: string; pos_enabled?: boolean } | null

  const businessType = companyData?.business_type || null
  const posEnabled   = companyData?.pos_enabled   ?? false
  const isRestaurant = RESTAURANT_TYPES.includes(businessType || '')
  const isBakery     = BAKERY_TYPES.includes(businessType || '')
  const isSalon      = SALON_TYPES.includes(businessType || '')
  const isHealth     = HEALTH_TYPES.includes(businessType || '')
  const isCounter    = COUNTER_TYPES.includes(businessType || '')
  const isMarket     = false // Market ka sidebar si normal — lock screen kontrollohet nga komponenti
  const isArka       = subscription?.plan === 'arka'
  const useLightMode = true

  return (
    <div className={useLightMode ? 'light' : ''} style={{ display: 'flex', height: '100vh', maxHeight: '100dvh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      {!isMarket && (
        <div className={isArka ? 'sidebar-arka' : ''}>
          <Sidebar
            user={userData}
            subscription={subscription}
            accountantClients={accClients}
            linkedAccountant={linkedAccountant}
            pendingInvitesCount={pendingInvitesCount}
            businessType={businessType}
            posEnabled={posEnabled}
          />
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!isMarket && <Header user={userData} notifCount={unreadCount} />}
        <main style={{ flex: 1, overflowY: 'auto', padding: (isRestaurant || isBakery || isSalon || isHealth || isCounter || isMarket) ? '0' : '24px' }}>
          <SubscriptionGuard subscription={subscription} role={userData?.role}>
            {children}
          </SubscriptionGuard>
        </main>
      </div>
      {!isRestaurant && !isBakery && !isSalon && !isHealth && !isArka && !isMarket && <BottomNav role={userData.role} hasLinkedAccountant={!!linkedAccountant} />}
      {isArka && <div className="bottom-nav-arka"><BottomNavArka /></div>}
      {!isRestaurant && !isBakery && !isSalon && !isHealth && !isMarket && <FloatingChatWidget userId={user.id} role={userData.role} partners={chatPartners} />}
    </div>
  )
}
