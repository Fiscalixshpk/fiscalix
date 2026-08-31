// src/app/(dashboard)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import DashboardClient  from '@/components/dashboard/dashboard-client'
import POSDashboardWidget from '@/components/pos/pos-dashboard-widget'
import POSAlertsWidget    from '@/components/pos/pos-alerts-widget'
import RestaurantDashboard from '@/components/pos/restaurant-dashboard'
import BakeryDashboard from '@/components/pos/bakery-dashboard'
import { getCategoryConfig } from '@/lib/category-config'
import { getCategoryDashboardConfig, DEFAULT_CONFIG } from '@/lib/category-dashboard'
import { BUSINESS_CATEGORIES } from '@/lib/business-categories'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('*, company:companies(*)')
    .eq('id', user.id)
    .single()

  if (userData?.role === 'accountant') redirect('/accountant')
  if (userData?.role === 'admin')      redirect('/admin')
  if (!userData?.company_id)           redirect('/register')

  const companyId = userData.company_id
  const company   = userData.company as {
    pos_enabled?: boolean; business_type?: string; name?: string
    phone?: string; address?: string; vat_number?: string
  } | null

  const now            = new Date()
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()
  const todayStr       = now.toISOString().split('T')[0]  // "2026-08-09"
  const todayStart     = `${todayStr}T00:00:00.000Z`

  // ── QUERIES (paralele) ──
  const queries: Promise<unknown>[] = [
    supabase.from('invoices').select('status, total, paid_date, issue_date, created_at').eq('company_id', companyId),
    supabase.from('expenses').select('amount, expense_date, created_at, category:expense_categories(name_sq, color)').eq('company_id', companyId),
    supabase.from('invoices').select('*, items:invoice_items(*)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
    supabase.from('expenses').select('*, category:expense_categories(name_sq, icon, color)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
    supabase.from('subscriptions').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('accountant_clients').select('accountant_id, users!accountant_clients_accountant_id_fkey(full_name, email)').eq('company_id', companyId).eq('status', 'active').maybeSingle(),
  ]

  // ── POS queries (vetëm nëse pos_enabled) ──
  let posQueries: Promise<unknown>[] = []
  if (company?.pos_enabled) {
    posQueries = [
      // Shitjet sot
      supabase.from('sales').select('total_amount, payment_method, issued_at, receipt_number, status').eq('company_id', companyId).gte('issued_at', todayStart).order('issued_at', { ascending: false }).limit(20),
      // Shitjet këtë muaj
      supabase.from('sales').select('total_amount').eq('company_id', companyId).gte('issued_at', monthStart).eq('status', 'fiscalized'),
      // Total transaksione sot
      supabase.from('sales').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('issued_at', todayStart),
    ]
  }

  const results = await Promise.all([...queries, ...posQueries])

  const [
    { data: invoices },
    { data: expenses },
    { data: recentInvoices },
    { data: recentExpenses },
    { data: subscription },
    { data: linkedAccountantRaw },
    ...posResults
  ] = results as [
    { data: { status: string; total: number; paid_date: string; issue_date: string; created_at: string }[] | null },
    { data: { amount: number; expense_date: string; created_at: string; category: { name_sq: string; color: string } | null }[] | null },
    { data: { id: string; invoice_number: string; client_name: string; total_amount: number; status: string; due_date: string }[] | null },
    { data: { id: string; description: string; amount: number; category_name: string; expense_date: string }[] | null },
    { data: { plan: string } | null },
    { data: { accountant_id: string; users: { full_name?: string; email?: string } | null } | null },
    ...unknown[]
  ]

  // POS stats
  const posSalesToday   = company?.pos_enabled && posResults[0] ? (posResults[0] as { data: { total_amount: number; payment_method: string; issued_at: string; receipt_number: string; status: string }[] | null }).data : null
  const posSalesMonth   = company?.pos_enabled && posResults[1] ? (posResults[1] as { data: { total_amount: number }[] | null }).data : null
  const posTxCountToday = company?.pos_enabled && posResults[2] ? (posResults[2] as { count: number | null }).count ?? 0 : 0
  const txCountMonth    = (posSalesMonth || []).length

  const posTotalToday = (posSalesToday || []).reduce((s, r) => s + Number(r.total_amount || 0), 0) / 100
  const posTotalMonth = (posSalesMonth || []).reduce((s, r) => s + Number(r.total_amount || 0), 0) / 100

  // Invoice/expense stats
  const totalRevenue    = invoices?.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0) || 0
  const monthlyRevenue  = invoices?.filter(i => i.status === 'paid' && i.paid_date >= monthStart).reduce((s, i) => s + i.total, 0) || 0
  const totalExpenses   = expenses?.reduce((s, e) => s + e.amount, 0) || 0
  const monthlyExpenses = expenses?.filter(e => e.expense_date >= monthStart.split('T')[0]).reduce((s, e) => s + e.amount, 0) || 0
  const pendingAmount   = invoices?.filter(i => i.status === 'pending').reduce((s, i) => s + i.total, 0) || 0
  const overdueAmount   = invoices?.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0) || 0

  // Monthly chart
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = d.toISOString().split('T')[0]
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const label = d.toLocaleString('sq-AL', { month: 'short' })
    const rev   = invoices?.filter(inv => inv.status === 'paid' && inv.paid_date >= start && inv.paid_date <= end).reduce((s, inv) => s + inv.total, 0) || 0
    const exp   = expenses?.filter(e => e.expense_date >= start && e.expense_date <= end).reduce((s, e) => s + e.amount, 0) || 0
    monthlyData.push({ month: label, revenue: rev, expenses: exp, profit: rev - exp })
  }

  // Expense by category
  const categoryMap: Record<string, { name: string; amount: number; color: string }> = {}
  expenses?.forEach(e => {
    const catName  = (e.category as { name_sq: string } | null)?.name_sq || 'Të tjera'
    const catColor = (e.category as { color: string } | null)?.color || '#6B7280'
    if (!categoryMap[catName]) categoryMap[catName] = { name: catName, amount: 0, color: catColor }
    categoryMap[catName].amount += e.amount
  })
  const expenseByCategory = Object.values(categoryMap).sort((a, b) => b.amount - a.amount).slice(0, 6)

  const hasCompanyDetails = !!(company?.phone || company?.address || company?.vat_number)
  let expenseCount = 0, categoryCount = 0
  try {
    const r1 = await supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
    expenseCount = r1.count || 0
    const r2 = await supabase.from('expense_categories').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
    categoryCount = r2.count || 0
  } catch {}

  const linkedAccountant = linkedAccountantRaw
    ? {
        name:  (linkedAccountantRaw.users as { full_name?: string; email?: string } | null)?.full_name || 'Kontabilist',
        email: (linkedAccountantRaw.users as { full_name?: string; email?: string } | null)?.email || '',
      }
    : null

  const businessType           = company?.business_type || null
  const categoryConfig         = getCategoryConfig(businessType)
  const categoryDashboardConfig = getCategoryDashboardConfig(businessType) || DEFAULT_CONFIG
  const categoryLabel          = BUSINESS_CATEGORIES.find(c => c.id === businessType)?.label || null
  const isRestaurant           = ['restaurant','cafe','bar','fastfood'].includes(businessType || '')
  const isBakery               = ['bakery'].includes(businessType || '')

  // ── RESTAURANT SPECIFIC DATA ──────────────────────────────
  let trendingDishes: { name: string; category: string; orders: number; color: string }[] = []
  let waiterStats:    { name: string; color: string; earnings: number; orders: number }[]  = []
  let allSales:       any[] = []
  let waiters:        any[] = []
  let cashTotal = 0, cardTotal = 0

  if (isRestaurant) {
    if (companyId) {
      const yearAgo2 = new Date(); yearAgo2.setFullYear(yearAgo2.getFullYear() - 1)
      const { data: _allS, error: salesErr } = await supabase.from('sales')
        .select('total_amount, issued_at, payment_method, cashier_name, operator_id')
        .eq('company_id', companyId)
        .gte('issued_at', yearAgo2.toISOString())
        .order('issued_at', { ascending: false })
      // Normalize: use cashier_name or operator_id as fallback
      const allSalesNorm = (_allS || []).map((s: any) => ({
        ...s,
        cashier_name: s.cashier_name || s.operator_id || null
      }))
      allSales = allSalesNorm

      const { data: _wts } = await supabase.from('pos_waiters')
        .select('id, name, color').eq('company_id', companyId).eq('is_active', true)
      waiters = _wts || []
    }
  }

  if (isRestaurant) {
    // Cash vs Card split
    cashTotal = (posSalesToday || []).filter(s => s.payment_method === 'cash').reduce((s, r) => s + Number(r.total_amount || 0), 0) / 100
    cardTotal = (posSalesToday || []).filter(s => s.payment_method === 'card').reduce((s, r) => s + Number(r.total_amount || 0), 0) / 100

    // Trending dishes from sale_items today
    const { data: todayItems } = await supabase
      .from('table_order_items')
      .select('name, quantity, order_id, table_orders!inner(company_id, opened_at)')
      .eq('table_orders.company_id', companyId)
      .gte('table_orders.opened_at', todayStart)

    const dishMap: Record<string, number> = {}
    for (const item of todayItems || []) {
      dishMap[item.name] = (dishMap[item.name] || 0) + (item.quantity || 1)
    }
    const dishColors = ['#5B21B6','#10B981','#F59E0B','#3B82F6']
    trendingDishes = Object.entries(dishMap)
      .sort((a,b) => b[1]-a[1])
      .slice(0, 5)
      .map(([name, orders], i) => ({ name, category: 'Ushqim', orders, color: dishColors[i % dishColors.length] }))

    // Waiter stats
    const { data: todayOrders } = await supabase
      .from('table_orders')
      .select('waiter_name, waiter_id')
      .eq('company_id', companyId)
      .eq('status', 'closed')
      .gte('closed_at', todayStart)

    const { data: todaySales, error: todaySalesErr } = await supabase
      .from('sales')
      .select('total_amount, operator_id, cashier_name, payment_method')
      .eq('company_id', companyId)
      .gte('issued_at', todayStart)

    console.log('DEBUG todaySales:', todaySales?.length, 'err:', todaySalesErr?.message, 'todayStart:', todayStart, 'companyId:', companyId)

    const { data: waitersData } = await supabase
      .from('pos_waiters')
      .select('id, name, color')
      .eq('company_id', companyId)
      .eq('is_active', true)

    waiters = waitersData || []
    const waiterColors = ['#9B5CF8','#3B82F6','#10B981','#F59E0B','#EC4899']
    console.log('DEBUG todaySales count:', todaySales?.length, 'sample:', JSON.stringify(todaySales?.[0]))
    console.log('DEBUG waiters:', waiters?.map((w:any) => w.name))
    waiterStats = (waiters || []).map((w: any, i: number) => {
      const wSales = (todaySales || []).filter((s: any) =>
        s.cashier_name === w.name ||
        s.operator_id  === w.name ||
        s.operator_name === w.name ||
        s.waiter_name === w.name
      )
      const wOrders = (todayOrders || []).filter((o: any) =>
        o.waiter_name === w.name || o.waiter_id === w.id
      )
      const earnings = wSales.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0) / 100
      const orders   = Math.max(wSales.length, wOrders.length)
      return { name: w.name, color: w.color || waiterColors[i % waiterColors.length], earnings, orders }
    }).sort((a: any, b: any) => b.earnings - a.earnings)
  }

  const isArka    = subscription?.plan === 'arka'
  const isHealth  = ['health'].includes(businessType || '')
  const isSalon   = ['salon','barber','beauty','spa','gym'].includes(businessType || '')
  const isMarketB = ['market','pharmacy'].includes(businessType || '')
  const isOther   = businessType === 'other'

  // ── ARKA — dashboard minimal ──────────────────────────────
  if (isArka) {
    const { default: ArkaDashboard } = await import('@/components/dashboard/business/arka-dashboard')
    return <ArkaDashboard
      userName={userData?.full_name}
      companyName={company?.name || ''}
      totalSalesToday={posTotalToday * 100}
      totalSalesMonth={posTotalMonth * 100}
      txCountToday={posTxCountToday}
    />
  }

  // ── SALON/SPA/GYM ────────────────────────────────────────
  if (isSalon) {
    const { default: SalonDashboard } = await import('@/components/dashboard/business/salon-dashboard')
    const s = { revenue: posTotalMonth*100, transactions: txCountMonth||0, expenses: monthlyExpenses, profit: Math.max(0,posTotalMonth*100-monthlyExpenses) }
    return <SalonDashboard stats={s} userName={userData?.full_name} businessType={businessType||'salon'} />
  }

  // ── MARKET/PHARMACY ───────────────────────────────────────
  if (isMarketB) {
    const { default: MarketDashboard } = await import('@/components/dashboard/business/market-dashboard')
    const s = { revenue: posTotalMonth*100, transactions: txCountMonth||0, expenses: monthlyExpenses, profit: Math.max(0,posTotalMonth*100-monthlyExpenses) }
    return <MarketDashboard stats={s} userName={userData?.full_name} businessType={businessType||'market'} />
  }

  // ── HEALTH/MJEK ───────────────────────────────────────────
  if (isHealth) {
    const { default: HealthDashboard } = await import('@/components/dashboard/business/health-dashboard')
    const statsForHealth = {
      revenue:      posTotalMonth * 100,
      transactions: txCountMonth || 0,
      expenses:     monthlyExpenses,
      profit:       Math.max(0, posTotalMonth * 100 - monthlyExpenses),
    }
    return <HealthDashboard stats={statsForHealth} userName={userData?.full_name} businessType={businessType || ''} />
  }

  // ── OTHER — dashboard i përgjithshëm ─────────────────────
  if (isOther) {
    const { default: OtherDashboard } = await import('@/components/dashboard/business/other-dashboard')
    const statsForOther = {
      revenue:      posTotalMonth * 100,
      transactions: txCountMonth || 0,
      expenses:     monthlyExpenses,
      profit:       Math.max(0, posTotalMonth * 100 - monthlyExpenses),
    }
    return <OtherDashboard stats={statsForOther} userName={userData?.full_name} />
  }

  // ── BAKERY — dashboard furrës ────────────────────────────
  if (isBakery) {
    return (
      <BakeryDashboard
        companyName={company?.name || ''}
        allSales={(allSales as any[]) || []}
        totalToday={posTotalToday}
        totalMonth={posTotalMonth}
        txCountToday={posTxCountToday}
        txCountMonth={txCountMonth || 0}
        trendingDishes={trendingDishes}
        cashTotal={cashTotal}
        cardTotal={cardTotal}
        expensesToday={monthlyExpenses / 30}
      />
    )
  }

  if (isRestaurant) {
    return (
      <RestaurantDashboard
        companyName={company?.name || ''}
        allSales={(allSales as any[]) || []}
        allWaiters={(waiters as any[]) || []}
        totalToday={posTotalToday}
        totalMonth={posTotalMonth}
        txCountToday={posTxCountToday}
        txCountMonth={txCountMonth || 0}
        hourlySales={[]}
        trendingDishes={trendingDishes}
        waiterStats={waiterStats}
        cashTotal={cashTotal}
        cardTotal={cardTotal}
        expensesToday={monthlyExpenses / 30}
      />
    )
  }

  return (
    <div>
      {/* ── POS ALERTS (stock, offline, failed) ── */}
      {company?.pos_enabled && <POSAlertsWidget />}

      {/* ── POS WIDGET (vetëm nëse pos_enabled) ── */}
      {company?.pos_enabled && (
        <POSDashboardWidget
          totalToday={posTotalToday}
          totalMonth={posTotalMonth}
          txCountToday={posTxCountToday}
          recentSales={(posSalesToday || []).slice(0, 5).map(s => ({
            receiptNumber: s.receipt_number,
            totalEUR:      s.total_amount / 100,
            paymentMethod: s.payment_method,
            issuedAt:      s.issued_at,
            status:        s.status,
          }))}
        />
      )}

      {/* ── DASHBOARD KRYESOR ── */}
      <DashboardClient
        user={userData}
        subscription={subscription}
        linkedAccountant={linkedAccountant}
        categoryConfig={categoryConfig}
        categoryDashboardConfig={categoryDashboardConfig}
        categoryLabel={categoryLabel}
        stats={{
          totalRevenue, monthlyRevenue, totalExpenses, monthlyExpenses,
          profit:       totalRevenue - totalExpenses,
          profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
          pendingAmount, overdueAmount,
          pendingCount: invoices?.filter(i => i.status === 'pending').length || 0,
          overdueCount: invoices?.filter(i => i.status === 'overdue').length || 0,
          totalInvoices: invoices?.length || 0,
          paidInvoices:  invoices?.filter(i => i.status === 'paid').length || 0,
        }}
        monthlyData={monthlyData}
        expenseByCategory={expenseByCategory}
        recentInvoices={recentInvoices || []}
        recentExpenses={recentExpenses || []}
      />
    </div>
  )
}
