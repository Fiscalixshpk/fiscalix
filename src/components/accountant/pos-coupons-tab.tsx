'use client'
// Tab i kuponëve fiskalë për kontabilistin
// Shfaqet te detajet e klientit kur biznesi ka pos_enabled=true

import { useState, useEffect, useMemo } from 'react'
import {
  Download, CheckCircle, WifiOff, AlertCircle, Clock,
  ChevronDown, ChevronUp, Receipt, BarChart3
} from 'lucide-react'

interface SaleItem { name: string; price: number; quantity: number; total: number; tax_rate: string; unit: string }
interface Sale {
  id: string; coupon_id: number; coupon_type: string
  receipt_number: string; atk_transaction_id: number | null
  total_amount: number; total_tax: number; total_no_tax: number
  payment_method: string; status: string; issued_at: string
  sale_items: SaleItem[]
}

interface Props {
  companyId:   string
  companyName: string
}

const STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  fiscalized: { label: 'Fiskalizuar', color: '#10B981', icon: <CheckCircle size={12} /> },
  offline:    { label: 'Offline',     color: '#F59E0B', icon: <WifiOff size={12} />    },
  failed:     { label: 'Dështoi',     color: '#EF4444', icon: <AlertCircle size={12} /> },
  pending:    { label: 'Pritur',      color: '#6B7280', icon: <Clock size={12} />       },
}

const fmtCnt = (c: number) => `€${(c / 100).toFixed(2)}`
const fmtAtk = (a: number) => `€${(a / 10000).toFixed(2)}`

