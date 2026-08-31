'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Building2, Users, FileText, TrendingUp, Trash2, ChevronDown, Home, Wrench } from 'lucide-react'

type Tab = 'overview' | 'projects' | 'units' | 'contracts' | 'subcontractors'

interface Props {
  companyId: string
  projects: any[]
  units: any[]
  contracts: any[]
  subcontractors: any[]
}

export default function ConstructionClient({ companyId, projects: initProjects, units: initUnits, contracts: initContracts, subcontractors: initSubs }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [projects, setProjects] = useState(initProjects || [])
  const [units, setUnits] = useState(initUnits || [])
  const [contracts, setContracts] = useState(initContracts || [])
  const [subs, setSubs] = useState(initSubs || [])
  const [showForm, setShowForm] = useState(false)
  const supabase = createClient()

  const S = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }
  const I = { background: 'var(--bg-input,var(--bg-muted))', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--text-1)', fontSize: 13, width: '100%', outline: 'none' }
  const L = { fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }

  // KPIs
  const totalValue = projects.reduce((s, p) => s + Number(p.total_value || 0), 0)
  const activeProjects = projects.filter(p => p.status === 'active').length
  const soldUnits = units.filter(u => u.status === 'sold').length
  const availableUnits = units.filter(u => u.status === 'available').length
  const totalCollected = contracts.reduce((s, c) => s + Number(c.paid_amount || 0), 0)
  const totalContract = contracts.reduce((s, c) => s + Number(c.total_value || 0), 0)

  const TABS = [
    { id: 'overview', label: 'Pasqyra', icon: TrendingUp },
    { id: 'projects', label: 'Projektet', icon: Building2 },
    { id: 'units', label: 'Njësitë', icon: Home },
    { id: 'contracts', label: 'Kontratat', icon: FileText },
    { id: 'subcontractors', label: 'Nënkontraktorët', icon: Wrench },
  ]

  async function addProject(form: any) {
    const { data, error } = await supabase.from('construction_projects').insert({ ...form, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setProjects(p => [data, ...p])
    toast.success('Projekti u shtua')
    setShowForm(false)
  }

  async function deleteProject(id: string) {
    await supabase.from('construction_projects').delete().eq('id', id)
    setProjects(p => p.filter(x => x.id !== id))
    toast.success('U fshi')
  }

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
          🏗️ Moduli i Ndërtimit
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Projekte, njësi, kontrata, kompensime, nënkontraktorë</p>
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
              { label: 'Projekte Aktive', value: activeProjects.toString(), color: '#3B82F6', icon: '🏗️' },
              { label: 'Vlera Totale', value: `€${totalValue.toLocaleString()}`, color: '#10B981', icon: '💰' },
              { label: 'Njësi të Shitura', value: soldUnits.toString(), color: '#9B5CF8', icon: '✅' },
              { label: 'Njësi Disponibël', value: availableUnits.toString(), color: '#F59E0B', icon: '🏠' },
              { label: 'Arkëtuar', value: `€${totalCollected.toLocaleString()}`, color: '#10B981', icon: '📥' },
              { label: 'Bilanci Kontratave', value: `€${(totalContract - totalCollected).toLocaleString()}`, color: '#EF4444', icon: '📋' },
            ].map((k, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', borderTop: `3px solid ${k.color}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{k.icon} {k.label}</p>
                <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 900, color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Recent projects */}
          <div style={S}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>Projektet e Fundit</p>
            {projects.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>Nuk ka projekte. Shto projektin e parë.</p>
            ) : projects.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{p.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.location} · {p.status === 'active' ? '🟢 Aktiv' : p.status === 'completed' ? '✅ Kompletuar' : '⏸️ Pauzuar'}</p>
                </div>
                <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 14, fontWeight: 800, color: '#10B981' }}>€{Number(p.total_value || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* PROJECTS */}
      {tab === 'projects' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Projektet ({projects.length})</p>
            <button onClick={() => setShowForm(!showForm)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              <Plus size={14} /> Projekt i Ri
            </button>
          </div>

          {showForm && <ProjectForm onSave={addProject} onCancel={() => setShowForm(false)} I={I} L={L} />}

          {projects.map(p => (
            <div key={p.id} style={{ ...S, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{p.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>📍 {p.location || '—'} · {p.start_date || '—'}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: p.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)', color: p.status === 'active' ? '#10B981' : '#818CF8' }}>
                    {p.status === 'active' ? '🟢 Aktiv' : p.status === 'completed' ? '✅ Kompletuar' : '⏸️ Pauzuar'}
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(59,130,246,0.1)', color: '#60A5FA' }}>
                    {p.progress_percent || 0}% kompletuar
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 18, fontWeight: 900, color: '#10B981' }}>€{Number(p.total_value || 0).toLocaleString()}</p>
                <button onClick={() => deleteProject(p.id)} style={{ padding: '6px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', cursor: 'pointer' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {projects.length === 0 && <p style={{ textAlign: 'center', color:'var(--text-1)', padding: '40px 0', fontSize: 13 }}>Nuk ka projekte</p>}
        </div>
      )}

      {/* UNITS */}
      {tab === 'units' && (
        <UnitsTab units={units} projects={projects} companyId={companyId} onUpdate={setUnits} I={I} L={L} S={S} />
      )}

      {/* CONTRACTS */}
      {tab === 'contracts' && (
        <ContractsTab contracts={contracts} projects={projects} units={units} companyId={companyId} onUpdate={setContracts} I={I} L={L} S={S} />
      )}

      {/* SUBCONTRACTORS */}
      {tab === 'subcontractors' && (
        <SubsTab subs={subs} projects={projects} companyId={companyId} onUpdate={setSubs} I={I} L={L} S={S} />
      )}
    </div>
  )
}

function ProjectForm({ onSave, onCancel, I, L }: any) {
  const [form, setForm] = useState({ name: '', location: '', total_value: '', start_date: '', status: 'active', description: '' })
  return (
    <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div><label style={L}>Emri i Projektit *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={I} placeholder="p.sh. Rezidenca Sunshine" /></div>
        <div><label style={L}>Lokacioni</label><input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} style={I} placeholder="p.sh. Prishtinë, Dardania" /></div>
        <div><label style={L}>Vlera Totale (€)</label><input type="number" value={form.total_value} onChange={e => setForm(p => ({ ...p, total_value: e.target.value }))} style={I} placeholder="500000" /></div>
        <div><label style={L}>Data Fillimit</label><input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} style={I} /></div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onSave({ ...form, total_value: parseFloat(form.total_value) || 0 })}
          style={{ padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          Shto Projektin
        </button>
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color:'var(--text-1)', fontSize: 13, cursor: 'pointer' }}>Anulo</button>
      </div>
    </div>
  )
}

function UnitsTab({ units, projects, companyId, onUpdate, I, L, S }: any) {
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ project_id: '', unit_number: '', type: 'apartment', floor: '', area_sqm: '', price: '', status: 'available', buyer_name: '' })

  const STATUS_COLORS: Record<string, string> = { available: '#10B981', reserved: '#F59E0B', sold: '#9B5CF8', delivered: '#3B82F6' }
  const STATUS_LABELS: Record<string, string> = { available: '🟢 Disponibël', reserved: '🟡 Rezervuar', sold: '🟣 Shitur', delivered: '🔵 Dorëzuar' }

  async function addUnit() {
    const { data, error } = await supabase.from('construction_units').insert({ ...form, floor: parseInt(form.floor) || null, area_sqm: parseFloat(form.area_sqm) || null, price: parseFloat(form.price) || 0, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    onUpdate((u: any[]) => [data, ...u])
    setShowForm(false)
    toast.success('Njësia u shtua')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {['available', 'reserved', 'sold', 'delivered'].map(s => (
            <span key={s} style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {STATUS_LABELS[s]}: <strong style={{ color: STATUS_COLORS[s] }}>{units.filter((u: any) => u.status === s).length}</strong>
            </span>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> Njësi e Re
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><label style={L}>Projekti</label>
              <select value={form.project_id} onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))} style={I}>
                <option value="">Zgjidh projektin</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label style={L}>Nr. Njësisë *</label><input value={form.unit_number} onChange={e => setForm(p => ({ ...p, unit_number: e.target.value }))} style={I} placeholder="A-101" /></div>
            <div><label style={L}>Lloji</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={I}>
                <option value="apartment">Apartament</option>
                <option value="commercial">Komercial</option>
                <option value="garage">Garazh</option>
                <option value="office">Zyrë</option>
              </select>
            </div>
            <div><label style={L}>Kati</label><input type="number" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))} style={I} placeholder="1" /></div>
            <div><label style={L}>Sipërfaqja (m²)</label><input type="number" value={form.area_sqm} onChange={e => setForm(p => ({ ...p, area_sqm: e.target.value }))} style={I} placeholder="65" /></div>
            <div><label style={L}>Çmimi (€)</label><input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} style={I} placeholder="65000" /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addUnit} style={{ padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Shto</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color:'var(--text-1)', fontSize: 13, cursor: 'pointer' }}>Anulo</button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="finex-table">
          <thead>
            <tr>
              <th>Nr.</th><th>Projekti</th><th>Lloji</th><th>Kati</th><th style={{ textAlign: 'right' }}>m²</th><th style={{ textAlign: 'right' }}>Çmimi</th><th>Statusi</th><th>Blerësi</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u: any) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 700 }}>{u.unit_number}</td>
                <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{projects.find((p: any) => p.id === u.project_id)?.name || '—'}</td>
                <td style={{ fontSize: 11 }}>{u.type}</td>
                <td style={{ textAlign: 'center' }}>{u.floor || '—'}</td>
                <td style={{ textAlign: 'right' }}>{u.area_sqm || '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>€{Number(u.price || 0).toLocaleString()}</td>
                <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: `${STATUS_COLORS[u.status]}15`, color: STATUS_COLORS[u.status] }}>{STATUS_LABELS[u.status]}</span></td>
                <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.buyer_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {units.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '30px 0', fontSize: 13 }}>Nuk ka njësi</p>}
      </div>
    </div>
  )
}

