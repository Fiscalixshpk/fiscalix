'use client'
// src/components/layouts/sidebar.tsx
// NDRYSHIMI: shtohet POS nav item për bizneset me pos_enabled
// Shto prop posEnabled te Props, dhe importo ShoppingBag

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { RESTAURANT_TYPES, BAKERY_TYPES, SALON_TYPES, HEALTH_TYPES } from '@/lib/business-categories'
import {
  LayoutDashboard, FileText, Receipt, RefreshCw,
  Link2,
  Settings, Shield, ChevronLeft, ChevronRight, Crown, LogOut,
  Calendar, BarChart3, Landmark, BookMarked,
  ShoppingCart, Users2, ChevronDown, Download, Building2, Zap,
  AlertTriangle, Clock, FolderOpen, FileSpreadsheet, TrendingUp, MessageSquare,
  UserPlus as UserPlus2, Store, Wallet, ClipboardList, Scale, Award, Hotel,
  Palette, Search, BookOpen, Activity, Truck, Package, Wrench, Code2,
  ShoppingBag, Sun, Moon, BarChart2, History, FileSignature, Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Client {
  id: string
  company: { id: string; name: string } | null
}

interface Props {
  user: { full_name: string; email: string; role: string; company_id?: string }
  subscription: { plan: string; status: string; current_period_end?: string | null; trial_ends_at?: string | null; is_trial?: boolean } | null
  accountantClients?: Client[]
  linkedAccountant?: { name: string } | null
  pendingInvitesCount?: number
  businessType?: string | null
  posEnabled?: boolean   // ← E RE
}

const PLAN_COLORS: Record<string, string> = {
  arka: '#06B6D4', basic: '#10B981', pro: '#2563EB', business: '#7C3AED', accountant: '#F59E0B',
  // legacy
  premium: '#2563EB', advanced: '#7C3AED', enterprise: '#7C3AED'
}

function getATKDeadlines() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const MONTHS = ['Jan','Shk','Mar','Pri','Maj','Qer','Kor','Gus','Sht','Tet','Nën','Dhj']
  const deadlines = [
    { label: 'TVSH T1', date: new Date(y, 3, 15),   type: 'TVSH',    color: '#3B82F6' },
    { label: 'TVSH T2', date: new Date(y, 6, 15),   type: 'TVSH',    color: '#3B82F6' },
    { label: 'TVSH T3', date: new Date(y, 9, 15),   type: 'TVSH',    color: '#3B82F6' },
    { label: 'TVSH T4', date: new Date(y+1, 0, 15), type: 'TVSH',    color: '#3B82F6' },
    { label: `Pension ${MONTHS[m]}`,       date: new Date(y, m+1, 15), type: 'Pension', color: '#F59E0B' },
    { label: `Pension ${MONTHS[(m+1)%12]}`,date: new Date(y, m+2, 15), type: 'Pension', color: '#F59E0B' },
    { label: 'TAK/TAP Vjetor',             date: new Date(y+1, 2, 31), type: 'TAK',     color: '#9B5CF8' },
    { label: 'TAP T1', date: new Date(y, 3, 15),    type: 'TAP',     color: '#10B981' },
    { label: 'TAP T2', date: new Date(y, 6, 15),    type: 'TAP',     color: '#10B981' },
    { label: 'TAP T3', date: new Date(y, 9, 15),    type: 'TAP',     color: '#10B981' },
  ]
  return deadlines
    .map(d => ({ ...d, daysLeft: Math.ceil((d.date.getTime() - now.getTime()) / 86400000) }))
    .filter(d => d.daysLeft >= 0 && d.daysLeft <= 45)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5)
}

type NavGroup = {
  label?: string
  items: { href: string; label: string; icon: React.ElementType; premium?: boolean; advanced?: boolean; color?: string }[]
}

