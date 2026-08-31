'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Loader2, Wallet, Landmark, Trash2, Download, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Entry {
  id: string; account_code: string; bank_name?: string; entry_date: string
  description: string; direction: 'in' | 'out'; amount: number
  chart_of_accounts?: { name_sq: string }
}
interface Company { id: string; name: string }

interface Props {
  company: Company | null
  entryType: 'cash' | 'bank'
}

const BANK_ACCOUNTS = [
  { code: '1110', label: 'Banka ProCredit' },
  { code: '1120', label: 'Banka Raiffeisen' },
  { code: '1130', label: 'Banka TEB' },
  { code: '1140', label: 'Banka BKT' },
  { code: '1150', label: 'PayPal / Stripe' },
]
const CASH_ACCOUNTS = [
  { code: '1000', label: 'Arka Qendrore' },
  { code: '1010', label: 'Arka EUR' },
  { code: '1020', label: 'Arka Valutë' },
  { code: '1030', label: 'Arka POS' },
]

export default function CashBankBookClient({ company, entryType }: Props) {
  const isCash = entryType === 'cash'
  const accounts = isCash ? CASH_ACCOUNTS : BANK_ACCOUNTS
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`)
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10))
  const [downloading, setDownloading] = useState(false)

  const [form, setForm] = useState({
    account_code: accounts[0].code, entry_date: new Date().toISOString().slice(0, 10),
    description: '', direction: 'in' as 'in' | 'out', amount: '',
  })

  async function load() {
    if (!company?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/cash-bank-entries?company_id=${company.id}&entry_type=${entryType}`)
      const data = await res.json()
      setEntries(data.entries || [])
    } catch {
      toast.error('Gabim gjatë ngarkimit')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [company?.id, entryType])

  async function addEntry() {
    if (!form.amount || !form.description.trim()) { toast.error('Plotëso shumën dhe përshkrimin'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/cash-bank-entries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: company?.id, entry_type: entryType,
          account_code: form.account_code,
          bank_name: !isCash ? accounts.find(a => a.code === form.account_code)?.label : undefined,
          entry_date: form.entry_date, description: form.description.trim(),
          direction: form.direction, amount: Number(form.amount),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Hyrja u shtua!')
      setShowAdd(false)
      setForm({ account_code: accounts[0].code, entry_date: new Date().toISOString().slice(0, 10), description: '', direction: 'in', amount: '' })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally { setSubmitting(false) }
  }

  async function deleteEntry(id: string) {
    if (!confirm('Fshi këtë hyrje?')) return
    try {
      await fetch(`/api/cash-bank-entries/${id}`, { method: 'DELETE' })
      setEntries(prev => prev.filter(e => e.id !== id))
      toast.success('Hyrja u fshi')
    } catch {
      toast.error('Gabim')
    }
  }

  async function downloadExcel() {
    if (!company?.id) return
    setDownloading(true)
    try {
      const res = await fetch(`/api/accountant/books?company_id=${company.id}&type=${isCash ? 'arka' : 'banka'}&from=${from}&to=${to}`)
      if (!res.ok) throw new Error('Gabim gjatë gjenerimit')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${isCash ? 'Libri_Arkes' : 'Libri_Bankes'}_${company.name.replace(/\s+/g, '_')}.xlsx`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('U shkarkua!')
    } catch {
      toast.error('Gabim gjatë shkarkimit')
    } finally { setDownloading(false) }
  }

  const totalIn = entries.filter(e => e.direction === 'in').reduce((s, e) => s + Number(e.amount), 0)
  const totalOut = entries.filter(e => e.direction === 'out').reduce((s, e) => s + Number(e.amount), 0)
  const balance = totalIn - totalOut

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 10 }}>
            {isCash ? <Wallet size={22} style={{ color: '#F59E0B' }} /> : <Landmark size={22} style={{ color: '#9B5CF8' }} />}
            {isCash ? 'Libri i Arkës' : 'Libri i Bankës'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Regjistro hyrjet dhe daljet e {isCash ? 'arkës' : 'bankës'}, dhe shkarko për ATK.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="finex-button-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}>
          <Plus size={16} /> Shto Hyrje
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div className="finex-card" style={{ padding: 16, borderRadius: 14 }}>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Hyrje</p>
          <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 19, fontWeight: 800, color: '#10B981' }}>€ {totalIn.toFixed(2)}</p>
        </div>
        <div className="finex-card" style={{ padding: 16, borderRadius: 14 }}>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Dalje</p>
          <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 19, fontWeight: 800, color: '#EF4444' }}>€ {totalOut.toFixed(2)}</p>
        </div>
        <div className="finex-card" style={{ padding: 16, borderRadius: 14 }}>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Balanca</p>
          <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 19, fontWeight: 800, color: balance >= 0 ? '#10B981' : '#EF4444' }}>€ {balance.toFixed(2)}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
        <div>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Nga</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="finex-input" style={{ fontSize: 12.5 }} />
        </div>
        <div>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Deri</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="finex-input" style={{ fontSize: 12.5 }} />
        </div>
        <button onClick={downloadExcel} disabled={downloading}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
          {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Shkarko Excel
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: 40 }}>Duke ngarkuar...</p>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Nuk ka hyrje ende. Shto të parën me butonin lart.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              {e.direction === 'in'
                ? <ArrowDownCircle size={18} style={{ color: '#10B981', flexShrink: 0 }} />
                : <ArrowUpCircle size={18} style={{ color: '#EF4444', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{e.description}</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {e.chart_of_accounts?.name_sq || e.account_code}{e.bank_name ? ` · ${e.bank_name}` : ''} · {new Date(e.entry_date).toLocaleDateString('en-GB')}
                </p>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: e.direction === 'in' ? '#10B981' : '#EF4444', flexShrink: 0 }}>
                {e.direction === 'in' ? '+' : '-'}€ {Number(e.amount).toFixed(2)}
              </p>
              <button onClick={() => deleteEntry(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', flexShrink: 0 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <>
          <div onClick={() => setShowAdd(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, width: 'min(420px,92vw)', zIndex: 100 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Shto Hyrje — {isCash ? 'Arka' : 'Banka'}</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'var(--bg-muted)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-3)' }}><X size={15} /></button>
            </div>

            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>{isCash ? 'Arka' : 'Banka'}</label>
            <select value={form.account_code} onChange={e => setForm(p => ({ ...p, account_code: e.target.value }))} className="finex-input" style={{ marginBottom: 12 }}>
              {accounts.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button type="button" onClick={() => setForm(p => ({ ...p, direction: 'in' }))}
                style={{ flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  border: form.direction === 'in' ? '1.5px solid #10B981' : '1px solid var(--border)',
                  background: form.direction === 'in' ? 'rgba(16,185,129,0.1)' : 'var(--bg-muted)',
                  color: form.direction === 'in' ? '#10B981' : 'var(--text-2)' }}>
                Hyrje (+)
              </button>
              <button type="button" onClick={() => setForm(p => ({ ...p, direction: 'out' }))}
                style={{ flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  border: form.direction === 'out' ? '1.5px solid #EF4444' : '1px solid var(--border)',
                  background: form.direction === 'out' ? 'rgba(239,68,68,0.1)' : 'var(--bg-muted)',
                  color: form.direction === 'out' ? '#EF4444' : 'var(--text-2)' }}>
                Dalje (-)
              </button>
            </div>

            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Shuma (€)</label>
            <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className="finex-input" style={{ marginBottom: 12 }} />

            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Data</label>
            <input type="date" value={form.entry_date} onChange={e => setForm(p => ({ ...p, entry_date: e.target.value }))} className="finex-input" style={{ marginBottom: 12 }} />

            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Përshkrimi</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="p.sh. Pagesë qiraje" className="finex-input" style={{ marginBottom: 18 }} />

            <button onClick={addEntry} disabled={submitting} className="finex-button-primary w-full py-2.5">
              {submitting ? <Loader2 size={15} className="animate-spin" style={{ margin: '0 auto' }} /> : 'Shto Hyrjen'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
