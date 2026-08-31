'use client'
import { useState } from 'react'
import { Plus, ShoppingCart, CheckCircle, Clock, XCircle, FileText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type PurchaseOrder = {
  id: string
  order_number: string
  supplier_name: string
  supplier_email?: string
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'
  total_amount: number
  currency: string
  payment_terms?: string
  expected_date?: string
  notes?: string
  items: { name: string; qty: number; price: number; unit: string }[]
  created_at: string
}

const STATUS_CONFIG = {
  draft:     { label: 'Draft',      color: '#71717A', bg: 'rgba(113,113,122,.12)' },
  sent:      { label: 'Dërguar',    color: '#F59E0B', bg: 'rgba(245,158,11,.12)'  },
  confirmed: { label: 'Konfirmuar', color: '#8B5CF6', bg: 'rgba(139,92,246,.12)'  },
  received:  { label: 'Marrë',      color: '#10B981', bg: 'rgba(16,185,129,.12)'  },
  cancelled: { label: 'Anuluar',    color: '#EF4444', bg: 'rgba(239,68,68,.12)'   },
}

const PAYMENT_TERMS_OPTIONS = [
  'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Net 90',
  'Pagesa menjëherë', 'Parapagim 50%', 'Parapagim 100%',
]

export default function PurchaseOrdersClient({
  orders: initial, companyId,
}: {
  orders: PurchaseOrder[]
  company: any
  companyId: string
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>(initial)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    supplier_name: '', supplier_email: '', payment_terms: 'Net 30',
    expected_date: '', notes: '',
    items: [{ name: '', qty: 1, price: 0, unit: 'copë' }],
  })

  const total = form.items.reduce((s, i) => s + i.qty * i.price, 0)

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { name: '', qty: 1, price: 0, unit: 'copë' }] }))
  }
  function removeItem(idx: number) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }
  function updateItem(idx: number, key: string, val: any) {
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [key]: val } : it) }))
  }

  async function handleCreate() {
    if (!form.supplier_name.trim()) { toast.error('Emri i furnitorit kërkohet'); return }
    if (form.items.some(i => !i.name.trim())) { toast.error('Plotëso të gjithë artikujt'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, company_id: companyId, total_amount: total }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrders(prev => [data.order, ...prev])
      setShowNew(false)
      setForm({ supplier_name: '', supplier_email: '', payment_terms: 'Net 30', expected_date: '', notes: '', items: [{ name: '', qty: 1, price: 0, unit: 'copë' }] })
      toast.success('Porosia u krijua')
    } catch (err: any) {
      toast.error(err.message || 'Gabim')
    } finally { setLoading(false) }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/purchase-orders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o))
      toast.success('Statusi u ndryshua')
    }
  }

  const S: Record<string, any> = {
    page: { padding: '32px 28px', maxWidth: 1100, margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
    title: { fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0, letterSpacing: '-.03em' },
    sub: { fontSize: 13, color: 'var(--text-3)', marginTop: 4 },
    btn: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 12 },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    pill: (s: string) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, color: STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.color, background: STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.bg }),
    empty: { textAlign: 'center' as const, padding: '60px 0', color: 'var(--text-3)' },
    input: { width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box' as const, outline: 'none' },
    label: { fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '.04em' },
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}><ShoppingCart size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Porositë e Blerjes</h1>
          <p style={S.sub}>Purchase Orders — gjurmo porositë te furnitorët</p>
        </div>
        <button style={S.btn} onClick={() => setShowNew(true)}>
          <Plus size={15} /> Porosia e re
        </button>
      </div>

      {/* New Order Form */}
      {showNew && (
        <div style={{ ...S.card, borderColor: 'rgba(139,92,246,.3)', marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Porosia e re</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={S.label}>Furnitori *</label>
              <input style={S.input} placeholder="Emri i furnitorit" value={form.supplier_name}
                onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} />
            </div>
            <div>
              <label style={S.label}>Email Furnitorit</label>
              <input style={S.input} type="email" placeholder="info@furnitori.com" value={form.supplier_email}
                onChange={e => setForm(f => ({ ...f, supplier_email: e.target.value }))} />
            </div>
            <div>
              <label style={S.label}>Kushtet e Pagesës</label>
              <select style={S.input} value={form.payment_terms}
                onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}>
                {PAYMENT_TERMS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Data e Pritshme e Dorëzimit</label>
              <input style={S.input} type="date" value={form.expected_date}
                onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} />
            </div>
          </div>

          {/* Items */}
          <label style={S.label}>Artikujt</label>
          {form.items.map((item, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 80px auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input style={S.input} placeholder="Emri i artikullit" value={item.name}
                onChange={e => updateItem(idx, 'name', e.target.value)} />
              <input style={S.input} type="number" min="1" placeholder="Sasi" value={item.qty}
                onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 1)} />
              <input style={S.input} type="number" min="0" step="0.01" placeholder="Çmimi €" value={item.price || ''}
                onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)} />
              <input style={S.input} placeholder="copë" value={item.unit}
                onChange={e => updateItem(idx, 'unit', e.target.value)} />
              {form.items.length > 1 && (
                <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button onClick={addItem} style={{ fontSize: 12, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontWeight: 600 }}>
            + Shto artikull
          </button>

          <div style={{ marginTop: 14 }}>
            <label style={S.label}>Shënime</label>
            <textarea style={{ ...S.input, height: 70, resize: 'none' }} placeholder="Shënime shtesë..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>Totali: €{total.toFixed(2)}</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ ...S.btn, background: 'var(--bg-muted)', color: 'var(--text-2)' }}>Anulo</button>
              <button onClick={handleCreate} disabled={loading} style={S.btn}>
                {loading ? 'Duke ruajtur...' : 'Krijo Porosinë'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      {orders.length === 0 ? (
        <div style={S.empty}>
          <ShoppingCart size={40} style={{ opacity: .3, marginBottom: 12 }} />
          <p>Nuk ka porosi ende</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Krijo porosinë e parë te furnitorët tuaj</p>
        </div>
      ) : orders.map(order => (
        <div key={order.id} style={S.card}>
          <div style={S.row}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>{order.supplier_name}</span>
                <span style={S.pill(order.status)}>{STATUS_CONFIG[order.status]?.label}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                {order.order_number} · {order.payment_terms || 'Net 30'}
                {order.expected_date && ` · Dorëzim: ${new Date(order.expected_date).toLocaleDateString('sq-AL')}`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>€{Number(order.total_amount).toFixed(2)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                {new Date(order.created_at).toLocaleDateString('sq-AL')}
              </div>
            </div>
          </div>

          {/* Status actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            {order.status === 'draft' && (
              <button onClick={() => updateStatus(order.id, 'sent')} style={{ ...S.btn, background: 'rgba(245,158,11,.12)', color: '#F59E0B', padding: '6px 12px', fontSize: 12 }}>
                <FileText size={12} /> Dërgo
              </button>
            )}
            {order.status === 'sent' && (
              <button onClick={() => updateStatus(order.id, 'confirmed')} style={{ ...S.btn, background: 'rgba(139,92,246,.12)', color: '#8B5CF6', padding: '6px 12px', fontSize: 12 }}>
                <CheckCircle size={12} /> Konfirmo
              </button>
            )}
            {order.status === 'confirmed' && (
              <button onClick={() => updateStatus(order.id, 'received')} style={{ ...S.btn, background: 'rgba(16,185,129,.12)', color: '#10B981', padding: '6px 12px', fontSize: 12 }}>
                <CheckCircle size={12} /> Shëno si Marrë
              </button>
            )}
            {!['received', 'cancelled'].includes(order.status) && (
              <button onClick={() => updateStatus(order.id, 'cancelled')} style={{ ...S.btn, background: 'rgba(239,68,68,.08)', color: '#EF4444', padding: '6px 12px', fontSize: 12 }}>
                <XCircle size={12} /> Anulo
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