export default function Sidebar({
  user, subscription, accountantClients = [], linkedAccountant = null,
  pendingInvitesCount = 0, businessType = null, posEnabled = false,
}: Props) {
  const pathname = usePathname()

  const QUOTES_CATS = ['construction', 'agency', 'it', 'import_export', 'services', 'market', 'pharmacy', 'other', 'b2b']
  const showQuotes = QUOTES_CATS.includes(businessType||'')

  const isB2B        = businessType === 'b2b'
  const isRestaurant = RESTAURANT_TYPES.includes(businessType || '')
  const isBakery     = BAKERY_TYPES.includes(businessType || '')
  const isSalon      = SALON_TYPES.includes(businessType || '')
  const isHealth     = HEALTH_TYPES.includes(businessType || '')


  const [collapsed,       setCollapsed]       = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [currentMonth,    setCurrentMonth]    = useState(0)
  const [clientsOpen,     setClientsOpen]     = useState(true)
  const [clientSearch,    setClientSearch]    = useState('')
  const [clientShowAll,   setClientShowAll]   = useState(false)
  const [deadlinesOpen,   setDeadlinesOpen]   = useState(true)
  const [toolsOpen,       setToolsOpen]       = useState(false)
  const [expandedClient,  setExpandedClient]  = useState<string | null>(null)
  const [downloadingId,   setDownloadingId]   = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { setCurrentMonth(new Date().getMonth()) }, [])

  const PLAN_LABELS: Record<string, string> = {
    arka: 'Arka', basic: 'Basic', pro: 'Pro', business: 'Business', accountant: 'Kontabilist',
    premium: 'Pro', advanced: 'Business', enterprise: 'Business',
  }

  const plan = subscription?.plan || 'basic'

  const isArka = plan === 'arka'


  const navGroups: NavGroup[] = isArka ? [
    // Arka plan — vetëm essentials
    { items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
    {
      label: 'Arka Fiskale',
      items: [
        { href: '/pos',          label: 'Lësho Kupon',    icon: Receipt   },
        { href: '/pos/history',  label: 'Historia',        icon: History   },
        { href: '/pos/reports',  label: 'Raportet',        icon: BarChart2 },
      ],
    },
    {
      label: 'Cilësimet',
      items: [
        { href: '/settings', label: 'Cilësimet ATK', icon: Settings },
      ],
    },
  ] : [
    { items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
    {
      label: 'Faturim',
      items: [
        // Faturat — jo për restorante/kafe
        ...(!isRestaurant ? [{ href: '/invoices', label: 'Faturat', icon: FileText }] : []),
        ...(!isRestaurant && showQuotes ? [{ href: '/quotes', label: 'Ofertat', icon: ClipboardList }] : []),
        ...(isB2B ? [{ href: '/recurring', label: 'Fatura Periodike', icon: RefreshCw }] : []),
        ...(isB2B ? [{ href: '/purchase-orders', label: 'Porositë Blerjes', icon: ShoppingCart }] : []),
        ...(isB2B ? [{ href: '/contracts', label: 'Kontratat', icon: FileSignature }] : []),
        // ── Modulet specifike per kategori ──
        ...(businessType === 'health' ? [
          { href: '/patients',       label: 'Pacientët',       icon: Users2    },
          { href: '/health-module',  label: 'Moduli Mjekësor', icon: Activity  },
          { href: '/terminet',       label: 'Terminet',        icon: Calendar  },
        ] : []),
        ...(SALON_TYPES.includes(businessType||'') ? [
          { href: '/terminet',     label: 'Terminet',   icon: Calendar },
          { href: '/pos/products', label: 'Shërbimet',  icon: Package  },
          ...(businessType === 'gym' ? [{ href: '/gym-members', label: 'Anëtarët', icon: Users2 }] : []),
        ] : []),
        ...(['market','pharmacy'].includes(businessType||'') ? [
          { href: '/suppliers', label: 'Furnitorët', icon: Truck },
        ] : []),
        ...(businessType === 'bakery' ? [
          { href: '/suppliers', label: 'Furnitorët', icon: Truck },
        ] : []),
        ...(businessType === 'legal' ? [
          { href: '/legal-module', label: 'Moduli Juridik', icon: Scale },
          { href: '/terminet',     label: 'Terminet',       icon: Calendar },
        ] : []),
        ...(businessType === 'construction' ? [
          { href: '/construction-docs', label: 'Kontratat',         icon: FileText },
          { href: '/construction',      label: 'Moduli Ndërtimit', icon: Building2 },
        ] : []),
        ...(businessType === 'it' ? [
          { href: '/it-module', label: 'Moduli IT', icon: Code2 },
          { href: '/terminet', label: 'Terminet',  icon: Calendar },
        ] : []),
        ...(businessType === 'transport' ? [
          { href: '/transport-module', label: 'Moduli Transport', icon: Truck },
        ] : []),
        ...(businessType === 'education' ? [
          { href: '/certificate',      label: 'Çertifikata',        icon: Award },
          { href: '/education-module', label: 'Moduli Arsimit',  icon: BookOpen },
          { href: '/terminet',         label: 'Terminet',        icon: Calendar },
        ] : []),
        ...(businessType === 'import_export' ? [
          { href: '/import-export-module', label: 'Moduli Imp/Exp', icon: Package },
        ] : []),
        ...(businessType === 'services' ? [
          { href: '/services-module', label: 'Moduli Shërbimeve', icon: Wrench },
          { href: '/terminet',        label: 'Terminet',          icon: Calendar },
        ] : []),
        ...(businessType === 'tourism' ? [
          { href: '/tourism-module', label: 'Moduli Turizmit', icon: Hotel },
          { href: '/terminet',       label: 'Terminet',        icon: Calendar },
        ] : []),
        ...(businessType === 'agency' ? [
          { href: '/agency-module', label: 'Moduli Agjensi', icon: Palette },
          { href: '/terminet',      label: 'Terminet',       icon: Calendar },
        ] : []),
        { href: '/expenses', label: 'Shpenzimet', icon: Receipt },
        ...(RESTAURANT_TYPES.includes(businessType||'') ? [
          { href: '/suppliers', label: 'Furnitorët', icon: Truck },
          { href: '/pos/business-invoice', label: 'Faturë për Biznes', icon: FileText },
        ] : []),
        { href: '/payroll',            label: 'Payroll',           icon: Users },
        { href: '/raporte-financiare', label: 'Raporte Financiare', icon: TrendingUp },
      ],
    },
    { items: [{ href: '/settings', label: 'Cilësimet', icon: Settings }] },
  ] // end arka ternary

  const isAdmin     = user.role === 'admin'
  const isAccountant = user.role === 'accountant'
  const atkDeadlines = isAccountant ? getATKDeadlines() : []

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function downloadBook(companyId: string, companyName: string, type: 'shitjeve' | 'blerjeve' | 'pension') {
    setDownloadingId(`${companyId}-${type}`)
    try {
      const res = await fetch(`/api/accountant/books?company_id=${companyId}&type=${type}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `Libri_${type}_${companyName.replace(/\s+/g, '_')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      router.push(`/libri-${type}`)
    } finally {
      setDownloadingId(null)
    }
  }

  const sectionLabel = (txt: string) => !collapsed && (
    <p style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 10px 4px', fontFamily: 'Poppins,sans-serif' }}>
      {txt}
    </p>
  )

  const sidebarItem = (href: string, label: string, Icon: React.ElementType, active: boolean, color?: string, badge?: string) => (
    <Link key={href} href={href}
      className={`sidebar-item ${active ? 'active' : ''}`}
      style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
      title={collapsed ? label : undefined}>
      <Icon size={15} style={{ flexShrink: 0, color: active ? 'var(--purple-light)' : color || 'var(--text-3)' }} />
      {!collapsed && (
        <>
          <span style={{ flex: 1 }}>{label}</span>
          {badge && (
            <span style={{ background:'var(--bg-muted)', color:'var(--text-1)', fontSize: 9, padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  )

  return (
    <aside className="sidebar" style={{
      width: collapsed ? 68 : 240,
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      transition: 'width 0.3s ease',
      flexShrink: 0, display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'relative',
    }}>
      {/* Logo */}
      <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {collapsed
          ? <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#5A1FD6,#9B5CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 15, fontFamily: 'Poppins,sans-serif' }}>F</div>
          : <Image src="/logo.svg" alt="Fiscalix" width={420} height={100} style={{ height: 100, width: 'auto' }} />}
      </div>

      <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ══ ACCOUNTANT NAV ══ */}
        {isAccountant ? (
          <>
            {sectionLabel('Paneli Kryesor')}
            {sidebarItem('/accountant', 'Command Center', Zap, pathname.startsWith('/accountant') && !pathname.startsWith('/accountant/clients'), '#9B5CF8')}
            {sidebarItem('/invoices', 'Faturat e Mia', FileText, pathname === '/invoices', 'var(--purple-light)')}
            {sidebarItem('/accountant/external-clients', 'Klientët e Jashtëm', Link2, pathname === '/accountant/external-clients', '#F59E0B')}

            {/* Mini stats */}
            {!collapsed && accountantClients.length > 0 && (
              <div style={{ margin: '8px 6px', padding: '10px 12px', borderRadius: 10, background: 'rgba(90,31,214,0.06)', border: '1px solid rgba(90,31,214,0.15)' }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Ky Muaj</p>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#9B5CF8', fontFamily: 'Poppins,sans-serif' }}>{accountantClients.length}</p>
                    <p style={{ fontSize: 9, color: 'var(--text-3)' }}>Klientë</p>
                  </div>
                  <div style={{ width: 1, background:'var(--bg-muted)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#10B981', fontFamily: 'Poppins,sans-serif' }}>
                      {['Jan','Shk','Mar','Pri','Maj','Qer','Kor','Gus','Sht','Tet','Nën','Dhj'][currentMonth]}
                    </p>
                    <p style={{ fontSize: 9, color: 'var(--text-3)' }}>Muaji</p>
                  </div>
                </div>
              </div>
            )}

            {/* Klientët */}
            {!collapsed && accountantClients.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <button onClick={() => setClientsOpen(o => !o)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users2 size={12} style={{ color: 'var(--text-3)' }} />
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Poppins,sans-serif' }}>
                      Klientët ({accountantClients.length})
                    </span>
                  </div>
                  <ChevronDown size={11} style={{ color: 'var(--text-3)', transform: clientsOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </button>

                {clientsOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
                    {accountantClients.length >= 7 && (
                      <div style={{ position: 'relative', marginBottom: 2 }}>
                        <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                        <input
                          value={clientSearch}
                          onChange={e => { setClientSearch(e.target.value); setClientShowAll(false) }}
                          placeholder="Kërko klient..."
                          style={{ width: '100%', paddingLeft: 26, paddingRight: 8, paddingTop: 6, paddingBottom: 6, fontSize: 11, background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box' as const }}
                        />
                      </div>
                    )}
                    {(() => {
                      const filteredClients = clientSearch
                        ? accountantClients.filter(cl => cl.company?.name?.toLowerCase().includes(clientSearch.toLowerCase()))
                        : accountantClients
                      const LIMIT = 8
                      const visible = clientShowAll ? filteredClients : filteredClients.slice(0, LIMIT)
                      const hasMore = !clientShowAll && filteredClients.length > LIMIT
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {visible.map(cl => {
                            if (!cl.company) return null
                            const name = cl.company.name
                            const cid = cl.company.id
                            const isExpanded = expandedClient === cid
                            return (
                              <div key={cl.id} style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg-muted)' }}>
                                <button onClick={() => setExpandedClient(isExpanded ? null : cid)}
                                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                                  <div style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--purple-bg)', border: '1px solid var(--border-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Building2 size={12} style={{ color: 'var(--purple-light)' }} />
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>
                                    {name.length > 16 ? name.slice(0, 15) + '…' : name}
                                  </span>
                                  <ChevronDown size={10} style={{ color: 'var(--text-3)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.15s', flexShrink: 0 }} />
                                </button>
                                {isExpanded && (
                                  <div style={{ padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <Link href={`/accountant/clients/${cid}`}
                                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 7, background: 'var(--purple-bg)', textDecoration: 'none', fontSize: 11, color: 'var(--purple-light)', fontWeight: 700 }}>
                                      <Zap size={11} /> Workspace
                                    </Link>
                                    <Link href={`/expenses?company=${cid}`}
                                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 7, background: 'var(--bg-card)', textDecoration: 'none', fontSize: 11, color: 'var(--text-2)', fontWeight: 500 }}>
                                      <Receipt size={11} style={{ color: '#F59E0B' }} /> Shpenzimet
                                    </Link>
                                    <p style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 0 2px 2px' }}>Shkarko Librat</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                                      {([['shitjeve', 'Shitje', '#10B981'], ['blerjeve', 'Blerje', '#3B82F6']] as const).map(([type, label, color]) => (
                                        <button key={type}
                                          onClick={() => downloadBook(cid, name, type)}
                                          disabled={downloadingId === `${cid}-${type}`}
                                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px 4px', borderRadius: 7, background: `${color}12`, border: `1px solid ${color}30`, color, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                                          <Download size={9} />
                                          {downloadingId === `${cid}-${type}` ? '...' : label}
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() => downloadBook(cid, name, 'pension')}
                                      disabled={downloadingId === `${cid}-pension`}
                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '5px 8px', borderRadius: 7, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B', fontSize: 10, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                                      <Download size={9} />
                                      {downloadingId === `${cid}-pension` ? 'Duke shkarkuar...' : 'Kontrib. Pensionale'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          {hasMore && (
                            <button onClick={() => setClientShowAll(true)}
                              style={{ width: '100%', padding: '6px 10px', marginTop: 2, borderRadius: 8, border: '1px dashed rgba(124,58,237,0.3)', background: 'transparent', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer', textAlign: 'center' }}>
                              + {filteredClients.length - LIMIT} klientë tjerë
                            </button>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Afatet ATK */}
            {!collapsed && atkDeadlines.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setDeadlinesOpen(o => !o)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={12} style={{ color: '#F59E0B' }} />
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Poppins,sans-serif' }}>Afatet ATK</span>
                  </div>
                  <ChevronDown size={11} style={{ color: 'var(--text-3)', transform: deadlinesOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </button>
                {deadlinesOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
                    {atkDeadlines.map((d, i) => {
                      const urgent  = d.daysLeft <= 7
                      const warning = d.daysLeft <= 15
                      const col = urgent ? '#EF4444' : warning ? '#F59E0B' : d.color
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--bg-muted)', border: `1px solid ${urgent ? 'rgba(239,68,68,0.3)' : 'var(--border)'}` }}>
                          <div style={{ minWidth: 28, height: 28, borderRadius: 7, background: `${col}15`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: col, lineHeight: 1, fontFamily: 'Poppins,sans-serif' }}>{d.daysLeft}</span>
                            <span style={{ fontSize: 7, color: col }}>ditë</span>
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</p>
                            <p style={{ fontSize: 9, color: col, fontWeight: 600 }}>{d.type}{urgent ? ' — URGJENT' : ''}</p>
                          </div>
                        </div>
                      )
                    })}
                    <Link href="/tax-calendar" style={{ textAlign: 'center', fontSize: 10, color: 'var(--purple-light)', textDecoration: 'none', padding: '4px', fontWeight: 600 }}>
                      Shiko të gjitha →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Raporte klientëve */}
            {!collapsed && (
              <div style={{ marginTop: 6 }}>
                <p style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Poppins,sans-serif', padding: '7px 10px' }}>Raporte Klientëve</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {sidebarItem('/raporte', 'Raporte & Eksportime', FileSpreadsheet, pathname.startsWith('/raporte'), '#9B5CF8')}
                  {sidebarItem('/tvsh-deklarata', 'Deklarata TVSH', Receipt, pathname === '/tvsh-deklarata', '#F59E0B')}
                  {sidebarItem('/reports', 'Raporte ATK', BarChart3, pathname === '/reports', '#3B82F6')}
                  {sidebarItem('/listepagesa', 'Listëpagesa Klientëve', Users2, pathname === '/listepagesa', '#10B981')}
                  {sidebarItem('/tax-calendar', 'Kalendar ATK', Calendar, pathname === '/tax-calendar', '#6366F1')}
                </div>
              </div>
            )}

            {/* Mjetet e Mia */}
            {!collapsed && (
              <div style={{ marginTop: 6 }}>
                <button onClick={() => setToolsOpen(o => !o)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FolderOpen size={12} style={{ color: 'var(--text-3)' }} />
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Poppins,sans-serif' }}>Mjetet e Mia</span>
                  </div>
                  <ChevronDown size={11} style={{ color: 'var(--text-3)', transform: toolsOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </button>
                {toolsOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                    {sidebarItem('/raporte-financiare', 'Raporte Financiare', TrendingUp, pathname === '/raporte-financiare', '#10B981')}
                    {sidebarItem('/mjetet/libri-shitjeve', 'Libri i Shitjeve', BookOpen, pathname === '/mjetet/libri-shitjeve', '#3B82F6')}
                    {sidebarItem('/mjetet/libri-blerjeve', 'Libri i Blerjeve', ShoppingCart, pathname === '/mjetet/libri-blerjeve', '#F59E0B')}
                    {sidebarItem('/bank-import', 'Import Bankar', Landmark, pathname === '/bank-import', '#6B7280')}
                  </div>
                )}
              </div>
            )}

            {sectionLabel('Tjetër')}
            {sidebarItem('/settings', 'Cilësimet', Settings, pathname === '/settings')}
          </>
        ) : (
          /* ══ BUSINESS USER NAV ══ */
          <>
            {navGroups.map((group, gi) => (
              <div key={gi} style={{ marginBottom: 4 }}>
                {group.label && !collapsed && (
                  <p style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 10px 4px', fontFamily: 'Poppins,sans-serif' }}>
                    {group.label}
                  </p>
                )}
                {group.label && collapsed && <div style={{ height: 1, background: 'var(--border)', margin: '8px 4px 6px' }} />}
                {group.items.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  const locked = (item.premium && plan === 'basic') || (item.advanced && !['business', 'enterprise'].includes(plan))
                  const Icon = item.icon
                  return (
                    <Link key={item.href} href={locked ? '/settings' : item.href}
                      className={`sidebar-item ${active ? 'active' : ''}`}
                      style={{ opacity: locked ? 0.45 : 1, justifyContent: collapsed ? 'center' : 'flex-start' }}
                      title={collapsed ? item.label : undefined}>
                      <Icon size={15} style={{ flexShrink: 0, color: active ? 'var(--purple-light)' : item.color || 'var(--text-3)' }} />
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1 }}>{item.label}</span>
                          {locked && (
                            <span style={{ background: item.advanced ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)', color: item.advanced ? '#3B82F6' : '#F59E0B', fontSize: 9, padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>
                              {item.advanced ? 'Adv' : 'Pro'}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  )
                })}
              </div>
            ))}

            {/* ── POS LINK (vetëm për bizneset me pos_enabled, JO kontabilist, JO arka plan) ── */}
            {!isAccountant && posEnabled && !isArka && (
              <>
                {sectionLabel(isSalon ? 'Arka Fiskale' : 'Sistemi POS')}

                {/* Restorant/Kafe — hyrja kryesore janë Tavolinat */}
                {RESTAURANT_TYPES.includes(businessType || '') && !isBakery ? (
                  <>
                    <Link href="/pos/tables"
                      className={`sidebar-item ${pathname.startsWith('/pos/tables') || pathname === '/pos' ? 'active' : ''}`}
                      style={{ justifyContent: collapsed ? 'center' : 'flex-start', position: 'relative' }}
                      title={collapsed ? 'Tavolinat' : undefined}>
                      <Users2 size={15} style={{ flexShrink: 0, color: (pathname.startsWith('/pos/tables') || pathname === '/pos') ? 'var(--purple-light)' : '#10B981' }} />
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1 }}>Tavolinat</span>
                          <span style={{ background:'var(--bg-muted)', color:'var(--text-1)', fontSize: 9, padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>Live</span>
                        </>
                      )}
                    </Link>
                  </>
                ) : isBakery ? (
                  /* Furrë/Pastiqeri — POS counter direkt */
                  <Link href="/pos"
                    className={`sidebar-item ${pathname === '/pos' || pathname.startsWith('/pos/tables') ? 'active' : ''}`}
                    style={{ justifyContent: collapsed ? 'center' : 'flex-start', position: 'relative' }}
                    title={collapsed ? 'POS Counter' : undefined}>
                    <ShoppingBag size={15} style={{ flexShrink: 0, color: (pathname === '/pos') ? 'var(--purple-light)' : '#10B981' }} />
                    {!collapsed && (
                      <>
                        <span style={{ flex: 1 }}>POS Counter</span>
                        <span style={{ background:'var(--bg-muted)', color:'var(--text-1)', fontSize: 9, padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>Live</span>
                      </>
                    )}
                  </Link>
                ) : isSalon ? (
                  /* Sallon/Mjek/Gym/Spa — Arka Fiskale vetëm */
                  <Link href="/pos"
                    className={`sidebar-item ${pathname === '/pos' ? 'active' : ''}`}
                    style={{ justifyContent: collapsed ? 'center' : 'flex-start', position: 'relative' }}
                    title={collapsed ? 'Arka Fiskale' : undefined}>
                    <Receipt size={15} style={{ flexShrink: 0, color: pathname === '/pos' ? 'var(--purple-light)' : '#10B981' }} />
                    {!collapsed && (
                      <>
                        <span style={{ flex: 1 }}>Arka Fiskale</span>
                        <span style={{ background:'var(--bg-muted)', color:'var(--text-1)', fontSize: 9, padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>Live</span>
                      </>
                    )}
                  </Link>
                ) : (
                  <Link href="/pos"
                    className={`sidebar-item ${pathname === '/pos' ? 'active' : ''}`}
                    style={{ justifyContent: collapsed ? 'center' : 'flex-start', position: 'relative' }}
                    title={collapsed ? 'POS — Arka Fiskale' : undefined}>
                    <ShoppingBag size={15} style={{ flexShrink: 0, color: pathname === '/pos' ? 'var(--purple-light)' : '#10B981' }} />
                    {!collapsed && (
                      <>
                        <span style={{ flex: 1 }}>POS — Arka Fiskale</span>
                        <span style={{ background:'var(--bg-muted)', color:'var(--text-1)', fontSize: 9, padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>Live</span>
                      </>
                    )}
                  </Link>
                )}

                {/* Arka plan — vetëm link direkt te POS */}
            {!isAccountant && posEnabled && isArka && (
              <>
                {sectionLabel('Arka Fiskale')}
                <Link href="/pos"
                  className={`sidebar-item ${pathname === '/pos' ? 'active' : ''}`}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                  title={collapsed ? 'Arka Fiskale' : undefined}>
                  <Receipt size={15} style={{ flexShrink: 0, color: pathname === '/pos' ? 'var(--purple-light)' : '#10B981' }} />
                  {!collapsed && <span style={{ flex: 1 }}>Lësho Kupon</span>}
                </Link>
                <Link href="/pos/history"
                  className={`sidebar-item ${pathname === '/pos/history' ? 'active' : ''}`}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
                  <History size={15} style={{ flexShrink: 0, color: 'var(--text-3)' }} />
                  {!collapsed && <span style={{ flex: 1 }}>Historia</span>}
                </Link>
              </>
            )}

                {/* Produktet — fshihet per mjek, shfaqet per te tjere */}
                {!['health'].includes(businessType||'') && !collapsed && (
                  <div style={{ paddingLeft: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      <Package size={12} /> {SALON_TYPES.includes(businessType||'') ? 'Shërbimet' : 'Produktet'}
                    </div>
                    <Link href="/pos/products"
                      className={`sidebar-item ${pathname === '/pos/products' ? 'active' : ''}`}
                      style={{ paddingLeft: 22, fontSize: 12 }}>
                      <span style={{ flex: 1 }}>{SALON_TYPES.includes(businessType||"") ? "Menaxho Shërbimet" : "Menaxho Produktet"}</span>
                    </Link>
                    <Link href="/pos/import"
                      className={`sidebar-item ${pathname === '/pos/import' ? 'active' : ''}`}
                      style={{ paddingLeft: 22, fontSize: 12 }}>
                      <span style={{ flex: 1 }}>Importo Bulk</span>
                    </Link>
                  </div>
                )}
                {!['health'].includes(businessType||'') && collapsed && (
                  <Link href="/pos/products"
                    className={`sidebar-item ${pathname.startsWith('/pos/products') ? 'active' : ''}`}
                    style={{ justifyContent: 'center' }} title="Produktet">
                    <Package size={15} style={{ flexShrink: 0, color: pathname.startsWith('/pos/products') ? 'var(--purple-light)' : 'var(--text-3)' }} />
                  </Link>
                )}

                <Link href="/pos/history"
                  className={`sidebar-item ${pathname === '/pos/history' ? 'active' : ''}`}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                  title={collapsed ? 'Historia' : undefined}>
                  <Receipt size={15} style={{ flexShrink: 0, color: pathname === '/pos/history' ? 'var(--purple-light)' : 'var(--text-3)' }} />
                  {!collapsed && <span style={{ flex: 1 }}>Historia</span>}
                </Link>
                <Link href="/pos/reports"
                  className={`sidebar-item ${pathname === '/pos/reports' ? 'active' : ''}`}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                  title={collapsed ? 'Raportet' : undefined}>
                  <BarChart3 size={15} style={{ flexShrink: 0, color: pathname === '/pos/reports' ? 'var(--purple-light)' : 'var(--text-3)' }} />
                  {!collapsed && <span style={{ flex: 1 }}>Raportet</span>}
                </Link>
              </>
            )}
          </>
        )}

        {/* Pending invites */}
        {!isAccountant && pendingInvitesCount > 0 && (
          <Link href="/accountant-invites"
            className={`sidebar-item ${pathname === '/accountant-invites' ? 'active' : ''}`}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start', marginTop: 6 }}
            title={collapsed ? `${pendingInvitesCount} ftesë në pritje` : undefined}>
            <UserPlus2 size={15} style={{ flexShrink: 0, color: pathname === '/accountant-invites' ? 'var(--purple-light)' : '#F59E0B' }} />
            {!collapsed && (
              <>
                <span style={{ flex: 1 }}>Ftesat</span>
                <span style={{ background: '#F59E0B', color: 'white', fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 20, minWidth: 18, textAlign: 'center' }}>
                  {pendingInvitesCount}
                </span>
              </>
            )}
          </Link>
        )}

        {/* Admin */}
        {isAdmin && (
          <Link href="/admin"
            className={`sidebar-item ${pathname.startsWith('/admin') ? 'active' : ''}`}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start', marginTop: 8 }}>
            <Shield size={15} style={{ flexShrink: 0, color: '#3B82F6' }} />
            {!collapsed && <span>Admin Panel</span>}
          </Link>
        )}
      </nav>

      {/* Plan badge */}
      {!collapsed && !isAccountant && (
        <div style={{ margin: '0 10px 10px', padding: '9px 12px', borderRadius: 10, background: 'var(--purple-bg)', border: '1px solid var(--border-purple)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <Crown size={11} style={{ color: PLAN_COLORS[plan] }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'capitalize', color: PLAN_COLORS[plan], fontFamily: 'Poppins,sans-serif' }}>
              {PLAN_LABELS[plan] || plan}
            </span>
          </div>
          {subscription?.status === 'trialing' && subscription?.trial_ends_at && (() => {
            const daysLeft = Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            return (
              <div style={{ marginTop: 4, padding: '4px 8px', borderRadius: 6, background: daysLeft <= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${daysLeft <= 3 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: daysLeft <= 3 ? '#EF4444' : '#F59E0B' }}>
                  Trial: {daysLeft} ditë mbetur
                </p>
              </div>
            )
          })()}
          {subscription?.status === 'active' && subscription?.current_period_end && (
            <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>Skadon: {subscription.current_period_end?.split('T')[0]}</p>
          )}
        </div>
      )}

      {/* User footer */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#5A1FD6,#9B5CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: 'white', flexShrink: 0 }}>
            {(user.full_name || user.email)?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.full_name || 'User'}</p>
                <p style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'capitalize' }}>{user.role?.replace('_', ' ')}</p>
              </div>
              <button onClick={logout}
                style={{ padding: 5, borderRadius: 7, cursor: 'pointer', color: 'var(--text-3)', background: 'transparent', border: 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EF4444' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)' }}>
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapse button */}
      <button onClick={() => setCollapsed(!collapsed)}
        style={{ position: 'absolute', right: -11, top: 76, width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-3)', zIndex: 10 }}>
        {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>
    </aside>
  )
}