function formatDate(iso: string) {
  const d   = new Date(iso)
  const dd  = String(d.getDate()).padStart(2, '0')
  const mm  = String(d.getMonth() + 1).padStart(2, '0')
  const hh  = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm} ${hh}:${min}`
}

export default function POSCouponsTab({ companyId, companyName }: Props) {
  const [sales,       setSales]       = useState<Sale[]>([])
  const [stats,       setStats]       = useState<{ total: number; totalAmount: number; totalTax: number; offline: number; failed: number } | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [expandedId,  setExpandedId]  = useState<string | null>(null)
  const [tab,         setTab]         = useState<'coupons'|'zreport'>('coupons')
  const [month,       setMonth]       = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')

  useEffect(() => {
    setLoading(true)
    let url = `/api/accountant/pos-sales?companyId=${companyId}&month=${month}`
    if (dateFrom) url += `&dateFrom=${dateFrom}`
    if (dateTo)   url += `&dateTo=${dateTo}`
    fetch(url)
      .then(r => r.json())
      .then(d => { setSales(d.sales || []); setStats(d.stats || null) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId, month, dateFrom, dateTo])

  function exportCSV() {
    const headers = ['Kuponi', 'Data', 'Totali', 'TVSH', 'Pa TVSH', 'Pagesa', 'Statusi', 'ATK TX']
    const rows = sales.map(s => [
      s.receipt_number || `#${s.coupon_id}`,
      formatDate(s.issued_at),
      (s.total_amount / 100).toFixed(2),
      (s.total_tax    / 100).toFixed(2),
      (s.total_no_tax / 100).toFixed(2),
      s.payment_method,
      STATUS[s.status]?.label ?? s.status,
      s.atk_transaction_id ?? '',
    ])
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `kuponet-${companyName.replace(/\s+/g, '_')}-${month}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // Month navigation helpers
  function prevMonth() {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  function nextMonth() {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const monthLabel = (() => {
    const [y, m] = month.split('-').map(Number)
    const names = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']
    return `${names[m - 1]} ${y}`
  })()

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: 'var(--bg-muted)', borderRadius: 10, padding: 4 }}>
        {[
          { id: 'coupons', label: '🧾 Kuponë Fiskalë' },
          { id: 'zreport', label: '📊 Raportet Z' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as 'coupons'|'zreport')}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: tab === t.id ? 'var(--purple)' : 'transparent', color: tab === t.id ? 'white' : 'var(--text-3)', transition: 'all 0.12s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Z REPORT */}
      {tab === 'zreport' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>Raport Z — {companyName}</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>Zgjedh periudhën dhe shkarko raportin si CSV.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Nga Data</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-muted)', fontSize: 13, color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Deri Data</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-muted)', fontSize: 13, color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            </div>
            {stats && (dateFrom || dateTo) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                {[
                  { label: 'Totali Shitjeve', value: fmtCnt(stats.totalAmount), color: '#10B981' },
                  { label: 'TVSH Totale',     value: fmtCnt(stats.totalTax),    color: '#3B82F6' },
                  { label: 'Kuponë',          value: String(stats.total),       color: 'var(--purple-light)' },
                ].map(k => (
                  <div key={k.label} style={{ padding: '12px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)', textAlign: 'center' as const }}>
                    <p style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 5 }}>{k.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 900, color: k.color }}>{k.value}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={exportCSV} disabled={!dateFrom && !dateTo}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 9, background: 'var(--purple)', color:'var(--text-1)', border: 'none', cursor: (!dateFrom && !dateTo) ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, opacity: (!dateFrom && !dateTo) ? 0.5 : 1 }}>
              <Download size={14} /> Shkarko CSV ({sales.length} kuponë)
            </button>
          </div>
        </div>
      )}

      {/* COUPONS */}
      {tab === 'coupons' && (<>
      {/* Header: month nav + date filter + export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap' as const, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth}
            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', fontSize: 14, color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ‹
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', minWidth: 140, textAlign: 'center' as const }}>{monthLabel}</span>
          <button onClick={nextMonth}
            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', fontSize: 14, color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ›
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', fontSize: 12, color: 'var(--text-1)', outline: 'none' }} />
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', fontSize: 12, color: 'var(--text-1)', outline: 'none' }} />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', fontSize: 11, color: 'var(--text-3)' }}>
              Pastro
            </button>
          )}
          <button onClick={exportCSV} disabled={sales.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: 'var(--bg-muted)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', cursor: sales.length === 0 ? 'not-allowed' : 'pointer', opacity: sales.length === 0 ? 0.5 : 1 }}>
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Kuponë',      value: String(stats.total),           color: 'var(--purple-light)' },
            { label: 'Totali',      value: fmtCnt(stats.totalAmount),     color: '#10B981' },
            { label: 'TVSH',        value: fmtCnt(stats.totalTax),        color: '#3B82F6' },
            { label: 'Offline',     value: String(stats.offline + stats.failed), color: stats.offline + stats.failed > 0 ? '#F59E0B' : 'var(--text-3)' },
          ].map(s => (
            <div key={s.label} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: 'Poppins,sans-serif', lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTop: '2px solid var(--purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13 }}>Duke ngarkuar kuponët...</p>
        </div>
      ) : sales.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
          <Receipt size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Asnjë kupon këtë muaj</p>
          <p style={{ fontSize: 12, opacity: 0.6 }}>Biznesi nuk ka lëshuar kuponë fiskalë për {monthLabel}</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 90px 100px 90px', padding: '8px 14px', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
            {['Kuponi', 'Data & Ora', 'Totali', 'TVSH', 'Statusi', 'ATK TX'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          {sales.map((sale, i) => {
            const st       = STATUS[sale.status] ?? STATUS.pending
            const expanded = expandedId === sale.id
            return (
              <div key={sale.id} style={{ borderBottom: i < sales.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div
                  onClick={() => setExpandedId(expanded ? null : sale.id)}
                  style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 90px 100px 90px', padding: '10px 14px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-muted)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>

                  {/* Kuponi */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {expanded ? <ChevronUp size={12} color="var(--text-3)" /> : <ChevronDown size={12} color="var(--text-3)" />}
                    <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-1)' }}>
                      {sale.receipt_number || `#${sale.coupon_id}`}
                    </span>
                  </div>

                  {/* Data */}
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{formatDate(sale.issued_at)}</span>

                  {/* Totali */}
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'Poppins,sans-serif' }}>
                    {fmtCnt(sale.total_amount)}
                  </span>

                  {/* TVSH */}
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmtCnt(sale.total_tax)}</span>

                  {/* Statusi */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 20, background: `${st.color}14`, color: st.color, fontSize: 11, fontWeight: 700, width: 'fit-content' }}>
                    {st.icon} {st.label}
                  </div>

                  {/* ATK TX */}
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: sale.atk_transaction_id ? '#10B981' : 'var(--text-3)' }}>
                    {sale.atk_transaction_id ? `#${sale.atk_transaction_id}` : '—'}
                  </span>
                </div>

                {/* Expanded — artikujt */}
                {expanded && (
                  <div style={{ padding: '10px 40px 12px', background: 'var(--bg-muted)', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Artikujt</p>
                    {sale.sale_items.map((item, j) => (
                      <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: j < sale.sale_items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ color: 'var(--text-2)' }}>
                          {item.quantity}× {item.name}
                          <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 6 }}>({item.tax_rate})</span>
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{fmtAtk(item.total)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--text-3)' }}>
                      <span>Pa TVSH: {fmtCnt(sale.total_no_tax)}</span>
                      <span>TVSH: {fmtCnt(sale.total_tax)}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>Total: {fmtCnt(sale.total_amount)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </>)}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
