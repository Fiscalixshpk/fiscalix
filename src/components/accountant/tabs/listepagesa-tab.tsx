'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Download, Loader2, Users2, Save } from 'lucide-react'
import { toast } from 'sonner'

interface Employee { id: string; full_name: string; personal_id?: string; position?: string; gross_salary: number }

const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

function calcTAP(gross: number) {
  if (gross <= 80) return 0
  if (gross <= 250) return (gross - 80) * 0.04
  if (gross <= 450) return 170 * 0.04 + (gross - 250) * 0.08
  return 170 * 0.04 + 200 * 0.08 + (gross - 450) * 0.10
}

export default function ListepagesaTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newEmp, setNewEmp] = useState({ full_name: '', personal_id: '', position: '', gross_salary: '' })

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees?company_id=${companyId}`)
      const data = await res.json()
      setEmployees(Array.isArray(data) ? data : [])
    } catch { setEmployees([]) }
    finally { setLoading(false) }
  }, [companyId])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  async function addEmployee() {
    if (!newEmp.full_name.trim()) { toast.error('Shto emrin'); return }
    try {
      const res = await fetch('/api/employees', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEmp, gross_salary: Number(newEmp.gross_salary) || 0, company_id: companyId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEmployees(prev => [...prev, data])
      setNewEmp({ full_name: '', personal_id: '', position: '', gross_salary: '' })
      setShowModal(false)
      toast.success('Punonjësi u shtua')
    } catch (err: unknown) { toast.error((err as Error).message) }
  }

  async function removeEmployee(id: string) {
    if (!window.confirm('A je i sigurt?')) return
    await fetch('/api/employees', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setEmployees(prev => prev.filter(e => e.id !== id))
    toast.success('Punonjësi u hoq')
  }

  function updateSalary(id: string, val: string) {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, gross_salary: Number(val) || 0 } : e))
  }

  async function exportExcel() {
    if (employees.length === 0) { toast.error('Shto punonjës fillimisht'); return }
    setExporting(true)
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, year, month, employees })
      })
      if (!res.ok) throw new Error('Gabim')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `Listepagesa_${companyName}_${MONTHS[month-1]}_${year}.xlsx`
      a.click()
      toast.success('Listëpagesa u shkarkua')
    } catch { toast.error('Gabim gjatë gjenerimit') }
    finally { setExporting(false) }
  }

  const totals = employees.reduce((acc, e) => {
    const g = Number(e.gross_salary) || 0
    const pen = +(g * 0.05).toFixed(2)
    const tap = +calcTAP(g).toFixed(2)
    return { gross: acc.gross + g, pen: acc.pen + pen, tap: acc.tap + tap, net: acc.net + g - pen - tap }
  }, { gross: 0, pen: 0, tap: 0, net: 0 })

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ ...I, width:'auto' }}>
          {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ ...I, width:'auto' }}>
          {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => setShowModal(true)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 14px', borderRadius:10, border:'1px solid rgba(90,31,214,0.25)', background:'rgba(90,31,214,0.08)', color:'#9B5CF8', fontSize:13, fontWeight:700, cursor:'pointer' }}>
          <Plus size={13}/> Shto Punonjës
        </button>
        <button onClick={exportExcel} disabled={exporting || employees.length === 0}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 14px', borderRadius:10, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', opacity: employees.length===0?0.5:1, marginLeft:'auto' }}>
          {exporting ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}
          Excel ATK
        </button>
      </div>

      {/* KPIs */}
      {employees.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {[
            { label:'Bruto', value:`€${totals.gross.toFixed(0)}`, color:'#9B5CF8' },
            { label:'Pension (10%)', value:`€${(totals.pen*2).toFixed(0)}`, color:'#F59E0B' },
            { label:'TAP', value:`€${totals.tap.toFixed(0)}`, color:'#EF4444' },
            { label:'Neto', value:`€${totals.net.toFixed(0)}`, color:'#10B981' },
          ].map(k => (
            <div key={k.label} style={{ background:'var(--bg-muted)', borderRadius:12, padding:'12px 14px', borderTop:`2px solid ${k.color}` }}>
              <p style={{ fontSize:10, color:'var(--text-3)', marginBottom:4, fontWeight:600, textTransform:'uppercase' }}>{k.label}</p>
              <p style={{ fontFamily:'Poppins,sans-serif', fontSize:18, fontWeight:800, color:k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:32, textAlign:'center' }}><Loader2 size={18} className="animate-spin" style={{ margin:'0 auto' }}/></div>
        ) : employees.length === 0 ? (
          <div style={{ padding:40, textAlign:'center' }}>
            <Users2 size={32} style={{ color:'var(--text-3)', margin:'0 auto 10px', opacity:0.4 }}/>
            <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:14 }}>Nuk ka punonjës</p>
            <button onClick={() => setShowModal(true)}
              style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, background:'rgba(90,31,214,0.1)', border:'1px solid rgba(90,31,214,0.2)', color:'#9B5CF8', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              <Plus size={13}/> Shto Punonjësin e Parë
            </button>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-muted)' }}>
                  {['Emri','Nr. Personal','Pozita','Bruto (€)','Pension','TAP','Neto',''].map((h,i) => (
                    <th key={i} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => {
                  const g = Number(emp.gross_salary) || 0
                  const pen = +(g * 0.05).toFixed(2)
                  const tap = +calcTAP(g).toFixed(2)
                  const net = +(g - pen - tap).toFixed(2)
                  return (
                    <tr key={emp.id} style={{ borderBottom:'1px solid var(--border)', background: i%2===0?'transparent':'var(--bg-muted)' }}>
                      <td style={{ padding:'9px 12px', fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{emp.full_name}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:'var(--text-3)' }}>{emp.personal_id || '—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:'var(--text-3)' }}>{emp.position || '—'}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <input type="number" value={emp.gross_salary} onChange={e => updateSalary(emp.id, e.target.value)}
                          style={{ ...I, width:90, padding:'5px 8px', fontSize:13 }}/>
                      </td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:'#F59E0B', fontWeight:600 }}>€{pen.toFixed(0)}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:'var(--text-1)', fontWeight:600 }}>€{tap.toFixed(0)}</td>
                      <td style={{ padding:'9px 12px', fontSize:13, color:'var(--text-1)', fontWeight:700 }}>€{net.toFixed(0)}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <button onClick={() => removeEmployee(emp.id)}
                          style={{ padding:'4px 7px', borderRadius:6, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.07)', color:'var(--text-1)', cursor:'pointer', display:'flex' }}>
                          <Trash2 size={12}/>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ fontSize:11, color:'var(--text-3)' }}>TAP: 0% ≤€80 · 4% €80-250 · 8% €250-450 · 10% mbi €450 · Pension 5%+5%</p>

      {/* Modal */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:99 }}/>
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:24, width:'min(400px,92vw)', zIndex:100 }}>
            <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:16, fontWeight:800, color:'var(--text-1)', marginBottom:18 }}>Shto Punonjës</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label:'Emri *', field:'full_name', type:'text', placeholder:'Agim Berisha' },
                { label:'Nr. Personal', field:'personal_id', type:'text', placeholder:'1234567890' },
                { label:'Pozita', field:'position', type:'text', placeholder:'Menaxher, Kontabilist, Teknik' },
                { label:'Paga Bruto (€)', field:'gross_salary', type:'number', placeholder:'450' },
              ].map(f => (
                <div key={f.field}>
                  <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    value={newEmp[f.field as keyof typeof newEmp]}
                    onChange={e => setNewEmp(prev => ({ ...prev, [f.field]: e.target.value }))}
                    style={I}/>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:18 }}>
              <button onClick={() => setShowModal(false)} style={{ flex:1, padding:9, borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'white', cursor:'pointer', fontSize:13 }}>Anulo</button>
              <button onClick={addEmployee} style={{ flex:2, padding:9, borderRadius:9, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontSize:13, fontWeight:700, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <Save size={13}/> Shto
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
