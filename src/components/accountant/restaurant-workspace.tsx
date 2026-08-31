'use client'
// Workspace kontabilisti për restorant/kafe
// TVSH 8%/18%, libri shitjeve POS, shpenzimet, raport mujor

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
  TrendingUp, Receipt, BarChart3, Download, ChevronDown, ChevronUp,
  Banknote, CreditCard, AlertTriangle, CheckCircle, Calendar,
  Package, FileText, Calculator
} from 'lucide-react'

interface SaleItem { name: string; price: number; quantity: number; total: number; tax_rate: string }
interface Sale {
  id: string; receipt_number: string; atk_transaction_id: number | null
  total_amount: number; total_tax: number; payment_method: string
  status: string; issued_at: string; sale_items: SaleItem[]
}
interface Expense {
  id: string; vendor_name?: string; amount: number; category?: string
  expense_date: string; description?: string; tax_amount?: number
}
interface Summary {
  totalSalesCents: number; totalTaxSales: number; cashSalesCents: number; cardSalesCents: number
  totalExpenses: number; totalTaxExpenses: number; profitCents: number; txCount: number
  tvsh8Cents: number; tvsh18Cents: number; base8Cents: number; base18Cents: number
  tvshDetyrim: number
}

interface Props { companyId: string; companyName: string; businessType: string }

const MONTHS_ALB = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

const fmtEUR = (cents: number) => `€${(cents / 100).toFixed(2)}`

