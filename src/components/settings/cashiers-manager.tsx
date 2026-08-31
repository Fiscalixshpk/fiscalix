'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, Eye, EyeOff, UserCheck, Shield } from 'lucide-react'

interface Cashier {
  id: string; name: string; pin: string; role: 'owner'|'cashier'; is_active: boolean
}

export default function CashiersManager({ companyId }: { companyId: string }) {
  const supabase = createClient()
  const [cashiers, setCashiers] = useState<Cashier[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showPins, setShowPins] = useState<Record<string,boolean>>({})
  const [form, setForm] = useState({ name:'', pin:'', role:'cashier' as 'owner'|'cashier' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('market_cashiers')
      .select('*').eq('company_id', companyId).eq('is_active', true).order('created_at')
    setCashiers(data || [])
    setLoading(false)
  }

  async function addCashier() {
    if (!form.name || form.pin.length !== 4) {
      toast.error('Emri dhe PIN 4-shifror janë të detyrueshme')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('market_cashiers').insert({
      company_id: companyId, name: form.name, pin: form.pin,
      role: form.role, is_active: true
    })
    if (error) { toast.error('Gabim: ' + error.message) }
    else { toast.success('Kasieri u shtua!'); setForm({ name:'', pin:'', role:'cashier' }); setShowAdd(false); load() }
    setSaving(false)
  }

  async function deleteCashier(id: string) {
    await supabase.from('market_cashiers').update({ is_active: false }).eq('id', id)
    toast.success('Kasieri u fshi')
    load()
  }

  return (
    <div style={{ fontFamily:'Inter,sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-1)', marginBottom:4 }}>Kasierët</h3>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>Menaxho kasierët dhe PIN-et e hyrjes në POS</p>
        </div>
        <button onClick={()=>setShowAdd(!showAdd)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, background:'#7C3AED', color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>
          <Plus size={14}/> Shto Kasier
        </button>
      </div>

      {/* Form shtimi */}
      {showAdd && (
        <div style={{ background:'var(--bg-muted)', border:'1px solid var(--border)', borderRadius:14, padding:20, marginBottom:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:6 }}>Emri</label>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="p.sh. Arjeta"
                style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1.5px solid var(--border)', fontSize:13, color:'var(--text-1)', background:'var(--bg-input)', outline:'none', boxSizing:'border-box' as const }}/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:6 }}>PIN (4 shifra)</label>
              <input value={form.pin} onChange={e=>setForm(f=>({...f,pin:e.target.value.slice(0,4)}))} placeholder="1234" maxLength={4} type="password"
                style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1.5px solid var(--border)', fontSize:13, color:'var(--text-1)', background:'var(--bg-input)', outline:'none', boxSizing:'border-box' as const }}/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:6 }}>Roli</label>
              <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value as any}))}
                style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1.5px solid var(--border)', fontSize:13, color:'var(--text-1)', background:'var(--bg-input)', outline:'none', boxSizing:'border-box' as const }}>
                <option value="cashier">Kasier</option>
                <option value="owner">Pronar</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setShowAdd(false)}
              style={{ padding:'9px 16px', borderRadius:8, border:'1px solid var(--border)', background:'white', fontSize:13, color:'var(--text-2)', cursor:'pointer', fontWeight:600 }}>
              Anulo
            </button>
            <button onClick={addCashier} disabled={saving}
              style={{ padding:'9px 20px', borderRadius:8, background:'#7C3AED', color:'white', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {saving?'Duke ruajtur...':'Shto'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ padding:40, textAlign:'center' as const, color:'var(--text-3)', fontSize:13 }}>Duke ngarkuar...</div>
      ) : cashiers.length === 0 ? (
        <div style={{ padding:40, textAlign:'center' as const, color:'var(--text-3)', fontSize:13 }}>
          Nuk ka kasierë. Shto kasier të parë.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column' as const, gap:10 }}>
          {cashiers.map(c => (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:c.role==='owner'?'#FEF3C7':'var(--purple-bg)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {c.role==='owner' ? <Shield size={18} color="#D97706"/> : <UserCheck size={18} color="#7C3AED"/>}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:2 }}>{c.name}</p>
                <p style={{ fontSize:12, color:'var(--text-3)' }}>{c.role==='owner'?'Pronar — qasje e plotë':'Kasier — vetëm shitje'}</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontFamily:'monospace', fontSize:16, letterSpacing:4, color:showPins[c.id]?'var(--text-1)':'var(--text-3)' }}>
                  {showPins[c.id] ? c.pin : '••••'}
                </div>
                <button onClick={()=>setShowPins(p=>({...p,[c.id]:!p[c.id]}))}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', padding:4 }}>
                  {showPins[c.id] ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
              <span style={{ padding:'4px 10px', borderRadius:20, background:c.role==='owner'?'#FEF3C7':'var(--purple-bg)', color:c.role==='owner'?'#D97706':'#7C3AED', fontSize:11, fontWeight:700 }}>
                {c.role==='owner'?'Pronar':'Kasier'}
              </span>
              <button onClick={()=>deleteCashier(c.id)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#DC2626', padding:4 }}>
                <Trash2 size={15}/>
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop:16, padding:'12px 16px', background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:10 }}>
        <p style={{ fontSize:12, color:'#92400E', fontWeight:600 }}>
          ⚠ PIN-et janë të dukshme vetëm nga pronari. Kasieri mund të ndryshojë PIN-in e tij vetëm nga POS terminal.
        </p>
      </div>
    </div>
  )
}
