'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { UserPlus, Users, AlertTriangle, CheckCircle, Clock, Trash2 } from 'lucide-react'

interface Member {
  id: string; full_name: string; phone: string|null; email: string|null
  membership_type: string; started_at: string; expires_at: string
  amount_paid: number; notes: string|null
}

const MEMBERSHIPS = [
  { id:'daily',     label:'Hyrje Ditore', days:1,   price:3   },
  { id:'weekly',    label:'Javore',       days:7,   price:15  },
  { id:'monthly',   label:'Mujore',       days:30,  price:40  },
  { id:'quarterly', label:'3 Mujore',     days:90,  price:100 },
  { id:'yearly',    label:'Vjetore',      days:365, price:350 },
]

const EMPTY = { full_name:'', phone:'', email:'', membership_type:'monthly', amount_paid:'', notes:'' }

export default function GymMembersClient({ companyId, userId, initialMembers }: { companyId:string; userId:string; initialMembers:Member[] }) {
  const supabase = createClient()
  const [members, setMembers] = useState(initialMembers)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all'|'active'|'expiring'|'expired'>('all')

  const today = new Date()
  const in7 = new Date(today.getTime() + 7*24*60*60*1000)

  function status(exp: string) {
    const d = new Date(exp)
    return d < today ? 'expired' : d <= in7 ? 'expiring' : 'active'
  }

  const counts = { active: members.filter(m=>status(m.expires_at)==='active').length, expiring: members.filter(m=>status(m.expires_at)==='expiring').length, expired: members.filter(m=>status(m.expires_at)==='expired').length }
  const expIn3Days = members.filter(m => {
    const d = new Date(m.expires_at); const diff = (d.getTime()-today.getTime())/86400000
    return diff >= 0 && diff <= 3
  })
  const filtered = filter==='all' ? members : members.filter(m=>status(m.expires_at)===filter)

  async function save() {
    if (!form.full_name.trim()) { toast.error('Emri kërkohet'); return }
    setSaving(true)
    const mem = MEMBERSHIPS.find(m=>m.id===form.membership_type)!
    const start = new Date()
    const exp = new Date(start.getTime() + mem.days*86400000)
    const { data, error } = await supabase.from('gym_members').insert({
      company_id:companyId, created_by:userId, full_name:form.full_name.trim(),
      phone:form.phone||null, email:form.email||null, membership_type:form.membership_type,
      started_at:start.toISOString(), expires_at:exp.toISOString(),
      amount_paid:Number(form.amount_paid)||mem.price, notes:form.notes||null,
    }).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setMembers(m=>[data as Member,...m]); setForm(EMPTY); setShowForm(false)
    toast.success(`${form.full_name} — skadon ${exp.toLocaleDateString('sq-AL')}`)
  }

  async function del(id:string, name:string) {
    if (!confirm(`Fshi "${name}"?`)) return
    await supabase.from('gym_members').delete().eq('id',id)
    setMembers(m=>m.filter(x=>x.id!==id)); toast.success('U fshi')
  }

  const C = { card:'var(--bg-card)', border:'var(--border)', text1:'var(--text-1)', text2:'var(--text-2)', text3:'var(--text-3)', purple:'#7C3AED', muted:'var(--bg-muted)' }
  const inp = { width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:14, color:C.text1, background:C.muted, outline:'none', boxSizing:'border-box' as const }
  const lbl = { fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase' as const, letterSpacing:'0.05em', display:'block', marginBottom:6 }

  const statusColor = (s:string) => s==='active'?'#10B981':s==='expiring'?'#F59E0B':'#EF4444'
  const statusLabel = (s:string) => s==='active'?'Aktiv':s==='expiring'?'Skadon Shpejt':'Skaduar'

  return (
    <div style={{ padding:24, fontFamily:'Inter,sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:C.text1 }}>Anëtarët</h1>
          <p style={{ fontSize:13, color:C.text3 }}>Membership dhe abonamente</p>
        </div>
        <button onClick={()=>setShowForm(true)} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, background:C.purple, color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>
          <UserPlus size={15}/> Anëtar i Ri
        </button>
      </div>
      {expIn3Days.length > 0 && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 16px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:12, marginBottom:16 }}>
          <Clock size={16} color="#D97706" style={{ flexShrink:0, marginTop:2 }}/>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#92400E' }}>Skadon brenda 3 ditësh ({expIn3Days.length} anëtarë)</p>
            <p style={{ fontSize:12, color:'#B45309' }}>{expIn3Days.map(m=>m.full_name).join(', ')}</p>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        {[{label:'Aktiv',s:'active',icon:CheckCircle,color:'#10B981',bg:'#F0FDF4'},{label:'Skadon Shpejt',s:'expiring',icon:Clock,color:'#F59E0B',bg:'#FFFBEB'},{label:'Skaduar',s:'expired',icon:AlertTriangle,color:'#EF4444',bg:'#FEF2F2'}].map(x=>(
          <div key={x.s} style={{ background:x.bg, border:`1px solid ${x.color}30`, borderRadius:12, padding:'16px 18px', display:'flex', alignItems:'center', gap:12 }}>
            <x.icon size={22} color={x.color}/>
            <div><p style={{ fontSize:28, fontWeight:900, color:x.color, lineHeight:1 }}>{counts[x.s as keyof typeof counts]}</p><p style={{ fontSize:11, color:x.color, fontWeight:600, marginTop:2 }}>{x.label}</p></div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}`, marginBottom:20 }}>
          <p style={{ fontSize:15, fontWeight:800, color:C.text1, marginBottom:18 }}>Anëtar i Ri</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div><label style={lbl}>Emri i Plotë *</label><input value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} placeholder="Emri Mbiemri" style={inp}/></div>
            <div><label style={lbl}>Telefoni</label><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+383..." style={inp}/></div>
            <div>
              <label style={lbl}>Membership</label>
              <select value={form.membership_type} onChange={e=>{const m=MEMBERSHIPS.find(x=>x.id===e.target.value)!; setForm(f=>({...f,membership_type:e.target.value,amount_paid:String(m.price)}))}} style={{...inp,cursor:'pointer'}}>
                {MEMBERSHIPS.map(m=><option key={m.id} value={m.id}>{m.label} — €{m.price}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Çmimi (€)</label><input type="number" value={form.amount_paid} onChange={e=>setForm(f=>({...f,amount_paid:e.target.value}))} style={inp}/></div>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button onClick={()=>{setShowForm(false);setForm(EMPTY)}} style={{ padding:'9px 20px', borderRadius:10, border:`1px solid ${C.border}`, background:C.card, cursor:'pointer', fontSize:13 }}>Anulo</button>
            <button onClick={save} disabled={saving} style={{ padding:'9px 20px', borderRadius:10, background:C.purple, color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>{saving?'Duke ruajtur...':'Regjistro'}</button>
          </div>
        </div>
      )}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {(['all','active','expiring','expired'] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${filter===f?C.purple:C.border}`, background:filter===f?'var(--purple-bg)':'transparent', color:filter===f?C.purple:C.text3, fontSize:12, fontWeight:600, cursor:'pointer' }}>
            {f==='all'?'Të Gjithë':f==='active'?'Aktiv':f==='expiring'?'Skadon Shpejt':'Skaduar'}
          </button>
        ))}
      </div>

      <div style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}` }}>
        {filtered.length===0 ? (
          <div style={{ padding:40, textAlign:'center' }}><Users size={36} style={{ color:C.text3, margin:'0 auto 12px' }}/><p style={{ color:C.text3 }}>Nuk ka anëtarë</p></div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
            <thead><tr style={{ background:C.muted }}>
              {['Emri','Membership','Skadon','Pagoi','Statusi',''].map(h=><th key={h} style={{ padding:'10px 16px', textAlign:'left' as const, fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase' as const }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(m=>{
                const s = status(m.expires_at)
                const sc = statusColor(s)
                const days = Math.ceil((new Date(m.expires_at).getTime()-today.getTime())/86400000)
                return (
                  <tr key={m.id} style={{ borderTop:`1px solid ${C.border}` }}>
                    <td style={{ padding:'12px 16px' }}><p style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{m.full_name}</p>{m.phone&&<p style={{ fontSize:11, color:C.text3 }}>{m.phone}</p>}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:C.text2 }}>{MEMBERSHIPS.find(x=>x.id===m.membership_type)?.label||m.membership_type}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:sc, fontWeight:600 }}>{new Date(m.expires_at).toLocaleDateString('sq-AL')}{days>0&&<span style={{ fontSize:10, display:'block' }}>({days} ditë)</span>}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:C.text1 }}>€{Number(m.amount_paid).toFixed(2)}</td>
                    <td style={{ padding:'12px 16px' }}><span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:`${sc}18`, color:sc }}>{statusLabel(s)}</span></td>
                    <td style={{ padding:'12px 16px' }}><button onClick={()=>del(m.id,m.full_name)} style={{ padding:'5px 8px', borderRadius:8, border:'1px solid #FECACA', background:'#FEF2F2', cursor:'pointer', color:'#DC2626' }}><Trash2 size={13}/></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
