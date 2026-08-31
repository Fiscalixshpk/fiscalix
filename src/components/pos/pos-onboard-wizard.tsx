'use client'
// Wizard i onboardingut automatik ATK
// Shfaqet te Settings → Pajisjet POS

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ShoppingBag, CheckCircle, AlertTriangle, Loader2, ChevronRight } from 'lucide-react'

interface Props {
  companyNui:    string
  companyName:   string
  existingDevices: { id: string; pos_id: number; device_name: string; status: string }[]
  environment:   'TEST' | 'PROD'
}

export default function POSOnboardWizard({ companyNui, companyName, existingDevices, environment }: Props) {
  const router = useRouter()
  const [step,        setStep]        = useState(1)
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState<{ success: boolean; message: string; isMock?: boolean } | null>(null)
  const [form, setForm] = useState({
    posId:        String((existingDevices.length || 0) + 1),
    branchId:     '1',
    deviceName:   existingDevices.length === 0 ? 'Arka 1' : `Arka ${existingDevices.length + 1}`,
    cashierName:  '',
    applicationId:   '',
    fiscalizationNo: '',
  })

  async function activate() {
    if (!companyNui) {
      toast.error('NUI mungon — shto NUI-n te seksioni Kompania')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/pos/onboard', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          posId:             parseInt(form.posId),
          branchId:          parseInt(form.branchId),
          deviceName:        form.deviceName,
          cashierName:       form.cashierName || null,
          applicationId:     form.applicationId ? parseInt(form.applicationId) : null,
          fiscalizationNo:   form.fiscalizationNo || null,
          environment,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResult({ success: true, message: data.message, isMock: data.isMock })
        setStep(3)
        router.refresh()
      } else if (data.fallback) {
        setResult({ success: false, message: typeof data.error === 'string' ? data.error : JSON.stringify(data.error) })
        setStep(4)
      } else {
        const errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        toast.error(errMsg)
      }
    } catch {
      toast.error('Gabim rrjeti')
    } finally {
      setLoading(false)
    }
  }

  const S = {
    label: { fontSize: 11, fontWeight: 600 as const, color: '#6B7280', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 },
  }

  return (
    <div style={{ maxWidth: 480 }}>
      {/* Step 1 — Info */}
      {step === 1 && (
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--purple-bg)', border: '1px solid var(--border-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={20} color="var(--purple-light)" />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Aktivizo Arkën Fiskale</p>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Regjistrim automatik te ATK</p>
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#2563EB', lineHeight: 1.6 }}>
              Fiscalix gjeneron çelësin kriptografik dhe e regjistron pajisjen te ATK automatikisht.
              Procesi zgjat rreth 10 sekonda. NUI: <strong>{companyNui || '— mungon'}</strong>
            </p>
          </div>

          {!companyNui && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#EF4444' }}>
                NUI mungon. Shko te seksioni Kompania dhe vendos Numrin Fiskal para se të vazhdosh.
              </p>
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={!companyNui}
            className="finex-button-primary"
            style={{ width: '100%', padding: '11px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}>
            Vazhdo <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Step 2 — Config */}
      {step === 2 && (
        <div style={S.card}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Konfiguro Pajisjen</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={S.label}>Emri i Arkës</label>
                <input value={form.deviceName} onChange={e => setForm(f => ({ ...f, deviceName: e.target.value }))}
                  placeholder="Arka 1" className="finex-input" />
              </div>
              <div>
                <label style={S.label}>Kasieri (opsional)</label>
                <input value={form.cashierName} onChange={e => setForm(f => ({ ...f, cashierName: e.target.value }))}
                  placeholder="Ariana K." className="finex-input" />
              </div>
              <div>
                <label style={S.label}>POS ID</label>
                <input type="number" value={form.posId} onChange={e => setForm(f => ({ ...f, posId: e.target.value }))}
                  className="finex-input" />
              </div>
              <div>
                <label style={S.label}>Branch ID</label>
                <input type="number" value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                  className="finex-input" />
              </div>
            </div>

            <div>
              <label style={S.label}>Nr. Fiskalizimit ATK *</label>
              <input value={form.fiscalizationNo} onChange={e => setForm(f => ({ ...f, fiscalizationNo: e.target.value }))}
                placeholder="013243794194" className="finex-input" />
              <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Numri nga email-i i ATK pas aplikimit</p>
            </div>

            <div>
              <label style={S.label}>Application ID (nga ATK pas certifikimit)</label>
              <input value={form.applicationId} onChange={e => setForm(f => ({ ...f, applicationId: e.target.value }))}
                placeholder="Lër bosh — plotësohet pas certifikimit" className="finex-input" />
            </div>

            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#6B7280' }}>Kompania</span>
                <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{companyName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: '#6B7280' }}>NUI</span>
                <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{companyNui}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: '#6B7280' }}>Environment</span>
                <span style={{ color: environment === 'PROD' ? '#EF4444' : '#F59E0B', fontWeight: 600 }}>{environment}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={() => setStep(1)} className="finex-button-secondary" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
              Mbrapa
            </button>
            <button onClick={activate} disabled={loading} className="finex-button-primary"
              style={{ flex: 2, padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}>
              {loading
                ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Duke u aktivizuar...</>
                : 'Aktivizo Arkën'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Sukses */}
      {step === 3 && result?.success && (
        <div style={{ ...S.card, textAlign: 'center' }}>
          <CheckCircle size={40} color="#10B981" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>
            Arka u aktivizua!
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
            {result.message}
          </p>
          {result.isMock && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#F59E0B' }}>
                Mock Mode aktiv — çelësi është i simuluar. Për kuponë fiskalë realë, çaktivizo POS_MOCK_MODE dhe riekzekuto.
              </p>
            </div>
          )}
          <a href="/pos" className="finex-button-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, textDecoration: 'none', fontSize: 14 }}>
            Hap POS <ChevronRight size={14} />
          </a>
        </div>
      )}

      {/* Step 4 — Fallback manual */}
      {step === 4 && (
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <AlertTriangle size={20} color="#F59E0B" />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>ATK server nuk arrihet tani</p>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.6 }}>
            Onboarding automatik dështoi. Bëje manualisht:
          </p>
          <div style={{ background: 'var(--bg-muted)', borderRadius: 10, padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: '#10B981', marginBottom: 14 }}>
            ./onboarder -env={environment}
          </div>
          <p style={{ fontSize: 12, color:'var(--text-1)', lineHeight: 1.6 }}>
            Pas ekzekutimit, ngarko <code>private-key.pem</code> dhe <code>signed-certificate.pem</code> te ky seksion.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={() => setStep(2)} className="finex-button-secondary" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
              Provo Sërisht
            </button>
            <a href="/pos-onboarding" className="finex-button-primary"
              style={{ flex: 1, padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, textDecoration: 'none' }}>
              Ngarko Manualisht
            </a>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
