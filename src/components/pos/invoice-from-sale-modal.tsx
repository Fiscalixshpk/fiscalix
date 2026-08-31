'use client'
// Modal — Lësho Faturë Tatimore nga shitja POS
// Hapet pas fiskalizimit kur kasieri klikon "Lësho Faturë"

import { useState } from 'react'
import { toast } from 'sonner'
import { X, FileText, Check, Loader2, Building2, ExternalLink } from 'lucide-react'

interface SaleItem {
  name: string; price: number; quantity: number; taxRate: string; unit: string
}

interface Props {
  receiptNumber: string
  totalEUR:      string
  taxEUR:        string
  noTaxEUR:      string
  items:         SaleItem[]
  onClose:       () => void
  onCreated:     (invoiceId: string, invoiceNumber: string) => void
}

export default function InvoiceFromSaleModal({
  receiptNumber, totalEUR, taxEUR, noTaxEUR, items, onClose, onCreated,
}: Props) {
  const [loading,     setLoading]     = useState(false)
  const [form, setForm] = useState({
    clientName:    '',
    clientNui:     '',
    clientEmail:   '',
    clientAddress: '',
    dueDate:       new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes:         `Faturë e lëshuar nga kuponi fiskal ${receiptNumber}`,
  })

  const S = {
    label: { fontSize: 10, fontWeight: 700 as const, color: '#6B7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  }

  async function createInvoice() {
    if (!form.clientName.trim()) { toast.error('Vendos emrin e klientit'); return }
    setLoading(true)
    try {
      const total    = parseFloat(totalEUR)
      const taxAmt   = parseFloat(taxEUR)
      const subtotal = parseFloat(noTaxEUR)

      const res = await fetch('/api/invoices', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name:    form.clientName.trim(),
          client_vat:     form.clientNui.trim() || null,
          client_email:   form.clientEmail.trim() || null,
          client_address: form.clientAddress.trim() || null,
          issue_date:     new Date().toISOString().split('T')[0],
          due_date:       form.dueDate || null,
          status:         'paid',  // shitja është bërë, fatura konsiderohet e paguar
          payment_method: 'cash',
          subtotal:       subtotal,
          tax_rate:       18,
          tax_amount:     taxAmt,
          discount_amount: 0,
          total:          total,
          notes:          form.notes,
          items: items.map(item => ({
            description: `${item.name} × ${item.quantity} ${item.unit}`,
            quantity:    item.quantity,
            unit_price:  parseFloat((item.price / 10000).toFixed(2)),
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(`Fatura ${data.invoice_number} u krijua`)
      onCreated(data.id, data.invoice_number)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë krijimit të faturës')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 299, backdropFilter: 'blur(4px)' }} />

      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18,
        padding: 24, width: 'min(460px,94vw)', zIndex: 300,
        boxShadow:'0 4px 14px rgba(0,0,0,0.08)', maxHeight: '88vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={17} color="#3B82F6" />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Lësho Faturë Tatimore</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Kuponi: {receiptNumber} · Totali: €{totalEUR}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Sale summary */}
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Artikujt</p>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ color: 'var(--text-2)' }}>{item.quantity}× {item.name}</span>
              <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>€{(item.price * item.quantity / 10000).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
            <span style={{ color: '#6B7280' }}>Pa TVSH: €{noTaxEUR} · TVSH: €{taxEUR}</span>
            <span style={{ fontWeight: 800, color: 'var(--text-1)', fontFamily: 'Poppins,sans-serif' }}>€{totalEUR}</span>
          </div>
        </div>

        {/* Client fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={14} /> Të dhënat e klientit
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={S.label}>Emri / Kompania *</label>
              <input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                placeholder="Kompania ABC" className="finex-input" autoFocus />
            </div>
            <div>
              <label style={S.label}>NUI / Numri Fiskal</label>
              <input value={form.clientNui} onChange={e => setForm(f => ({ ...f, clientNui: e.target.value }))}
                placeholder="810948231" className="finex-input" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={S.label}>Email (opsional)</label>
              <input type="email" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
                placeholder="info@kompania.com" className="finex-input" />
            </div>
            <div>
              <label style={S.label}>Data e skadimit</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="finex-input" />
            </div>
          </div>

          <div>
            <label style={S.label}>Adresa (opsionale)</label>
            <input value={form.clientAddress} onChange={e => setForm(f => ({ ...f, clientAddress: e.target.value }))}
              placeholder="Rr. Agim Ramadani, Pejë" className="finex-input" />
          </div>

          <div>
            <label style={S.label}>Shënimi</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="finex-input" />
          </div>

          {/* Info */}
          <div style={{ padding: '10px 12px', borderRadius: 9, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', fontSize: 11, color: '#2563EB', lineHeight: 1.6 }}>
            Fatura krijohet me status <strong>E Paguar</strong> — shitja u bë te POS. Mund ta gjeni dhe modifikoni te seksioni <strong>Faturat</strong>.
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} className="finex-button-secondary" style={{ flex: 1, padding: '11px 0', fontSize: 13 }}>
              Anulo
            </button>
            <button onClick={createInvoice} disabled={loading || !form.clientName.trim()}
              className="finex-button-primary"
              style={{ flex: 2, padding: '11px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading
                ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
                : <><Check size={14} /> Krijo Faturën</>}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
