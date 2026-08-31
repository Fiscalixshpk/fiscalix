'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Users, Wrench, TrendingUp, Search, CheckCircle } from 'lucide-react'

interface Props { companyId: string; data1: any[]; data2: any[]; data3: any[] }

export default function ServicesModuleClient({ companyId, data1: iClients, data2: iJobs, data3: iTeams }: Props) {
  const [tab, setTab] = useState('overview')
  const [clients, setClients] = useState(iClients || [])
  const [jobs, setJobs] = useState(iJobs || [])
  const [teams, setTeams] = useState(iTeams || [])
  const [showForm, setShowForm] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }
  const L = { fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'0.06em' }
  const S = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', marginBottom:14 }

  const activeJobs = jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length
  const completedJobs = jobs.filter(j => j.status === 'completed').length
  const totalRevenue = jobs.reduce((s, j) => s + Number(j.total_price || 0), 0)
  const today = new Date().toISOString().split('T')[0]
  const scheduledToday = jobs.filter(j => j.scheduled_date === today).length

  const JOB_STATUS: Record<string, {label:string; color:string}> = {
    scheduled: { label:'🗓️ Planifikuar', color:'#6366F1' },
    in_progress: { label:'🔵 Në Punë', color:'#3B82F6' },
    completed: { label:'✅ Kompletuar', color:'#10B981' },
    cancelled: { label:'❌ Anulluar', color:'#EF4444' },
  }
  const PRIORITY_COLORS: Record<string, string> = { normal:'#6B7280', urgent:'#EF4444', high:'#F59E0B', low:'#10B981' }

  async function addClient(f: any) {
    const { data, error } = await supabase.from('service_clients').insert({ ...f, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setClients(c => [data, ...c]); setShowForm(null); toast.success('Klienti u shtua')
  }

  async function addJob(f: any) {
    const { data, error } = await supabase.from('service_jobs').insert({
      ...f, labor_cost: parseFloat(f.labor_cost)||0, materials_cost: parseFloat(f.materials_cost)||0,
      total_price: (parseFloat(f.labor_cost)||0) + (parseFloat(f.materials_cost)||0),
      company_id: companyId
    }).select().single()
    if (error) { toast.error(error.message); return }
    setJobs(j => [data, ...j]); setShowForm(null); toast.success('Puna u shtua')
  }

  async function addTeam(f: any) {
    const { data, error } = await supabase.from('service_teams').insert({ ...f, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setTeams(t => [data, ...t]); setShowForm(null); toast.success('Ekipi u shtua')
  }

  async function updateJobStatus(id: string, status: string) {
    const updates: any = { status }
    if (status === 'completed') updates.completed_date = today
    await supabase.from('service_jobs').update(updates).eq('id', id)
    setJobs(j => j.map(x => x.id === id ? { ...x, status, ...updates } : x))
    toast.success('Statusi u ndryshua')
  }

  const filteredJobs = useMemo(() => jobs.filter(j => !search || j.title?.toLowerCase().includes(search.toLowerCase()) || clients.find(c => c.id === j.client_id)?.name?.toLowerCase().includes(search.toLowerCase())), [jobs, clients, search])

  return (
    <div className="page-enter">
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>🔧 Moduli i Shërbimeve</h1>
        <p style={{ fontSize:13, color:'var(--text-3)' }}>Klientët, punët, ekipet, materialet</p>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {['overview','jobs','clients','teams'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${tab===t?'rgba(124,58,237,0.4)':'var(--border)'}`, background:tab===t?'rgba(124,58,237,0.12)':'var(--bg-card)', color:tab===t?'var(--purple)':'var(--text-2)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            {({overview:'Pasqyra',jobs:'Punët',clients:'Klientët',teams:'Ekipet'} as any)[t]}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
            {[
              { label:'Klientë', value:clients.length.toString(), color:'#3B82F6', icon:'👥' },
              { label:'Punë Aktive', value:activeJobs.toString(), color:'#F59E0B', icon:'🔧' },
              { label:'Sot Planifikuara', value:scheduledToday.toString(), color:'#6366F1', icon:'🗓️' },
              { label:'Kompletuar', value:completedJobs.toString(), color:'#10B981', icon:'✅' },
              { label:'Të Ardhura', value:`€${totalRevenue.toLocaleString()}`, color:'#9B5CF8', icon:'💰' },
            ].map((k,i) => (
              <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', borderTop:`3px solid ${k.color}` }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{k.icon} {k.label}</p>
                <p style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:900, color:k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
          <div style={S}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>📅 Punët e Sotme & Aktive</p>
            {jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled').slice(0,8).map(j => (
              <div key={j.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color:PRIORITY_COLORS[j.priority||'normal'] }}>●</span>
                    {j.title}
                  </p>
                  <p style={{ fontSize:11, color:'var(--text-3)' }}>{clients.find(c => c.id === j.client_id)?.name || '—'} · {j.scheduled_date || '—'} · {j.assigned_to || 'Pa caktim'}</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <p style={{ fontWeight:700, color:'var(--text-1)' }}>€{Number(j.total_price||0).toFixed(0)}</p>
                  <button onClick={() => updateJobStatus(j.id, 'completed')}
                    style={{ padding:'4px 10px', borderRadius:7, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', color:'var(--text-1)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                    ✓ Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'jobs' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kërko punë, klient..." style={{ ...I, paddingLeft:36 }}/>
            </div>
            <button onClick={() => setShowForm('job')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Punë e Re
            </button>
          </div>
          {showForm === 'job' && <SFJob clients={clients} onSave={addJob} onCancel={() => setShowForm(null)} I={I} L={L}/>}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Titulli</th><th>Klienti</th><th>Data</th><th>Caktuar</th><th style={{ textAlign:'right' }}>Puna</th><th style={{ textAlign:'right' }}>Materialet</th><th style={{ textAlign:'right' }}>Total</th><th>Statusi</th></tr></thead>
              <tbody>
                {filteredJobs.map(j => (
                  <tr key={j.id}>
                    <td style={{ fontWeight:700 }}>
                      <span style={{ color:PRIORITY_COLORS[j.priority||'normal'], marginRight:6 }}>●</span>
                      {j.title}
                    </td>
                    <td style={{ fontSize:12 }}>{clients.find(c => c.id === j.client_id)?.name || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{j.scheduled_date || '—'}</td>
                    <td style={{ fontSize:11 }}>{j.assigned_to || '—'}</td>
                    <td style={{ textAlign:'right', fontSize:12 }}>€{Number(j.labor_cost||0).toFixed(0)}</td>
                    <td style={{ textAlign:'right', fontSize:12 }}>€{Number(j.materials_cost||0).toFixed(0)}</td>
                    <td style={{ textAlign:'right', fontWeight:700 }}>€{Number(j.total_price||0).toFixed(0)}</td>
                    <td>
                      <select value={j.status} onChange={e => updateJobStatus(j.id, e.target.value)}
                        style={{ background:'transparent', border:'none', color:JOB_STATUS[j.status]?.color, fontSize:11, fontWeight:700, cursor:'pointer', outline:'none' }}>
                        {Object.entries(JOB_STATUS).map(([v,l]) => <option key={v} value={v}>{l.label}</option>)}
                      </select>
                    </td>
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kërko klient..." style={{ ...I, flex:1 }}/>
            <button onClick={() => setShowForm('client')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Klient i Ri
            </button>
          </div>
          {showForm === 'client' && <SF fields={[
            ['name','Emri *','text'],['phone','Telefoni','text'],['email','Email','text'],
            ['address','Adresa','text'],['client_type','Lloji','text'],
          ]} onSave={addClient} onCancel={() => setShowForm(null)} I={I} L={L}/>}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Emri</th><th>Telefoni</th><th>Adresa</th><th>Lloji</th><th>Punët</th><th style={{ textAlign:'right' }}>Totali</th></tr></thead>
              <tbody>
                {clients.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase())).map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight:700 }}>{c.name}</td>
                    <td style={{ fontSize:12 }}>{c.phone || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{c.address || '—'}</td>
                    <td style={{ fontSize:11 }}>{c.client_type === 'company' ? '🏢' : '👤'} {c.client_type || 'individ'}</td>
                    <td style={{ textAlign:'center', fontWeight:700, color:'#9B5CF8' }}>{jobs.filter(j => j.client_id === c.id).length}</td>
                    <td style={{ textAlign:'right', fontWeight:700, color:'var(--text-1)' }}>€{jobs.filter(j => j.client_id === c.id).reduce((s, j) => s + Number(j.total_price||0), 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'teams' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button onClick={() => setShowForm('team')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Ekip i Ri
            </button>
          </div>
          {showForm === 'team' && <SF fields={[
            ['name','Emri Ekipit *','text'],['specialization','Specializimi','text'],
          ]} onSave={addTeam} onCancel={() => setShowForm(null)} I={I} L={L}/>}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:12 }}>
            {teams.map(t => (
              <div key={t.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px' }}>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:6 }}>👷 {t.name}</p>
                <p style={{ fontSize:12, color:'var(--text-3)', marginBottom:10 }}>🔧 {t.specialization || '—'}</p>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'rgba(16,185,129,0.1)', color:'var(--text-1)' }}>🟢 Aktiv</span>
                  <p style={{ fontSize:11, color:'var(--text-3)' }}>{jobs.filter(j => j.assigned_to === t.name).length} punë</p>
                </div>
              </div>
            ))}
            {teams.length === 0 && <p style={{ textAlign:'center', color:'var(--text-3)', padding:'30px 0', fontSize:13, gridColumn:'1/-1' }}>Nuk ka ekipe</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function SF({ fields, onSave, onCancel, I, L }: any) {
  const [form, setForm] = useState<Record<string, string>>({})
  return (
    <div style={{ background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:14, padding:16, marginBottom:14 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:12 }}>
        {fields.map(([key, label, type]: [string, string, string]) => (
          <div key={key}><label style={L}>{label}</label><input type={type} value={form[key]||''} onChange={e => setForm(p => ({...p,[key]:e.target.value}))} style={I}/></div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onSave(form)} style={{ padding:'8px 20px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>Shto</button>
        <button onClick={onCancel} style={{ padding:'8px 16px', borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--text-1)', fontSize:13, cursor:'pointer' }}>Anulo</button>
      </div>
    </div>
  )
}

function SFJob({ clients, onSave, onCancel, I, L }: any) {
  const [form, setForm] = useState<Record<string, string>>({})
  return (
    <div style={{ background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:14, padding:16, marginBottom:14 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:12 }}>
        <div><label style={L}>Klienti</label>
          <select value={form.client_id||''} onChange={e => setForm(p => ({...p, client_id:e.target.value}))} style={I}>
            <option value="">Zgjidh klientin</option>
            {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {[['title','Titulli *','text'],['service_type','Lloji','text'],['assigned_to','Caktuar te','text'],['scheduled_date','Data','date'],['location','Lokacioni','text'],['labor_cost','Puna (€)','number'],['materials_cost','Materialet (€)','number']].map(([k,l,t]) => (
          <div key={k}><label style={L}>{l}</label><input type={t} value={form[k]||''} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} style={I}/></div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onSave(form)} style={{ padding:'8px 20px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>Shto</button>
        <button onClick={onCancel} style={{ padding:'8px 16px', borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--text-1)', fontSize:13, cursor:'pointer' }}>Anulo</button>
      </div>
    </div>
  )
}
