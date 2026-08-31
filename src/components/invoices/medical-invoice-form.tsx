'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, ArrowLeft, QrCode } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import dynamic from 'next/dynamic'
const PatientAutocomplete = dynamic(() => import('./patient-autocomplete'), { ssr: false })
const ServicePicker = dynamic(() => import('./service-picker'), { ssr: false })

interface Company {
  id: string; name: string; vat_number?: string; address?: string
  phone?: string; email?: string; is_vat_registered?: boolean; business_type?: string | null
}

interface LineItem { description: string; unit_price: number }

interface Props { company: Company; userId: string; nextInvoiceNumber?: string }

export default function MedicalInvoiceForm({ company, userId, nextInvoiceNumber }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    invoice_number: nextInvoiceNumber || '',
    issue_date: today,
    patient_name: '',
    patient_id: '',
    patient_gender: '',
    patient_birth_year: '',
    diagnosis: '',
    notes: '',
  })
  const [items, setItems] = useState<LineItem[]>([{ description: '', unit_price: 0 }])
  const [saving, setSaving] = useState(false)

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems(prev => prev.map((item, j) => j === i ? { ...item, [field]: value } : item))
  }

  const total = items.reduce((s, i) => s + Number(i.unit_price), 0)

  async function save(status: 'paid' | 'pending' = 'paid') {
    if (!form.patient_name.trim()) { toast.error('Shto emrin e pacientit'); return }
    if (items.every(i => !i.description.trim())) { toast.error('Shto të paktën një shërbim'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Jo i autentikuar')

      // Auto-create patient nëse nuk ekziston
      let patientId = form.patient_id
      if (!patientId && form.patient_name.trim()) {
        const res = await fetch('/api/patients', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: company.id,
            full_name: form.patient_name,
            gender: form.patient_gender || null,
            birth_year: form.patient_birth_year ? parseInt(form.patient_birth_year) : null,
          })
        })
        if (res.ok) { const p = await res.json(); patientId = p.id }
      }

      // Krijo faturën
      const { data: invoice, error } = await supabase.from('invoices').insert({
        company_id: company.id,
        created_by: user.id,
        invoice_number: form.invoice_number,
        issue_date: form.issue_date,
        due_date: form.issue_date,
        client_name: form.patient_name,
        patient_id: patientId || null,
        patient_gender: form.patient_gender || null,
        patient_birth_year: form.patient_birth_year ? parseInt(form.patient_birth_year) : null,
        diagnosis: form.diagnosis || null,
        notes: form.notes || null,
        status,
        subtotal: total,
        tax_rate: 0,
        tax_amount: 0,
        total_amount: total,
        total,
        payment_method: 'Cash',
        currency: 'EUR',
      }).select().single()

      if (error) throw new Error(error.message)

      // Shto shërbimet
      const validItems = items.filter(i => i.description.trim())
      if (validItems.length > 0) {
        await supabase.from('invoice_items').insert(
          validItems.map((item, i) => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: 1,
            unit_price: item.unit_price,
            total: item.unit_price,
            sort_order: i,
          }))
        )
      }

      toast.success(`Raporti u krijua: ${invoice.invoice_number}`)
      router.push('/invoices')
      router.refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally { setSaving(false) }
  }

  const I = { background: 'var(--bg-input,var(--bg-muted))', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--text-1)', fontSize: 13, width: '100%', outline: 'none' }
  const L = { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
  const S = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }

  return (
    <div className="page-enter">
      <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13 }}>
        <ArrowLeft size={15} /> Kthehu
      </button>

      <div className="form-row">
        <div className="form-main">

          {/* Nr. Raportit + Data */}
          <div style={S}>
            <div className="form-grid-2">
              <div>
                <label style={L}>Nr. Raportit</label>
                <input value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} style={I} />
              </div>
              <div>
                <label style={L}>Data e Kontrollit</label>
                <input type="date" value={form.issue_date} onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))} style={I} />
              </div>
            </div>
          </div>

          {/* Pacienti */}
          <div style={S}>
            <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Pacienti</h3>
            <div className="form-grid-2">
              <div style={{ gridColumn: '1/-1' }}>
                <label style={L}>Emri i Pacientit *</label>
                <PatientAutocomplete
                  companyId={company.id}
                  value={form.patient_name}
                  onChange={name => setForm(p => ({ ...p, patient_name: name, patient_id: '' }))}
                  onSelect={patient => setForm(p => ({
                    ...p,
                    patient_name: patient.full_name,
                    patient_id: patient.id,
                    patient_gender: patient.gender || '',
                    patient_birth_year: patient.birth_year ? String(patient.birth_year) : '',
                  }))}
                />
              </div>
              <div>
                <label style={L}>Gjinia</label>
                <select value={form.patient_gender} onChange={e => setForm(p => ({ ...p, patient_gender: e.target.value }))} style={I}>
                  <option value="">Zgjidh...</option>
                  <option value="M">Mashkull</option>
                  <option value="F">Femër</option>
                  <option value="other">Tjetër</option>
                </select>
              </div>
              <div>
                <label style={L}>Viti i Lindjes</label>
                <input type="number" value={form.patient_birth_year} onChange={e => setForm(p => ({ ...p, patient_birth_year: e.target.value }))} placeholder="1985" style={I} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={L}>Diagnoza / Arsyeja e Vizitës</label>
                <input value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))}
                  placeholder="p.sh. Kontroll i rregullt, Ekografi obstetrike, Pap test..." style={I} />
              </div>
            </div>
          </div>

          {/* Shërbimet */}
          <div style={S}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Shërbimet Mjekësore</h3>
              <ServicePicker companyId={company.id} onSelect={service => {
                setItems(prev => [...prev, { description: service.name, unit_price: service.price }])
              }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                    placeholder="Emri i shërbimit" style={{ ...I, flex: 1, minWidth: 120 }} />
                  <div style={{ position: 'relative', flexShrink: 0, width: 100 }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 12, zIndex: 1 }}>€</span>
                    <input type="number" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                      style={{ ...I, width: '100%', paddingLeft: 24 }} />
                  </div>
                  {items.length > 1 && (
                    <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                      style={{ padding: '8px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setItems(prev => [...prev, { description: '', unit_price: 0 }])}
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '7px 14px', borderRadius: 9, border: '1px dashed rgba(90,31,214,0.3)', background: 'transparent', color: 'var(--purple)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={13} /> Shto shërbim
            </button>
          </div>

          {/* Shënime */}
          <div style={S}>
            <label style={L}>Shënime shtesë (opsionale)</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2} placeholder="Rekomandime, ilaçe, kontroll i radhës..." style={{ ...I, resize: 'none' }} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="form-sidebar">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
            <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Totali</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {items.filter(i => i.description).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-3)', flex: 1, marginRight: 8 }}>{item.description}</span>
                  <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>€{Number(item.unit_price).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Totali</span>
                <span style={{ fontFamily: 'Poppins,sans-serif', fontSize: 22, fontWeight: 900, color: '#9B5CF8' }}>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* QR Info */}
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(90,31,214,0.06)', border: '1px solid rgba(90,31,214,0.15)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <QrCode size={16} style={{ color: '#9B5CF8', flexShrink: 0 }} />
              <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>QR kodi do të shfaqë diagnozën dhe historikun e pacientit</p>
            </div>

            <button onClick={() => save('paid')} disabled={saving}
              style={{ width: '100%', padding: 12, borderRadius: 11, background: 'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {saving ? 'Duke ruajtur...' : 'Lësho Raportin'}
            </button>
            <p style={{ fontSize: 11, color:'var(--text-1)', textAlign: 'center' }}>Raporti shënohet automatikisht si i paguar</p>
          </div>
        </div>
      </div>
    </div>
  )
}
