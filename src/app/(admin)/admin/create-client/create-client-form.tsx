'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Building2, User, Briefcase, CreditCard, Zap, Check, Crown } from 'lucide-react'

const CATEGORIES = [
  { id: 'restaurant', label: 'Restorant'            },
  { id: 'bakery',     label: 'Furrë / Pastiqeri'    },
  { id: 'market',     label: 'Dyqan / Market'        },
  { id: 'pharmacy',   label: 'Farmaci'               },
  { id: 'salon',      label: 'Sallon / Berber / Spa' },
  { id: 'health',     label: 'Mjek / Klinikë'        },
  { id: 'b2b',        label: 'Biznes B2B'            },
  { id: 'other',      label: 'Tjera'                 },
]

const PLANS = [
  {
    id: 'arka',
    label: 'Arka',
    price: '€59/vit · €6/muaj',
    desc: 'Vetëm arka fiskale digjitale',
    color: '#06B6D4',
    features: ['1 pajisje', 'Arka Fiskale ATK', 'Historia kuponave', 'Lidhja me kontabilist'],
  },
  {
    id: 'basic',
    label: 'Basic',
    price: '€119/vit · €11/muaj',
    desc: 'Biznese të vogla me POS',
    color: '#10B981',
    features: ['1 pajisje', 'Arka Fiskale ATK', 'Raporte simple'],
  },
  {
    id: 'pro',
    label: 'Pro',
    price: '€249/vit · €22/muaj',
    desc: 'Restorant, market, farmaci',
    color: '#2563EB',
    features: ['3 pajisje', 'POS Tavolina', 'Portal Kontabilisti', 'Terminet & Stoku'],
  },
  {
    id: 'business',
    label: 'Business',
    price: '€349/vit · €29/muaj',
    desc: 'Zinxhir, shumë degë',
    color: '#7C3AED',
    features: ['Pajisje pa limit', 'Role & Permisione', 'Gjithçka nga Pro'],
  },
  {
    id: 'accountant',
    label: 'Kontabilist',
    price: '€199/vit · €17/muaj',
    desc: 'Menaxho të gjithë klientët',
    color: '#F59E0B',
    features: ['Klientë pa limit', 'Panel i unifikuar', 'Komision 20%'],
  },
  {
    id: 'b2b',
    label: 'B2B',
    price: '€150/vit · €13/muaj',
    desc: 'Biznese që faturojnë biznese',
    color: '#10B981',
    features: ['Fatura & Oferta', 'Kontrata', 'Fatura Periodike', 'Porosi Blerjeje', 'Lidhja me kontabilist'],
  },
]

const CITIES = ['Prishtinë','Prizren','Pejë','Mitrovicë','Gjakovë','Ferizaj','Gjilan','Vushtrri','Podujevë','Suharekë','Rahovec','Malishevë','Istog','Klinë','Skënderaj','Drenas','Lipjan','Kaçanik','Shtimë','Shtime','Deçan','Junik','Dragash','Mamushë','Novobërdë','Ranilug','Partesh','Kllokot']

const S = {
  label: { fontSize: 11, fontWeight: 700 as const, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  input: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-muted)', fontSize: 13, color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' },
  section: { fontSize: 11, fontWeight: 700 as const, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 },
}

