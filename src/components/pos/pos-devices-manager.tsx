'use client'
// Settings → Pajisjet POS — shto, edito, fshi arka

import { useEffect, useState } from 'react'
import { getPaperWidth, setPaperWidth, type PaperWidth } from '@/lib/atk/print-client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ShoppingBag, Plus, Pencil, Trash2, CheckCircle,
  Shield, X, Check, Loader2, ChevronRight, Info
} from 'lucide-react'
import POSOnboardWizard from './pos-onboard-wizard'

interface Device {
  id: string; pos_id: number; device_name: string
  cashier_name: string | null; status: string
  environment: string; private_key_enc: string | null
  application_id: number | null
}

interface Props {
  companyId:   string
  companyNui:  string
  companyName: string
  initialDevices: Device[]
}

export default function POSDevicesManager({ companyId, companyNui, companyName, initialDevices }: Props) {
  const router  = useRouter()
  const [devices,    setDevices]    = useState<Device[]>(initialDevices)
  const [showAdd,    setShowAdd]    = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [showOnboard, setShowOnboard] = useState(false)
  const [onboardDeviceId, setOnboardDeviceId] = useState<string | null>(null)

  const [form, setForm] = useState({
    device_name:  '',
    cashier_name: '',
    environment:  'TEST' as 'TEST' | 'PROD',
  })

  const [paper, setPaper] = useState<PaperWidth>(80)
  useEffect(() => { setPaper(getPaperWidth()) }, [])
  function choosePaper(w: PaperWidth) { setPaperWidth(w); setPaper(w); toast.success(`Letra e printerit: ${w} mm`) }

  const env: 'TEST' | 'PROD' = process.env.NEXT_PUBLIC_ATK_ENVIRONMENT === 'PROD' ? 'PROD' : 'TEST'

  const S = {
    label: { fontSize: 10, fontWeight: 700 as const, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  }

  function openAdd() {
    setEditingId(null)
    setForm({ device_name: `Arka ${devices.length + 1}`, cashier_name: '', environment: env })
    setShowAdd(true)
  }

  function openEdit(d: Device) {
    setEditingId(d.id)
    setForm({ device_name: d.device_name, cashier_name: d.cashier_name || '', environment: env === 'PROD' ? d.environment as 'TEST' | 'PROD' : 'TEST' })
    setShowAdd(true)
  }

  async function save() {
    if (!form.device_name.trim()) { toast.error('Vendos emrin e arkës'); return }
    setSaving(true)
    try {
      const nextPosId = editingId
        ? devices.find(d => d.id === editingId)!.pos_id
        : (Math.max(0, ...devices.map(d => d.pos_id)) + 1)

      const body = {
        device_name:  form.device_name.trim(),
        cashier_name: form.cashier_name.trim() || null,
        environment:  form.environment,
        ...(editingId ? { id: editingId } : { pos_id: nextPosId, branch_id: 1, status: 'active' }),
      }

      const res  = await fetch('/api/pos/devices', {
        method:  editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (editingId) {
        setDevices(prev => prev.map(d => d.id === editingId ? { ...d, ...body } : d))
        toast.success('Arka u përditësua')
      } else {
        setDevices(prev => [...prev, data.device])
        toast.success(`${form.device_name} u shtua`)
      }
      setShowAdd(false); router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally { setSaving(false) }
  }

  async function deleteDevice(id: string) {
    if (!confirm('Fshi arkën? Kjo nuk mund të zhbëhet.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/pos/devices?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setDevices(prev => prev.filter(d => d.id !== id))
      toast.success('Arka u fshi')
      router.refresh()
    } catch { toast.error('Gabim gjatë fshirjes') }
    finally { setDeletingId(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Letra e printerit termik — ruhet në këtë kompjuter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Letra e printerit</p>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Gjerësia e letrës termike në këtë kompjuter</p>
        </div>
        <div role="radiogroup" aria-label="Letra e printerit" style={{ display: 'flex', gap: 6 }}>
          {([58, 80] as const).map(w => (
            <button key={w} type="button" role="radio" aria-checked={paper === w} onClick={() => choosePaper(w)}
              style={{ padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${paper === w ? 'var(--purple)' : 'var(--border)'}`,
                background: paper === w ? 'var(--purple)' : 'transparent', color: paper === w ? '#fff' : 'var(--text-2)' }}>
              {w} mm
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Pajisjet POS</h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Menaxho arkat fiskale</p>
        </div>
        <button onClick={openAdd} className="finex-button-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', fontSize: 13 }}>
          <Plus size={14} /> Shto Arkë
        </button>
      </div>

      {/* Form inline */}
      {showAdd && (
        <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-muted)', border: '1px solid var(--border-purple)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
              {editingId ? 'Edito Arkën' : 'Arkë e Re'}
            </p>
            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={S.label}>Emri i Arkës *</label>
              <input value={form.device_name} onChange={e => setForm(f => ({ ...f, device_name: e.target.value }))}
                placeholder="Arka 1" className="finex-input" autoFocus />
            </div>
            <div>
              <label style={S.label}>Kasieri (opsional)</label>
              <input value={form.cashier_name} onChange={e => setForm(f => ({ ...f, cashier_name: e.target.value }))}
                placeholder="Ariana K." className="finex-input" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Environment</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(env === 'PROD' ? (['TEST', 'PROD'] as const) : (['TEST'] as const)).map(e => (
                <button key={e} onClick={() => setForm(f => ({ ...f, environment: e }))}
                  style={{ padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: form.environment === e ? (e === 'PROD' ? '#EF4444' : 'var(--purple)') : 'var(--bg-muted)',
                    color: form.environment === e ? 'white' : 'var(--text-3)' }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAdd(false)} className="finex-button-secondary" style={{ flex: 1, padding: '9px 0', fontSize: 13 }}>
              Anulo
            </button>
            <button onClick={save} disabled={saving} className="finex-button-primary"
              style={{ flex: 2, padding: '9px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><Check size={14} /> {editingId ? 'Ruaj' : 'Shto Arkën'}</>}
            </button>
          </div>
        </div>
      )}

      {/* Devices list */}
      {devices.length === 0 && !showAdd ? (
        <div style={{ padding: '28px', borderRadius: 12, background: 'var(--bg-muted)', border: '1px dashed var(--border)', textAlign: 'center' }}>
          <ShoppingBag size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>Asnjë arkë ende</p>
          <button onClick={openAdd} className="finex-button-primary"
            style={{ margin: '0 auto', padding: '8px 20px', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
            <Plus size={14} /> Shto Arkën e Parë
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {devices.map(device => (
            <div key={device.id} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--bg-card)', border: `1px solid ${device.status === 'active' ? 'rgba(16,185,129,0.2)' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: device.status === 'active' ? 'rgba(16,185,129,0.1)' : 'var(--bg-muted)', border: `1px solid ${device.status === 'active' ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag size={17} color={device.status === 'active' ? '#10B981' : 'var(--text-3)'} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color:'var(--text-1)' }}>{device.device_name}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: device.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: device.status === 'active' ? '#10B981' : '#F59E0B' }}>
                        {device.status === 'active' ? 'Aktiv' : device.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color:'var(--text-1)' }}>
                      {device.cashier_name || 'Pa operator'} · {device.environment}
                      {device.private_key_enc
                        ? <span style={{ color: '#10B981', marginLeft: 8 }}>✓ Çelësi ATK</span>
                        : <span style={{ color: '#F59E0B', marginLeft: 8 }}>⚠ Pa çelës ATK</span>}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {!device.private_key_enc && (
                    <button onClick={() => { setOnboardDeviceId(device.id); setShowOnboard(true) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(123,44,245,0.3)', background: 'var(--purple-bg)', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--purple-light)' }}>
                      <Shield size={12} /> Aktivizo ATK
                    </button>
                  )}
                  <button onClick={() => openEdit(device)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteDevice(device.id)} disabled={!!deletingId}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#EF4444'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'}>
                    {deletingId === device.id
                      ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                      : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ATK Onboard modal */}
      {showOnboard && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowOnboard(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, width: 'min(480px,94vw)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Aktivizo Çelësin ATK</p>
              <button onClick={() => setShowOnboard(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18} /></button>
            </div>
            <POSOnboardWizard
              companyNui={companyNui}
              companyName={companyName}
              existingDevices={devices.map(d => ({ id: d.id, pos_id: d.pos_id, device_name: d.device_name, status: d.status }))}
              environment={env}
            />
          </div>
        </div>
      )}

      {/* Info */}
      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', display: 'flex', gap: 10 }}>
        <Info size={14} color="#3B82F6" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6', marginBottom: 3 }}>Si funksionon?</p>
          <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
            Çdo arkë që shton këtu shfaqet si tab (Arka 1, Arka 2...) brenda POS-it. Kasierë të ndryshëm mund të punojnë njëkohësisht nga arka të ndryshme. Para lansimit real, kliko "Aktivizo ATK" për çdo arkë.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
