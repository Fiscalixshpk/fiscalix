'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Search, Filter, Download,
  CheckCircle, WifiOff, AlertCircle, Clock,
  Receipt, ChevronDown, ChevronUp, X
} from 'lucide-react'

interface SaleItem {
  id: string; name: string; price: number; unit: string
  quantity: number; total: number; tax_rate: string
}

interface Sale {
  id: string; coupon_id: number; coupon_type: string
  receipt_number: string; atk_transaction_id: number | null
  total_amount: number; total_tax: number; total_no_tax: number
  payment_method: string; status: string; operator_id: string | null
  issued_at: string; qr_code_data: string | null
  sale_items: SaleItem[]
}

interface Props {
  company: { id: string; name: string; nui: string }
  sales:   Sale[]
}

// Format consistent (no locale) — parandalon hydration mismatch
function formatDate(iso: string) {
  const d = new Date(iso)
  const dd  = String(d.getDate()).padStart(2, '0')
  const mm  = String(d.getMonth() + 1).padStart(2, '0')
  const hh  = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm} ${hh}:${min}`
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  fiscalized: { label: 'Fiskalizuar', color: '#10B981', icon: <CheckCircle size={13} /> },
  offline:    { label: 'Offline',     color: '#F59E0B', icon: <WifiOff size={13} />    },
  failed:     { label: 'Dështoi',     color: '#EF4444', icon: <AlertCircle size={13} /> },
  pending:    { label: 'Pritur',      color: 'var(--text-3)', icon: <Clock size={13} />       },
}

const PAY_LABELS: Record<string, string> = {
  cash: 'Cash', card: 'Kartë', split: 'Split', voucher: 'Kupon',
}

const TYPE_LABELS: Record<string, string> = {
  SALE: 'Shitje', CANCEL: 'Anulim', RETURN: 'Kthim',
}

export default function POSHistoryClient({ company, sales }: Props) {
  const router = useRouter()
  const [search,     setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPay,   setFilterPay]  = useState('all')
  const [dateFrom,    setDateFrom]   = useState('')
  const [dateTo,      setDateTo]     = useState('')
  const [expandedId,  setExpandedId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<Sale | null>(null)
  const [returnItems, setReturnItems]     = useState<Record<string, number>>({}) // itemId -> return quantity
  const [isPartialReturn, setIsPartialReturn] = useState(false)
  const [cancelReason, setCancelReason]   = useState('')

  async function cancelSale(sale: Sale, type: 'CANCEL' | 'RETURN') {
    setCancellingId(sale.id)
    try {
      const res = await fetch('/api/pos/cancel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          originalSaleId: sale.id,
          originalCouponId: sale.coupon_id,
          type,
          reason: type === 'CANCEL' ? cancelReason : undefined,
          items: type === 'RETURN' && isPartialReturn
            ? sale.sale_items?.map((item: any) => ({
                ...item,
                quantity: returnItems[item.id] ?? item.quantity,
                total: Math.round(item.total * (returnItems[item.id] ?? item.quantity) / item.quantity)
              })).filter((item: any) => (returnItems[item.id] ?? item.quantity) > 0)
            : sale.sale_items,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${type === 'CANCEL' ? 'Anulimi' : 'Kthimi'} u krye — kupon #${data.receiptNumber}`)
      setConfirmCancel(null)
      setCancelReason('')
      if (data.saleId && data.status !== 'failed') {
        const { printFiscalReceipt } = await import('@/lib/atk/print-client')
        await printFiscalReceipt(data.saleId)
      }
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally {
      setCancellingId(null)
    }
  }

  const fmt = (cents: number) => `€${(cents / 100).toFixed(2)}`
  const fmtItem = (price: number) => `€${(price / 10000).toFixed(2)}`

  // Stats
  const totalToday = useMemo(() => {
    const today = new Date().toDateString()
    return sales
      .filter(s => s.status === 'fiscalized' && new Date(s.issued_at).toDateString() === today)
      .reduce((s, r) => s + r.total_amount, 0)
  }, [sales])

  const totalMonth = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return sales
      .filter(s => s.status === 'fiscalized' && new Date(s.issued_at) >= start)
      .reduce((s, r) => s + r.total_amount, 0)
  }, [sales])

  const totalOffline = sales.filter(s => s.status === 'offline').length

  // Filtered
  const filtered = useMemo(() => sales.filter(s => {
    const matchSearch = !search ||
      s.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
      s.operator_id?.toLowerCase().includes(search.toLowerCase()) ||
      String(s.atk_transaction_id).includes(search)
    const matchStatus = filterStatus === 'all' || s.status === filterStatus
    const matchPay    = filterPay === 'all' || s.payment_method === filterPay
    const matchFrom   = !dateFrom || new Date(s.issued_at) >= new Date(dateFrom)
    const matchTo     = !dateTo   || new Date(s.issued_at) <= new Date(dateTo + 'T23:59:59')
    return matchSearch && matchStatus && matchPay && matchFrom && matchTo
  }), [sales, search, filterStatus, filterPay, dateFrom, dateTo])

  const filteredTotal = filtered
    .filter(s => s.status === 'fiscalized')
    .reduce((s, r) => s + r.total_amount, 0)

  function exportCSV() {
    const headers = ['Kuponi', 'Data', 'Totali', 'TVSH', 'Pa TVSH', 'Pagesa', 'Statusi', 'ATK TX', 'Operatori']
    const rows = filtered.map(s => [
      s.receipt_number ?? '',
      new Date(s.issued_at).toISOString().replace('T',' ').substring(0,16),
      (s.total_amount / 100).toFixed(2),
      (s.total_tax    / 100).toFixed(2),
      (s.total_no_tax / 100).toFixed(2),
      PAY_LABELS[s.payment_method]?.replace(/[^\w]/g, '') ?? s.payment_method,
      STATUS_META[s.status]?.label ?? s.status,
      s.atk_transaction_id ?? '',
      s.operator_id ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `shitjet-pos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/pos')}
            style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', fontSize: 13 }}>
            <ArrowLeft size={14} /> POS
          </button>
          <div>
            <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>
              Historia e Shitjeve
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{company.name} · 30 ditët e fundit</p>
          </div>
        </div>
        <button onClick={exportCSV}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, background: 'var(--bg-muted)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer' }}>
          <Download size={14} /> Eksporto CSV
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Shitjet Sot',    value: fmt(totalToday), color: '#10B981' },
          { label: 'Ky Muaj',        value: fmt(totalMonth), color: '#9B5CF8' },
          { label: 'Offline Pritur', value: totalOffline.toString(), color: totalOffline > 0 ? '#F59E0B' : '#6B7280' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: 'Poppins,sans-serif', lineHeight: 1, marginBottom: 6 }}>{k.value}</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Kërko kupon, operator, tx ID..." className="finex-input"
            style={{ paddingLeft: 32, fontSize: 13 }} />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 9, background: showFilters ? 'var(--purple-bg)' : 'var(--bg-muted)', border: showFilters ? '1px solid var(--border-purple)' : '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: showFilters ? 'var(--purple-light)' : 'var(--text-2)', cursor: 'pointer' }}>
          <Filter size={13} /> Filtra
        </button>
      </div>

      {showFilters && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16, padding: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statusi</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="finex-input" style={{ fontSize: 12 }}>
              <option value="all">Të gjitha</option>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pagesa</label>
            <select value={filterPay} onChange={e => setFilterPay(e.target.value)} className="finex-input" style={{ fontSize: 12 }}>
              <option value="all">Të gjitha</option>
              <option value="cash">Cash</option>
              <option value="card">Kartë</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nga data</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="finex-input" style={{ fontSize: 12 }} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deri më</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="finex-input" style={{ fontSize: 12 }} />
          </div>
          {(filterStatus !== 'all' || filterPay !== 'all' || dateFrom || dateTo) && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={() => { setFilterStatus('all'); setFilterPay('all'); setDateFrom(''); setDateTo('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', fontSize: 12, color: '#EF4444', cursor: 'pointer' }}>
                <X size={12} /> Pastro
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {filtered.length} kuponë · Total: <strong style={{ color: 'var(--text-1)' }}>{fmt(filteredTotal)}</strong>
        </p>
      </div>

      {/* Sales list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <Receipt size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>Asnjë shitje{search ? ` për "${search}"` : ''}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(sale => {
            const status   = STATUS_META[sale.status] ?? STATUS_META.pending
            const isExpand = expandedId === sale.id
            return (
              <div key={sale.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', transition: 'all 0.15s' }}>
                {/* Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 12, padding: '12px 16px', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpand ? null : sale.id)}>

                  {/* Left — receipt + time */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                        {sale.receipt_number || `#${sale.coupon_id}`}
                      </span>
                      {sale.coupon_type !== 'SALE' && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                          {TYPE_LABELS[sale.coupon_type]}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color:'var(--text-1)' }}>
                      {formatDate(sale.issued_at)}
                      {sale.operator_id && ` · ${sale.operator_id}`}
                    </p>
                  </div>

                  {/* ATK TX */}
                  <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-3)', textAlign: 'right' }}>
                    {sale.atk_transaction_id ? `#${sale.atk_transaction_id}` : '—'}
                  </p>

                  {/* Payment */}
                  <p style={{ fontSize: 12, color: 'var(--text-2)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {PAY_LABELS[sale.payment_method] ?? sale.payment_method}
                  </p>

                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: `${status.color}12`, color: status.color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {status.icon} {status.label}
                  </div>

                  {/* Total + expand */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--purple-light)', fontFamily: 'Poppins,sans-serif', minWidth: 70, textAlign: 'right' }}>
                      {fmt(sale.total_amount)}
                    </span>
                    {isExpand ? <ChevronUp size={14} color="#6B7280" /> : <ChevronDown size={14} color="#6B7280" />}
                  </div>
                </div>

                {/* Expanded — items */}
                {isExpand && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: 'var(--bg-muted)' }}>
                    {/* Items table */}
                    <div style={{ marginBottom: 12 }}>
                      {sale.sale_items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < sale.sale_items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                            {item.quantity}x {item.name}
                            <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 6 }}>({item.tax_rate})</span>
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{fmtItem(item.total)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20, fontSize: 11, color: 'var(--text-3)' }}>
                      <span>Pa TVSH: {fmt(sale.total_no_tax)}</span>
                      <span>TVSH: {fmt(sale.total_tax)}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>Total: {fmt(sale.total_amount)}</span>
                    </div>

                    {/* Cancel / Return buttons — vetëm për shitjet fiskale */}
                    {sale.status === 'fiscalized' && sale.coupon_type === 'SALE' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop:'1px solid var(--border)' }}>
                        <button
                          onClick={() => setConfirmCancel({ ...sale, _actionType: 'CANCEL' } as Sale & { _actionType: string })}
                          style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          Anulo Kuponin
                        </button>
                        <button
                          onClick={() => setConfirmCancel({ ...sale, _actionType: 'RETURN' } as Sale & { _actionType: string })}
                          style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          Kthim Malli
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm Cancel/Return Modal */}
      {confirmCancel && (
        <>
          <div onClick={() => setConfirmCancel(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, width: 'min(400px,92vw)', zIndex: 100, boxShadow:'0 4px 14px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-1)' }}>
              {(confirmCancel as Sale & { _actionType: string })._actionType === 'CANCEL'
                ? 'Anulo Kuponin'
                : 'Kthim Malli'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>
              Kuponi: <strong>{confirmCancel.receipt_number}</strong>
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
              Total: <strong>{fmt(confirmCancel.total_amount)}</strong>
            </p>

            {/* Partial return option */}
            {(confirmCancel as Sale & { _actionType: string })._actionType === 'RETURN' && confirmCancel.sale_items?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <button onClick={() => { setIsPartialReturn(!isPartialReturn); setReturnItems({}) }}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)', background: isPartialReturn ? 'var(--purple-bg)' : 'var(--bg-muted)', color: isPartialReturn ? 'var(--purple-light)' : 'var(--text-3)', cursor: 'pointer', fontWeight: 600 }}>
                    {isPartialReturn ? '✓ Kthim i Pjesshëm' : 'Kthim i Pjesshëm'}
                  </button>
                </div>
                {isPartialReturn && (
                  <div style={{ background: 'var(--bg-muted)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {confirmCancel.sale_items.map((item: any) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: 12, color: 'var(--text-1)', margin: 0, flex: 1 }}>{item.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>Max: {item.quantity}</p>
                          <input type="number" min="0" max={item.quantity} step="any"
                            value={returnItems[item.id] ?? item.quantity}
                            onChange={e => setReturnItems(p => ({ ...p, [item.id]: Math.min(item.quantity, Math.max(0, Number(e.target.value))) }))}
                            style={{ width: 56, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-1)', fontSize: 12, textAlign: 'center' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(confirmCancel as Sale & { _actionType: string })._actionType === 'CANCEL' && (
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="cancel-reason" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Arsyeja e anulimit
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {['Gabim gjatë shtypjes', 'Artikull i gabuar', 'Çmim i gabuar', 'Klienti hoqi dorë'].map(r => (
                    <button key={r} type="button" onClick={() => setCancelReason(r)}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)', background: cancelReason === r ? 'var(--purple-bg)' : 'var(--bg-muted)', color: cancelReason === r ? 'var(--purple-light)' : 'var(--text-2)', cursor: 'pointer', fontWeight: 600 }}>
                      {r}
                    </button>
                  ))}
                </div>
                <input id="cancel-reason" value={cancelReason} maxLength={120} onChange={e => setCancelReason(e.target.value)}
                  placeholder="Shkruaj arsyen…"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            )}

            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 20, padding: '10px 12px', background: 'var(--bg-muted)', borderRadius: 8 }}>
              {(confirmCancel as Sale & { _actionType: string })._actionType === 'CANCEL'
                ? 'Do të krijohet kupon CANCEL me referencë të kuponit origjinal. Kjo veprim regjistrohet te ATK.'
                : 'Do të krijohet kupon RETURN — klienti kthen mallin. Shuma kthehet.'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmCancel(null)} className="finex-button-secondary" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
                Anulo
              </button>
              <button
                disabled={!!cancellingId || ((confirmCancel as Sale & { _actionType: string })._actionType === 'CANCEL' && cancelReason.trim().length < 3)}
                onClick={() => cancelSale(confirmCancel, (confirmCancel as Sale & { _actionType: string })._actionType as 'CANCEL' | 'RETURN')}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: (confirmCancel as Sale & { _actionType: string })._actionType === 'CANCEL' ? '#F59E0B' : '#EF4444', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {cancellingId
                  ? <span style={{ width: 15, height: 15, border: '2px solid var(--border-color,#e2dcff)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : 'Konfirmo'}
              </button>
            </div>
          </div>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
