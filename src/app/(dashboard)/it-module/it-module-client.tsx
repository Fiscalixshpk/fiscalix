'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Users, FolderOpen, CheckSquare, Clock, TrendingUp, Search, Trash2, Code } from 'lucide-react'

type Tab = 'overview' | 'clients' | 'projects' | 'tasks'
interface Props { companyId: string; clients: any[]; projects: any[]; tasks: any[] }

export default function ITModuleClient({ companyId, clients: iC, projects: iP, tasks: iT }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [clients, setClients] = useState(iC || [])
  const [projects, setProjects] = useState(iP || [])
  const [tasks, setTasks] = useState(iT || [])
  const [showForm, setShowForm] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }
  const L = { fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'0.06em' }
  const S = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', marginBottom:14 }

  const activeProjects = projects.filter(p => p.status === 'active').length
  const totalBudget = projects.reduce((s, p) => s + Number(p.budget || 0), 0)
  const totalHours = projects.reduce((s, p) => s + Number(p.hours_logged || 0), 0)
  const pendingTasks = tasks.filter(t => t.status !== 'done').length

  const TASK_STATUS: Record<string, { label: string; color: string }> = {
    todo: { label: '⬜ Todo', color: '#6B7280' },
    in_progress: { label: '🔵 Në Punë', color: '#3B82F6' },
    review: { label: '🟡 Review', color: '#F59E0B' },
    done: { label: '✅ Done', color: '#10B981' },
  }
  const PRIORITY: Record<string, string> = { low: '🟢', medium: '🟡', high: '🔴', urgent: '🚨' }

  const TABS = [
    { id: 'overview', label: 'Pasqyra', icon: TrendingUp },
    { id: 'clients', label: 'Klientët', icon: Users },
    { id: 'projects', label: 'Projektet', icon: FolderOpen },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  ]

  async function addClient(f: any) {
    const { data, error } = await supabase.from('it_clients').insert({ ...f, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setClients(c => [data, ...c]); setShowForm(null); toast.success('Klienti u shtua')
  }

  async function addProject(f: any) {
    const { data, error } = await supabase.from('it_projects').insert({ ...f, budget: parseFloat(f.budget) || 0, hourly_rate: parseFloat(f.hourly_rate) || 0, hours_estimated: parseFloat(f.hours_estimated) || 0, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setProjects(p => [data, ...p]); setShowForm(null); toast.success('Projekti u shtua')
  }

  async function addTask(f: any) {
    const { data, error } = await supabase.from('it_tasks').insert({ ...f, hours_estimated: parseFloat(f.hours_estimated) || 0, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setTasks(t => [data, ...t]); setShowForm(null); toast.success('Task u shtua')
  }

  async function updateTaskStatus(id: string, status: string) {
    await supabase.from('it_tasks').update({ status }).eq('id', id)
    setTasks(t => t.map(x => x.id === id ? { ...x, status } : x))
  }

  const filteredProjects = useMemo(() => projects.filter(p => !search || p.project_name?.toLowerCase().includes(search.toLowerCase()) || p.client_name?.toLowerCase().includes(search.toLowerCase())), [projects, search])

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>💻 IT / Tech Module</h1>
        <p style={{ fontSize:13, color:'var(--text-3)' }}>Klientët, projektet, tasks, orët, faturimi</p>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {TABS.map(t => { const Icon = t.icon; return (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:`1px solid ${tab===t.id?'rgba(124,58,237,0.4)':'var(--border)'}`, background:tab===t.id?'rgba(124,58,237,0.12)':'var(--bg-card)', color:tab===t.id?'var(--purple)':'var(--text-2)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            <Icon size={14}/>{t.label}
          </button>
        )})}
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
            {[
              { label:'Klientë', value:clients.length.toString(), color:'#3B82F6', icon:'👥' },
              { label:'Projekte Aktive', value:activeProjects.toString(), color:'#9B5CF8', icon:'🚀' },
              { label:'Budget Total', value:`€${totalBudget.toLocaleString()}`, color:'#10B981', icon:'💰' },
              { label:'Orë të Punuara', value:`${totalHours}h`, color:'#F59E0B', icon:'⏱️' },
              { label:'Tasks Hapur', value:pendingTasks.toString(), color:'#EF4444', icon:'📋' },
            ].map((k,i) => (
              <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', borderTop:`3px solid ${k.color}` }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{k.icon} {k.label}</p>
                <p style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:900, color:k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
          <div style={S}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>Tasks të Hapura</p>
            {tasks.filter(t => t.status !== 'done').slice(0,8).map(t => (
              <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:12 }}>{PRIORITY[t.priority]}</span>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{t.title}</p>
                    <p style={{ fontSize:11, color:'var(--text-3)' }}>{projects.find(p => p.id === t.project_id)?.project_name || '—'}</p>
                  </div>
                </div>
                <select value={t.status} onChange={e => updateTaskStatus(t.id, e.target.value)}
                  style={{ background:'transparent', border:'none', color:TASK_STATUS[t.status]?.color, fontSize:11, fontWeight:700, cursor:'pointer', outline:'none' }}>
                  {Object.entries(TASK_STATUS).map(([v,l]) => <option key={v} value={v}>{l.label}</option>)}
                </select>
              </div>
            ))}
            {tasks.filter(t => t.status !== 'done').length === 0 && <p style={{ textAlign:'center', color:'var(--text-3)', padding:'20px 0', fontSize:13 }}>Të gjitha tasks janë bërë! 🎉</p>}
          </div>
        </>
      )}

      {tab === 'clients' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
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
              { key:'contact_person', label:'Kontakti', type:'text' },
              { key:'email', label:'Email', type:'text' },
              { key:'phone', label:'Telefoni', type:'text' },
              { key:'industry', label:'Industria', type:'text' },
              { key:'website', label:'Website', type:'text' },
            ]} onSave={addClient} onCancel={() => setShowForm(null)} I={I} L={L} />
          )}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Emri</th><th>Kontakti</th><th>Industria</th><th>Email</th><th>Projektet</th></tr></thead>
              <tbody>
                {clients.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase())).map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight:700 }}>{c.name}</td>
                    <td style={{ fontSize:12 }}>{c.contact_person || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{c.industry || '—'}</td>
                    <td style={{ fontSize:11 }}>{c.email || '—'}</td>
                    <td style={{ textAlign:'center', fontWeight:700, color:'#9B5CF8' }}>{projects.filter(p => p.client_id === c.id).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'projects' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kërko projekt..." style={{ ...I, paddingLeft:36 }}/>
            </div>
            <button onClick={() => setShowForm('project')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Projekt i Ri
            </button>
          </div>
          {showForm === 'project' && (
            <SimpleForm fields={[
              { key:'project_name', label:'Emri Projektit *', type:'text' },
              { key:'client_name', label:'Klienti *', type:'text' },
              { key:'type', label:'Lloji', type:'select', options:[['website','Website'],['app','App'],['software','Software'],['maintenance','Mirëmbajtje'],['consulting','Konsulencë']] },
              { key:'budget', label:'Buxheti (€)', type:'number' },
              { key:'hourly_rate', label:'Çmimi/Orë (€)', type:'number' },
              { key:'hours_estimated', label:'Orë Vlerësuara', type:'number' },
              { key:'deadline', label:'Afati', type:'date' },
              { key:'status', label:'Statusi', type:'select', options:[['active','Aktiv'],['completed','Kompletuar'],['paused','Pauzuar']] },
            ]} onSave={addProject} onCancel={() => setShowForm(null)} I={I} L={L} />
          )}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Projekti</th><th>Klienti</th><th>Lloji</th><th>Afati</th><th style={{ textAlign:'right' }}>Buxheti</th><th style={{ textAlign:'right' }}>Orët</th><th>Statusi</th></tr></thead>
              <tbody>
                {filteredProjects.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight:700 }}>{p.project_name}</td>
                    <td style={{ fontSize:12 }}>{p.client_name}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{p.type}</td>
                    <td style={{ fontSize:11, color:p.deadline < new Date().toISOString().split('T')[0] && p.status === 'active' ? '#EF4444' : 'var(--text-3)' }}>{p.deadline || '—'}</td>
                    <td style={{ textAlign:'right', fontWeight:700 }}>€{Number(p.budget||0).toLocaleString()}</td>
                    <td style={{ textAlign:'right', fontSize:12 }}>{p.hours_logged || 0}/{p.hours_estimated || 0}h</td>
                    <td><span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:p.status==='active'?'rgba(16,185,129,0.1)':'rgba(99,102,241,0.1)', color:p.status==='active'?'#10B981':'#818CF8' }}>{p.status==='active'?'🟢 Aktiv':'✅ Done'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'tasks' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button onClick={() => setShowForm('task')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Task i Ri
            </button>
          </div>
          {showForm === 'task' && (
            <SimpleForm fields={[
              { key:'title', label:'Titulli *', type:'text' },
              { key:'project_id', label:'Projekti', type:'select', options:projects.map(p => [p.id, p.project_name]) },
              { key:'priority', label:'Prioriteti', type:'select', options:[['low','I ulët'],['medium','Mesatar'],['high','I lartë'],['urgent','Urgjent']] },
              { key:'assigned_to', label:'Caktohet te', type:'text' },
              { key:'hours_estimated', label:'Orë Vlerësuara', type:'number' },
              { key:'due_date', label:'Afati', type:'date' },
              { key:'description', label:'Përshkrimi', type:'text' },
            ]} onSave={addTask} onCancel={() => setShowForm(null)} I={I} L={L} />
          )}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {Object.entries(TASK_STATUS).map(([status, info]) => (
              <div key={status} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:12 }}>
                <p style={{ fontSize:12, fontWeight:700, color:info.color, marginBottom:10 }}>{info.label} ({tasks.filter(t => t.status === status).length})</p>
                {tasks.filter(t => t.status === status).map(t => (
                  <div key={t.id} style={{ padding:'8px', borderRadius:8, background:'var(--bg-muted)', marginBottom:6, cursor:'pointer' }}>
                    <p style={{ fontSize:12, fontWeight:600, color:'var(--text-1)' }}>{t.title}</p>
                    <p style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>{PRIORITY[t.priority]} {t.assigned_to || 'Pa caktim'}</p>
                    <div style={{ display:'flex', gap:4, marginTop:6 }}>
                      {Object.keys(TASK_STATUS).filter(s => s !== status).map(s => (
                        <button key={s} onClick={() => updateTaskStatus(t.id, s)}
                          style={{ fontSize:9, padding:'2px 6px', borderRadius:4, background:TASK_STATUS[s].color+'20', color:TASK_STATUS[s].color, border:'none', cursor:'pointer' }}>
                          {TASK_STATUS[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Reusable simple form
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
            ) : (
              <input type={f.type} value={form[f.key]||''} onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))} style={I}/>
            )}
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
