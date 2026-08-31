'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, CheckCircle, XCircle, Clock, Send, ArrowRight, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',    color: '#6B7280', bg: 'rgba(107,114,128,.12)' },
  sent:      { label: 'Dërguar', color: '#3B82F6', bg: 'rgba(59,130,246,.12)' },
  accepted:  { label: 'Pranuar', color: '#10B981', bg: 'rgba(16,185,129,.12)' },
  rejected:  { label: 'Refuzuar',color: '#EF4444', bg: 'rgba(239,68,68,.12)'  },
  expired:   { label: 'Skaduar', color: '#F59E0B', bg: 'rgba(245,158,11,.12)' },
  converted: { label: 'Faturë',  color: '#8B5CF6', bg: 'rgba(139,92,246,.12)' },
}

type Item = { name: string; quantity: number; unit_price: number; tax_rate: number; total: number }
type Quote = { id: string; quote_number: string; client_name: string; status: string; total: number; valid_until: string | null; created_at: string; items: Item[] }
type Client = { id: string; name: string; email: string }

export default function QuotesClient({ quotes, clients, companyId }: { quotes: Quote[]; clients: Client[]; companyId: string }) {
  const router = useRouter()
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_name: '', client_email: '', valid_until: '', notes: '', payment_terms: 'net30',
  })
  const [items, setItems] = useState<Item[]>([
    { name: '', quantity: 1, unit_price: 0, tax_rate: 18, total: 0 }
  ])

  function updateItem(i: number, field: keyof Item, val: string | number) {
    const next = [...items]
    next[i] = { ...next[i], [field]: val }
    const qty = Number(next[i].quantity), price = Number(next[i].unit_price)
    const tax = Number(next[i].tax_rate)
    next[i].total = qty * price * (1 + tax / 100)
    setItems(next)
  }

  const grandTotal = items.reduce((s, it) => s + it.total, 0)
  const taxTotal   = items.reduce((s, it) => s + it.quantity * it.unit_price * (it.tax_rate / 100), 0)

  async function save(status: 'draft' | 'sent') {
    if (!form.client_name) { toast.error('Vendos emrin e klientit'); return }
    setSaving(true)
    try {
      const num = 'OF-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4)
      const res = await fetch('/api/b2b/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status, total: grandTotal, tax_total: taxTotal, quote_number: num, company_id: companyId, items }),
      })
      if (!res.ok) throw new Error('Gabim')
      toast.success(status === 'sent' ? 'Oferta u dërgua!' : 'Oferta u ruajt!')
      setShowNew(false)
      router.refresh()
    } catch { toast.error('Gabim gjatë ruajtjes') }
    finally { setSaving(false) }
  }

  async function convert(quoteId: string) {
    try {
      const res = await fetch('/api/b2b/quotes/' + quoteId + '/convert', { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('U konvertua në faturë!')
      router.push('/invoices')
    } catch { toast.error('Gabim') }
  }

  const S: Record<string, React.CSSProperties> = {
    wrap:    { padding: '28px 32px', maxWidth: 1100, margin: '0 auto' },
    hdr:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
    title:   { fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 },
    btn:     { display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 9, background: 'var(--purple)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
    card:    { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 20, alignItems: 'center' },
    badge:   (s: string) => ({ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: STATUS_MAP[s]?.color, background: STATUS_MAP[s]?.bg }),
    modal:   { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    box:     { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' as const },
    inp:     { width: '100%', padding: '10px 13px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box' as const },
    lbl:     { fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 5, display: 'block', textTransform: 'uppercase' as const, letterSpacing: '.04em' },
  }

  return (
    <div style={S.wrap}>
      <div style={S.hdr}>
        <h1 style={S.title}>Ofertat</h1>
        <button style={S.btn} onClick={() => setShowNew(true)}><Plus size={15} /> Ofertë e re</button>
      </div>

      {quotes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <FileText size={40} style={{ marginBottom: 14, opacity: .4 }} />
          <p style={{ fontSize: 15 }}>Nuk keni oferta ende.</p>
        </div>
      )}

      {quotes.map(q => (
        <div key={q.id} style={S.card}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{q.quote_number}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{q.client_name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>€{q.total.toFixed(2)}</div>
            {q.valid_until && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Deri {new Date(q.valid_until).toLocaleDateString('sq-AL')}</div>}
          </div>
          <span style={S.badge(q.status)}>{STATUS_MAP[q.status]?.label}</span>
          {q.status === 'accepted' && (
            <button onClick={() => convert(q.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, background: 'rgba(139,92,246,.15)', color: 'var(--purple)', border: '1px solid rgba(139,92,246,.3)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              <ArrowRight size={13} /> Bëj Faturë
            </button>
          )}
        </div>
      ))}

      {showNew && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setShowNew(false)}>
          <div style={S.box}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700 }}>Ofertë e re</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={S.lbl}>Klienti *</label>
                <input style={S.inp} value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                  placeholder="Emri i klientit" list="clients-list" />
                <datalist id="clients-list">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
              </div>
              <div>
                <label style={S.lbl}>Email klientit</label>
                <input style={S.inp} type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} placeholder="email@klienti.com" />
              </div>
              <div>
                <label style={S.lbl}>Vlefshme deri</label>
                <input style={S.inp} type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
              </div>
              <div>
                <label style={S.lbl}>Kushtet e pagesës</label>
                <select style={S.inp} value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}>
                  <option value="immediate">Menjëherë</option>
                  <option value="net15">Net 15 ditë</option>
                  <option value="net30">Net 30 ditë</option>
                  <option value="net60">Net 60 ditë</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={S.lbl}>Shënime</label>
              <textarea style={{ ...S.inp, height: 70, resize: 'vertical' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Kushte, vërejtje..." />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                {['Shërbimi/Produkti', 'Sasia', 'Çmimi', 'TVSH %', ''].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</div>
                ))}
              </div>
              {items.map((it, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input style={S.inp} value={it.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Emri" />
                  <input style={S.inp} type="number" value={it.quantity} onChange={e => updateItem(i, 'quantity', +e.target.value)} min={0} />
                  <input style={S.inp} type="number" value={it.unit_price} onChange={e => updateItem(i, 'unit_price', +e.target.value)} min={0} step=".01" />
                  <select style={S.inp} value={it.tax_rate} onChange={e => updateItem(i, 'tax_rate', +e.target.value)}>
                    <option value={0}>0%</option><option value={8}>8%</option><option value={18}>18%</option>
                  </select>
                  <button onClick={() => setItems(items.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>×</button>
                </div>
              ))}
              <button onClick={() => setItems([...items, { name: '', quantity: 1, unit_price: 0, tax_rate: 18, total: 0 }])}
                style={{ fontSize: 12, color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
                + Shto rresht
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', padding: '12px 0', textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>TVSH: €{taxTotal.toFixed(2)}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>Totali: €{grandTotal.toFixed(2)}</div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowNew(false)} style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid var(--border)', background: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13 }}>Anulo</button>
              <button onClick={() => save('draft')} disabled={saving} style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-1)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Ruaj Draft</button>
              <button onClick={() => save('sent')} disabled={saving} style={{ padding: '10px 20px', borderRadius: 9, background: 'var(--purple)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Send size={14} /> Dërgo Ofertën
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
