'use client'
import { useState } from 'react'
import { Plus, FileSignature, CheckCircle, Clock, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Contract = {
  id: string
  contract_number: string
  client_name: string
  client_email?: string
  title: string
  value: number
  currency: string
  payment_terms: string
  start_date: string
  end_date?: string
  status: 'draft' | 'active' | 'expired' | 'cancelled'
  notes?: string
  created_at: string
}

const STATUS = {
  draft:     { label: 'Draft',    color: '#71717A', bg: 'rgba(113,113,122,.12)' },
  active:    { label: 'Aktive',   color: '#10B981', bg: 'rgba(16,185,129,.12)'  },
  expired:   { label: 'Skaduar', color: '#F59E0B', bg: 'rgba(245,158,11,.12)'  },
  cancelled: { label: 'Anuluar', color: '#EF4444', bg: 'rgba(239,68,68,.12)'   },
}

const PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Net 90', 'Mujore', 'Tremujore', 'Vjetore', 'Parapagim']

export default function ContractsClient({ contracts: initial, companyId }: { contracts: Contract[]; companyId: string }) {
  const [contracts, setContracts] = useState(initial)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    client_name: '', client_email: '', title: '',
    value: '', payment_terms: 'Mujore',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '', notes: '',
  })

  async function handleCreate() {
    if (!form.client_name.trim() || !form.title.trim()) { toast.error('Plotëso fushat e detyrueshme'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/b2b/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, company_id: companyId, value: parseFloat(form.value) || 0 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setContracts(prev => [data.contract, ...prev])
      setShowNew(false)
      setForm({ client_name: '', client_email: '', title: '', value: '', payment_terms: 'Mujore', start_date: new Date().toISOString().split('T')[0], end_date: '', notes: '' })
      toast.success('Kontrata u krijua')
    } catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/b2b/contracts/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) { setContracts(p => p.map(c => c.id === id ? { ...c, status: status as any } : c)); toast.success('Statusi u ndryshua') }
  }

  const S: Record<string, any> = {
    page: { padding: '32px 28px', maxWidth: 1100, margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
    title: { fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0, letterSpacing: '-.03em' },
    sub: { fontSize: 13, color: 'var(--text-3)', marginTop: 4 },
    btn: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 12 },
    input: { width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box' as const, outline: 'none' },
    label: { fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '.04em' },
    pill: (s: string) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, color: STATUS[s as keyof typeof STATUS]?.color, background: STATUS[s as keyof typeof STATUS]?.bg }),
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}><FileSignature size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Kontratat</h1>
          <p style={S.sub}>Menaxho kontratat me klientët B2B</p>
        </div>
        <button style={S.btn} onClick={() => setShowNew(true)}><Plus size={15} /> Kontratë e re</button>
      </div>

      {showNew && (
        <div style={{ ...S.card, borderColor: 'rgba(139,92,246,.3)', marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700 }}>Kontratë e re</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><label style={S.label}>Klienti *</label><input style={S.input} placeholder="Emri i klientit" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} /></div>
            <div><label style={S.label}>Email Klientit</label><input style={S.input} type="email" placeholder="info@klienti.com" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Titulli i Kontratës *</label><input style={S.input} placeholder="p.sh. Kontratë mirëmbajtjeje software 2026" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><label style={S.label}>Vlera (€)</label><input style={S.input} type="number" min="0" step="0.01" placeholder="0.00" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
            <div><label style={S.label}>Kushtet e Pagesës</label>
              <select style={S.input} value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}>
                {PAYMENT_TERMS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div><label style={S.label}>Data e Fillimit</label><input style={S.input} type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><label style={S.label}>Data e Mbarimit</label><input style={S.input} type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Shënime</label><textarea style={{ ...S.input, height: 70, resize: 'none' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Termat dhe kushtet, shënime shtesë..." /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setShowNew(false)} style={{ ...S.btn, background: 'var(--bg-muted)', color: 'var(--text-2)' }}>Anulo</button>
            <button onClick={handleCreate} disabled={loading} style={S.btn}>{loading ? 'Duke ruajtur...' : 'Krijo Kontratën'}</button>
          </div>
        </div>
      )}

      {contracts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <FileSignature size={40} style={{ opacity: .3, marginBottom: 12 }} />
          <p>Nuk ka kontrata ende</p>
        </div>
      ) : contracts.map(c => (
        <div key={c.id} style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>{c.client_name}</span>
                <span style={S.pill(c.status)}>{STATUS[c.status]?.label}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                {c.contract_number} · {c.payment_terms}
                {c.start_date && ` · ${new Date(c.start_date).toLocaleDateString('sq-AL')}`}
                {c.end_date && ` → ${new Date(c.end_date).toLocaleDateString('sq-AL')}`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>€{Number(c.value).toFixed(2)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{new Date(c.created_at).toLocaleDateString('sq-AL')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            {c.status === 'draft' && <button onClick={() => updateStatus(c.id, 'active')} style={{ ...S.btn, background: 'rgba(16,185,129,.12)', color: '#10B981', padding: '6px 12px', fontSize: 12 }}><CheckCircle size={12} /> Aktivizo</button>}
            {c.status === 'active' && <button onClick={() => updateStatus(c.id, 'expired')} style={{ ...S.btn, background: 'rgba(245,158,11,.12)', color: '#F59E0B', padding: '6px 12px', fontSize: 12 }}><Clock size={12} /> Shëno si Skaduar</button>}
            {!['cancelled', 'expired'].includes(c.status) && <button onClick={() => updateStatus(c.id, 'cancelled')} style={{ ...S.btn, background: 'rgba(239,68,68,.08)', color: '#EF4444', padding: '6px 12px', fontSize: 12 }}><AlertCircle size={12} /> Anulo</button>}
          </div>
        </div>
      ))}
    </div>
  )
}
