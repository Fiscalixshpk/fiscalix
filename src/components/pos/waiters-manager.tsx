'use client'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, X, Check, Loader2, Wifi, WifiOff } from 'lucide-react'

interface Waiter { id: string; name: string; pin: string; color: string; rfid_tag?: string | null }

const COLORS = ['#9B5CF8','#3B82F6','#10B981','#F59E0B','#EC4899','#EF4444','#14B8A6','#6366F1']

export default function WaitersManager({ initialWaiters }: { initialWaiters: Waiter[] }) {
  const [waiters,      setWaiters]      = useState<Waiter[]>(initialWaiters)
  const [showAdd,      setShowAdd]      = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const [scanningFor,  setScanningFor]  = useState<string | null>(null) // waiter id
  const [rfidBuffer,   setRfidBuffer]   = useState('')
  const [form, setForm] = useState({ name: '', color: '#9B5CF8', pin: '' })
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // RFID listener për regjistrim
  useEffect(() => {
    if (!scanningFor) return
    let buffer = ''
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Enter') {
        if (buffer.length >= 4) saveRfid(scanningFor, buffer.trim())
        buffer = ''
      } else if (e.key.length === 1) {
        buffer += e.key
        setRfidBuffer(buffer)
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => { buffer = ''; setRfidBuffer('') }, 2000)
      }
    }
    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler); clearTimeout(timerRef.current) }
  }, [scanningFor])

  async function saveRfid(waiterId: string, rfid: string) {
    try {
      const res  = await fetch('/api/pos/waiters', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: waiterId, rfid_tag: rfid }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setWaiters(p => p.map(w => w.id === waiterId ? { ...w, rfid_tag: rfid } : w))
      setScanningFor(null); setRfidBuffer('')
      toast.success('Byzylyk u regjistrua')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gabim') }
  }

  async function removeRfid(waiterId: string) {
    await fetch('/api/pos/waiters', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: waiterId, rfid_tag: null }) })
    setWaiters(p => p.map(w => w.id === waiterId ? { ...w, rfid_tag: null } : w))
    toast.success('Byzylyk u hoq')
  }

  async function add() {
    if (!form.name.trim()) { toast.error('Vendos emrin'); return }
    if (!form.name.trim()) { toast.error('Emri kërkohet'); return }
    if (form.pin && !/^\d{4}$/.test(form.pin)) { toast.error('PIN duhet të jetë 4 shifra'); return }
    setSaving(true)
    try {
      const res  = await fetch('/api/pos/waiters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({name: form.name, color: form.color, pin: form.pin || '0000'}) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setWaiters(p => [...p, data.waiter])
      toast.success(form.name + ' u shtua')
      setShowAdd(false); setForm({ name: '', color: '#9B5CF8', pin: '' })
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gabim') }
    finally { setSaving(false) }
  }

  async function del(id: string) {
    setDeleting(id)
    await fetch('/api/pos/waiters?id=' + id, { method: 'DELETE' })
    setWaiters(p => p.filter(w => w.id !== id))
    toast.success('U fshi')
    setDeleting(null)
  }

  const S = {
    label: { fontSize: 10, fontWeight: 700 as const, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    input: { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-muted)', fontSize: 13, color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box' as const },
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Kamarierët</p>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Byzylyk RFID/NFC ose zgjedhje direkte</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="finex-button-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 13 }}>
          <Plus size={13} /> Shto
        </button>
      </div>

      {showAdd && (
        <div style={{ padding: 14, borderRadius: 12, background: 'var(--bg-muted)', border: '1px solid var(--border-purple)', marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={S.label}>Emri *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ariana" style={S.input} autoFocus />
            </div>
            <div>
              <label style={S.label}>PIN 4-shifror *</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.pin}
                onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g,'').slice(0,4) }))}
                placeholder="p.sh. 1234"
                maxLength={4}
                style={{...S.input, letterSpacing: form.pin ? '8px' : '0', fontWeight: 700, fontSize: 16}}
              />
              <p style={{fontSize:11,color:'var(--text-3)',marginTop:4}}>Kamarieri e përdor këtë PIN për t'u kyçur</p>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Ngjyra</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--text-1)' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAdd(false)} className="finex-button-secondary" style={{ flex: 1, padding: '8px 0', fontSize: 13 }}>Anulo</button>
            <button onClick={add} disabled={saving} className="finex-button-primary"
              style={{ flex: 2, padding: '8px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><Check size={13} /> Shto</>}
            </button>
          </div>
        </div>
      )}

      {/* RFID scan modal */}
      {scanningFor && (
        <>
          <div onClick={() => { setScanningFor(null); setRfidBuffer('') }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: 'min(340px,92vw)', zIndex: 200, textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--purple-bg)', border: '2px solid var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'pulse 1.5s ease infinite' }}>
              <Wifi size={28} color="var(--purple-light)" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>
              {waiters.find(w => w.id === scanningFor)?.name}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
              Vendosni byzylykin/kartën pranë lexuesit RFID
            </p>
            {rfidBuffer && (
              <div style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)', marginBottom: 12, fontFamily: 'monospace', fontSize: 14, color: 'var(--text-2)', letterSpacing: 2 }}>
                {rfidBuffer}...
              </div>
            )}
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 14 }}>Lexuesi USB NFC/RFID duhet të jetë i lidhur</p>
            <button onClick={() => { setScanningFor(null); setRfidBuffer('') }}
              style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' }}>
              Anulo
            </button>
          </div>
        </>
      )}

      {waiters.length === 0 && !showAdd ? (
        <div style={{ padding: 20, borderRadius: 10, background: 'var(--bg-muted)', border: '1px dashed var(--border)', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Asnjë kamerier — shto me butonin lart</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {waiters.map(w => (
            <div key={w.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: w.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color:'var(--text-1)', flexShrink: 0 }}>
                  {w.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{w.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                    {/* PIN display */}
                    <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', letterSpacing: 2, fontWeight: 700 }}>
                      PIN: {w.pin || '0000'}
                    </span>

                    {w.rfid_tag ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Wifi size={10} color="#10B981" />
                        <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>RFID aktiv</span>
                        <button onClick={() => removeRfid(w.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 10, marginLeft: 2 }}>
                          (hiq)
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setScanningFor(w.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 11 }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--purple-light)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'}>
                        <WifiOff size={10} />
                        + Shto RFID
                      </button>
                    )}
                  </div>
                </div>
                <button onClick={() => del(w.id)} disabled={!!deleting}
                  style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#EF4444'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'}>
                  {deleting === w.id ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.95)} }
      `}</style>
    </div>
  )
}
