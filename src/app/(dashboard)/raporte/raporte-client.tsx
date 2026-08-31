'use client'

import { useState, useEffect } from 'react'
import { Download, FileSpreadsheet, BarChart3, TrendingUp, Wallet, Users2, Shield, Database, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Company { id: string; name: string }

interface Props {
  companies: Company[]
  userRole: string
}

const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']
const QUARTERS = ['T1 (Jan-Mar)', 'T2 (Pri-Qer)', 'T3 (Kor-Sht)', 'T4 (Tet-Dhj)']

export default function RaporteClient({ companies, userRole }: Props) {
  const now = new Date()
  const [companyId, setCompanyId] = useState(companies[0]?.id || '')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3))
  const [loading, setLoading] = useState<string | null>(null)

  async function download(url: string, label: string) {
    setLoading(label)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Gabim gjatë gjenerimit')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${label}.xlsx`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success(`${label} u shkarkua`)
    } catch {
      toast.error('Gabim gjatë shkarkimit')
    } finally {
      setLoading(null)
    }
  }

  const S = {
    card: { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px 22px', display:'flex', alignItems:'center', gap:16, transition:'all .2s', cursor:'pointer' as const },
    ico: (color: string) => ({ width:46, height:46, borderRadius:13, background:`${color}15`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }),
    btn: (color: string) => ({ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, border:`1px solid ${color}30`, background:`${color}10`, color, fontSize:13, fontWeight:700, cursor:'pointer' as const, flexShrink:0, transition:'all .15s', whiteSpace:'nowrap' as const }),
  }

  const reports = [
    {
      section: '📊 Raporte Financiare',
      items: [
        { id:'pl', label:'Profit & Loss', desc:'Hyrjet, daljet dhe fitimi sipas muajve', icon:TrendingUp, color:'#10B981',
          url:() => `/api/reports/pl?company_id=${companyId}&year=${year}&format=excel` },
        { id:'cashflow', label:'Cash Flow', desc:'Rrjedha e parasë hyrëse dhe dalëse', icon:Wallet, color:'#3B82F6',
          url:() => `/api/reports/cashflow?company_id=${companyId}&year=${year}&format=excel` },
        { id:'trial', label:'Trial Balance', desc:'Gjendja e llogarive (debi/kredi)', icon:BarChart3, color:'#9B5CF8',
          url:() => `/api/reports/trial-balance?company_id=${companyId}&year=${year}&format=excel` },
      ]
    },
    {
      section: '🏛️ Eksportime ATK',
      items: [
        { id:'vat', label:'Deklarata TVSH', desc:`TVSH dalëse dhe hyrëse — ${QUARTERS[quarter-1]} ${year}`, icon:FileSpreadsheet, color:'#F59E0B',
          url:() => `/api/vat-export?company_id=${companyId}&year=${year}&quarter=${quarter}` },
        { id:'atk-full', label:'Eksport i Plotë ATK', desc:'Të gjitha librat në një Excel (5 sheet)', icon:Shield, color:'#5A1FD6',
          url:() => `/api/reports/atk-full?company_id=${companyId}&year=${year}&quarter=${quarter}` },
        { id:'withholding', label:'Tatimi në Burim 9%', desc:`Deklarata tatimit në burim — ${MONTHS[month-1]} ${year}`, icon:FileSpreadsheet, color:'#EF4444',
          url:() => `/api/withholding-tax/export?company_id=${companyId}&year=${year}&month=${month}` },
      ]
    },
    {
      section: '👥 Listëpagesa & Pension',
      items: [
        { id:'listepagesa', label:'Listëpagesa Mujore', desc:`Format ATK — ${MONTHS[month-1]} ${year}`, icon:Users2, color:'#10B981',
          url:() => `/pension?export=true&company_id=${companyId}&year=${year}&month=${month}` },
      ]
    },
    {
      section: '💾 Backup',
      items: [
        { id:'backup', label:'Backup i Plotë', desc:'Të gjitha të dhënat: fatura, shpenzime, arka, bankë', icon:Database, color:'#6B7280',
          url:() => `/api/backup?company_id=${companyId}` },
      ]
    },
  ]

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div>
        <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>
          Raporte & Eksportime
        </h1>
        <p style={{ fontSize:13, color:'var(--text-3)' }}>Gjeneroni raporte financiare dhe eksportime ATK</p>
      </div>

      {/* Client selector — gjithmonë i dukshëm për kontabilistin */}
      {userRole === 'accountant' && (
        <div style={{ background:'linear-gradient(135deg,rgba(90,31,214,0.1),rgba(90,31,214,0.05))', border:'1px solid rgba(90,31,214,0.25)', borderRadius:14, padding:'16px 20px', marginBottom:4 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#9B5CF8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
            👤 Zgjidh Klientin
          </p>
          {companies.length === 0 ? (
            <p style={{ fontSize:13, color:'var(--text-3)' }}>Nuk keni klientë të lidhur akoma.</p>
          ) : (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {companies.map(c => (
                <button key={c.id} onClick={() => setCompanyId(c.id)}
                  style={{ padding:'9px 18px', borderRadius:10, border:`1px solid ${companyId===c.id ? 'rgba(90,31,214,0.5)' : 'var(--border)'}`, background:companyId===c.id ? 'rgba(90,31,214,0.15)' : 'var(--bg-card)', color:companyId===c.id ? 'var(--purple)' : 'var(--text-2)', fontSize:13, fontWeight:companyId===c.id ? 700 : 400, cursor:'pointer', transition:'all 0.15s' }}>
                  {companyId===c.id ? '✓ ' : ''}{c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 20px' }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Filtrat e Periudhës</p>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {userRole !== 'accountant' && companies.length > 1 && (
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Kompania</label>
              <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="finex-input" style={{ minWidth:180 }}>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Viti</label>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="finex-input">
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Tremujori (TVSH/ATK)</label>
            <select value={quarter} onChange={e => setQuarter(parseInt(e.target.value))} className="finex-input">
              {QUARTERS.map((q,i) => <option key={i+1} value={i+1}>{q}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Muaji (Pagat/Tatimi)</label>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="finex-input">
              {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Reports */}
      {companyId && <AnalyticsOverview companyId={companyId} year={year} quarter={quarter} />}

      {reports.map(section => (
        <div key={section.section}>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:10 }}>{section.section}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {section.items.map(item => {
              const Icon = item.icon
              const isLoading = loading === item.label
              return (
                <div key={item.id} style={S.card}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=`${item.color}30`; e.currentTarget.style.background='var(--bg-muted)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--bg-card)' }}>
                  <div style={S.ico(item.color)}>
                    <Icon size={20} style={{ color: item.color }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:2 }}>{item.label}</p>
                    <p style={{ fontSize:12, color:'var(--text-3)' }}>{item.desc}</p>
                  </div>
                  <button
                    onClick={() => download(item.url(), item.label)}
                    disabled={isLoading || !companyId}
                    style={S.btn(item.color)}
                    onMouseEnter={e => { e.currentTarget.style.background=`${item.color}20` }}
                    onMouseLeave={e => { e.currentTarget.style.background=`${item.color}10` }}>
                    {isLoading ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}
                    {isLoading ? 'Duke gjeneruar...' : 'Shkarko Excel'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Analitika e shpejtë per klientin e zgjedhur ──────────────
function AnalyticsOverview({ companyId, year, quarter }: { companyId: string; year: number; quarter: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    fetch(`/api/analytics/summary?company_id=${companyId}&year=${year}&quarter=${quarter}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [companyId, year, quarter])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'16px 20px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, marginBottom:8, color:'var(--text-3)', fontSize:13 }}>
      <Loader2 size={14} className="animate-spin"/> Duke ngarkuar analitikën...
    </div>
  )

  if (!data) return null

  const kpis = [
    { label: `Qarkullimi Q${quarter} ${year}`,    value: `€${Number(data.revenue || 0).toLocaleString('sq-AL', { minimumFractionDigits:2 })}`,  color: '#10B981', icon: '💰' },
    { label: `Shpenzime Q${quarter} ${year}`,      value: `€${Number(data.expenses || 0).toLocaleString('sq-AL', { minimumFractionDigits:2 })}`, color: '#EF4444', icon: '📤' },
    { label: `Fitimi Neto`,                         value: `€${Number(data.profit || 0).toLocaleString('sq-AL', { minimumFractionDigits:2 })}`,   color: Number(data.profit) >= 0 ? '#3B82F6' : '#EF4444', icon: '📈' },
    { label: `Tatimi 9% (est.)`,                    value: `€${Math.max(0, Number(data.profit || 0) * 0.09).toLocaleString('sq-AL', { minimumFractionDigits:2 })}`, color: '#F59E0B', icon: '🏛️' },
    { label: `Faturat Papaguara`,                   value: data.unpaid_invoices || '0',                                                              color: '#9B5CF8', icon: '🧾' },
    { label: `Faturat Totale`,                      value: data.total_invoices || '0',                                                               color: '#6B7280', icon: '📋' },
  ]

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        📊 Analitika — Q{quarter} {year}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', borderTop: `3px solid ${k.color}` }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{k.icon} {k.label}</p>
            <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 800, color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
