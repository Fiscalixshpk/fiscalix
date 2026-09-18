'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Users, Calendar, FileText, Activity, Search, Trash2 } from 'lucide-react'

type Tab = 'overview' | 'patients' | 'visits' | 'schedule'

interface Props {
  companyId: string
  patients: any[]
  visits: any[]
}

export default function HealthModuleClient({ companyId, patients: initPatients, visits: initVisits }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [patients, setPatients] = useState(initPatients || [])
  const [visits, setVisits] = useState(initVisits || [])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState<'patient' | 'visit' | null>(null)
  const supabase = createClient()

  const I = { background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--text-1)', fontSize: 13, width: '100%', outline: 'none' }
  const L = { fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }
  const S = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }

  const today = new Date().toISOString().split('T')[0]
  const visitsToday = visits.filter(v => v.visit_date === today).length
  const visitsThisMonth = visits.filter(v => v.visit_date?.startsWith(new Date().toISOString().slice(0, 7))).length
  const totalRevenue = visits.reduce((s, v) => s + Number(v.amount || 0), 0)
  const scheduledVisits = visits.filter(v => v.status === 'scheduled' && v.visit_date >= today)

  const filteredPatients = useMemo(() => patients.filter(p =>
    !search || p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search)
  ), [patients, search])

  const TABS = [
    { id: 'overview', label: 'Pasqyra', icon: Activity },
    { id: 'patients', label: 'Pacientët', icon: Users },
    { id: 'visits', label: 'Vizitat', icon: Calendar },
    { id: 'schedule', label: 'Orari', icon: FileText },
  ]

  async function addPatient(form: any) {
    const { data, error } = await supabase.from('patients').insert({ ...form, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setPatients(p => [data, ...p])
    setShowForm(null)
    toast.success('Pacienti u shtua')
  }

  const [savedVisit, setSavedVisit] = useState<any>(null) // modal pas ruajtjes
  const [fiscalizing, setFiscalizing] = useState(false)

  async function addVisit(form: any) {
    // Pastro fushat bosh — string bosh → null për kolonat date/numeric
    const clean = {
      ...form,
      next_visit:   form.next_visit   || null,
      amount:       form.amount       ? Number(form.amount) : null,
      patient_id:   form.patient_id   || null,
      doctor_name:  form.doctor_name  || null,
      diagnosis:    form.diagnosis    || null,
      treatment:    form.treatment    || null,
      prescription: form.prescription || null,
    }
    const { data, error } = await supabase.from('medical_visits').insert({ ...clean, company_id: companyId }).select('*, patients(full_name)').single()
    if (error) { toast.error(error.message); return }
    setVisits(v => [data, ...v])
    setShowForm(null)
    setSavedVisit({ ...data, amount: clean.amount, diagnosis: clean.diagnosis }) // hap modal
  }

  const [fiscalReceipt, setFiscalReceipt] = useState<any>(null) // kupon fiskal pas fiskalizimit
  const [viewVisit,     setViewVisit]     = useState<any>(null)  // hap vizitën e ruajtur

  async function fiscalizeVisit() {
    if (!savedVisit?.amount || Number(savedVisit.amount) <= 0) {
      toast.error('Shuma është 0 — vendos çmimin te vizita'); return
    }
    setFiscalizing(true)
    try {
      const res = await fetch('/api/pos/fiscalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            name: `Vizitë mjekësore${savedVisit.diagnosis ? ' — ' + savedVisit.diagnosis.slice(0,40) : ''}`,
            price: Math.round(Number(savedVisit.amount) * 10000),
            quantity: 1,
            total: Math.round(Number(savedVisit.amount) * 10000),
            taxRate: 'E',
            unit: 'cope',
          }],
          paymentMethod: 'cash',
          companyId,
          posDeviceId: 'mock-device',
          operatorName: 'Mjeku',
          couponId: 0,
        })
      })
      const fiscal = await res.json()
      if (fiscal.success || fiscal.status === 'offline') {
        setSavedVisit(null)
        // Shfaq kuponin fiskal
        setFiscalReceipt({
          receiptNumber: fiscal.receiptNumber || 'OFFLINE',
          transactionId: fiscal.transactionId || '—',
          amount: Number(savedVisit.amount),
          patient: savedVisit.patients?.full_name || 'Pacienti',
          diagnosis: savedVisit.diagnosis || '',
          date: new Date().toLocaleDateString('sq-AL'),
          time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
          status: fiscal.status === 'offline' ? 'offline' : 'fiscalized',
          qrCodeData: fiscal.qrCodeData || null,
        })
      } else {
        toast.error(fiscal.error || 'Fiskalizimi dështoi')
      }
    } catch (e) {
      toast.error('Gabim: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setFiscalizing(false)
    }
  }

  function printReceipt() {
    if (!fiscalReceipt) return
    import('@/hooks/usePrintReceipt').then(({ buildATKReceipt }) => {
      import('@/components/pos/receipt-printer').then(({ printReceipt: doPrint }) => {
        const amountCents = Math.round(fiscalReceipt.amount * 100)
        const atk = buildATKReceipt(
          {
            receiptNumber: fiscalReceipt.receiptNumber,
            status:        fiscalReceipt.status || 'fiscalized',
            total:         amountCents,
            tax:           Math.round(amountCents * 0.18 / 1.18),
          },
          [{
            name:     `${fiscalReceipt.diagnosis ? fiscalReceipt.diagnosis + ' — ' : ''}Vizitë Mjekësore`,
            price:    Math.round(fiscalReceipt.amount * 10000),
            quantity: 1,
            unit:     'cope',
            taxRate:  'E',
          }],
          { name: 'Klinika', nui: '—', location_city: 'Kosovë' },
          { paymentMethod: 'cash', operatorName: 'Mjek' }
        )
        doPrint(atk)
      })
    })
  }

  function generateReport() {
    if (!savedVisit) return
    const patient = savedVisit.patients?.full_name || 'Pacienti'
    const date    = new Date(savedVisit.visit_date || savedVisit.created_at).toLocaleDateString('sq-AL')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Raport Mjekësor</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:560px;margin:0 auto}
      h1{font-size:22px;margin-bottom:4px;color:#1E0A3C}
      .meta{color:#555;font-size:13px;margin-bottom:24px;border-bottom:1px solid #eee;padding-bottom:12px}
      .section{background:#F8F8F8;border-radius:8px;padding:14px;margin-bottom:12px;border-left:3px solid #7C3AED}
      .label{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}
      .val{font-size:14px;color:#111}
      .footer{margin-top:40px;border-top:1px solid #ddd;padding-top:16px;font-size:11px;color:#aaa;text-align:center}
      @media print{@page{margin:15mm}body{padding:0}}
    </style></head><body>
    <h1>Raport Mjekësor</h1>
    <div class="meta">Data: ${date} &nbsp;&nbsp; Nr: ${savedVisit.id?.slice(-8).toUpperCase()}</div>
    <div class="section"><div class="label">Pacienti</div><div class="val">${patient}</div></div>
    ${savedVisit.diagnosis  ? `<div class="section"><div class="label">Diagnoza</div><div class="val">${savedVisit.diagnosis}</div></div>` : ''}
    ${savedVisit.treatment  ? `<div class="section"><div class="label">Trajtimi</div><div class="val">${savedVisit.treatment}</div></div>` : ''}
    ${savedVisit.prescription ? `<div class="section"><div class="label">Receta</div><div class="val">${savedVisit.prescription}</div></div>` : ''}
    ${savedVisit.amount     ? `<div class="section"><div class="label">Shuma e Vizitës</div><div class="val">€${Number(savedVisit.amount).toFixed(2)}</div></div>` : ''}
    <div class="footer">Fiscalix · Raport i gjeneruar automatikisht · ${date}</div>
    </body></html>`

    // Përdor iframe të fshehur — nuk bllokohet nga popup blocker
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (!doc) { toast.error('Gabim printimi'); return }
    doc.open(); doc.write(html); doc.close()
    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 400)
  }

  async function deletePatient(id: string) {
    await supabase.from('patients').delete().eq('id', id)
    setPatients(p => p.filter(x => x.id !== id))
    toast.success('U fshi')
  }

  return (
    <div className="page-enter">

      {/* Modal — Kupon Fiskal */}
      {fiscalReceipt && (
        <>
          <div onClick={()=>setFiscalReceipt(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:210,backdropFilter:'blur(4px)'}}/>
          <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:28,width:'min(340px,94vw)',zIndex:211,boxShadow:'0 24px 60px rgba(0,0,0,0.3)'}}>
            <div style={{textAlign:'center',paddingBottom:16,borderBottom:'1px solid var(--border)',marginBottom:16}}>
              <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(16,185,129,0.12)',border:'2px solid #10B981',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px',fontSize:20}}>✓</div>
              <p style={{fontSize:16,fontWeight:800,color:'var(--text-1)'}}>Kupon Fiskal</p>
              <p style={{fontSize:12,color:fiscalReceipt.status==='offline'?'#F59E0B':'#10B981',fontWeight:700,marginTop:4}}>
                {fiscalReceipt.status==='offline' ? 'Offline — do të fiskalizohet' : `ATK ✓`}
              </p>
            </div>
            <div style={{background:'var(--bg-muted)',borderRadius:12,padding:'14px',marginBottom:16,fontFamily:'Courier New,monospace',fontSize:12}}>
              <div style={{textAlign:'center',marginBottom:8}}>
                <p style={{fontSize:15,fontWeight:900,letterSpacing:2}}>FISCALIX</p>
                <p style={{fontSize:10,color:'var(--text-3)'}}>{fiscalReceipt.date} · {fiscalReceipt.time}</p>
                <p style={{fontSize:11,fontWeight:700,color:'var(--purple-light)'}}>Nr: {fiscalReceipt.receiptNumber}</p>
              </div>
              <div style={{borderTop:'1px dashed var(--border)',paddingTop:8,marginTop:8}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:11}}><span>{fiscalReceipt.patient}</span></div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:900,borderTop:'1px solid var(--border)',paddingTop:6,marginTop:4}}>
                  <span>TOTALI</span><span>€{fiscalReceipt.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={printReceipt}
                style={{flex:1,padding:'10px',borderRadius:10,background:'var(--purple)',color:'var(--text-1)',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                🖨️ Printo
              </button>
              <button onClick={()=>setFiscalReceipt(null)}
                style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontSize:13,color:'var(--text-2)'}}>
                Mbyll
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal — Shiko Vizitën */}
      {viewVisit && (
        <>
          <div onClick={()=>setViewVisit(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:210,backdropFilter:'blur(4px)'}}/>
          <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:28,width:'min(500px,94vw)',zIndex:211,boxShadow:'0 24px 60px rgba(0,0,0,0.3)',maxHeight:'85vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <div>
                <p style={{fontSize:17,fontWeight:800,color:'var(--text-1)'}}>Vizita — {viewVisit.patients?.full_name || 'Pacienti'}</p>
                <p style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>{new Date(viewVisit.visit_date || viewVisit.created_at).toLocaleDateString('sq-AL')}</p>
              </div>
              <button onClick={()=>setViewVisit(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:20}}>×</button>
            </div>
            {[
              { label: 'Lloji Vizitës', val: viewVisit.visit_type },
              { label: 'Mjeku', val: viewVisit.doctor_name },
              { label: 'Diagnoza', val: viewVisit.diagnosis },
              { label: 'Trajtimi', val: viewVisit.treatment },
              { label: 'Receta', val: viewVisit.prescription },
              { label: 'Shuma', val: viewVisit.amount ? `€${Number(viewVisit.amount).toFixed(2)}` : null },
              { label: 'Statusi', val: viewVisit.status },
              { label: 'Vizita Tjetër', val: viewVisit.next_visit ? new Date(viewVisit.next_visit).toLocaleDateString('sq-AL') : null },
            ].filter(r => r.val).map(r => (
              <div key={r.label} style={{padding:'10px 14px',borderRadius:10,background:'var(--bg-muted)',border:'1px solid var(--border)',marginBottom:8}}>
                <p style={{fontSize:10,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:3}}>{r.label}</p>
                <p style={{fontSize:14,color:'var(--text-1)'}}>{r.val}</p>
              </div>
            ))}
            <button onClick={()=>setViewVisit(null)}
              style={{width:'100%',marginTop:8,padding:'11px',borderRadius:10,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontSize:13,color:'var(--text-2)'}}>
              Mbyll
            </button>
          </div>
        </>
      )}

      {/* Modal pas ruajtjes së vizitës */}
      {savedVisit && (
        <>
          <div onClick={()=>setSavedVisit(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,backdropFilter:'blur(4px)'}}/>
          <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:28,width:'min(400px,94vw)',zIndex:201,boxShadow:'0 24px 60px rgba(0,0,0,0.3)'}}>
            <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(16,185,129,0.1)',border:'2px solid #10B981',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
              <span style={{fontSize:22}}>✓</span>
            </div>
            <h3 style={{fontSize:17,fontWeight:800,color:'var(--text-1)',textAlign:'center',marginBottom:6}}>Vizita u ruajt</h3>
            <p style={{fontSize:13,color:'var(--text-1)',textAlign:'center',marginBottom:22}}>
              {savedVisit.patients?.full_name} &nbsp;·&nbsp;
              {savedVisit.amount ? `€${Number(savedVisit.amount).toFixed(2)}` : 'Pa çmim'}
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <button onClick={generateReport}
                style={{padding:'11px',borderRadius:11,border:'1px solid var(--border)',background:'var(--bg-muted)',cursor:'pointer',fontSize:13,fontWeight:700,color:'var(--text-1)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                📄 Gjenero &amp; Printo Raportin
              </button>
              {savedVisit.amount && Number(savedVisit.amount) > 0 && (
                <button onClick={fiscalizeVisit} disabled={fiscalizing}
                  style={{padding:'11px',borderRadius:11,background:'var(--purple)',color:'var(--text-1)',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 12px rgba(124,58,237,0.3)'}}>
                  {fiscalizing
                    ? <><div style={{width:14,height:14,border:'2px solid var(--border)',borderTop:'2px solid white',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/> Duke fiskalizuar...</>
                    : <>🧾 Fiskalizо &amp; Gjenero Kupon</>}
                </button>
              )}
              <button onClick={()=>{ generateReport(); setTimeout(fiscalizeVisit, 600) }} disabled={fiscalizing || !savedVisit.amount}
                style={{padding:'11px',borderRadius:11,border:'1px solid var(--border-purple)',background:'var(--purple-bg)',cursor:(!savedVisit.amount||fiscalizing)?'not-allowed':'pointer',fontSize:13,fontWeight:700,color:'var(--purple-light)',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:!savedVisit.amount?0.5:1}}>
                ✨ Të Dyja — Raport + Kupon
              </button>
              <button onClick={()=>setSavedVisit(null)}
                style={{padding:'9px',borderRadius:11,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontSize:13,color:'var(--text-3)'}}>
                Mbyll
              </button>
            </div>
          </div>
        </>
      )}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
          Moduli i Shëndetësisë
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Pacientët, vizitat, recetat, orari</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id as Tab)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${tab === t.id ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`, background: tab === t.id ? 'rgba(124,58,237,0.12)' : 'var(--bg-card)', color: tab === t.id ? 'var(--purple)' : 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Pacientë Totalë', value: patients.length.toString(), color: '#3B82F6', icon: '👥' },
              { label: 'Vizita Sot', value: visitsToday.toString(), color: '#10B981', icon: '📅' },
              { label: 'Këtë Muaj', value: visitsThisMonth.toString(), color: '#9B5CF8', icon: '📊' },
              { label: 'Të Ardhura', value: `€${totalRevenue.toLocaleString()}`, color: '#F59E0B', icon: '💰' },
              { label: 'Vizita Planifikuara', value: scheduledVisits.length.toString(), color: '#6366F1', icon: '🗓️' },
            ].map((k, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', borderTop: `3px solid ${k.color}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{k.icon} {k.label}</p>
                <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 900, color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Vizitat e fundit */}
          <div style={S}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>Vizitat e Fundit</p>
            {visits.slice(0, 8).map(v => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{v.patients?.full_name || '—'}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{v.visit_date} · {v.visit_type} · {v.doctor_name || ''}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>€{Number(v.amount || 0).toFixed(2)}</p>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: v.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)', color: v.status === 'completed' ? '#10B981' : '#818CF8' }}>
                    {v.status === 'completed' ? '✅ Kompletuar' : '🗓️ Planifikuar'}
                  </span>
                </div>
              </div>
            ))}
            {visits.length === 0 && <p style={{ textAlign: 'center', color:'var(--text-1)', padding: '20px 0', fontSize: 13 }}>Nuk ka vizita</p>}
          </div>
        </>
      )}

      {/* PATIENTS */}
      {tab === 'patients' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kërko pacient..." style={{ ...I, paddingLeft: 36 }} />
            </div>
            <button onClick={() => setShowForm('patient')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              <Plus size={14} /> Pacient i Ri
            </button>
          </div>

          {showForm === 'patient' && <PatientForm onSave={addPatient} onCancel={() => setShowForm(null)} I={I} L={L} />}

          <div style={{ overflowX: 'auto' }}>
            <table className="finex-table">
              <thead>
                <tr><th>Emri</th><th>Telefoni</th><th>Data Lindjes</th><th>Gjaku</th><th>Sëmundje Kronike</th><th>Vizita</th><th></th></tr>
              </thead>
              <tbody>
                {filteredPatients.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>{p.full_name}</td>
                    <td style={{ fontSize: 12 }}>{p.phone || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.date_of_birth || '—'}</td>
                    <td style={{ fontSize: 11 }}>{p.blood_type || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.chronic_conditions || '—'}</td>
                    <td style={{ textAlign: 'center', fontSize: 12, color: '#9B5CF8', fontWeight: 700 }}>
                      {visits.filter(v => v.patient_id === p.id).length}
                    </td>
                    <td>
                      <button onClick={() => deletePatient(p.id)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', cursor: 'pointer' }}>
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPatients.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '30px 0', fontSize: 13 }}>Nuk ka pacientë</p>}
          </div>
        </div>
      )}

      {/* VISITS */}
      {tab === 'visits' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button onClick={() => setShowForm('visit')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              <Plus size={14} /> Vizitë e Re
            </button>
          </div>

          {showForm === 'visit' && <VisitForm patients={patients} onSave={addVisit} onCancel={() => setShowForm(null)} I={I} L={L} />}

          <div style={{ overflowX: 'auto' }}>
            <table className="finex-table">
              <thead>
                <tr><th>Pacienti</th><th>Data</th><th>Lloji</th><th>Diagnoza</th><th>Mjeku</th><th style={{ textAlign: 'right' }}>Shuma</th><th>Statusi</th></tr>
              </thead>
              <tbody>
                {visits.map(v => (
                  <tr key={v.id} style={{cursor:'pointer'}} onClick={()=>setViewVisit(v)}>
                    <td style={{ fontWeight: 700 }}>{v.patients?.full_name || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{v.visit_date}</td>
                    <td style={{ fontSize: 11 }}>{v.visit_type}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.diagnosis || '—'}</td>
                    <td style={{ fontSize: 11 }}>{v.doctor_name || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#10B981' }}>€{Number(v.amount || 0).toFixed(2)}</td>
                    <td><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: v.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)', color: v.status === 'completed' ? '#10B981' : '#818CF8' }}>
                      {v.status === 'completed' ? 'Kompletuar' : 'Planifikuar'}
                    </span></td>
                    <td><button onClick={e=>{e.stopPropagation();setViewVisit(v)}} style={{padding:'4px 10px',borderRadius:7,border:'1px solid var(--border)',background:'var(--bg-muted)',cursor:'pointer',fontSize:11,fontWeight:600,color:'var(--text-1)'}}>Hap</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visits.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '30px 0', fontSize: 13 }}>Nuk ka vizita</p>}
          </div>
        </div>
      )}

      {/* SCHEDULE */}
      {tab === 'schedule' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>🗓️ Vizitat e Planifikuara</p>
          {scheduledVisits.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 0', fontSize: 13 }}>Nuk ka vizita të planifikuara</p>
          ) : scheduledVisits.map(v => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{v.patients?.full_name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{v.visit_type} · {v.doctor_name || ''}</p>
              </div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#6366F1' }}>{v.visit_date}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PatientForm({ onSave, onCancel, I, L }: any) {
  const [form, setForm] = useState({ full_name: '', date_of_birth: '', gender: 'male', phone: '', email: '', blood_type: '', chronic_conditions: '', allergies: '', id_number: '' })
  return (
    <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div><label style={L}>Emri i Plotë *</label><input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} style={I} /></div>
        <div><label style={L}>Data Lindjes</label><input type="date" value={form.date_of_birth} onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))} style={I} /></div>
        <div><label style={L}>Gjinia</label>
          <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} style={I}>
            <option value="male">Mashkull</option><option value="female">Femër</option>
          </select>
        </div>
        <div><label style={L}>Telefoni</label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={I} /></div>
        <div><label style={L}>Grupi i Gjakut</label>
          <select value={form.blood_type} onChange={e => setForm(p => ({ ...p, blood_type: e.target.value }))} style={I}>
            <option value="">—</option>
            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div><label style={L}>Nr. ID</label><input value={form.id_number} onChange={e => setForm(p => ({ ...p, id_number: e.target.value }))} style={I} /></div>
        <div style={{ gridColumn: 'span 3' }}><label style={L}>Sëmundje Kronike</label><input value={form.chronic_conditions} onChange={e => setForm(p => ({ ...p, chronic_conditions: e.target.value }))} style={I} placeholder="Diabeti, Hipertensioni..." /></div>
        <div style={{ gridColumn: 'span 3' }}><label style={L}>Alergjitë</label><input value={form.allergies} onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))} style={I} /></div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onSave(form)} style={{ padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Shto Pacientin</button>
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color:'var(--text-1)', fontSize: 13, cursor: 'pointer' }}>Anulo</button>
      </div>
    </div>
  )
}

