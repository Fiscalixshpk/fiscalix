'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, User, FileText, Loader2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

interface Invoice { id: string; invoice_number: string; total_amount: number; issue_date: string; diagnosis?: string }
interface Patient { id: string; full_name: string; gender?: string; birth_year?: number; phone?: string; notes?: string; invoices?: Invoice[] }

const GENDER_LABELS: Record<string, string> = { M: 'Mashkull', F: 'Femër', other: 'Tjetër' }

export default function PatientsClient({ patients: initial, companyId }: { patients: Patient[]; companyId: string }) {
  const router = useRouter()
  const [patients, setPatients] = useState(initial)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ full_name: '', gender: '', birth_year: '', phone: '', notes: '' })

  const filtered = patients.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase()))

  async function addPatient() {
    if (!form.full_name.trim()) { toast.error('Shto emrin e pacientit'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/patients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, company_id: companyId, birth_year: form.birth_year ? parseInt(form.birth_year) : null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPatients(prev => [...prev, { ...data, invoices: [] }].sort((a, b) => a.full_name.localeCompare(b.full_name)))
      setForm({ full_name: '', gender: '', birth_year: '', phone: '', notes: '' })
      setShowForm(false)
      toast.success('Pacienti u shtua')
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setSaving(false) }
  }

  const I = { background: 'var(--bg-input,var(--bg-muted))', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--text-1)', fontSize: 13, width: '100%', outline: 'none' }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>Pacientët</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{patients.length} pacientë të regjistruar</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 12, background: 'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
          <Plus size={15} /> Shto Pacient
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color:'var(--text-1)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kërko pacient..."
          style={{ ...I, paddingLeft: 36 }} />
      </div>

      {/* Add Form */}
      {showForm && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(90,31,214,0.25)', borderRadius: 16, padding: 22 }}>
          <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 800, color: 'var(--text-1)', marginBottom: 18 }}>Pacient i Ri</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Emri i Plotë *</label>
              <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Liridon Berisha" style={I} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gjinia</label>
              <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} style={I}>
                <option value="">Zgjidh...</option>
                <option value="M">Mashkull</option>
                <option value="F">Femër</option>
                <option value="other">Tjetër</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Viti i Lindjes</label>
              <input type="number" value={form.birth_year} onChange={e => setForm(p => ({ ...p, birth_year: e.target.value }))} placeholder="1985" style={I} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Telefoni</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+383..." style={I} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shënime</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Alergjitë, sëmundjet kronike..." style={I} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontSize: 13 }}>Anulo</button>
            <button onClick={addPatient} disabled={saving}
              style={{ flex: 2, padding: 10, borderRadius: 10, background: 'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {saving ? 'Duke ruajtur...' : 'Shto Pacientin'}
            </button>
          </div>
        </div>
      )}

      {/* Patients List */}
      {filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <User size={48} style={{ color: 'var(--text-3)', margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 16 }}>
            {search ? 'Asnjë pacient me këtë emër' : 'Nuk ka pacientë akoma'}
          </p>
          {!search && (
            <button onClick={() => setShowForm(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'rgba(90,31,214,0.1)', border: '1px solid rgba(90,31,214,0.2)', color: '#9B5CF8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={14} /> Shto Pacientin e Parë
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(patient => {
            const isExpanded = expanded === patient.id
            const age = patient.birth_year ? new Date().getFullYear() - patient.birth_year : null
            const invoiceCount = patient.invoices?.length || 0
            return (
              <div key={patient.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                {/* Patient row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
                  onClick={() => setExpanded(isExpanded ? null : patient.id)}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: patient.gender === 'F' ? 'rgba(236,72,153,0.15)' : 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                    {patient.gender === 'F' ? '👩' : patient.gender === 'M' ? '👨' : '🧑'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 3 }}>{patient.full_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {patient.gender ? GENDER_LABELS[patient.gender] : ''}
                      {age ? ` · ${age} vjeç` : ''}
                      {patient.birth_year ? ` (${patient.birth_year})` : ''}
                      {patient.phone ? ` · ${patient.phone}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#9B5CF8' }}>{invoiceCount}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-3)' }}>vizita</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/invoices/new?patient_id=${patient.id}&patient_name=${encodeURIComponent(patient.full_name)}&patient_gender=${patient.gender || ''}&patient_birth_year=${patient.birth_year || ''}`) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: '1px solid rgba(90,31,214,0.25)', background: 'rgba(90,31,214,0.08)', color: '#9B5CF8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      <FileText size={12} /> Faturë
                    </button>
                    {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-3)' }} />}
                  </div>
                </div>

                {/* History */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px', background:'var(--bg-muted)' }}>
                    {patient.notes && (
                      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', marginBottom: 12 }}>
                        <p style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, marginBottom: 3 }}>Shënime mjekësore</p>
                        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{patient.notes}</p>
                      </div>
                    )}
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Historia ({invoiceCount} vizita)</p>
                    {invoiceCount === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>Asnjë vizitë e regjistruar akoma</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(patient.invoices || []).map(inv => (
                          <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 9, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{inv.invoice_number}</p>
                              {inv.diagnosis && <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Diagnoza: {inv.diagnosis}</p>}
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDate(inv.issue_date)}</p>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>€{Number(inv.total_amount).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
