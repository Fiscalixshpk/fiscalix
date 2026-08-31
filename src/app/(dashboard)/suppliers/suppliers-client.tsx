'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Search, Building2, Phone, Mail, X, Check, FileText, ChevronDown, ChevronUp } from 'lucide-react'

interface Supplier {
  id: string; name: string; contact_name?: string; phone?: string
  email?: string; address?: string; nipt?: string; notes?: string; created_at: string
}

interface Invoice {
  id: string; supplier_id: string; invoice_number?: string; amount: number
  vat_amount?: number; invoice_date: string; description?: string; created_at: string
}

const EMPTY_FORM = { name: '', contact_name: '', phone: '', email: '', address: '', nipt: '', notes: '' }
const EMPTY_INV  = { invoice_number: '', amount: '', vat_amount: '', invoice_date: new Date().toISOString().split('T')[0], description: '' }

export default function SuppliersClient({ companyId, userId, initialSuppliers }: { companyId: string; userId: string; initialSuppliers: Supplier[] }) {
  const supabase = createClient()
  const [suppliers, setSuppliers]     = useState<Supplier[]>(initialSuppliers)
  const [invoices,  setInvoices]      = useState<Record<string, Invoice[]>>({})
  const [expanded,  setExpanded]      = useState<string | null>(null)
  const [search,    setSearch]        = useState('')
  const [showForm,  setShowForm]      = useState(false)
  const [showInv,   setShowInv]       = useState<string | null>(null)
  const [saving,    setSaving]        = useState(false)
  const [form,      setForm]          = useState(EMPTY_FORM)
  const [invForm,   setInvForm]       = useState(EMPTY_INV)

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search) || s.nipt?.includes(search)
  )

  const set    = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const setInv = (k: string, v: string) => setInvForm(f => ({ ...f, [k]: v }))

  async function loadInvoices(supplierId: string) {
    if (invoices[supplierId]) return
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('invoice_date', { ascending: false })
    if (data) setInvoices(v => ({ ...v, [supplierId]: data as Invoice[] }))
  }

  async function toggleExpand(supplierId: string) {
    if (expanded === supplierId) { setExpanded(null); return }
    setExpanded(supplierId)
    await loadInvoices(supplierId)
  }

  async function saveSupplier() {
    if (!form.name.trim()) { toast.error('Emri kërkohet'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('suppliers').insert({ ...form, company_id: companyId }).select().single()
      if (error) throw error
      setSuppliers(s => [data, ...s])
      setShowForm(false); setForm(EMPTY_FORM)
      toast.success('Furnitori u shtua')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Gabim') }
    finally { setSaving(false) }
  }

  async function saveInvoice(supplierId: string) {
    if (!invForm.amount) { toast.error('Shuma kërkohet'); return }
    setSaving(true)
    try {
      const supplier = suppliers.find(s => s.id === supplierId)
      const { data, error } = await supabase.from('expenses').insert({
        company_id:     companyId,
        supplier_id:    supplierId,
        vendor_name:    supplier?.name || '',
        invoice_number: invForm.invoice_number || null,
        amount:         Number(invForm.amount),
        vat_amount:     invForm.vat_amount ? Number(invForm.vat_amount) : null,
        expense_date:   invForm.invoice_date || new Date().toISOString().split('T')[0],
        invoice_date:   invForm.invoice_date || new Date().toISOString().split('T')[0],
        description:    invForm.description || null,
        payment_method: 'other',
        created_by:     userId,
      }).select().single()
      if (error) { toast.error(error.message); return }
      setInvoices(v => ({ ...v, [supplierId]: [data as Invoice, ...(v[supplierId] || [])] }))
      setShowInv(null); setInvForm(EMPTY_INV)
      toast.success('Fatura u regjistrua — shkon te Libri Blerjeve')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Gabim') }
    finally { setSaving(false) }
  }

  async function removeSupplier(id: string) {
    if (!confirm('Fshij furnitorin dhe të gjitha faturat e tij?')) return
    await supabase.from('suppliers').delete().eq('id', id)
    setSuppliers(s => s.filter(x => x.id !== id))
    toast.success('Furnitori u fshi')
  }

  const S = {
    label: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.05em' } as React.CSSProperties,
    input: { width: '100%' },
  }

  return (
    <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>Furnitorët</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>{suppliers.length} furnitorë — faturat ruhen te Libri Blerjeve</p>
        </div>
        <button onClick={() => setShowForm(true)} className="finex-button-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', fontSize: 13 }}>
          <Plus size={15} /> Shto Furnitor
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Kërko furnitor..." className="finex-input" style={{ paddingLeft: 36, width: '100%' }} />
      </div>

      {/* LIST */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <Building2 size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 15, fontWeight: 600 }}>Nuk ka furnitorë</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Shto furnitorin e parë</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(s => (
            <div key={s.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              {/* Supplier row */}
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--purple-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={17} color="var(--purple-light)" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{s.name}</p>
                  <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' as const }}>
                    {s.phone && <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={10}/>{s.phone}</span>}
                    {s.nipt  && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>NIPT: {s.nipt}</span>}
                    {invoices[s.id] && <span style={{ fontSize: 12, color: 'var(--purple-light)', fontWeight: 600 }}>{invoices[s.id].length} fatura</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setShowInv(s.id) }}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FileText size={12}/> Shto Faturë
                  </button>
                  <button onClick={() => toggleExpand(s.id)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                    {expanded === s.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                  </button>
                  <button onClick={() => removeSupplier(s.id)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color:'var(--text-1)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEE2E2'; (e.currentTarget as HTMLElement).style.color = '#EF4444' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)' }}>
                    <X size={13}/>
                  </button>
                </div>
              </div>

              {/* Invoices expanded */}
              {expanded === s.id && (
                <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-muted)', padding: '12px 18px' }}>
                  {!invoices[s.id] ? (
                    <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '10px 0' }}>Duke ngarkuar...</p>
                  ) : invoices[s.id].length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '10px 0' }}>Nuk ka fatura ende — kliko "Shto Faturë"</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', gap: 8, padding: '4px 10px', marginBottom: 4 }}>
                        {['Data', 'Nr. Faturës', 'Shuma', 'TVSH'].map(h => (
                          <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{h}</span>
                        ))}
                      </div>
                      {invoices[s.id].map(inv => (
                        <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', gap: 8, padding: '8px 10px', background: 'var(--bg-card)', borderRadius: 9, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{new Date(inv.invoice_date).toLocaleDateString('sq-AL')}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{(inv as any).invoice_number || '—'}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>€{Number(inv.amount).toFixed(2)}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{inv.vat_amount ? `€${Number(inv.vat_amount).toFixed(2)}` : '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL — Shto Furnitor */}
      {showForm && (
        <>
          <div onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, backdropFilter: 'blur(4px)' }}/>
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: 'min(500px,94vw)', zIndex: 201, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Shto Furnitor</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18}/></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={S.label}>Emri i Kompanisë *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="ABC shpk" className="finex-input" style={S.input} autoFocus/>
              </div>
              <div><label style={S.label}>Kontakti</label><input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Emri" className="finex-input" style={S.input}/></div>
              <div><label style={S.label}>NIPT</label><input value={form.nipt} onChange={e => set('nipt', e.target.value)} placeholder="800123456A" className="finex-input" style={S.input}/></div>
              <div><label style={S.label}>Telefoni</label><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+383 44 000 000" className="finex-input" style={S.input}/></div>
              <div><label style={S.label}>Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@abc.com" className="finex-input" style={S.input}/></div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="finex-button-secondary" style={{ flex: 1, padding: '11px' }}>Anulo</button>
              <button onClick={saveSupplier} disabled={saving} className="finex-button-primary" style={{ flex: 2, padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {saving ? 'Duke ruajtur...' : <><Check size={14}/> Shto Furnitorin</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* MODAL — Shto Faturë */}
      {showInv && (
        <>
          <div onClick={() => setShowInv(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, backdropFilter: 'blur(4px)' }}/>
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: 'min(460px,94vw)', zIndex: 201, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Shto Faturë</h3>
              <button onClick={() => setShowInv(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18}/></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
              <strong style={{ color: 'var(--purple-light)' }}>{suppliers.find(s => s.id === showInv)?.name}</strong> — fatura shkon automatikisht te Libri Blerjeve
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={S.label}>Data e Faturës *</label><input type="date" value={invForm.invoice_date} onChange={e => setInv('invoice_date', e.target.value)} className="finex-input" style={S.input}/></div>
              <div><label style={S.label}>Nr. Faturës</label><input value={invForm.invoice_number} onChange={e => setInv('invoice_number', e.target.value)} placeholder="FAT-2026-001" className="finex-input" style={S.input}/></div>
              <div><label style={S.label}>Shuma (€) *</label><input type="number" value={invForm.amount} onChange={e => setInv('amount', e.target.value)} placeholder="0.00" className="finex-input" style={S.input} autoFocus step="0.01"/></div>
              <div><label style={S.label}>TVSH (€)</label><input type="number" value={invForm.vat_amount} onChange={e => setInv('vat_amount', e.target.value)} placeholder="0.00" className="finex-input" style={S.input} step="0.01"/></div>
              <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Përshkrimi</label><input value={invForm.description} onChange={e => setInv('description', e.target.value)} placeholder="Furnizim mallrash, shërbim..." className="finex-input" style={S.input}/></div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowInv(null)} className="finex-button-secondary" style={{ flex: 1, padding: '11px' }}>Anulo</button>
              <button onClick={() => saveInvoice(showInv)} disabled={saving} className="finex-button-primary" style={{ flex: 2, padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {saving ? 'Duke ruajtur...' : <><Check size={14}/> Regjistro Faturën</>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