function VisitForm({ patients, onSave, onCancel, I, L }: any) {
  const [form, setForm] = useState({ patient_id: '', visit_date: new Date().toISOString().split('T')[0], visit_type: 'regular', doctor_name: '', diagnosis: '', treatment: '', prescription: '', amount: '', status: 'completed', next_visit: '' })
  return (
    <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div><label style={L}>Pacienti *</label>
          <select value={form.patient_id} onChange={e => setForm(p => ({ ...p, patient_id: e.target.value }))} style={I}>
            <option value="">Zgjidh pacientin</option>
            {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div><label style={L}>Data</label><input type="date" value={form.visit_date} onChange={e => setForm(p => ({ ...p, visit_date: e.target.value }))} style={I} /></div>
        <div><label style={L}>Lloji</label>
          <select value={form.visit_type} onChange={e => setForm(p => ({ ...p, visit_type: e.target.value }))} style={I}>
            <option value="regular">Rregullt</option>
            <option value="emergency">Urgjencë</option>
            <option value="followup">Kontroll</option>
            <option value="surgery">Operacion</option>
          </select>
        </div>
        <div><label style={L}>Mjeku</label><input value={form.doctor_name} onChange={e => setForm(p => ({ ...p, doctor_name: e.target.value }))} style={I} /></div>
        <div><label style={L}>Shuma (€)</label><input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} style={I} /></div>
        <div><label style={L}>Statusi</label>
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={I}>
            <option value="completed">Kompletuar</option>
            <option value="scheduled">Planifikuar</option>
          </select>
        </div>
        <div style={{ gridColumn: 'span 3' }}><label style={L}>Diagnoza</label><input value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} style={I} /></div>
        <div style={{ gridColumn: 'span 3' }}><label style={L}>Trajtimi / Receta</label><input value={form.prescription} onChange={e => setForm(p => ({ ...p, prescription: e.target.value }))} style={I} /></div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onSave({ ...form, amount: parseFloat(form.amount) || 0 })} style={{ padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Regjistro Vizitën</button>
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color:'var(--text-1)', fontSize: 13, cursor: 'pointer' }}>Anulo</button>
      </div>
    </div>
  )
}
