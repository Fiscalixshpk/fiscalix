'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, FileText,
  ArrowUpRight, ArrowDownRight, Sparkles, Eye, Bell, X
} from 'lucide-react'
import { formatCurrency, formatDate, formatDateLongSq } from '@/lib/utils'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const CategoryInsights = dynamic(() => import('@/components/dashboard/category-insights'), { ssr: false })
import CategoryDashboard from '@/components/dashboard/category-dashboard'

interface Props {
  stats: { totalRevenue: number; totalExpenses: number; profit: number; profitMargin: number; pendingAmount?: number; overdueAmount?: number; pendingCount?: number; overdueCount?: number; totalInvoices?: number; paidInvoices?: number; monthlyRevenue?: number; monthlyExpenses?: number }
  monthlyData: { month: string; revenue: number; expenses: number }[]
  recentInvoices: { id: string; invoice_number: string; client_name: string; total_amount: number; status: string; due_date: string }[]
  recentExpenses: { id: string; description: string; amount: number; category_name: string; expense_date: string }[]
  subscription: { plan: string } | null
  linkedAccountant?: { name: string; email: string } | null
  user?: { full_name?: string } | null
  expenseByCategory?: { name: string; amount: number; color: string }[]
  businessType?: string | null
  categoryConfig?: import('@/lib/category-config').CategoryConfig | null
  categoryDashboardConfig?: import('@/lib/category-dashboard').CategoryDashboardConfig | null
  categoryLabel?: string | null
}

const STATUS_COLOR: Record<string, string> = {
  paid: 'text-emerald-600 bg-emerald-500/10',
  pending: 'text-amber-400 bg-amber-500/10',
  overdue: 'text-red-400 bg-red-500/10',
  draft: 'style={{ color: "var(--text-3)" }} bg-zinc-500/10',
}
const STATUS_AL: Record<string, string> = {
  paid: 'Paguar', pending: 'Në pritje', overdue: 'Vonuar', draft: 'Draft'
}

