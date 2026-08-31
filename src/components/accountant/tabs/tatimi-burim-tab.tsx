'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface WHT { id: string; vendor_name: string; service_description?: string; amount: number; tax_rate: number; tax_amount: number; payment_date: string }
const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

export default function TatimiBurimTab({ companyId }: { companyId: string }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()+1)
  const [records, setRecords] = useState<WHT[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ vendor_name:'', service_description:'', amount:'', tax_rate:'9', payment_date:now.toISOString().split('T')[0] })

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/withholding-tax?company_id=${companyId}&year=${year}&month=${month}`)
      const data = await res.json()
      setRecords(Array.isArray(data) ? data : [])
    } catch { setRecords([]) }
    finally { setLoading(false) }
  }, [companyId, year, month])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  async function addRecord() {
    if (!form.vendor_name.trim() || !form.amount) { toast.error('Plotëso fushat'); return }
    try {
      const res = await fetch('/api/withholding-tax', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...form, amount:Number(form.amount), tax_rate:Number(form.tax_rate), company_id:companyId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRecords(prev => [...prev, data])
      setForm({ vendor_name:'', service_description:'', amount:'', tax_rate:'9', payment_date:now.toISOString().split('T')[0] })
      setShowModal(false)
      toast.success('U shtua')
    } catch (err: unknown) { toast.error((err as Error).message) }
  }

  async function deleteRecord(id: string) {
    await fetch('/api/withholding-tax', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id }) })
    setRecords(prev => prev.filter(r => r.id !== id))
    toast.success('U fshi')
  }

  async function exportExcel() {
    setExporting(true)
    try {
      const res = await fetch(`/api/withholding-tax/export?company_id=${companyId}&year=${year}&month=${month}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `Tatimi_Burim_${MONTHS[month-1]}_${year}.xlsx`
      a.click()
      toast.success('Deklarata u shkarkua')
    } catch { toast.error('Gabim') }
    finally { setExporting(false) }
  }

  const totTax = records.reduce((s,r) => s + Number(r.tax_amount), 0)
  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }

  return (
    <div className="space-y-4">
      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ ...I, width:'auto' }}>
          {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ ...I, width:'auto' }}>
          {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => setShowModal(true)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:10, border:'1px solid rgba(90,31,214,0.25)', background:'rgba(90,31,214,0.08)', color:'#9B5CF8', fontSize:13, fontWeight:700, cursor:'pointer' }}>
          <Plus size={13}/> Shto
        </button>
        <button onClick={exportExcel} disabled={exporting || records.length===0}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:10, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', opacity:records.length===0?0.5:1, marginLeft:'auto' }}>
          {exporting ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}
          Excel ATK
        </button>
      </div>

      {records.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div style={{ background:'var(--bg-muted)', borderRadius:12, padding:'12px 14px', borderTop:'2px solid #EF4444' }}>
            <p style={{ fontSize:10, color:'white', fontWeight:600, textTransform:'uppercase', marginBottom:4 }}>Tatimi Total 9%</p>
            <p style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:800, color:'white' }}>€{totTax.toFixed(2)}</p>
          </div>
          <div style={{ background:'var(--bg-muted)', borderRadius:12, padding:'12px 14px', borderTop:'2px solid #3B82F6' }}>
            <p style={{ fontSize:10, color:'white', fontWeight:600, textTransform:'uppercase', marginBottom:4 }}>Numri Rekordeve</p>
            <p style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:800, color:'white' }}>{records.length}</p>
          </div>
        </div>
      )}

      <div style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:32, textAlign:'center' }}><Loader2 size={18} className="animate-spin" style={{ margin:'0 auto' }}/></div>
        ) : records.length === 0 ? (
          <div style={{ padding:36, textAlign:'center' }}>
            <p style={{ fontSize:13, color:'var(--text-3)' }}>Nuk ka rekorde për {MONTHS[month-1]} {year}</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-muted)' }}>
                  {['Data','Furnizuesi','Shërbimi','Shuma','Tatimi 9%',''].map((h,i) => (
                    <th key={i} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r,i) => (
                  <tr key={r.id} style={{ borderBottom:'1px solid var(--border)', background:i%2===0?'transparent':'var(--bg-muted)' }}>
                    <td style={{ padding:'9px 12px', fontSize:12, color:'var(--text-3)' }}>{r.payment_date}</td>
                    <td style={{ padding:'9px 12px', fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{r.vendor_name}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, color:'var(--text-3)' }}>{r.service_description||'—'}</td>
                    <td style={{ padding:'9px 12px', fontSize:13, color:'var(--text-1)', fontWeight:600 }}>€{Number(r.amount).toFixed(2)}</td>
                    <td style={{ padding:'9px 12px', fontSize:13, color:'var(--text-1)', fontWeight:700 }}>€{Number(r.tax_amount).toFixed(2)}</td>
                    <td style={{ padding:'9px 12px' }}>
                      <button onClick={() => deleteRecord(r.id)} style={{ padding:'4px 7px', borderRadius:6, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.07)', color:'var(--text-1)', cursor:'pointer', display:'flex' }}>
                        <Trash2 size={12}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:99 }}/>
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:24, width:'min(400px,92vw)', zIndex:100 }}>
            <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:16, fontWeight:800, color:'var(--text-1)', marginBottom:16 }}>Shto Rekord</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label:'Furnizuesi *', field:'vendor_name', type:'text', placeholder:'Agron Gjoshi' },
                { label:'Shërbimi', field:'service_description', type:'text', placeholder:'Shërbim dizajni' },
                { label:'Shuma (€) *', field:'amount', type:'number', placeholder:'500' },
                { label:'Norma (%)', field:'tax_rate', type:'number', placeholder:'9' },
                { label:'Data', field:'payment_date', type:'date', placeholder:'' },
              ].map(f => (
                <div key={f.field}>
                  <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:4 }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={form[f.field as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.field]: e.target.value }))} style={I}/>
                </div>
              ))}
              {form.amount && (
                <p style={{ fontSize:12, color:'var(--text-1)', fontWeight:600, padding:'8px 12px', background:'rgba(239,68,68,0.07)', borderRadius:8 }}>
                  Tatimi: €{(Number(form.amount)*Number(form.tax_rate)/100).toFixed(2)}
                </p>
              )}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <button onClick={() => setShowModal(false)} style={{ flex:1, padding:9, borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'white', cursor:'pointer', fontSize:13 }}>Anulo</button>
              <button onClick={addRecord} style={{ flex:2, padding:9, borderRadius:9, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontSize:13, fontWeight:700, border:'none', cursor:'pointer' }}>Shto</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