export default function RestaurantWorkspace({ companyId, companyName, businessType }: Props) {
  const now   = new Date()
  const [month,   setMonth]   = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<'overview'|'sales'|'expenses'|'tvsh'|'export'>('overview')
  const [sales,   setSales]   = useState<Sale[]>([])
  const [expenses,setExpenses]= useState<Expense[]>([])
  const [summary, setSummary] = useState<Summary|null>(null)
  const [monthlySales, setMonthlySales] = useState<Record<string,number>>({})
  const [expandedSale, setExpandedSale] = useState<string|null>(null)

  useEffect(() => { load() }, [month])

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/accountant/restaurant?companyId=${companyId}&month=${month}&year=${month.split('-')[0]}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSales(data.sales||[])
      setExpenses(data.expenses||[])
      setSummary(data.summary)
      setMonthlySales(data.monthlySales||{})
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gabim') }
    finally { setLoading(false) }
  }

  function exportCSV() {
    if (!sales.length) { toast.error('Asnjë shitje për eksport'); return }
    const rows = [
      ['Nr Kuponi', 'ATK ID', 'Data', 'Ora', 'Cash/Kartë', 'Pa TVSH', 'TVSH', 'Totali'].join(','),
      ...sales.map(s => [
        s.receipt_number,
        s.atk_transaction_id || '-',
        s.issued_at.split('T')[0],
        s.issued_at.split('T')[1]?.slice(0,5),
        s.payment_method === 'cash' ? 'Cash' : 'Kartë',
        ((s.total_amount - s.total_tax) / 100).toFixed(2),
        (s.total_tax / 100).toFixed(2),
        (s.total_amount / 100).toFixed(2),
      ].join(','))
    ].join('\n')
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${companyName}-${month}-shitjet.csv`
    a.click(); URL.revokeObjectURL(url)
    toast.success('CSV u shkarkua')
  }

  const [yr, mo] = month.split('-')
  const monthLabel = `${MONTHS_ALB[parseInt(mo)-1]} ${yr}`

  const TAB_STYLE = (active: boolean) => ({
    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
    background: active ? 'var(--purple)' : 'transparent',
    color: active ? 'white' : 'var(--text-3)',
    transition: 'all 0.12s',
  })

  const CARD = (children: React.ReactNode, style?: React.CSSProperties) => (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '16px 20px', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', ...style }}>
      {children}
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', color: 'var(--text-1)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', marginBottom: 3 }}>{companyName}</h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Restorant · Raport financiar</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={month} onChange={e => setMonth(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 13, color: 'var(--text-1)', cursor: 'pointer' }}>
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
              const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
              return <option key={val} value={val}>{MONTHS_ALB[d.getMonth()]} {d.getFullYear()}</option>
            })}
          </select>
          <button onClick={exportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-muted)', borderRadius: 10, padding: 4 }}>
        {[
          { id: 'overview',  label: 'Pasqyra',    icon: BarChart3   },
          { id: 'sales',     label: 'Shitjet POS', icon: Receipt     },
          { id: 'expenses',  label: 'Shpenzimet',  icon: Package     },
          { id: 'tvsh',      label: 'TVSH',        icon: Calculator  },
          { id: 'export',    label: 'Eksport',     icon: FileText    },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            style={TAB_STYLE(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'var(--text-3)' }}>
          <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTop: '2px solid var(--purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Duke ngarkuar {monthLabel}...
        </div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && summary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                  { label: 'Shitjet Totale', value: fmtEUR(summary.totalSalesCents), color: 'var(--purple-light)', sub: `${summary.txCount} transaksione` },
                  { label: 'Shpenzimet',     value: `€${summary.totalExpenses.toFixed(2)}`, color: '#EF4444', sub: `${expenses.length} dokumente` },
                  { label: 'Fitimi Bruto',   value: fmtEUR(summary.profitCents), color: summary.profitCents >= 0 ? '#10B981' : '#EF4444', sub: 'pa tatim fitimi' },
                  { label: 'TVSH Detyrim',   value: fmtEUR(summary.tvshDetyrim), color: '#F59E0B', sub: 'shitje - blerje' },
                ].map(k => CARD(
                  <div key={k.label}>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{k.label}</p>
                    <p style={{ fontSize: 24, fontWeight: 900, color: k.color, fontFamily: 'Poppins,sans-serif', lineHeight: 1, marginBottom: 4 }}>{k.value}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{k.sub}</p>
                  </div>
                ))}
              </div>

              {/* Cash vs Kartë */}
              {CARD(
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Cash vs Kartë — {monthLabel}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Banknote size={16} color="#10B981" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>Cash</span>
                      </div>
                      <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)' }}>{fmtEUR(summary.cashSalesCents)}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {summary.totalSalesCents > 0 ? Math.round(summary.cashSalesCents / summary.totalSalesCents * 100) : 0}% e totalit
                      </p>
                    </div>
                    <div style={{ padding: '12px', borderRadius: 10, background: 'var(--purple-bg)', border: '1px solid var(--border-purple)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <CreditCard size={16} color="var(--purple-light)" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple-light)' }}>Kartë</span>
                      </div>
                      <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)' }}>{fmtEUR(summary.cardSalesCents)}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {summary.totalSalesCents > 0 ? Math.round(summary.cardSalesCents / summary.totalSalesCents * 100) : 0}% e totalit
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Trend vjetor */}
              {Object.keys(monthlySales).length > 0 && CARD(
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Trend {yr}</p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                    {Array.from({length:12},(_,i)=>{
                      const m = `${yr}-${String(i+1).padStart(2,'0')}`
                      const val = monthlySales[m] || 0
                      const max = Math.max(...Object.values(monthlySales), 1)
                      const h   = Math.max(4, Math.round((val/max)*76))
                      const isCurrent = m === month
                      return (
                        <div key={m} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                          <div style={{ width:'100%', height:h, borderRadius:'3px 3px 0 0', background: isCurrent ? 'var(--purple)' : 'var(--border)', transition:'height 0.3s' }} />
                          <span style={{ fontSize:9, color: isCurrent ? 'var(--purple-light)' : 'var(--text-3)', fontWeight: isCurrent ? 700 : 400 }}>
                            {MONTHS_ALB[i].slice(0,3)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SHITJET POS ── */}
          {tab === 'sales' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700 }}>Shitjet POS — {monthLabel} ({sales.length} kupona)</p>
              </div>
              {sales.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                  Asnjë shitje fiskale për {monthLabel}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 100px 1fr 80px 80px 80px 24px', gap: 8, padding: '8px 14px', background: 'var(--bg-muted)', borderRadius: 8, fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                    <span>Nr Kuponi</span><span>ATK ID</span><span>Data</span><span>Pagesa</span><span>Pa TVSH</span><span>Totali</span><span/>
                  </div>
                  {sales.map(sale => (
                    <div key={sale.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 100px 1fr 80px 80px 80px 24px', gap: 8, padding: '10px 14px', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple-light)', fontFamily: 'monospace' }}>{sale.receipt_number}</span>
                        <span style={{ fontSize: 11, color: sale.atk_transaction_id ? '#10B981' : 'var(--text-3)' }}>
                          {sale.atk_transaction_id ? <>✓ {sale.atk_transaction_id}</> : '—'}
                        </span>
                        <div>
                          <p style={{ fontSize: 12, color: 'var(--text-1)' }}>{new Date(sale.issued_at).toLocaleDateString('sq-AL')}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{new Date(sale.issued_at).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'})}</p>
                        </div>
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: sale.payment_method==='cash'?'rgba(16,185,129,0.1)':'var(--purple-bg)', color: sale.payment_method==='cash'?'#10B981':'var(--purple-light)', fontWeight: 600 }}>
                          {sale.payment_method==='cash'?'Cash':'Kartë'}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color:'white' }}>{fmtEUR(sale.total_amount - sale.total_tax)}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color:'white' }}>{fmtEUR(sale.total_amount)}</span>
                        <button onClick={() => setExpandedSale(expandedSale===sale.id?null:sale.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color:'white', display: 'flex', alignItems: 'center' }}>
                          {expandedSale===sale.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                      </div>
                      {expandedSale===sale.id && (
                        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', background: 'var(--bg-muted)' }}>
                          {sale.sale_items?.map((item,i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                              <span style={{ color: 'var(--text-2)' }}>{item.quantity}x {item.name} <span style={{ color: 'var(--text-3)' }}>TVSH {item.tax_rate==='D'?'8%':'18%'}</span></span>
                              <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{fmtEUR(item.total)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SHPENZIMET ── */}
          {tab === 'expenses' && (
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Shpenzimet — {monthLabel} ({expenses.length})</p>
              {expenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>Asnjë shpenzim për {monthLabel}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {expenses.map(exp => (
                    <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{exp.vendor_name || 'Pa emër'}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{exp.category} · {exp.expense_date}</p>
                      </div>
                      {exp.tax_amount && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>TVSH: €{Number(exp.tax_amount).toFixed(2)}</span>}
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#EF4444' }}>€{Number(exp.amount).toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-muted)', borderRadius: 10, marginTop: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Totali Shpenzimeve</span>
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#EF4444' }}>€{summary?.totalExpenses.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TVSH ── */}
          {tab === 'tvsh' && summary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Deklarata TVSH — {monthLabel}</p>

              {/* 8% Ushqim */}
              {CARD(
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#10B981' }}>8%</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>TVSH Normë e Reduktuar — Ushqim i Gatuar</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Baza Tatueshme', value: fmtEUR(summary.base8Cents) },
                      { label: 'TVSH 8%',        value: fmtEUR(summary.tvsh8Cents) },
                      { label: 'Bruto',          value: fmtEUR(summary.base8Cents + summary.tvsh8Cents) },
                    ].map(i => (
                      <div key={i.label} style={{ padding: '10px', borderRadius: 9, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{i.label}</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#10B981' }}>{i.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 18% Standard */}
              {CARD(
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--purple-light)' }}>18%</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>TVSH Normë Standarde — Pije & Tjetër</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Baza Tatueshme', value: fmtEUR(summary.base18Cents) },
                      { label: 'TVSH 18%',       value: fmtEUR(summary.tvsh18Cents) },
                      { label: 'Bruto',          value: fmtEUR(summary.base18Cents + summary.tvsh18Cents) },
                    ].map(i => (
                      <div key={i.label} style={{ padding: '10px', borderRadius: 9, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{i.label}</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--purple-light)' }}>{i.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TVSH Detyrim */}
              {CARD(
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>TVSH Detyrim për Pagesë</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>TVSH shitje − TVSH blerje = {fmtEUR(summary.tvsh8Cents + summary.tvsh18Cents)} − {fmtEUR(summary.totalTaxExpenses)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 32, fontWeight: 900, color: summary.tvshDetyrim >= 0 ? '#EF4444' : '#10B981', fontFamily: 'Poppins,sans-serif' }}>
                      {fmtEUR(Math.abs(summary.tvshDetyrim))}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{summary.tvshDetyrim >= 0 ? 'për t\'u paguar' : 'kredi TVSH'}</p>
                  </div>
                </div>,
                { border: '2px solid var(--border-purple)' }
              )}

              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', gap: 8 }}>
                <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: '#D97706', lineHeight: 1.5 }}>
                  Deklarata TVSH dorëzohet te ATK brenda datës 20 të muajit pasardhës. Kontrolloni me klientin nëse të gjitha faturat e blerjeve janë regjistruar.
                </p>
              </div>
            </div>
          )}

          {/* ── EKSPORT ── */}
          {tab === 'export' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Eksporto Dokumentet — {monthLabel}</p>
              {[
                { label: 'Libri i Shitjeve (CSV)', desc: 'Të gjitha kuponët fiskalë me detaje', action: exportCSV, icon: Receipt },
                { label: 'Libri i Blerjeve (CSV)', desc: 'Shpenzimet dhe faturat e blerjeve', action: () => toast.info('Duke u ndërtuar...'), icon: Package },
                { label: 'Deklarata TVSH (PDF)',   desc: 'Formulari i TVSH gati për ATK', action: () => window.print(), icon: FileText },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left' as const, transition: 'all 0.12s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--purple)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <item.icon size={18} color="var(--purple-light)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 3 }}>{item.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.desc}</p>
                  </div>
                  <Download size={16} color="var(--text-3)" style={{ marginLeft: 'auto' }} />
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
