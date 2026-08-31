'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Store, UtensilsCrossed, Building2, Loader2, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface LightweightClient {
  id: string
  business_name: string
  business_type: string
  vat_number?: string
  is_vat_registered: boolean
  phone?: string
  address?: string
  created_at: string
}

const TYPE_ICONS: Record<string, typeof Store> = { market: Store, restorant: UtensilsCrossed, tjeter: Building2 }
const TYPE_LABELS: Record<string, string> = { market: 'Market', restorant: 'Restorant', tjeter: 'Tjetër' }

export default function LightweightClientsClient() {
  const [clients, setClients] = useState<LightweightClient[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  // Import bulk state
  const [showImport, setShowImport] = useState(false)
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ totalRows: number; validCount: number; invalidCount: number; preview: Record<string, unknown>[] } | null>(null)
  const [importResult, setImportResult] = useState<{ importedCount: number; skippedCount: number } | null>(null)
  const [importLoading, setImportLoading] = useState(false)

  const [form, setForm] = useState({
    business_name: '', business_type: 'market', vat_number: '',
    is_vat_registered: false, phone: '', address: '',
  })

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/accountant/lightweight-clients')
      const data = await res.json()
      setClients(data.clients || [])
    } catch {
      toast.error('Gabim gjatë ngarkimit')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function createClient() {
    if (!form.business_name.trim()) { toast.error('Emri i biznesit është i detyrueshëm'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/accountant/lightweight-clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Klienti u shtua!')
      setShowAdd(false)
      setForm({ business_name: '', business_type: 'market', vat_number: '', is_vat_registered: false, phone: '', address: '' })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally { setSubmitting(false) }
  }

  function downloadTemplate() {
    window.location.href = '/api/accountant/import-clients/template'
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function deleteClient(id: string, name: string) {
    if (!window.confirm(`A je i sigurt që dëshiron të fshish "${name}"?`)) return
    try {
      const res = await fetch('/api/accountant/lightweight-clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setClients(prev => prev.filter(c => c.id !== id))
      toast.success('Klienti u fshi')
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Gabim gjatë fshirjes')
    }
  }

  async function handleFileSelected(file: File) {
    setImportFile(file)
    setImportLoading(true)
    try {
      const fileBase64 = await fileToBase64(file)
      const res = await fetch('/api/accountant/import-clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, mode: 'preview' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setImportPreview(data)
      setImportStep('preview')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë leximit të fajllit')
    } finally {
      setImportLoading(false)
    }
  }

  async function confirmImport() {
    if (!importFile) return
    setImportLoading(true)
    try {
      const fileBase64 = await fileToBase64(importFile)
      const res = await fetch('/api/accountant/import-clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, mode: 'confirm' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setImportResult(data)
      setImportStep('done')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë importimit')
    } finally {
      setImportLoading(false)
    }
  }

  function closeImportModal() {
    setShowImport(false)
    setImportStep('upload')
    setImportFile(null)
    setImportPreview(null)
    setImportResult(null)
  }

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
            Markete & Restorante
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Klientë me arkë fiskale — menaxhohen plotësisht prej teje, pa pasur nevojë llogarie Fiscalix.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowImport(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-2)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={15} /> Importo Bulk
          </button>
          <button onClick={() => setShowAdd(true)} className="finex-button-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}>
            <Plus size={16} /> Shto Klient
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: 40 }}>Duke ngarkuar...</p>
      ) : clients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16 }}>
          <Store size={32} style={{ color: 'var(--text-3)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}>Nuk ke ende markete/restorante</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Shto klientin e parë për ta menaxhuar kontabilitetin e tij nga kuponi fiskal.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {clients.map(c => {
            const Icon = TYPE_ICONS[c.business_type] || Building2
            return (
              <div key={c.id} className="finex-card" style={{ borderRadius: 14, padding: 18, position:'relative' }}>
                {/* Delete button */}
                <button onClick={e => { e.stopPropagation(); deleteClient(c.id, c.business_name) }}
                  style={{ position:'absolute', top:10, right:10, padding:'4px 6px', borderRadius:7, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.07)', color:'var(--text-1)', cursor:'pointer', display:'flex', alignItems:'center', opacity:0.7, zIndex:1 }}
                  onMouseEnter={e => e.currentTarget.style.opacity='1'}
                  onMouseLeave={e => e.currentTarget.style.opacity='0.7'}>
                  <Trash2 size={12}/>
                </button>
                <div onClick={() => router.push(`/accountant/markets/${c.id}`)} style={{ cursor:'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} style={{ color: 'var(--purple-light)' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{c.business_name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{TYPE_LABELS[c.business_type] || c.business_type}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 20, background: c.is_vat_registered ? 'rgba(123,44,245,0.12)' : 'rgba(100,110,130,0.12)', color: c.is_vat_registered ? 'var(--purple-light)' : 'var(--text-3)' }}>
                      {c.is_vat_registered ? 'Në TVSH' : 'Pa TVSH'}
                    </span>
                    {c.vat_number && <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>NUI: {c.vat_number}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <>
          <div onClick={() => setShowAdd(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, width: 'min(440px,92vw)', zIndex: 100, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Shto Market/Restorant</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'var(--bg-muted)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-3)' }}><X size={15} /></button>
            </div>

            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Emri i Biznesit *</label>
            <input value={form.business_name} onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))}
              placeholder="p.sh. Market Driloni" className="finex-input" style={{ marginBottom: 14 }} />

            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Lloji</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {(['market', 'restorant', 'tjeter'] as const).map(t => (
                <button key={t} type="button" onClick={() => setForm(p => ({ ...p, business_type: t }))}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: form.business_type === t ? '1.5px solid var(--purple-light)' : '1px solid var(--border)',
                    background: form.business_type === t ? 'var(--purple-bg)' : 'var(--bg-muted)',
                    color: form.business_type === t ? 'var(--purple-light)' : 'var(--text-2)' }}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>NUI (opsionale)</label>
            <input value={form.vat_number} onChange={e => setForm(p => ({ ...p, vat_number: e.target.value }))}
              placeholder="800000000" className="finex-input" style={{ marginBottom: 14 }} />

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 10, background: 'var(--bg-muted)', marginBottom: 14 }}>
              <input type="checkbox" checked={form.is_vat_registered} onChange={e => setForm(p => ({ ...p, is_vat_registered: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: 'var(--purple-light)' }} />
              <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Biznesi është i regjistruar në TVSH</span>
            </label>

            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Telefoni</label>
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+383 44 000 000" className="finex-input" style={{ marginBottom: 14 }} />

            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Adresa</label>
            <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              placeholder="Rr. Nëna Terezë, Prishtinë" className="finex-input" style={{ marginBottom: 18 }} />

            <button onClick={createClient} disabled={submitting} className="finex-button-primary w-full py-2.5">
              {submitting ? <Loader2 size={15} className="animate-spin" style={{ margin: '0 auto' }} /> : 'Shto Klientin'}
            </button>
          </div>
        </>
      )}

      {showImport && (
        <>
          <div onClick={closeImportModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, width: 'min(520px,92vw)', zIndex: 100, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Importo Klientë nga Excel</h3>
              <button onClick={closeImportModal} style={{ background: 'var(--bg-muted)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-3)' }}><X size={15} /></button>
            </div>

            {importStep === 'upload' && (
              <>
                <div style={{ background: 'var(--bg-muted)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <p style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>
                    <strong style={{ color: 'var(--text-1)' }}>Hapi 1:</strong> Shkarko shabllonin Excel, plotësoje me klientët e tu (Emri i Biznesit, Lloji, NUI, Telefoni, TVSH), dhe ngarkoje më poshtë.
                  </p>
                  <button onClick={downloadTemplate}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--purple-light)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                    <Download size={14} /> Shkarko Shabllonin
                  </button>
                </div>

                <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 10 }}>
                  <strong style={{ color: 'var(--text-1)' }}>Hapi 2:</strong> Ngarko fajllin e plotësuar
                </p>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '30px 20px', borderRadius: 12, border: '2px dashed var(--border)', cursor: 'pointer', background: 'var(--bg-muted)' }}>
                  <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])} />
                  {importLoading ? (
                    <Loader2 size={28} className="animate-spin" style={{ color: 'var(--purple-light)' }} />
                  ) : (
                    <>
                      <Upload size={28} style={{ color: 'var(--text-3)' }} />
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Kliko për të zgjedhur fajllin (.xlsx, .csv)</span>
                    </>
                  )}
                </label>
              </>
            )}

            {importStep === 'preview' && importPreview && (
              <>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: 14, borderRadius: 10, background: 'rgba(16,185,129,0.08)' }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#10B981' }}>{importPreview.validCount}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Gati për import</p>
                  </div>
                  {importPreview.invalidCount > 0 && (
                    <div style={{ flex: 1, textAlign: 'center', padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.08)' }}>
                      <p style={{ fontSize: 20, fontWeight: 800, color: '#EF4444' }}>{importPreview.invalidCount}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Me probleme</p>
                    </div>
                  )}
                </div>

                <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase' }}>Parapamje (5 të parët)</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18, maxHeight: 220, overflowY: 'auto' }}>
                  {importPreview.preview.slice(0, 5).map((row, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-muted)', fontSize: 12.5 }}>
                      {row.rowError
                        ? <AlertCircle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                        : <CheckCircle2 size={14} style={{ color: '#10B981', flexShrink: 0 }} />}
                      <span style={{ color: 'var(--text-1)', flex: 1 }}>{String(row.business_name) || '(emër bosh)'}</span>
                      {row.rowError && <span style={{ color: '#EF4444', fontSize: 11 }}>{String(row.rowError)}</span>}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setImportStep('upload')} className="finex-button-secondary flex-1 py-2.5">Mbrapa</button>
                  <button onClick={confirmImport} disabled={importLoading || importPreview.validCount === 0} className="finex-button-primary flex-1 py-2.5">
                    {importLoading ? <Loader2 size={15} className="animate-spin" style={{ margin: '0 auto' }} /> : `Importo ${importPreview.validCount} Klientë`}
                  </button>
                </div>
              </>
            )}

            {importStep === 'done' && importResult && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle2 size={40} style={{ color: '#10B981', margin: '0 auto 14px' }} />
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>
                  {importResult.importedCount} klientë u importuan!
                </p>
                {importResult.skippedCount > 0 && (
                  <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 16 }}>
                    {importResult.skippedCount} rreshta u kaluan për shkak gabimesh.
                  </p>
                )}
                <button onClick={closeImportModal} className="finex-button-primary w-full py-2.5" style={{ marginTop: 10 }}>
                  Mbyll
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
