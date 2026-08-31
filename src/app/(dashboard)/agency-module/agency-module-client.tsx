'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

interface Props { companyId: string; data1: any[]; data2: any[]; data3: any[] }

export default function AgencyModuleClient({ companyId, data1, data2, data3 }: Props) {
  const [tab, setTab] = useState('overview')
  const [clients, setClients] = useState(data1 || [])
  const [projects, setProjects] = useState(data2 || [])
  const [campaigns, setCampaigns] = useState(data3 || [])
  const [showForm, setShowForm] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }
  const L = { fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'0.06em' }

  const activeClients = clients.filter((c:any) => c.status === 'active').length
  const totalRetainer = clients.reduce((s:number, c:any) => s + Number(c.monthly_retainer || 0), 0)
  const activeProjects = projects.filter((p:any) => p.status !== 'delivered').length
  const activeCampaigns = campaigns.filter((c:any) => c.status === 'active').length
  const totalBudget = campaigns.reduce((s:number, c:any) => s + Number(c.budget || 0), 0)

  const PROJ_STATUS: Record<string,string> = { briefing:'📋 Briefing', in_progress:'🔵 Në Punë', review:'🟡 Review', approved:'✅ Aprovuar', delivered:'🎯 Dorëzuar' }

  async function addClient(f: any) {
    const { data, error } = await supabase.from('agency_clients').insert({ ...f, monthly_retainer: parseFloat(f.monthly_retainer)||0, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setClients((c:any[]) => [data, ...c]); setShowForm(null); toast.success('Klienti u shtua')
  }

  async function addProject(f: any) {
    const { data, error } = await supabase.from('agency_projects').insert({ ...f, budget: parseFloat(f.budget)||0, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setProjects((p:any[]) => [data, ...p]); setShowForm(null); toast.success('Projekti u shtua')
  }

  async function addCampaign(f: any) {
    const { data, error } = await supabase.from('agency_campaigns').insert({ ...f, budget: parseFloat(f.budget)||0, spent:0, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setCampaigns((c:any[]) => [data, ...c]); setShowForm(null); toast.success('Kampanja u shtua')
  }

  const TABS: Record<string,string> = { overview:'Pasqyra', clients:'Klientët', projects:'Projektet', campaigns:'Kampanjat' }

  return (
    <div className="page-enter">
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>🎨 Moduli i Agjensisë</h1>
        <p style={{ fontSize:13, color:'var(--text-3)' }}>Klientët, projektet, kampanjat, retainers</p>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {Object.entries(TABS).map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${tab===id?'rgba(124,58,237,0.4)':'var(--border)'}`, background:tab===id?'rgba(124,58,237,0.12)':'var(--bg-card)', color:tab===id?'var(--purple)':'var(--text-2)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
          {[
            { label:'Klientë Aktivë', value:activeClients.toString(), color:'#3B82F6', icon:'👥' },
            { label:'Retainer/Muaj', value:`€${totalRetainer.toLocaleString()}`, color:'#10B981', icon:'💰' },
            { label:'Projekte Aktive', value:activeProjects.toString(), color:'#9B5CF8', icon:'🚀' },
            { label:'Kampanja Aktive', value:activeCampaigns.toString(), color:'#F59E0B', icon:'📢' },
            { label:'Budget Kampanjash', value:`€${totalBudget.toLocaleString()}`, color:'#EF4444', icon:'💸' },
          ].map((k,i) => (
            <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', borderTop:`3px solid ${k.color}` }}>
              <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{k.icon} {k.label}</p>
              <p style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:900, color:k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'clients' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kërko klient..." style={{ ...I, flex:1 }}/>
            <button onClick={() => setShowForm(showForm==='client'?null:'client')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Klient i Ri
            </button>
          </div>
          {showForm === 'client' && (
            <SF fields={[['name','Emri *','text'],['industry','Industria','text'],['contact_person','Kontakti','text'],['email','Email','text'],['phone','Telefoni','text'],['monthly_retainer','Retainer/Muaj (€)','number'],['start_date','Data Fillimit','date']]} onSave={addClient} onCancel={() => setShowForm(null)} I={I} L={L}/>
          )}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Emri</th><th>Industria</th><th>Kontakti</th><th style={{ textAlign:'right' }}>Retainer/Muaj</th><th>Statusi</th></tr></thead>
              <tbody>
                {clients.filter((c:any) => !search || c.name?.toLowerCase().includes(search.toLowerCase())).map((c:any) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight:700 }}>{c.name}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{c.industry || '—'}</td>
                    <td style={{ fontSize:12 }}>{c.contact_person || '—'}</td>
                    <td style={{ textAlign:'right', fontWeight:700, color:'var(--text-1)' }}>€{Number(c.monthly_retainer||0).toFixed(0)}</td>
                    <td><span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:c.status==='active'?'rgba(16,185,129,0.1)':'rgba(107,114,128,0.1)', color:c.status==='active'?'#10B981':'#6B7280' }}>{c.status==='active'?'🟢 Aktiv':'⬛ Joaktiv'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'projects' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button onClick={() => setShowForm(showForm==='project'?null:'project')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Projekt i Ri
            </button>
          </div>
          {showForm === 'project' && (
            <SF fields={[['name','Emri *','text'],['type','Lloji','text'],['budget','Buxheti (€)','number'],['deadline','Afati','date'],['assigned_to','Caktuar te','text']]} onSave={addProject} onCancel={() => setShowForm(null)} I={I} L={L}/>
          )}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Projekti</th><th>Lloji</th><th>Afati</th><th style={{ textAlign:'right' }}>Buxheti</th><th>Statusi</th></tr></thead>
              <tbody>
                {projects.map((p:any) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight:700 }}>{p.name}</td>
                    <td style={{ fontSize:11 }}>{p.type || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{p.deadline || '—'}</td>
                    <td style={{ textAlign:'right', fontWeight:700 }}>€{Number(p.budget||0).toLocaleString()}</td>
                    <td><span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'rgba(59,130,246,0.1)', color:'var(--text-1)' }}>{PROJ_STATUS[p.status] || p.status || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'campaigns' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button onClick={() => setShowForm(showForm==='campaign'?null:'campaign')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Kampanjë e Re
            </button>
          </div>
          {showForm === 'campaign' && (
            <SF fields={[['name','Emri *','text'],['platform','Platforma','text'],['budget','Buxheti (€)','number'],['start_date','Fillimi','date'],['end_date','Mbarimi','date']]} onSave={addCampaign} onCancel={() => setShowForm(null)} I={I} L={L}/>
          )}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Kampanja</th><th>Platforma</th><th>Fillimi</th><th>Mbarimi</th><th style={{ textAlign:'right' }}>Buxheti</th><th style={{ textAlign:'right' }}>Shpenzuar</th><th>Statusi</th></tr></thead>
              <tbody>
                {campaigns.map((c:any) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight:700 }}>{c.name}</td>
                    <td style={{ fontSize:11 }}>{c.platform || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{c.start_date || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{c.end_date || '—'}</td>
                    <td style={{ textAlign:'right', fontWeight:700 }}>€{Number(c.budget||0).toFixed(0)}</td>
                    <td style={{ textAlign:'right', color:'var(--text-1)' }}>€{Number(c.spent||0).toFixed(0)}</td>
                    <td><span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:c.status==='active'?'rgba(16,185,129,0.1)':'rgba(107,114,128,0.1)', color:c.status==='active'?'#10B981':'#6B7280' }}>{c.status==='active'?'🟢 Aktive':'⬛ Përfunduar'}</span></td>
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

function SF({ fields, onSave, onCancel, I, L }: any) {
  const [form, setForm] = useState<Record<string,string>>({})
  return (
    <div style={{ background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:14, padding:16, marginBottom:14 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:12 }}>
        {fields.map(([key,label,type]: [string,string,string]) => (
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