function ContractsTab({ contracts, projects, units, companyId, onUpdate, I, L, S }: any) {
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ buyer_name: '', buyer_id_number: '', project_id: '', unit_id: '', total_value: '', contract_date: '', delivery_date: '', notes: '' })

  async function addContract() {
    const { data, error } = await supabase.from('construction_contracts').insert({
      ...form, total_value: parseFloat(form.total_value) || 0, paid_amount: 0, company_id: companyId
    }).select().single()
    if (error) { toast.error(error.message); return }
    onUpdate((c: any[]) => [data, ...c])
    setShowForm(false)
    toast.success('Kontrata u shtua')
  }

  const totalValue = contracts.reduce((s: number, c: any) => s + Number(c.total_value || 0), 0)
  const totalPaid = contracts.reduce((s: number, c: any) => s + Number(c.paid_amount || 0), 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Vlera Totale', value: `€${totalValue.toLocaleString()}`, color: '#3B82F6' },
          { label: 'Arkëtuar', value: `€${totalPaid.toLocaleString()}`, color: '#10B981' },
          { label: 'Mbetur', value: `€${(totalValue - totalPaid).toLocaleString()}`, color: '#EF4444' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', borderTop: `3px solid ${k.color}` }}>
            <p style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{k.label}</p>
            <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> Kontratë e Re
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><label style={L}>Emri Blerësit *</label><input value={form.buyer_name} onChange={e => setForm(p => ({ ...p, buyer_name: e.target.value }))} style={I} /></div>
            <div><label style={L}>Nr. ID Blerës</label><input value={form.buyer_id_number} onChange={e => setForm(p => ({ ...p, buyer_id_number: e.target.value }))} style={I} /></div>
            <div><label style={L}>Projekti</label>
              <select value={form.project_id} onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))} style={I}>
                <option value="">Zgjidh</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label style={L}>Njësia</label>
              <select value={form.unit_id} onChange={e => setForm(p => ({ ...p, unit_id: e.target.value }))} style={I}>
                <option value="">Zgjidh</option>
                {units.map((u: any) => <option key={u.id} value={u.id}>{u.unit_number} — {u.type}</option>)}
              </select>
            </div>
            <div><label style={L}>Vlera Totale (€)</label><input type="number" value={form.total_value} onChange={e => setForm(p => ({ ...p, total_value: e.target.value }))} style={I} /></div>
            <div><label style={L}>Data Kontratës</label><input type="date" value={form.contract_date} onChange={e => setForm(p => ({ ...p, contract_date: e.target.value }))} style={I} /></div>
            <div><label style={L}>Data Dorëzimit</label><input type="date" value={form.delivery_date} onChange={e => setForm(p => ({ ...p, delivery_date: e.target.value }))} style={I} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addContract} style={{ padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Shto</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color:'var(--text-1)', fontSize: 13, cursor: 'pointer' }}>Anulo</button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="finex-table">
          <thead>
            <tr><th>Blerësi</th><th>Projekti</th><th>Data</th><th style={{ textAlign: 'right' }}>Vlera</th><th style={{ textAlign: 'right' }}>Arkëtuar</th><th style={{ textAlign: 'right' }}>Mbetur</th><th>Statusi</th></tr>
          </thead>
          <tbody>
            {contracts.map((c: any) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 700 }}>{c.buyer_name}</td>
                <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{projects.find((p: any) => p.id === c.project_id)?.name || '—'}</td>
                <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.contract_date || '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>€{Number(c.total_value || 0).toLocaleString()}</td>
                <td style={{ textAlign: 'right', color: '#10B981', fontWeight: 600 }}>€{Number(c.paid_amount || 0).toLocaleString()}</td>
                <td style={{ textAlign: 'right', color: '#EF4444' }}>€{(Number(c.total_value || 0) - Number(c.paid_amount || 0)).toLocaleString()}</td>
                <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: c.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)', color: c.status === 'active' ? '#10B981' : '#818CF8' }}>{c.status === 'active' ? '🟢 Aktive' : '✅ Kompletuar'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {contracts.length === 0 && <p style={{ textAlign: 'center', color:'var(--text-1)', padding: '30px 0', fontSize: 13 }}>Nuk ka kontrata</p>}
      </div>
    </div>
  )
}

