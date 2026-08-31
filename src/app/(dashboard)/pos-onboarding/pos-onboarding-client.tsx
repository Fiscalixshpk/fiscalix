'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Shield, Key, CheckCircle, AlertTriangle, Copy,
  Download, ExternalLink, ChevronRight, Terminal, Zap
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Device {
  id: string; pos_id: number; device_name: string; cashier_name: string | null
  status: string; environment: string; certificate_pem: string | null
  private_key_enc: string | null; application_id: number | null
}

interface Props {
  company: { id: string; name: string; nui: string; locationCity: string }
  devices: Device[]
}

const STEPS = [
  { id: 1, label: 'Shkarko Onboarder',    icon: Download   },
  { id: 2, label: 'Ekzekuto & Konfiguro', icon: Terminal   },
  { id: 3, label: 'Ngarko Çelësat',       icon: Key        },
  { id: 4, label: 'Verifiko',             icon: CheckCircle},
]

export default function POSOnboardingClient({ company, devices }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [step,         setStep]         = useState(1)
  const [environment,  setEnvironment]  = useState<'TEST' | 'PROD'>('TEST')
  const [posId,        setPosId]        = useState('1')
  const [branchId,     setBranchId]     = useState('1')
  const [deviceName,   setDeviceName]   = useState('Arka 1')
  const [cashierName,  setCashierName]  = useState('')
  const [privateKey,   setPrivateKey]   = useState('')
  const [certificate,  setCertificate]  = useState('')
  const [applicationId, setApplicationId] = useState('')
  const [saving,       setSaving]       = useState(false)
  const [verifying,    setVerifying]    = useState(false)
  const [verifyResult, setVerifyResult] = useState<'ok' | 'fail' | null>(null)

  const onboardCmd = `./onboarder -env=${environment}`

  async function saveDevice() {
    if (!privateKey.trim()) { toast.error('Vendos Private Key'); return }
    if (!certificate.trim()) { toast.error('Vendos Certificatën'); return }
    setSaving(true)
    try {
      // Check if device already exists
      const { data: existing } = await supabase
        .from('pos_devices')
        .select('id')
        .eq('company_id', company.id)
        .eq('pos_id', parseInt(posId))
        .single()

      const deviceData = {
        company_id:      company.id,
        pos_id:          parseInt(posId),
        branch_id:       parseInt(branchId),
        device_name:     deviceName,
        cashier_name:    cashierName || null,
        private_key_enc: privateKey.trim(),
        certificate_pem: certificate.trim(),
        application_id:  applicationId ? parseInt(applicationId) : null,
        environment,
        status:          'onboarded',
        updated_at:      new Date().toISOString(),
      }

      if (existing) {
        await supabase.from('pos_devices').update(deviceData).eq('id', existing.id)
      } else {
        await supabase.from('pos_devices').insert({ ...deviceData, created_at: new Date().toISOString() })
      }

      toast.success('Pajisja u ruajt!')
      setStep(4)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally {
      setSaving(false)
    }
  }

  async function verifyDevice() {
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await fetch('/api/pos/verify-device', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ companyId: company.id, environment }),
      })
      const data = await res.json()
      setVerifyResult(data.success ? 'ok' : 'fail')
      if (data.success) {
        toast.success('Pajisja është e konfiguruar saktë!')
        await supabase.from('pos_devices')
          .update({ status: 'active' })
          .eq('company_id', company.id)
          .eq('environment', environment)
      } else {
        toast.error(data.error ?? 'Verifikimi dështoi')
      }
    } catch {
      setVerifyResult('fail')
      toast.error('Gabim gjatë verifikimit')
    } finally {
      setVerifying(false)
    }
  }

  const S = {
    page:   { maxWidth: 780, margin: '0 auto' },
    card:   { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 },
    label:  { fontSize: 11, fontWeight: 600 as const, color: 'var(--text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    input:  { marginBottom: 14 },
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#5A1FD6,#9B5CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="white" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>
              ATK POS Onboarding
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{company.name} · NUI: {company.nui || 'nuk është vendosur'}</p>
          </div>
        </div>
        {!company.nui && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#F59E0B', marginTop: 10 }}>
            NUI nuk është vendosur. Shko te <strong>Cilësimet → Kompania</strong> dhe vendos NUI-n para onboardingut.
          </div>
        )}
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
        {STEPS.map((s, i) => {
          const done   = step > s.id
          const active = step === s.id
          const Icon   = s.icon
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: done ? '#10B981' : active ? 'var(--purple)' : 'var(--bg-muted)',
                  border: `2px solid ${done ? '#10B981' : active ? 'var(--purple)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  {done
                    ? <CheckCircle size={16} color="white" />
                    : <Icon size={15} color={active ? 'white' : '#6B7280'} />}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: active ? 'var(--purple-light)' : done ? '#10B981' : '#6B7280', whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 60, height: 1, background: step > s.id ? '#10B981' : 'var(--border)', margin: '0 4px', marginBottom: 22, transition: 'background 0.3s' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: Shkarko Onboarder ── */}
      {step === 1 && (
        <div style={S.card}>
          <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-1)' }}>
            Hapi 1 — Shkarko ATK Onboarder Tool
          </h2>

          {/* Environment */}
          <div style={{ marginBottom: 20 }}>
            <label style={S.label}>Environment</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['TEST', 'PROD'] as const).map(env => (
                <button key={env} onClick={() => setEnvironment(env)}
                  style={{
                    padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 13,
                    background: environment === env
                      ? env === 'PROD' ? '#EF4444' : 'var(--purple)'
                      : 'var(--bg-muted)',
                    color: environment === env ? 'white' : 'var(--text-3)',
                    transition: 'all 0.15s',
                  }}>
                  {env}
                  {env === 'PROD' && <span style={{ fontSize: 9, marginLeft: 5 }}>REAL</span>}
                </button>
              ))}
            </div>
            {environment === 'PROD' && (
              <p style={{ fontSize: 11, color: '#EF4444', marginTop: 8 }}>
                Kujdes: PROD environment krijon kuponë fiskalë REALË. Përdor vetëm pas certifikimit zyrtar nga ATK.
              </p>
            )}
          </div>

          {/* Download links */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { os: 'macOS',   url: 'https://github.com/fiskalizimi/pos-golang/raw/refs/heads/main/onboarder/onboarder-macos.zip',   icon: '🍎' },
              { os: 'Windows', url: 'https://github.com/fiskalizimi/pos-golang/raw/refs/heads/main/onboarder/onboarder-windows.zip', icon: '🪟' },
              { os: 'Linux',   url: 'https://github.com/fiskalizimi/pos-golang/raw/refs/heads/main/onboarder/onboarder-linux.zip',   icon: '🐧' },
            ].map(d => (
              <a key={d.os} href={d.url} target="_blank" rel="noreferrer"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 10px', borderRadius: 12, background: 'var(--bg-muted)', border: '1px solid var(--border)', textDecoration: 'none', transition: 'all 0.15s' }}>
                <span style={{ fontSize: 24 }}>{d.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{d.os}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--purple-light)' }}>
                  <Download size={10} /> Shkarko
                </span>
              </a>
            ))}
          </div>

          {/* Command info */}
          <div style={{ background: 'var(--bg-muted)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>Pas shkarkimit, ekzekuto:</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-base)', borderRadius: 8, padding: '10px 14px' }}>
              <code style={{ fontSize: 13, color: '#10B981', fontFamily: 'monospace' }}>{onboardCmd}</code>
              <button onClick={() => { navigator.clipboard.writeText(onboardCmd); toast.success('Kopjuar!') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                <Copy size={14} />
              </button>
            </div>
          </div>

          <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: 12, color: '#2563EB', lineHeight: 1.6 }}>
            Onboarderi do të kërkojë: <strong>NUI</strong> ({company.nui || '—'}), <strong>Fiscalization Number</strong> (nga EDI/ATK), <strong>POS ID</strong>, <strong>Branch ID</strong>.<br />
            Pas ekzekutimit gjeneron: <code>private-key.pem</code> dhe <code>signed-certificate.pem</code>
          </div>

          <button onClick={() => setStep(2)} className="finex-button-primary"
            style={{ padding: '11px 24px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            E shkarkova, vazhdo <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* ── STEP 2: Konfiguro ── */}
      {step === 2 && (
        <div style={S.card}>
          <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-1)' }}>
            Hapi 2 — Konfiguro Pajisjen
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={S.label}>POS ID</label>
              <input value={posId} onChange={e => setPosId(e.target.value)} className="finex-input" placeholder="1" />
              <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>Duhet të përputhet me numrin te onboarder</p>
            </div>
            <div>
              <label style={S.label}>Branch ID</label>
              <input value={branchId} onChange={e => setBranchId(e.target.value)} className="finex-input" placeholder="1" />
            </div>
            <div>
              <label style={S.label}>Emri i Pajisjes</label>
              <input value={deviceName} onChange={e => setDeviceName(e.target.value)} className="finex-input" placeholder="Arka 1" />
            </div>
            <div>
              <label style={S.label}>Kasieria (opsionale)</label>
              <input value={cashierName} onChange={e => setCashierName(e.target.value)} className="finex-input" placeholder="Ariana K." />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Application ID (merret nga ATK pas certifikimit)</label>
            <input value={applicationId} onChange={e => setApplicationId(e.target.value)} className="finex-input" placeholder="0 — lër bosh gjatë TEST" />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(1)} className="finex-button-secondary" style={{ padding: '10px 20px', fontSize: 13 }}>
              ← Mbrapa
            </button>
            <button onClick={() => setStep(3)} className="finex-button-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              Vazhdo <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Ngarko çelësat ── */}
      {step === 3 && (
        <div style={S.card}>
          <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-1)' }}>
            Hapi 3 — Ngarko Çelësat ATK
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20, lineHeight: 1.6 }}>
            Pas onboardingut, gjej fajllet <code>private-key.pem</code> dhe <code>signed-certificate.pem</code>,
            hapëi me text editor dhe kopjo përmbajtjen këtu.
          </p>

          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Private Key (private-key.pem)</label>
            <textarea
              value={privateKey}
              onChange={e => setPrivateKey(e.target.value)}
              placeholder="-----BEGIN EC PRIVATE KEY-----&#10;...&#10;-----END EC PRIVATE KEY-----"
              rows={6}
              style={{ width: '100%', background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text-1)', fontFamily: 'monospace', fontSize: 11, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: 10, color: '#EF4444', marginTop: 4 }}>Kujdes: Mos e ndaj me askënd. Ruhet i enkriptuar.</p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={S.label}>Certificate (signed-certificate.pem)</label>
            <textarea
              value={certificate}
              onChange={e => setCertificate(e.target.value)}
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              rows={6}
              style={{ width: '100%', background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text-1)', fontFamily: 'monospace', fontSize: 11, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(2)} className="finex-button-secondary" style={{ padding: '10px 20px', fontSize: 13 }}>
              ← Mbrapa
            </button>
            <button onClick={saveDevice} disabled={saving || !privateKey.trim() || !certificate.trim()}
              className="finex-button-primary"
              style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              {saving
                ? <span style={{ width: 15, height: 15, border: '2px solid var(--border-color,#e2dcff)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : <><Key size={14} /> Ruaj Çelësat</>}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Verifiko ── */}
      {step === 4 && (
        <div style={S.card}>
          <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-1)' }}>
            Hapi 4 — Verifiko Konfigurimin
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Kompania',    value: company.name                           },
              { label: 'NUI',        value: company.nui || '⚠ Mungon'              },
              { label: 'Qyteti',     value: company.locationCity || '⚠ Mungon'     },
              { label: 'POS ID',     value: posId                                   },
              { label: 'Branch ID',  value: branchId                                },
              { label: 'Pajisja',    value: deviceName                              },
              { label: 'Environment',value: environment                             },
              { label: 'Private Key',value: privateKey ? '✓ E ngarkuar' : '✗ Mungon' },
              { label: 'Certifikata',value: certificate ? '✓ E ngarkuar' : '✗ Mungon' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-muted)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: r.value.startsWith('⚠') || r.value.startsWith('✗') ? '#EF4444' : 'var(--text-1)' }}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>

          {verifyResult === 'ok' && (
            <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <CheckCircle size={22} color="#10B981" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>Pajisja është aktive dhe gati!</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>POS mund të fiskalizojë kuponë {environment === 'TEST' ? 'TEST' : 'REAL'}.</p>
              </div>
            </div>
          )}

          {verifyResult === 'fail' && (
            <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <AlertTriangle size={22} color="#EF4444" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>Verifikimi dështoi</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Kontrollo çelësin privat dhe certifikatën.</p>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={verifyDevice} disabled={verifying}
              className="finex-button-primary"
              style={{ padding: '11px 24px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              {verifying
                ? <span style={{ width: 15, height: 15, border: '2px solid var(--border-color,#e2dcff)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : <><Zap size={14} /> Testo ATK</>}
            </button>
            {verifyResult === 'ok' && (
              <button onClick={() => router.push('/pos')} className="finex-button-secondary"
                style={{ padding: '11px 24px', fontSize: 13 }}>
                Hap POS →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Existing devices */}
      {devices.length > 0 && (
        <div style={S.card}>
          <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--text-1)' }}>
            Pajisjet Ekzistuese
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {devices.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{d.device_name} · POS #{d.pos_id}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{d.environment} · {d.cashier_name || 'Pa operator'}</p>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: d.status === 'active' || d.status === 'onboarded'
                    ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  color: d.status === 'active' || d.status === 'onboarded' ? '#10B981' : '#F59E0B',
                }}>
                  {d.status === 'active' ? '● Aktiv' : d.status === 'onboarded' ? '● Onboarded' : d.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
