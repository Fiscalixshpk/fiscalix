'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Check, X, Loader2, Package } from 'lucide-react'
import { toast } from 'sonner'

interface Service {
  id: string
  name: string
  description?: string
  price: number
  unit: string
  sort_order: number
}

const UNITS = ['copë', 'orë', 'ditë', 'muaj', 'm²', 'm³', 'kg', 'ton', 'litra', 'paketë', 'person', 'vizitë']

export default function ServicesManager({ companyId, businessType = '' }: { companyId: string; businessType?: string }) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  const SERVICE_SUGGESTIONS: Record<string, string[]> = {
    health: ['Vizitë Gjinekologjike', 'Konsultë e Përgjithshme', 'Ekografi', 'Analizë Gjaku', 'Kontroll Pediatrik', 'Vizitë Dermatologjike'],
    legal: ['Konsultë Juridike', 'Përfaqësim në Gjykatë', 'Hartim Kontrate', 'Konsultë Familjare', 'Mbrojtje Penale', 'Regjistrim Biznesi'],
    it: ['Konsultë IT', 'Mbështetje Teknike', 'Zhvillim Website', 'Siguri Kompjuterike', 'Rikuperim Të Dhënash', 'Trajnim Software'],
    education: ['Provim Niveli', 'Mësim Privat', 'Kurs Gjuhe', 'Konsultë me Prind', 'Orientim Karriere', 'Trajnim Profesional'],
    services: ['Kontroll i Sistemit', 'Riparim në Shtëpi', 'Instalim', 'Mirëmbajtje', 'Pastrim', 'Montim Mobiljesh'],
    agency: ['Takim Briefing', 'Konsultë Strategjike', 'Prezantim Projektit', 'Shoot Fotografik', 'Prodhim Video', 'Auditim Social Media'],
    construction: ['Konsultë Ndërtimi', 'Vlerësim Kostoje', 'Inspektim Ndërtese', 'Hartim Planesh', 'Mbikëqyrje Projekti'],
    tourism: ['Check-In', 'Transfer Aeroporti', 'Tour Guidues', 'Rent-a-Car', 'Organizim Ngjarjeje'],
    transport: ['Transport Mallrash', 'Shpërndarje', 'Lëvizje Urbanistike', 'Transport Ndërkombëtar'],
    import_export: ['Konsultë Doganore', 'Deklaratë Doganore', 'Vlerësim Ngarkese', 'Planifikim Logjistik'],
  }

  const suggestions = SERVICE_SUGGESTIONS[businessType] || ['Konsultë', 'Shërbim Standard', 'Vizitë', 'Takim']
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', unit: 'copë' })
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', unit: 'copë' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/services?company_id=${companyId}`)
      const data = await res.json()
      setServices(Array.isArray(data) ? data : [])
    } catch { setServices([]) }
    finally { setLoading(false) }
  }, [companyId])

  useEffect(() => { load() }, [load])

  async function addService() {
    if (!form.name.trim()) { toast.error('Shto emrin e shërbimit'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/services', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, ...form, price: Number(form.price) || 0, sort_order: services.length })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setServices(prev => [...prev, data])
      setForm({ name: '', description: '', price: '', unit: 'copë' })
      setShowForm(false)
      toast.success('Shërbimi u shtua')
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setSaving(false) }
  }

  async function updateService(id: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/services', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editForm.name, description: editForm.description, price: Number(editForm.price) || 0, unit: editForm.unit })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setServices(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
      setEditingId(null)
      toast.success('Shërbimi u përditësua')
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setSaving(false) }
  }

  async function deleteService(id: string) {
    if (!window.confirm('A je i sigurt?')) return
    await fetch('/api/services', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setServices(prev => prev.filter(s => s.id !== id))
    toast.success('Shërbimi u fshi')
  }

  function startEdit(s: Service) {
    setEditingId(s.id)
    setEditForm({ name: s.name, description: s.description || '', price: String(s.price), unit: s.unit })
  }

  const I = { background: 'var(--bg-input,var(--bg-muted))', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--text-1)', fontSize: 13, outline: 'none', width: '100%' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--text-1)', marginBottom: 2 }}>Shërbimet & Produktet</h3>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Shto shërbimet tuaja — i zgjidhni shpejt kur krijoni fatura</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> Shto
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div style={{ background: 'var(--bg-muted)', border: '1px solid rgba(90,31,214,0.25)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>Shërbim i Ri</p>

          {/* Suggestions */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Zgjedh shpejt:</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {suggestions.map((s: string, i: number) => (
                <button key={i} onClick={() => setForm(p => ({ ...p, name: s }))}
                  style={{ padding: '4px 12px', borderRadius: 8, background: form.name === s ? 'rgba(90,31,214,0.2)' : 'var(--bg-muted)', border: `1px solid ${form.name === s ? 'rgba(90,31,214,0.4)' : 'var(--bg-muted)'}`, color: form.name === s ? 'var(--purple)' : 'var(--text-3)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Emri *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder={suggestions[0] || 'Emri shërbimit'} style={I} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Çmimi (€)</label>
              <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="0.00" style={I} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Njësia</label>
              <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} style={I}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Përshkrimi</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Opsional" style={I} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 9, borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontSize: 13 }}>Anulo</button>
            <button onClick={addService} disabled={saving}
              style={{ flex: 2, padding: 9, borderRadius: 9, background: 'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {saving ? 'Duke ruajtur...' : 'Shto Shërbimin'}
            </button>
          </div>
        </div>
      )}

      {/* Services List */}
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center' }}><Loader2 size={18} className="animate-spin" style={{ margin: '0 auto' }} /></div>
      ) : services.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 14 }}>
          <Package size={36} style={{ color: 'var(--text-3)', margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>Nuk keni shërbime akoma</p>
          <button onClick={() => setShowForm(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(90,31,214,0.1)', border: '1px solid rgba(90,31,214,0.2)', color: '#9B5CF8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={13} /> Shto Shërbimin e Parë
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {services.map(s => (
            <div key={s.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
              {editingId === s.id ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={I} />
                  <input type="number" value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} placeholder="€" style={I} />
                  <select value={editForm.unit} onChange={e => setEditForm(p => ({ ...p, unit: e.target.value }))} style={I}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Përshkrimi" style={I} />
                  <div style={{ display: 'flex', gap: 7, gridColumn: '1/-1' }}>
                    <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontSize: 12 }}>
                      <X size={13} style={{ margin: '0 auto', display: 'block' }} />
                    </button>
                    <button onClick={() => updateService(s.id)} disabled={saving}
                      style={{ flex: 2, padding: '7px 0', borderRadius: 8, background: 'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Ruaj
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>{s.name}</p>
                    {s.description && <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.description}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: '#9B5CF8', fontFamily: 'Poppins,sans-serif' }}>€{Number(s.price).toFixed(2)}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-3)' }}>/ {s.unit}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => startEdit(s)}
                      style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', display: 'flex' }}>
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => deleteService(s.id)}
                      style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', cursor: 'pointer', display: 'flex' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