function SubsTab({ subs, projects, companyId, onUpdate, I, L, S }: any) {
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', work_type: '', project_id: '', contract_value: '', phone: '', email: '' })

  async function addSub() {
    const { data, error } = await supabase.from('construction_subcontractors').insert({
      ...form, contract_value: parseFloat(form.contract_value) || 0, paid_amount: 0, company_id: companyId
    }).select().single()
    if (error) { toast.error(error.message); return }
    onUpdate((s: any[]) => [data, ...s])
    setShowForm(false)
    toast.success('Nënkontraktori u shtua')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> Nënkontraktor i Ri
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><label style={L}>Emri *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={I} placeholder="Comp. Elektrike Sh.p.k" /></div>
            <div><label style={L}>Lloji i Punës</label><input value={form.work_type} onChange={e => setForm(p => ({ ...p, work_type: e.target.value }))} style={I} placeholder="Elektricitet, Hidraulikë..." /></div>
            <div><label style={L}>Projekti</label>
              <select value={form.project_id} onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))} style={I}>
                <option value="">Zgjidh</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label style={L}>Vlera Kontratës (€)</label><input type="number" value={form.contract_value} onChange={e => setForm(p => ({ ...p, contract_value: e.target.value }))} style={I} /></div>
            <div><label style={L}>Telefoni</label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={I} /></div>
            <div><label style={L}>Email</label><input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={I} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addSub} style={{ padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Shto</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color:'var(--text-1)', fontSize: 13, cursor: 'pointer' }}>Anulo</button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="finex-table">
          <thead>
            <tr><th>Emri</th><th>Lloji Punës</th><th>Projekti</th><th>Kontakti</th><th style={{ textAlign: 'right' }}>Kontrata</th><th style={{ textAlign: 'right' }}>Paguar</th><th>Statusi</th></tr>
          </thead>
          <tbody>
            {subs.map((s: any) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 700 }}>{s.name}</td>
                <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.work_type || '—'}</td>
                <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{projects.find((p: any) => p.id === s.project_id)?.name || '—'}</td>
                <td style={{ fontSize: 11 }}>{s.phone || s.email || '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>€{Number(s.contract_value || 0).toLocaleString()}</td>
                <td style={{ textAlign: 'right', color: '#10B981' }}>€{Number(s.paid_amount || 0).toLocaleString()}</td>
                <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>{s.status || 'Aktiv'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {subs.length === 0 && <p style={{ textAlign: 'center', color:'var(--text-1)', padding: '30px 0', fontSize: 13 }}>Nuk ka nënkontraktorë</p>}
      </div>
    </div>
  )
}