const COLORS = ['#8b5cf6', '#60a5fa', '#34d399', '#f59e0b', '#f87171']

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 14px rgba(0,0,0,0.08)" }}>
      <p style={{ color: "#9CA3AF", fontWeight: 600, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.name === "revenue" ? "#8b5cf6" : "#f87171", flexShrink: 0 }} />
          <span style={{ color: "#9CA3AF" }}>{p.name === "revenue" ? "Të Ardhura" : "Shpenzime"}:</span>
          <span style={{ color: "var(--text-1)", fontWeight: 700 }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardClient({ stats, monthlyData, recentInvoices, recentExpenses, subscription, linkedAccountant, user, expenseByCategory, businessType, categoryConfig, categoryDashboardConfig, categoryLabel }: Props) {
  // Safety defaults to prevent crashes
  stats = stats || { totalRevenue: 0, totalExpenses: 0, profit: 0, profitMargin: 0 }
  monthlyData = monthlyData || []
  recentInvoices = recentInvoices || []
  recentExpenses = recentExpenses || []
  const [chartType, setChartType] = useState<'area' | 'bar'>('area')
  const plan = subscription?.plan || 'basic'
  const planLabel: Record<string, string> = { arka:'Arka', basic:'Basic', pro:'Pro', business:'Business', accountant:'Kontabilist', premium:'Pro', advanced:'Business', enterprise:'Business' }
  const planName = planLabel[plan] || plan

  // Njoftime nga kontabilisti
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; type: string; is_read: boolean; created_at: string }[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadNotifs() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(5)
        if (data) setNotifications(data)
      } catch {}
    }
    loadNotifs()
  }, [])

  async function dismissNotif(id: string) {
    setDismissedIds(prev => new Set([...prev, id]))
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', authUser.id)
    } catch {}
  }

  const visibleNotifs = notifications.filter(n => !dismissedIds.has(n.id))

  const pieData = [
    { name: 'Të ardhura', value: stats.totalRevenue },
    { name: 'Shpenzime', value: stats.totalExpenses },
  ]

  const kpis = [
    {
      label: 'Të ardhura totale',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      trend: '+12.5%',
      up: true,
      color: 'purple',
      bg: 'from-purple-500/10 to-transparent',
      iconBg: 'bg-purple-500/15 text-purple-400',
    },
    {
      label: 'Shpenzime totale',
      value: formatCurrency(stats.totalExpenses),
      icon: TrendingDown,
      trend: '-3.2%',
      up: false,
      color: 'rose',
      bg: 'from-rose-500/10 to-transparent',
      iconBg: 'bg-rose-500/15 text-rose-600',
    },
    {
      label: 'Fitimi neto',
      value: formatCurrency(stats.profit),
      icon: TrendingUp,
      trend: '+8.1%',
      up: true,
      color: 'emerald',
      bg: 'from-emerald-500/10 to-transparent',
      iconBg: 'bg-emerald-500/15 text-emerald-600',
    },
    {
      label: 'Marzhi i fitimit',
      value: `${(stats.profitMargin ?? 0).toFixed(1)}%`,
      icon: ArrowUpRight,
      trend: '+2.4%',
      up: true,
      color: 'blue',
      bg: 'from-blue-500/10 to-transparent',
      iconBg: 'bg-blue-500/15 text-blue-400',
    },
  ]

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {formatDateLongSq()}
          </p>
        </div>
      </div>

      {/* Njoftime nga kontabilisti */}
      {visibleNotifs.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {visibleNotifs.map(notif => (
            <div key={notif.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', borderRadius:12, background:'#7C3AED', border:'1px solid rgba(124,58,237,.5)' }}>
              <Bell size={15} style={{ color:'#fff', flexShrink:0, marginTop:1 }}/>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:2 }}>{notif.title}</p>
                <p style={{ fontSize:12, color:'rgba(255,255,255,.8)', lineHeight:1.5 }}>{notif.message}</p>
              </div>
              <button onClick={() => dismissNotif(notif.id)}
                style={{ padding:4, borderRadius:6, border:'none', background:'rgba(255,255,255,.15)', cursor:'pointer', color:'#fff', flexShrink:0 }}>
                <X size={14}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Welcome state — kur biznesi është i ri */}
      {stats.totalRevenue === 0 && recentInvoices.length === 0 && (
        <div style={{ background:'var(--purple-bg)', border:'1px solid var(--border-purple)', borderRadius:18, padding:'28px 32px', marginBottom:8 }}>
          <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:800, color:'var(--text-1)', marginBottom:6 }}>
            Mirë se vini te Fiscalix!
          </h2>
          <p style={{ fontSize:14, color:'var(--text-2)', marginBottom:24, lineHeight:1.6 }}>
            Filloni duke krijuar faturën e parë ose duke shtuar shpenzimin e parë.
          </p>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <Link href="/invoices/new"
              style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:12, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontWeight:700, fontSize:14, textDecoration:'none' }}>
              <FileText size={15}/> Krijo Faturën e Parë
            </Link>
            <Link href="/expenses/new"
              style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-1)', fontWeight:600, fontSize:14, textDecoration:'none' }}>
              <TrendingDown size={15}/> Shto Shpenzim
            </Link>
          </div>
        </div>
      )}

      {/* Kontabilisti i lidhur */}
      {linkedAccountant && (
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderRadius:14, background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#10B981,#059669)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Poppins,sans-serif', fontWeight:800, fontSize:16, color:'white', flexShrink:0 }}>
            {linkedAccountant.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:1 }}>Kontabilisti juaj: {linkedAccountant.name}</p>
            <p style={{ fontSize:12, color:'var(--text-1)' }}>{linkedAccountant.email}</p>
          </div>
          <Link href="/accountant-chat"
            style={{ padding:'7px 14px', borderRadius:9, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', color:'var(--text-1)', fontSize:12, fontWeight:700, textDecoration:'none' }}>
            Dërgoji mesazh
          </Link>
        </div>
      )}

      {/* Alert fatura të vonuara */}
      {(stats.overdueCount || 0) > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', borderRadius:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
          <TrendingDown size={16} style={{ color:'var(--text-1)', flexShrink:0 }}/>
          <p style={{ fontSize:13, color:'var(--text-1)', fontWeight:600, flex:1 }}>
            Ke {stats.overdueCount} fatura të vonuara — totali €{(stats.overdueAmount || 0).toFixed(0)}
          </p>
          <Link href="/invoices?status=overdue"
            style={{ fontSize:12, fontWeight:700, color:'var(--text-1)', textDecoration:'none', padding:'5px 12px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)' }}>
            Shiko
          </Link>
        </div>
      )}

      {/* Category-specific dashboard */}
      {categoryDashboardConfig && (
        <CategoryDashboard
          config={categoryDashboardConfig}
          businessType={businessType}
          stats={{
            totalRevenue: stats.totalRevenue,
            totalExpenses: stats.totalExpenses,
            profit: stats.profit,
            pendingAmount: stats.pendingAmount || 0,
            totalInvoices: stats.totalInvoices || 0,
            monthlyRevenue: stats.monthlyRevenue || 0,
            monthlyExpenses: stats.monthlyExpenses || 0,
            pendingCount: stats.pendingCount || 0,
            overdueCount: stats.overdueCount || 0,
          }}
          userName={user?.full_name || undefined}
        />
      )}

      {/* KPI Cards — shown only when no category */}
      {!categoryDashboardConfig && (<></> )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k, i) => {
          const Icon = k.icon
          return (
            <div key={i} className="kpi-card">
              <div className={`absolute inset-0 bg-gradient-to-br ${k.bg} rounded-2xl pointer-events-none`} />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.iconBg}`}>
                    <Icon size={18} />
                  </div>
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${k.up ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {k.up ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>}
                    {k.trend}
                  </span>
                </div>
                <p className="text-2xl font-bold tracking-tight">{k.value}</p>
                <p className="text-muted-foreground text-xs mt-1">{k.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Category Insights */}
      {categoryConfig && categoryLabel && (
        <CategoryInsights config={categoryConfig} businessType={categoryLabel} />
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Main Chart */}
        <div className="xl:col-span-2 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold">Performanca Financiare</h3>
              <p className="text-xs text-muted-foreground mt-0.5">6 muajt e fundit</p>
            </div>
            <div className="flex gap-1 bg-[var(--bg-input)] rounded-lg p-1">
              {(['area', 'bar'] as const).map(t => (
                <button key={t} onClick={() => setChartType(t)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${chartType === t ? 'bg-[var(--bg-muted)] text-[var(--text-1)]' : 'text-muted-foreground hover:text-[var(--text-1)]'}`}>
                  {t === 'area' ? 'Area' : 'Bar'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {chartType === 'area' ? (
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-muted)" />
                <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fill="url(#rev)" />
                <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} fill="url(#exp)" />
              </AreaChart>
            ) : (
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-muted)" />
                <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[4,4,0,0]} />
                <Bar dataKey="expenses" fill="#f87171" radius={[4,4,0,0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 justify-center">
            {[['#8b5cf6','Të ardhura'], ['#f87171','Shpenzime']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-3 h-1 rounded-full" style={{background:c}}/>
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-1">Shpërndarja</h3>
          <p className="text-xs text-muted-foreground mb-4">Të ardhura vs Shpenzime</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                paddingAngle={3} dataKey="value" strokeWidth={0}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--bg-muted)", border: "1px solid rgba(123,44,245,0.3)", borderRadius: 8, color: "var(--text-1)" }}
                itemStyle={{ color: "var(--text-1)" }}
                formatter={(v: number) => formatCurrency(v)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{background: COLORS[i]}}/>
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent rows */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Invoices */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-purple-400" />
              <h3 className="font-semibold text-sm">Faturat e fundit</h3>
            </div>
            <Link href="/invoices" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              Të gjitha <Eye size={12}/>
            </Link>
          </div>
          <div className="divide-y divide-white/4">
            {recentInvoices.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">Nuk ka fatura akoma</p>
            ) : recentInvoices.slice(0, 5).map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-input)] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <FileText size={14} className="text-purple-400"/>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{inv.client_name}</p>
                    <p className="text-xs text-muted-foreground">{inv.invoice_number}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency((inv.total_amount ?? inv.total))}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[inv.status] || ' bg-zinc-500/10'}`}>
                    {STATUS_AL[inv.status] || inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <TrendingDown size={16} className="text-rose-600" />
              <h3 className="font-semibold text-sm">Shpenzimet e fundit</h3>
            </div>
            <Link href="/expenses" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              Të gjitha <Eye size={12}/>
            </Link>
          </div>
          <div className="divide-y divide-white/4">
            {recentExpenses.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">Nuk ka shpenzime akoma</p>
            ) : recentExpenses.slice(0, 5).map(exp => (
              <div key={exp.id} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-input)] transition-colors">
                <div>
                  <p className="text-sm font-medium">{exp.description}</p>
                  <p className="text-xs text-muted-foreground">{exp.category_name || 'Pa kategori'} · {formatDate(exp.expense_date)}</p>
                </div>
                <p className="text-sm font-semibold text-rose-600">-{formatCurrency(exp.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
