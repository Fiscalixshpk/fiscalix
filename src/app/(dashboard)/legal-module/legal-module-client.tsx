'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Users, FileText, Calendar, TrendingUp, Search, Scale } from 'lucide-react'

interface Props { companyId: string; data1: any[]; data2: any[]; data3: any[] }

export default function LegalModuleClient({ companyId, data1: iCases, data2: iHearings, data3: iClients }: Props) {
  const [tab, setTab] = useState('overview')
  const [cases, setCases] = useState(iCases || [])
  const [hearings, setHearings] = useState(iHearings || [])
  const [clients, setClients] = useState(iClients || [])
  const [showForm, setShowForm] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }
  const L = { fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'0.06em' }
  const S = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', marginBottom:14 }

  const activeCases = cases.filter(c => c.status === 'active').length
  const totalFees = cases.reduce((s, c) => s + Number(c.total_fee || 0), 0)
  const totalPaid = cases.reduce((s, c) => s + Number(c.paid_amount || 0), 0)
  const today = new Date().toISOString().split('T')[0]
  const upcomingHearings = hearings.filter(h => h.hearing_date >= today).sort((a, b) => a.hearing_date.localeCompare(b.hearing_date))

  const CASE_STATUS: Record<string, string> = { active:'🟢 Aktiv', won:'🏆 Fituar', lost:'❌ Humbur', settled:'🤝 Marrëveshje', closed:'⬛ Mbyllur' }
  const CASE_TYPE: Record<string, string> = { civil:'Civile', criminal:'Penale', commercial:'Komerciale', family:'Familjare', administrative:'Administrative' }

  const TABS = [
    { id:'overview', label:'Pasqyra', icon:TrendingUp },
    { id:'cases', label:'Çështjet', icon:FileText },
    { id:'hearings', label:'Seancat', icon:Calendar },
    { id:'clients', label:'Klientët', icon:Users },
  ]

  async function addCase(f: any) {
    const { data, error } = await supabase.from('legal_cases').insert({ ...f, total_fee: parseFloat(f.total_fee)||0, paid_amount: 0, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setCases(c => [data, ...c]); setShowForm(null); toast.success('Çështja u shtua')
  }

  async function addHearing(f: any) {
    const { data, error } = await supabase.from('legal_hearings').insert({ ...f, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setHearings(h => [data, ...h]); setShowForm(null); toast.success('Seanca u shtua')
  }

  async function addClient(f: any) {
    const { data, error } = await supabase.from('legal_clients').insert({ ...f, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setClients(c => [data, ...c]); setShowForm(null); toast.success('Klienti u shtua')
  }

  return (
    <div className="page-enter">
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>⚖️ Moduli Juridik</h1>
        <p style={{ fontSize:13, color:'var(--text-3)' }}>Çështjet, klientët, seancat, honorarët</p>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {TABS.map(t => { const Icon = t.icon; return (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:`1px solid ${tab===t.id?'rgba(124,58,237,0.4)':'var(--border)'}`, background:tab===t.id?'rgba(124,58,237,0.12)':'var(--bg-card)', color:tab===t.id?'var(--purple)':'var(--text-2)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            <Icon size={14}/>{t.label}
          </button>
        )})}
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
            {[
              { label:'Çështje Aktive', value:activeCases.toString(), color:'#3B82F6', icon:'⚖️' },
              { label:'Klientë', value:clients.length.toString(), color:'#9B5CF8', icon:'👥' },
              { label:'Honorarë Totale', value:`€${totalFees.toLocaleString()}`, color:'#10B981', icon:'💰' },
              { label:'Arkëtuar', value:`€${totalPaid.toLocaleString()}`, color:'#F59E0B', icon:'📥' },
              { label:'Mbetur', value:`€${(totalFees-totalPaid).toLocaleString()}`, color:'#EF4444', icon:'📋' },
              { label:'Seanca të Ardhshme', value:upcomingHearings.length.toString(), color:'#6366F1', icon:'🗓️' },
            ].map((k,i) => (
              <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', borderTop:`3px solid ${k.color}` }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{k.icon} {k.label}</p>
                <p style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:900, color:k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
          <div style={S}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>🗓️ Seancat e Ardhshme</p>
            {upcomingHearings.slice(0,5).map(h => (
              <div key={h.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>{cases.find(c => c.id === h.case_id)?.client_name || '—'}</p>
                  <p style={{ fontSize:11, color:'var(--text-3)' }}>{h.court || '—'} · {h.hearing_time || ''}</p>
                </div>
                <p style={{ fontSize:14, fontWeight:800, color:'#6366F1' }}>{h.hearing_date}</p>
              </div>
            ))}
            {upcomingHearings.length === 0 && <p style={{ textAlign:'center', color:'var(--text-3)', padding:'20px 0', fontSize:13 }}>Nuk ka seanca të planifikuara</p>}
          </div>
        </>
      )}

      {tab === 'cases' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kërko çështje, klient..." style={{ ...I, paddingLeft:36 }}/>
            </div>
            <button onClick={() => setShowForm('case')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Çështje e Re
            </button>
          </div>
          {showForm === 'case' && (
            <SimpleForm fields={[
              { key:'client_name', label:'Klienti *', type:'text' },
              { key:'client_phone', label:'Telefoni', type:'text' },
              { key:'case_type', label:'Lloji', type:'select', options:[['civil','Civile'],['criminal','Penale'],['commercial','Komerciale'],['family','Familjare'],['administrative','Administrative']] },
              { key:'court', label:'Gjykata', type:'text' },
              { key:'lawyer_name', label:'Avokati', type:'text' },
              { key:'total_fee', label:'Honorari (€)', type:'number' },
              { key:'start_date', label:'Data Fillimit', type:'date' },
              { key:'next_hearing', label:'Seanca e Radhës', type:'date' },
            ]} onSave={addCase} onCancel={() => setShowForm(null)} I={I} L={L} />
          )}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Klienti</th><th>Lloji</th><th>Gjykata</th><th>Seanca e Ardhshme</th><th style={{ textAlign:'right' }}>Honorari</th><th style={{ textAlign:'right' }}>Arkëtuar</th><th>Statusi</th></tr></thead>
              <tbody>
                {cases.filter(c => !search || c.client_name?.toLowerCase().includes(search.toLowerCase())).map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight:700 }}>{c.client_name}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{CASE_TYPE[c.case_type] || c.case_type}</td>
                    <td style={{ fontSize:11 }}>{c.court || '—'}</td>
                    <td style={{ fontSize:11, color:c.next_hearing < today?'#EF4444':'#6366F1' }}>{c.next_hearing || '—'}</td>
                    <td style={{ textAlign:'right', fontWeight:700 }}>€{Number(c.total_fee||0).toLocaleString()}</td>
                    <td style={{ textAlign:'right', color:'var(--text-1)' }}>€{Number(c.paid_amount||0).toLocaleString()}</td>
                    <td><span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'rgba(16,185,129,0.1)', color:'var(--text-1)' }}>{CASE_STATUS[c.status] || c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'hearings' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button onClick={() => setShowForm('hearing')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Seancë e Re
            </button>
          </div>
          {showForm === 'hearing' && (
            <SimpleForm fields={[
              { key:'case_id', label:'Çështja', type:'select', options:cases.map(c => [c.id, c.client_name+' — '+c.case_type]) },
              { key:'hearing_date', label:'Data *', type:'date' },
              { key:'hearing_time', label:'Ora', type:'text' },
              { key:'court', label:'Gjykata', type:'text' },
              { key:'judge', label:'Gjykatësi', type:'text' },
              { key:'next_date', label:'Data e Radhës', type:'date' },
              { key:'notes', label:'Shënime', type:'text' },
            ]} onSave={addHearing} onCancel={() => setShowForm(null)} I={I} L={L} />
          )}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Çështja</th><th>Data</th><th>Ora</th><th>Gjykata</th><th>Gjykatësi</th><th>Data e Radhës</th><th>Rezultati</th></tr></thead>
              <tbody>
                {hearings.sort((a,b) => b.hearing_date.localeCompare(a.hearing_date)).map(h => (
                  <tr key={h.id}>
                    <td style={{ fontWeight:700 }}>{cases.find(c => c.id === h.case_id)?.client_name || '—'}</td>
                    <td style={{ fontSize:11, fontWeight:600, color:h.hearing_date >= today?'#6366F1':'var(--text-3)' }}>{h.hearing_date}</td>
                    <td style={{ fontSize:11 }}>{h.hearing_time || '—'}</td>
                    <td style={{ fontSize:11 }}>{h.court || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{h.judge || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-1)' }}>{h.next_date || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis' }}>{h.outcome || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'clients' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center' }}>
            <div style={{ position:'relative', flex:1 }}>
              <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kërko klient..." style={{ ...I, paddingLeft:36 }}/>
            </div>
            <button onClick={() => setShowForm('client')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Klient i Ri
            </button>
          </div>
          {showForm === 'client' && (
            <SimpleForm fields={[
              { key:'name', label:'Emri *', type:'text' },
              { key:'id_number', label:'Nr. Personal', type:'text' },
              { key:'phone', label:'Telefoni', type:'text' },
              { key:'email', label:'Email', type:'text' },
              { key:'client_type', label:'Lloji', type:'select', options:[['individual','Individ'],['company','Kompani']] },
              { key:'address', label:'Adresa', type:'text' },
            ]} onSave={addClient} onCancel={() => setShowForm(null)} I={I} L={L} />
          )}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Emri</th><th>Lloji</th><th>Telefoni</th><th>Email</th><th>Çështjet</th><th style={{ textAlign:'right' }}>Totali</th></tr></thead>
              <tbody>
                {clients.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase())).map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight:700 }}>{c.name}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{c.client_type === 'company' ? '🏢 Kompani' : '👤 Individ'}</td>
                    <td style={{ fontSize:12 }}>{c.phone || '—'}</td>
                    <td style={{ fontSize:11 }}>{c.email || '—'}</td>
                    <td style={{ textAlign:'center', fontWeight:700, color:'#6366F1' }}>{cases.filter(cs => cs.client_name === c.name).length}</td>
                    <td style={{ textAlign:'right', fontWeight:700, color:'var(--text-1)' }}>€{cases.filter(cs => cs.client_name === c.name).reduce((s, cs) => s + Number(cs.total_fee||0), 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function SimpleForm({ fields, onSave, onCancel, I, L }: any) {
  const [form, setForm] = useState<Record<string, string>>({})
  return (
    <div style={{ background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:14, padding:16, marginBottom:14 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:12 }}>
        {fields.map((f: any) => (
          <div key={f.key}>
            <label style={L}>{f.label}</label>
            {f.type === 'select' ? (
              <select value={form[f.key]||''} onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))} style={I}>
                <option value="">Zgjidh...</option>
                {f.options?.map(([v,l]: [string,string]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ) : <input type={f.type} value={form[f.key]||''} onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))} style={I}/>}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onSave(form)} style={{ padding:'8px 20px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>Shto</button>
        <button onClick={onCancel} style={{ padding:'8px 16px', borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--text-1)', fontSize:13, cursor:'pointer' }}>Anulo</button>
      </div>
    </div>
  )
}