export default function CreateClientForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isB2B = searchParams.get('type') === 'b2b'
  const [saving,       setSaving]      = useState(false)
  const [done,         setDone]        = useState(false)
  const [accountType,  setAccountType] = useState<'business'|'accountant'>('business')
  const [accForm, setAccForm] = useState({ full_name: '', email: '', password: '', max_clients: 20, notes: '' })
  const [form, setForm] = useState({
    // Kompania
    business_name:  '',
    business_type:  isB2B ? 'b2b' : '',
    nipt:           '',
    nui:            '',
    city:           '',
    address:        '',
    phone:          '',
    website:        '',
    // Llogaria
    full_name:      '',
    email:          '',
    password:       '',
    // Abonimenti
    plan:           isB2B ? 'b2b' : 'basic',
    pos_enabled:    isB2B ? false : true,
    is_vat_registered: false,
    trial_days:     0,
    // Shënime
    notes:          '',
  })

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  async function submitAccountant() {
    if (!accForm.full_name || !accForm.email || !accForm.password) {
      toast.error('Plotëso: emri, email, fjalëkalim'); return
    }
    if (accForm.password.length < 8) { toast.error('Fjalëkalimi minimum 8 karaktere'); return }
    setSaving(true)
    try {
      const res  = await fetch('/api/admin/create-accountant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gabim')
      setDone(true); toast.success(`${accForm.full_name} u krijua si kontabilist`)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gabim') }
    finally { setSaving(false) }
  }

  async function submit() {
    if (!form.business_name || !form.business_type || !form.email || !form.password || !form.full_name) {
      toast.error('Plotëso: emri biznesit, lloji, emri kontaktit, email, fjalëkalim')
      return
    }
    if (form.password.length < 8) { toast.error('Fjalëkalimi duhet të jetë minimum 8 karaktere'); return }

    setSaving(true)
    try {
      const res  = await fetch('/api/admin/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gabim gjatë krijimit')
      setDone(true)
      toast.success(`${form.business_name} u krijua`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally {
      setSaving(false)
    }
  }

  if (done) return (
    <div style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <Check size={28} color="#10B981" />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color:'var(--text-1)', marginBottom: 8 }}>Llogaria u krijua</h2>
      <p style={{ fontSize: 14, color:'var(--text-1)', marginBottom: 8 }}><strong>{form.business_name}</strong></p>
      <p style={{ fontSize: 13, color:'var(--text-1)', marginBottom: 24 }}>Email: <strong>{form.email}</strong></p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={() => { setDone(false); setForm(f => ({ ...f, business_name: '', nipt: '', nui: '', email: '', full_name: '', password: '', phone: '', address: '', website: '', notes: '' })) }}
          className="finex-button-secondary" style={{ padding: '10px 20px', fontSize: 13 }}>
          Krijo Tjetër
        </button>
        <button onClick={() => router.push('/admin')} className="finex-button-primary" style={{ padding: '10px 20px', fontSize: 13 }}>
          Kthehu te Admin
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.push('/admin')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' }}>
          <ArrowLeft size={14} /> Admin
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)' }}>Krijo Llogari të Re</h1>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Biznes ose Kontabilist</p>
        </div>
      </div>

      {/* Type switcher */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <button onClick={() => setAccountType('business')}
          style={{ padding: '14px', borderRadius: 14, border: `2px solid ${accountType==='business' ? 'var(--purple)' : 'var(--border)'}`, background: accountType==='business' ? 'var(--purple-bg)' : 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.12s' }}>
          <Building2 size={20} color={accountType==='business' ? 'var(--purple-light)' : 'var(--text-3)'} />
          <div style={{ textAlign: 'left' as const }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: accountType==='business' ? 'var(--purple-light)' : 'var(--text-1)' }}>Biznes</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Market, restorant, kafé...</p>
          </div>
        </button>
        <button onClick={() => setAccountType('accountant')}
          style={{ padding: '14px', borderRadius: 14, border: `2px solid ${accountType==='accountant' ? '#F59E0B' : 'var(--border)'}`, background: accountType==='accountant' ? 'rgba(245,158,11,0.08)' : 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.12s' }}>
          <Crown size={20} color={accountType==='accountant' ? '#F59E0B' : 'var(--text-3)'} />
          <div style={{ textAlign: 'left' as const }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: accountType==='accountant' ? '#F59E0B' : 'var(--text-1)' }}>Kontabilist</p>
            <p style={{ fontSize: 11, color:'var(--text-1)' }}>Menaxhon disa biznese</p>
          </div>
        </button>
      </div>

      {/* ACCOUNTANT FORM */}
      {accountType === 'accountant' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 13, color: '#F59E0B' }}>
            Kontabilisti do të ketë akses te workspace-i i kontabilistit — pa POS, pa tavolina.
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px' }}>
            <p style={S.section}><User size={13} /> Të Dhënat e Kontabilistit</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={S.label}>Emri i Plotë *</label>
                <input value={accForm.full_name} onChange={e => setAccForm(f=>({...f,full_name:e.target.value}))} placeholder="Ardian Krasniqi" style={S.input} autoFocus />
              </div>
              <div>
                <label style={S.label}>Email *</label>
                <input type="email" value={accForm.email} onChange={e => setAccForm(f=>({...f,email:e.target.value}))} placeholder="ardian@kontabilist.com" style={S.input} />
              </div>
              <div>
                <label style={S.label}>Fjalëkalimi *</label>
                <input type="password" value={accForm.password} onChange={e => setAccForm(f=>({...f,password:e.target.value}))} placeholder="Min. 8 karaktere" style={S.input} />
              </div>
              <div>
                <label style={S.label}>Limiti i Klientëve</label>
                <select value={accForm.max_clients} onChange={e => setAccForm(f=>({...f,max_clients:Number(e.target.value)}))} style={{ ...S.input, cursor: 'pointer' }}>
                  <option value={10}>Deri 10 klientë</option>
                  <option value={20}>Deri 20 klientë</option>
                  <option value={50}>Deri 50 klientë</option>
                  <option value={100}>Deri 100 klientë</option>
                  <option value={-1}>Pa limit</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={S.label}>Shënime Interne</label>
                <textarea value={accForm.notes} onChange={e => setAccForm(f=>({...f,notes:e.target.value}))} placeholder="Kontakti, mënyra e pagesës..." style={{ ...S.input, minHeight: 70, resize: 'vertical' as const }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 40 }}>
            <button onClick={() => router.push('/admin')} className="finex-button-secondary" style={{ padding: '11px 20px', fontSize: 13 }}>Anulo</button>
            <button onClick={submitAccountant} disabled={saving} className="finex-button-primary"
              style={{ padding: '11px 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, minWidth: 180, justifyContent: 'center' }}>
              {saving
                ? <><div style={{ width: 16, height: 16, border: '2px solid var(--border-color,#e2dcff)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Duke krijuar...</>
                : <><Check size={15} /> Krijo Kontabilistin</>}
            </button>
          </div>
        </div>
      )}

      {/* BUSINESS FORM */}
      {accountType === 'business' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* B2B Banner */}
        {isB2B && (
          <div style={{ background: 'rgba(16,185,129,.08)', border: '1.5px solid rgba(16,185,129,.25)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🤝</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#10B981', margin: 0 }}>Llogari Biznes B2B</p>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '3px 0 0' }}>Pa POS · Me Oferta, Kontrata, Fatura Periodike dhe Porosi Blerjeje</p>
            </div>
          </div>
        )}

        {/* Lloji i biznesit */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px' }}>
          <p style={S.section}><Briefcase size={13} /> Lloji i Biznesit *</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => set('business_type', cat.id)}
                style={{ padding: '12px 8px', borderRadius: 12, border: `1.5px solid ${form.business_type === cat.id ? 'var(--purple)' : 'var(--border)'}`, background: form.business_type === cat.id ? 'var(--purple-bg)' : 'var(--bg-muted)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.12s' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: form.business_type === cat.id ? 'var(--purple-light)' : 'var(--text-2)', textAlign: 'center', lineHeight: 1.3 }}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Të dhënat e kompanisë */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px' }}>
          <p style={S.section}><Building2 size={13} /> Kompania</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={S.label}>Emri i Biznesit *</label>
              <input value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Kafe Tradita shpk" style={S.input} autoFocus />
            </div>
            <div>
              <label style={S.label}>NIPT</label>
              <input value={form.nipt} onChange={e => set('nipt', e.target.value)} placeholder="811234567" style={S.input} />
            </div>
            <div>
              <label style={S.label}>NUI (Fiskal ATK)</label>
              <input value={form.nui} onChange={e => set('nui', e.target.value)} placeholder="7012345678" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Qyteti</label>
              <select value={form.city} onChange={e => set('city', e.target.value)} style={{ ...S.input, cursor: 'pointer' }}>
                <option value="">— Zgjedh qytetin —</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Telefoni</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+383 44 123 456" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Adresa</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rr. Lidhja e Prizrenit, nr. 5" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Website (opsional)</label>
              <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="www.kafe-tradita.com" style={S.input} />
            </div>
          </div>
        </div>

        {/* Llogaria */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px' }}>
          <p style={S.section}><User size={13} /> Llogaria (Kyçja)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={S.label}>Emri i Plotë *</label>
              <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Ardian Berisha" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="ardian@kafe-tradita.com" style={S.input} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={S.label}>Fjalëkalimi Fillestar *</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 karaktere" style={S.input} />
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Klienti mund ta ndryshojë pas kyçjes së parë</p>
            </div>
          </div>
        </div>

        {/* Abonimenti */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px' }}>
          <p style={S.section}><CreditCard size={13} /> Abonimenti</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
            {(isB2B ? PLANS.filter(p => p.id === 'b2b') : PLANS.filter(p => p.id !== 'b2b')).map(plan => (
              <button key={plan.id} onClick={() => set('plan', plan.id)}
                style={{ padding: '14px', borderRadius: 12, border: `2px solid ${form.plan === plan.id ? plan.color : 'var(--border)'}`, background: form.plan === plan.id ? `${plan.color}12` : 'var(--bg-muted)', cursor: 'pointer', textAlign: 'left' as const, transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: form.plan === plan.id ? plan.color : 'var(--text-1)' }}>{plan.label}</p>
                  {form.plan === plan.id && <span style={{ width: 8, height: 8, borderRadius: '50%', background: plan.color, display: 'block' }}/>}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{plan.desc}</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: plan.color, marginBottom: 8 }}>{plan.price}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {plan.features.map(f => (
                    <p key={f} style={{ fontSize: 11, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ color: plan.color, fontWeight: 700 }}>✓</span> {f}
                    </p>
                  ))}
                </div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>I Regjistruar në TVSH</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Biznesi aplikon TVSH 18% te faturat</p>
            </div>
            <button onClick={() => set('is_vat_registered', !form.is_vat_registered)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 26, color: form.is_vat_registered ? '#10B981' : 'var(--text-3)' }}>
              {form.is_vat_registered ? '●' : '○'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>POS Aktiv</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Lejo fiskalizim me ATK</p>
            </div>
            {!isB2B && <button onClick={() => set('pos_enabled', !form.pos_enabled)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 26, color: form.pos_enabled ? 'var(--purple)' : 'var(--text-3)' }}>
              {form.pos_enabled ? '●' : '○'}
            </button>}
          </div>
        </div>

        {/* Shënime */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px' }}>
          <p style={S.section}><Zap size={13} /> Shënime Interne</p>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Kontakti: Ardiani 044 xxx xxx. Takuam 4 Gusht..."
            style={{ ...S.input, minHeight: 80, resize: 'vertical' as const }} />
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 40 }}>
          <button onClick={() => router.push('/admin')} className="finex-button-secondary" style={{ padding: '11px 20px', fontSize: 13 }}>
            Anulo
          </button>
          <button onClick={submit} disabled={saving} className="finex-button-primary"
            style={{ padding: '11px 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, minWidth: 160, justifyContent: 'center' }}>
            {saving
              ? <><div style={{ width: 16, height: 16, border: '2px solid var(--border-color,#e2dcff)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Duke krijuar...</>
              : <><Check size={15} /> Krijo Llogarinë</>}
          </button>
        </div>
      </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
