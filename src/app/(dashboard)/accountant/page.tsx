// src/app/(dashboard)/accountant/page.tsx
// NDRYSHIMI: shtohet shitjet e POS per çdo klient
// Kontabilisti sheh pos_sales_today dhe pos_total_month

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import AccountantCommandCenter from '@/components/accountant/command-center'

export const metadata: Metadata = { title: 'Accountant Command Center — Fiscalix' }

export default async function AccountantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name, email, company_id')
    .eq('id', user.id)
    .single()

  if (!['accountant', 'admin'].includes(profile?.role || '')) redirect('/dashboard')

  const { data: accSub } = await supabase
    .from('accountant_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: clientsRaw } = await supabase
    .from('accountant_clients')
    .select(`id, notes, added_at, company:companies(id, name, email, phone, city, logo_url, is_active, pos_enabled, business_type, subscriptions(plan, status, current_period_end))`)
    .eq('accountant_id', user.id)
    .eq('is_active', true)
    .eq('status', 'active')
    .order('added_at', { ascending: false })

  const now            = new Date()
  const todayStart     = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

  type CompanyRow = {
    id: string; name: string; email?: string; phone?: string; city?: string
    is_active?: boolean; pos_enabled?: boolean; business_type?: string
    subscriptions?: { plan: string; status: string; current_period_end?: string }[]
  }

  const clients = await Promise.all((clientsRaw || []).map(async (c) => {
    const comp = c.company as unknown as CompanyRow | null
    if (!comp) return null

    const [
      invAll, invThis, invLast, expAll, expThis, expLast,
      checklistRes, docReqRes,
      posTodayRes, posMonthRes,
      posOfflineRes, posFailedRes,  // ← E RE: POS probleme
    ] = await Promise.all([
      supabase.from('invoices').select('id, status, total_amount, total, due_date, issue_date, client_name').eq('company_id', comp.id),
      supabase.from('invoices').select('id, total_amount, total, status').eq('company_id', comp.id).gte('issue_date', thisMonthStart),
      supabase.from('invoices').select('id, total_amount, total').eq('company_id', comp.id).gte('issue_date', lastMonthStart).lte('issue_date', lastMonthEnd),
      supabase.from('expenses').select('id, amount, expense_date').eq('company_id', comp.id),
      supabase.from('expenses').select('id, amount').eq('company_id', comp.id).gte('expense_date', thisMonthStart),
      supabase.from('expenses').select('id, amount').eq('company_id', comp.id).gte('expense_date', lastMonthStart).lte('expense_date', lastMonthEnd),
      supabase.from('closing_checklists').select('id, closing_checklist_items(is_done)').eq('accountant_id', user.id).eq('company_id', comp.id).eq('period_month', now.getMonth() + 1).eq('period_year', now.getFullYear()).maybeSingle(),
      supabase.from('document_requests').select('id', { count: 'exact', head: true }).eq('accountant_id', user.id).eq('company_id', comp.id).eq('status', 'pending'),
      supabase.from('sales').select('total_amount').eq('company_id', comp.id).eq('status', 'fiscalized').gte('issued_at', todayStart),
      supabase.from('sales').select('total_amount').eq('company_id', comp.id).eq('status', 'fiscalized').gte('issued_at', thisMonthStart),
      // POS offline pa sinkronizuar
      supabase.from('pos_offline_queue').select('id, deadline_at', { count: 'exact' }).eq('company_id', comp.id).is('synced_at', null).lt('attempts', 5),
      // POS shitje të dështuara sot
      supabase.from('sales').select('id', { count: 'exact', head: true }).eq('company_id', comp.id).eq('status', 'failed').gte('issued_at', todayStart),
    ])

    const invoices  = invAll.data  || []
    const invMonth  = invThis.data || []
    const invPrev   = invLast.data || []
    const expenses  = expAll.data  || []
    const expMonth  = expThis.data || []
    const expPrev   = expLast.data || []

    // POS totals (cent → EUR)
    const posSalesToday  = (posTodayRes.data  || []).reduce((s, r) => s + Number(r.total_amount || 0), 0) / 100
    const posSalesMonth  = (posMonthRes.data  || []).reduce((s, r) => s + Number(r.total_amount || 0), 0) / 100

    // POS probleme
    const posOfflineCount = (posOfflineRes as { count: number | null }).count ?? 0
    const posFailedCount  = (posFailedRes  as { count: number | null }).count ?? 0

    // Kontrollo nëse ka offline urgjent (>24h)
    const posOfflineUrgent = posOfflineCount > 0
      ? (posOfflineRes.data ?? []).filter((r: { deadline_at: string }) =>
          new Date(r.deadline_at).getTime() - Date.now() < 24 * 60 * 60 * 1000
        ).length
      : 0

    const totalRev   = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0)
    const totalExp   = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
    const overdue    = invoices.filter(i => i.status === 'overdue')
    const pending    = invoices.filter(i => i.status === 'pending')
    const thisRevAmt = invMonth.reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0)
    const prevRevAmt = invPrev.reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0)
    const thisExpAmt = expMonth.reduce((s, e) => s + Number(e.amount || 0), 0)
    const prevExpAmt = expPrev.reduce((s, e) => s + Number(e.amount || 0), 0)
    const revTrend   = prevRevAmt > 0 ? ((thisRevAmt - prevRevAmt) / prevRevAmt) * 100 : 0
    const expTrend   = prevExpAmt > 0 ? ((thisExpAmt - prevExpAmt) / prevExpAmt) * 100 : 0

    const lastInvDate     = invoices.sort((a, b) => new Date(b.issue_date || '').getTime() - new Date(a.issue_date || '').getTime())[0]?.issue_date
    const lastExpDate     = expenses.sort((a, b) => new Date(b.expense_date || '').getTime() - new Date(a.expense_date || '').getTime())[0]?.expense_date
    const lastActivity    = [lastInvDate, lastExpDate].filter(Boolean).sort().reverse()[0] || null
    const daysSinceActivity = lastActivity ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)) : 999

    let health = 100
    if (overdue.length > 0)       health -= Math.min(30, overdue.length * 10)
    if (daysSinceActivity > 30)   health -= 20
    if (daysSinceActivity > 60)   health -= 20
    if (pending.length > 5)       health -= 10
    if (posOfflineUrgent > 0)     health -= 25   // kuponë offline urgjentë = problem serioz
    if (posFailedCount > 0)       health -= 20   // shitje të dështuara
    if (posOfflineCount > 0)      health -= 10   // offline por jo urgjent
    health = Math.max(0, health)

    const insights: string[] = []
    if (overdue.length > 0) insights.push(`${overdue.length} fatura të vonuara`)
    if (daysSinceActivity > 30) insights.push(`Jo aktiv prej ${daysSinceActivity} ditësh`)
    if (thisRevAmt > prevRevAmt * 1.2) insights.push('Të ardhurat +20% ky muaj')
    if (posSalesMonth > 0) insights.push(`POS: €${posSalesMonth.toFixed(0)} këtë muaj`)
    if (posOfflineUrgent > 0) insights.push(`⚠ ${posOfflineUrgent} kuponë offline URGJENTË`)
    if (posFailedCount > 0)   insights.push(`✗ ${posFailedCount} shitje të dështuara sot`)

    const taxDeadlines: { type: string; label: string; daysLeft: number }[] = []
    const d1 = new Date(now.getFullYear(), now.getMonth() + 1, 15)
    taxDeadlines.push({ type: 'Pension', label: 'Kontrib. Pension', daysLeft: Math.ceil((d1.getTime() - now.getTime()) / 86400000) })
    const tvshDL = [new Date(now.getFullYear(), 3, 15), new Date(now.getFullYear(), 6, 15), new Date(now.getFullYear(), 9, 15), new Date(now.getFullYear() + 1, 0, 15)]
      .find(d => d > now)
    if (tvshDL) taxDeadlines.push({ type: 'TVSH', label: 'Deklarata TVSH', daysLeft: Math.ceil((tvshDL.getTime() - now.getTime()) / 86400000) })

    const checklistItems       = (checklistRes.data?.closing_checklist_items || []) as { is_done: boolean }[]
    const checklistTotal       = checklistItems.length
    const checklistDone        = checklistItems.filter(i => i.is_done).length
    const checklistPct         = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0
    const pendingDocRequests   = docReqRes.count || 0

    let portfolioStatus: 'ready' | 'attention' | 'overdue' = 'ready'
    if (overdue.length > 0 || daysSinceActivity > 45 || posOfflineUrgent > 0 || posFailedCount > 0)
      portfolioStatus = 'overdue'
    else if (pendingDocRequests > 0 || (checklistTotal > 0 && checklistPct < 100) || health < 70 || posOfflineCount > 0)
      portfolioStatus = 'attention'

    return {
      id: c.id,
      company: comp,
      stats: {
        totalRevenue: totalRev, totalExpenses: totalExp, profit: totalRev - totalExp,
        invoiceCount: invoices.length, overdueCount: overdue.length,
        overdueAmount: overdue.reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0),
        pendingCount: pending.length,
        thisMonthInvoices: invMonth.length, prevMonthInvoices: invPrev.length,
        thisMonthExpenses: expMonth.length, prevMonthExpenses: expPrev.length,
        revTrend, expTrend,
        posSalesToday, posSalesMonth,
        hasPOS:            comp.pos_enabled ?? false,
        posOfflineCount,
        posOfflineUrgent,
        posFailedCount,
      },
      health, insights, taxDeadlines,
      lastActivity, daysSinceActivity,
      checklistPct, checklistTotal, pendingDocRequests, portfolioStatus,
    }
  }))

  const validClients = clients.filter(Boolean) as NonNullable<typeof clients[0]>[]

  const { count: pendingInviteCount } = await supabase
    .from('accountant_clients')
    .select('id', { count: 'exact', head: true })
    .eq('accountant_id', user.id)
    .eq('status', 'pending')

  const { count: ownInvoiceCount } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', profile?.company_id || '')

  return (
    <AccountantCommandCenter
      accountantName={profile?.full_name || user.email || 'Kontabilist'}
      clients={validClients}
      pendingInviteCount={pendingInviteCount || 0}
      subscription={accSub}
      maxClients={accSub?.max_clients || 20}
      hasInvoiced={(ownInvoiceCount || 0) > 0}
    />
  )
}
