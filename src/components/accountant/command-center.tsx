'use client'
// src/components/accountant/command-center.tsx
// NDRYSHIMI: interface ClientData stats + posSalesToday, posSalesMonth, hasPOS
// + POS badge brenda kartave klientësh

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import AccountantOnboarding from '@/components/onboarding/accountant-onboarding'
import MorningBriefing from '@/components/accountant/morning-briefing'
import {
  AlertTriangle, CheckCircle, Clock, Users, TrendingDown, TrendingUp,
  Eye, Plus, X, Activity, Calendar, FileWarning, Zap, ChevronRight,
  Shield, Target, BarChart2, Bell, Search, RefreshCw, Trash2,
  ShoppingBag   // ← E RE: POS icon
} from 'lucide-react'

interface Company { id: string; name: string; email?: string; phone?: string; city?: string }
interface TaxDeadline { type: string; label: string; daysLeft: number }

interface ClientData {
  id: string
  company: Company
  stats: {
    totalRevenue: number; totalExpenses: number; profit: number
    invoiceCount: number; overdueCount: number; overdueAmount: number
    pendingCount: number; thisMonthInvoices: number; prevMonthInvoices: number
    thisMonthExpenses: number; prevMonthExpenses: number
    revTrend: number; expTrend: number
    // ── E RE: POS ──
    posSalesToday?: number
    posSalesMonth?: number
    hasPOS?:        boolean
    posOfflineCount?:  number
    posOfflineUrgent?: number
    posFailedCount?:   number
  }
  health: number
  insights: string[]
  taxDeadlines: TaxDeadline[]
  lastActivity: string | null
  daysSinceActivity: number
  checklistPct: number
  checklistTotal: number
  pendingDocRequests: number
  portfolioStatus: 'ready' | 'attention' | 'overdue'
}

interface Props {
  accountantName: string
  clients: ClientData[]
  pendingInviteCount: number
  subscription: { max_clients: number; plan: string; status: string } | null
  maxClients: number
  hasInvoiced?: boolean
}

function HealthBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'
  const label = score >= 80 ? 'Mirë' : score >= 60 ? 'Kujdes' : 'Kritik'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}20`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color, fontFamily: 'Poppins,sans-serif' }}>
        {score}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
    </div>
  )
}

function PriorityDot({ level }: { level: 'critical' | 'warning' | 'info' }) {
  const c = level === 'critical' ? '#EF4444' : level === 'warning' ? '#F59E0B' : '#3B82F6'
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
}

// ── E RE: mini POS badge ──────────────────────────────────────
function POSBadge({ today, month, offlineUrgent, failed }: {
  today: number; month: number
  offlineUrgent?: number; failed?: number
}) {
  const hasAlert = (offlineUrgent ?? 0) > 0 || (failed ?? 0) > 0
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 8px', borderRadius: 7,
        background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.18)',
      }}>
        <ShoppingBag size={11} color="#10B981" />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981' }}>POS sot: €{today.toFixed(0)}</span>
        {month > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 4 }}>· Muaji: €{month.toFixed(0)}</span>
        )}
      </div>
      {hasAlert && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
          {(offlineUrgent ?? 0) > 0 && (
            <div style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', padding: '3px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              ! {offlineUrgent} kuponë offline urgjentë
            </div>
          )}
          {(failed ?? 0) > 0 && (
            <div style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', padding: '3px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              - {failed} shitje të dështuara sot
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AccountantCommandCenter({ accountantName, clients: initialClients, pendingInviteCount, subscription, maxClients, hasInvoiced = false }: Props) {
  const router = useRouter()
  const [clientsList, setClientsList] = useState(initialClients)
  const clients = clientsList
  const [search, setSearch] = useState('')
  const [addingClient, setAddingClient] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [activeTab, setActiveTab] = useState<'portfolio' | 'overview' | 'tasks' | 'health' | 'deadlines'>('portfolio')

  const fmt = (n: number) => `€${Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Mirëmëngjes' : hour < 17 ? 'Mirëdita' : 'Mirëmbrëma'

  const urgentTasks = useMemo(() => {
    const tasks: { priority: 'critical'|'warning'|'info'; client: string; clientId: string; issue: string; detail: string }[] = []

    clients.forEach(c => {
      const name = c.company.name

      if (c.stats.overdueCount > 0) tasks.push({
        priority: 'critical', client: name, clientId: c.company.id,
        issue: `${c.stats.overdueCount} fatura të vonuara`,
        detail: `Shuma totale: ${fmt(c.stats.overdueAmount)}`
      })

      if (c.daysSinceActivity > 45 && c.stats.invoiceCount > 0) tasks.push({
        priority: 'critical', client: name, clientId: c.company.id,
        issue: 'Inaktivitet i gjatë',
        detail: `Asnjë aktivitet prej ${c.daysSinceActivity} ditësh`
      })

      c.taxDeadlines.forEach(d => {
        tasks.push({
          priority: d.daysLeft <= 7 ? 'critical' : 'warning',
          client: name, clientId: c.company.id,
          issue: `Afat tatimor: ${d.type}`,
          detail: `${d.label} — ${d.daysLeft} ditë mbetën`
        })
      })

      if (c.stats.revTrend <= -25) tasks.push({
        priority: 'warning', client: name, clientId: c.company.id,
        issue: 'Rënie e xhirosë',
        detail: `Xhiroja ra ${Math.abs(c.stats.revTrend)}% krahasuar me muajin e kaluar`
      })

      if (c.stats.thisMonthInvoices === 0 && c.stats.invoiceCount > 0 && now.getDate() > 10) tasks.push({
        priority: 'warning', client: name, clientId: c.company.id,
        issue: 'Asnjë faturë këtë muaj',
        detail: `Muajin e kaluar kishte ${c.stats.prevMonthInvoices} fatura`
      })

      if (c.stats.thisMonthExpenses === 0 && c.stats.prevMonthExpenses > 2) tasks.push({
        priority: 'warning', client: name, clientId: c.company.id,
        issue: 'Asnjë shpenzim këtë muaj',
        detail: `Muajin e kaluar kishte ${c.stats.prevMonthExpenses} shpenzime`
      })

      if (c.stats.expTrend >= 50) tasks.push({
        priority: 'warning', client: name, clientId: c.company.id,
        issue: 'Rritje e shpenzimeve',
        detail: `Shpenzimet u rritën ${c.stats.expTrend}% krahasuar me muajin e kaluar`
      })

      // ── POS probleme ──────────────────────────────────────
      if ((c.stats.posOfflineUrgent ?? 0) > 0) tasks.push({
        priority: 'critical', client: name, clientId: c.company.id,
        issue: `${c.stats.posOfflineUrgent} kuponë POS offline URGJENTË`,
        detail: 'Afati 48h (UA 01/2026) po kalon — duhet sinkronizim'
      })

      if ((c.stats.posOfflineCount ?? 0) > 0 && (c.stats.posOfflineUrgent ?? 0) === 0) tasks.push({
        priority: 'warning', client: name, clientId: c.company.id,
        issue: `${c.stats.posOfflineCount} kuponë POS offline`,
        detail: 'Do të dërgohen automatikisht kur kthehet interneti'
      })

      if ((c.stats.posFailedCount ?? 0) > 0) tasks.push({
        priority: 'critical', client: name, clientId: c.company.id,
        issue: `${c.stats.posFailedCount} shitje POS të dështuara sot`,
        detail: 'Fiskalizimi dështoi — duhet ndërhyrje manuale'
      })
    })

    return tasks.sort((a, b) => {
      const p = { critical: 0, warning: 1, info: 2 }
      return p[a.priority] - p[b.priority]
    })
  }, [clients])

  const critical      = urgentTasks.filter(t => t.priority === 'critical').length
  const warnings      = urgentTasks.filter(t => t.priority === 'warning').length
  const healthy       = clients.filter(c => c.health >= 80).length
  const allDeadlines  = clients.flatMap(c => c.taxDeadlines.map(d => ({ ...d, clientName: c.company.name, clientId: c.company.id }))).sort((a, b) => a.daysLeft - b.daysLeft)

  // ── E RE: total POS sot i klientëve ──
  const totalPOSToday = clients.reduce((s, c) => s + (c.stats.hasPOS ? (c.stats.posSalesToday ?? 0) : 0), 0)

  const filtered = clients.filter(c => !search || c.company.name.toLowerCase().includes(search.toLowerCase()))

  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  async function removeClient(companyId: string) {
    setRemoving(true)
    try {
      const res = await fetch('/api/accountant/clients', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success('Klienti u hoq nga lista')
      setConfirmRemoveId(null)
      setClientsList(prev => prev.filter(c => c.id !== companyId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally {
      setRemoving(false)
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    if (clients.length >= (maxClients === -1 ? Infinity : maxClients)) {
      toast.error(`Ke arritur limitin e ${maxClients} klientëve`)
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/accountant/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(d.message || 'Ftesa u dërgua!')
      setInviteEmail(''); setAddingClient(false); router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally { setAdding(false) }
  }

  const tabBtn = (id: typeof activeTab, label: string, count?: number) => (
    <button onClick={() => setActiveTab(id)}
      style={{
        padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        border: 'none', transition: 'all 0.15s',
        background: activeTab === id ? 'var(--purple)' : 'var(--bg-muted)',
        color: activeTab === id ? 'white' : 'var(--text-2)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
      {label}
      {count !== undefined && count > 0 && (
        <span style={{ background: activeTab === id ? 'var(--bg-muted)' : 'var(--purple)', color:'var(--text-1)', borderRadius: 20, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>{count}</span>
      )}
    </button>
  )

  return (
    <div className="page-enter space-y-5">

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#5A1FD6,#9B5CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} color="white" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 800, color:'var(--text-1)', lineHeight: 1.2 }}>
                {greeting}, {accountantName.split(' ')[0]}
              </h1>
              <p style={{ fontSize: 12, color:'var(--text-3)' }}>
                Accountant Command Center · <span suppressHydrationWarning>{now.toLocaleDateString('sq-AL', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.refresh()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', fontWeight: 500 }}>
            <RefreshCw size={13} /> Rifresko
          </button>
          {clients.length < (maxClients === -1 ? 9999 : maxClients) && (
            <button onClick={() => setAddingClient(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'var(--purple)', border: 'none', fontSize: 12, color:'white', cursor: 'pointer', fontWeight: 600 }}>
              <Plus size={13} /> Shto Klient
            </button>
          )}
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: totalPOSToday > 0 ? 'repeat(5,1fr)' : 'repeat(4,1fr)', gap: 10 }} className="kpi-grid">
        {[
          { label: 'Klientë Aktivë',      value: clients.length, sub: `Max: ${maxClients === -1 ? '∞' : maxClients}`, icon: Users,         color: '#7B2CF5' },
          { label: 'Probleme Kritike',     value: critical,       sub: 'Kërkojnë veprim tani',  icon: AlertTriangle,   color: '#EF4444' },
          { label: 'Paralajmërime',        value: warnings,       sub: 'Kërkojnë vëmendje',      icon: Bell,            color: '#F59E0B' },
          { label: 'Klientë Shëndetshëm', value: healthy,        sub: 'Score ≥ 80',             icon: CheckCircle,     color: '#10B981' },
          // ── E RE: POS sot (shfaqet vetëm nëse ka klientë POS) ──
          ...(totalPOSToday > 0 ? [{ label: 'POS Sot', value: `€${totalPOSToday.toFixed(0)}`, sub: 'Shitje fiskale live', icon: ShoppingBag, color: '#10B981', isString: true }] : []),
        ].map((k, i) => {
          const Icon = k.icon
          return (
            <div key={i} className="kpi-card" style={{ borderTop: `3px solid ${k.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} style={{ color: k.color }} />
                </div>
                {i === 1 && critical > 0 && <span style={{ fontSize: 10, background: k.color, color:'var(--text-1)', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>URGJENT</span>}
              </div>
              <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginTop: 4 }}>{k.label}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{k.sub}</p>
            </div>
          )
        })}
      </div>

      {/* ONBOARDING */}
      <AccountantOnboarding
        clientCount={clients.length}
        pendingInviteCount={pendingInviteCount}
        hasInvoiced={hasInvoiced}
        onAddClient={() => setAddingClient(true)}
      />

      {/* MORNING BRIEFING */}
      {clients.length > 0 && <MorningBriefing />}

      {/* TABS */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tabBtn('portfolio', '📊 Portofoli')}
        {tabBtn('overview', '📋 Sot', urgentTasks.length)}
        {tabBtn('tasks', '⚡ Detyrat Urgjente', critical + warnings)}
        {tabBtn('health', '💚 Shëndeti')}
        {tabBtn('deadlines', '📅 Afatet', allDeadlines.length)}
      </div>

      {/* ═══ TAB: PORTOFOLI ═══ */}
      {activeTab === 'portfolio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {(['overdue', 'attention', 'ready'] as const).map(statusKey => {
            const group = clients.filter(c => c.portfolioStatus === statusKey)
            if (group.length === 0) return null
            const meta = {
              overdue:   { label: '🔴 Vonë — Veprim i Menjëhershëm', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', icon: AlertTriangle },
              attention: { label: '🟡 Kërkon Vëmendje', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', icon: Bell },
              ready:     { label: '✅ Gati — Asgjë për T\'u Bërë', color: '#10B981', bg: 'rgba(16,185,129,0.08)', icon: CheckCircle },
            }[statusKey]

            return (
              <div key={statusKey}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>
                    {meta.label} ({group.length})
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                  {group.map(c => (
                    <div key={c.id} onClick={() => router.push(`/accountant/clients/${c.company.id}`)}
                      style={{
                        cursor: 'pointer', borderRadius: 14, padding: 14, background: meta.bg,
                        border: `1px solid ${meta.color}30`, transition: 'transform 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)' }}>{c.company.name}</p>
                        <HealthBadge score={c.health} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {c.stats.overdueCount > 0 && (
                          <p style={{ fontSize: 11, color: '#EF4444' }}>● {c.stats.overdueCount} fatura të vonuara (€{c.stats.overdueAmount.toFixed(0)})</p>
                        )}
                        {c.pendingDocRequests > 0 && (
                          <p style={{ fontSize: 11, color: '#F59E0B' }}>● {c.pendingDocRequests} dokument{c.pendingDocRequests > 1 ? 'e' : ''} në pritje</p>
                        )}
                        {c.checklistTotal > 0 && c.checklistPct < 100 && (
                          <p style={{ fontSize: 11, color: '#F59E0B' }}>● Checklist {c.checklistPct}% i kryer</p>
                        )}
                        {c.daysSinceActivity > 45 && (
                          <p style={{ fontSize: 11, color: '#EF4444' }}>● Asnjë aktivitet prej {c.daysSinceActivity} ditësh</p>
                        )}
                        {statusKey === 'ready' && (
                          <p style={{ fontSize: 11, color: '#10B981' }}>● Checklist {c.checklistTotal > 0 ? `${c.checklistPct}% i kryer` : 'gati'} · Pa probleme</p>
                        )}
                      </div>
                      {c.stats.hasPOS && (
                        <POSBadge
                          today={c.stats.posSalesToday ?? 0}
                          month={c.stats.posSalesMonth ?? 0}
                          offlineUrgent={c.stats.posOfflineUrgent}
                          failed={c.stats.posFailedCount}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {clients.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: 40 }}>
              Nuk ke klientë ende. Shto klientin e parë për të parë portofolin tënd këtu.
            </p>
          )}
        </div>
      )}

      {/* ═══ TAB: OVERVIEW (sot) ═══ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="invoice-grid">
          <div className="finex-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} style={{ color: '#EF4444' }} />
              <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
                Veprime Sot
              </h3>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {urgentTasks.slice(0, 8).map((t, i) => (
                <div key={i} onClick={() => router.push(`/accountant/clients/${t.clientId}`)}
                  style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 10, background: 'var(--bg-muted)', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-muted)' }}>
                  <PriorityDot level={t.priority} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>{t.client}</p>
                    <p style={{ fontSize: 11, color: t.priority === 'critical' ? '#EF4444' : '#F59E0B', fontWeight: 600 }}>{t.issue}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.detail}</p>
                  </div>
                  <ChevronRight size={13} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 2 }} />
                </div>
              ))}
              {urgentTasks.length === 0 && (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <CheckCircle size={28} style={{ color: '#10B981', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Asnjë veprim urgjent sot</p>
                </div>
              )}
            </div>
          </div>

          <div className="finex-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} style={{ color: '#9B5CF8' }} />
              <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
                Aktiviteti i Klientëve
              </h3>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {clients.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Nuk ke klientë ende</p>
                </div>
              ) : clients.map((c, i) => (
                <div key={i} onClick={() => router.push(`/accountant/clients/${c.company.id}`)}
                  style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-muted)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--purple-bg)', border: '1px solid var(--border-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--purple-light)' }}>
                      {c.company.name.charAt(0)}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.company.name}
                      </p>
                      <HealthBadge score={c.health} />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {c.lastActivity
                        ? `Aktiv ${c.daysSinceActivity === 0 ? 'sot' : `${c.daysSinceActivity} ditë më parë`}`
                        : 'Asnjë aktivitet'}
                    </p>
                    {/* POS sot */}
                    {c.stats.hasPOS && (c.stats.posSalesToday ?? 0) > 0 && (
                      <p style={{ fontSize: 10, color: '#10B981', marginTop: 2 }}>
                        POS sot: €{(c.stats.posSalesToday ?? 0).toFixed(0)}
                      </p>
                    )}
                    {(c.stats.posOfflineUrgent ?? 0) > 0 && (
                      <p style={{ fontSize: 10, color: '#EF4444', marginTop: 2, fontWeight: 700 }}>
                        ! {c.stats.posOfflineUrgent} kuponë offline URGJENTË
                      </p>
                    )}
                    {(c.stats.posFailedCount ?? 0) > 0 && (
                      <p style={{ fontSize: 10, color: '#EF4444', marginTop: 2, fontWeight: 700 }}>
                        - {c.stats.posFailedCount} shitje të dështuara
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: DETYRAT URGJENTE ═══ */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {urgentTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <CheckCircle size={40} style={{ color: '#10B981', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Asnjë detyrë urgjente!</p>
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Të gjithë klientët janë në rregull.</p>
            </div>
          ) : urgentTasks.map((t, i) => (
            <div key={i} onClick={() => router.push(`/accountant/clients/${t.clientId}`)}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '12px 14px', borderRadius: 12,
                background: t.priority === 'critical' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                border: `1px solid ${t.priority === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                cursor: 'pointer', transition: 'all 0.12s',
              }}>
              <PriorityDot level={t.priority} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color:'white' }}>{t.client}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: t.priority === 'critical' ? '#EF444420' : '#F59E0B20', color: t.priority === 'critical' ? '#EF4444' : '#F59E0B' }}>
                    {t.priority === 'critical' ? 'KRITIK' : 'KUJDES'}
                  </span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color:'white', marginBottom: 2 }}>{t.issue}</p>
                <p style={{ fontSize: 12, color:'white' }}>{t.detail}</p>
              </div>
              <ChevronRight size={14} style={{ color:'white', flexShrink: 0, marginTop: 2 }} />
            </div>
          ))}
        </div>
      )}

      {/* ═══ TAB: SHËNDETI ═══ */}
      {activeTab === 'health' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {clients.sort((a, b) => a.health - b.health).map(c => (
            <div key={c.id} onClick={() => router.push(`/accountant/clients/${c.company.id}`)}
              style={{ padding: 14, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'transform 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.company.name}
                </p>
                <HealthBadge score={c.health} />
              </div>
              {c.insights.slice(0, 2).map((insight, i) => (
                <p key={i} style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>• {insight}</p>
              ))}
              {c.stats.hasPOS && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#10B981' }}>
                  POS: €{(c.stats.posSalesMonth ?? 0).toFixed(0)} këtë muaj
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ TAB: AFATET ═══ */}
      {activeTab === 'deadlines' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allDeadlines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
              <Calendar size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>Asnjë afat tatimor brenda 45 ditëve</p>
            </div>
          ) : allDeadlines.map((d, i) => {
            const urgent  = d.daysLeft <= 7
            const warning = d.daysLeft <= 15
            const col     = urgent ? '#EF4444' : warning ? '#F59E0B' : '#3B82F6'
            return (
              <div key={i} onClick={() => router.push(`/accountant/clients/${d.clientId}`)}
                style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: `1px solid ${urgent ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`, cursor: 'pointer' }}>
                <div style={{ minWidth: 42, height: 42, borderRadius: 10, background: `${col}15`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: col, lineHeight: 1, fontFamily: 'Poppins,sans-serif' }}>{d.daysLeft}</span>
                  <span style={{ fontSize: 8, color: col, fontWeight: 600 }}>ditë</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{d.clientName}</p>
                  <p style={{ fontSize: 12, color: col, fontWeight: 600 }}>{d.type} — {d.label}</p>
                </div>
                {urgent && <span style={{ fontSize: 10, fontWeight: 700, background: '#EF444420', color: '#EF4444', padding: '2px 8px', borderRadius: 20 }}>URGJENT</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* ── CONFIRM REMOVE MODAL ── */}
      {confirmRemoveId && (
        <>
          <div onClick={() => !removing && setConfirmRemoveId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, width: 'min(400px,92vw)', zIndex: 100, boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Hiq klientin?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.5 }}>
              Klienti do të hiqet nga lista jote. Të dhënat e tij nuk do të fshihen.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmRemoveId(null)} className="finex-button-secondary" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
                Anulo
              </button>
              <button onClick={() => removeClient(confirmRemoveId)} disabled={removing}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: '#EF4444', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {removing ? '...' : <><Trash2 size={13} /> Hiq</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── ADD CLIENT MODAL ── */}
      {addingClient && (
        <>
          <div onClick={() => setAddingClient(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, width: 'min(420px,92vw)', zIndex: 100, boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 700 }}>Shto Klient të Ri</h3>
              <button onClick={() => setAddingClient(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.5 }}>
              Fut email-in e biznesit. Ata do të marrin një ftesë për t'u lidhur me llogarinë tënde.
            </p>
            <div style={{ display: 'relative', marginBottom: 14 }}>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendInvite()}
                placeholder="biznes@example.com"
                type="email"
                className="finex-input"
                style={{ marginBottom: 12 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setAddingClient(false)} className="finex-button-secondary" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
                Anulo
              </button>
              <button onClick={sendInvite} disabled={adding || !inviteEmail.trim()}
                className="finex-button-primary" style={{ flex: 1, padding: '10px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {adding ? '...' : <><Plus size={13} /> Dërgo Ftesën</>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
