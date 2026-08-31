'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Download, Loader2, Users2, Save } from 'lucide-react'
import { toast } from 'sonner'

interface Company { id: string; name: string }
interface Employee { id: string; full_name: string; personal_id?: string; position?: string; gross_salary: number; is_active: boolean }

const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

function calcTAP(gross: number) {
  if (gross <= 80) return 0
  if (gross <= 250) return (gross - 80) * 0.04
  if (gross <= 450) return 170 * 0.04 + (gross - 250) * 0.08
  return 170 * 0.04 + 200 * 0.08 + (gross - 450) * 0.10
}

export default function ListepagesaClient({ companies }: { companies: Company[] }) {
  const now = new Date()
  const [companyId, setCompanyId] = useState(companies[0]?.id || '')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmps, setLoadingEmps] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newEmp, setNewEmp] = useState({ full_name: '', personal_id: '', position: '', gross_salary: '' })

  const fetchEmployees = useCallback(async () => {
    if (!companyId) return
    setLoadingEmps(true)
    try {
      const res = await fetch(`/api/employees?company_id=${companyId}`)
      const data = await res.json()
      setEmployees(Array.isArray(data) ? data : [])
    } catch { setEmployees([]) }
    finally { setLoadingEmps(false) }
  }, [companyId])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  async function addEmployee() {
    if (!newEmp.full_name.trim()) { toast.error('Shto emrin'); return }
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEmp, gross_salary: Number(newEmp.gross_salary) || 0, company_id: companyId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEmployees(prev => [...prev, data])
      setNewEmp({ full_name: '', personal_id: '', position: '', gross_salary: '' })
      setShowAddModal(false)
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

  async function saveAndExport() {
    if (employees.length === 0) { toast.error('Shto punonjës fillimisht'); return }
    setExporting(true)
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, year, month, employees })
      })
      if (!res.ok) throw new Error('Gabim gjatë gjenerimit')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `Listepagesa_${MONTHS[month-1]}_${year}.xlsx`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('Listëpagesa u shkarkua')
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setExporting(false) }
  }

  // Totals
  const totals = employees.reduce((acc, emp) => {
    const g = Number(emp.gross_salary) || 0
    const pen = +(g * 0.05).toFixed(2)
    const tap = +calcTAP(g).toFixed(2)
    const net = +(g - pen - tap).toFixed(2)
    return { gross: acc.gross + g, pen: acc.pen + pen, tap: acc.tap + tap, net: acc.net + net }
  }, { gross: 0, pen: 0, tap: 0, net: 0 })

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>Listëpagesa Klientëve</h1>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>Zgjidh klientin · Menaxho punëtorët · Gjenero listëpagesën format ATK</p>
        </div>
        <button onClick={saveAndExport} disabled={exporting || employees.length === 0}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:12, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontWeight:700, fontSize:14, border:'none', cursor:'pointer', opacity: employees.length===0?0.5:1 }}>
          {exporting ? <Loader2 size={15} className="animate-spin"/> : <Download size={15}/>}
          {exporting ? 'Duke gjeneruar...' : 'Gjenero Excel ATK'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:12, padding:'10px 16px', marginBottom:4, fontSize:12, color:'var(--text-1)' }}>
        💡 Punëtorët këtu janë per klientin e zgjedhur — për listëpagesën ATK. Punëtorët e kompanisë suaj janë te <strong style={{ color:'var(--text-1)' }}>Raporte Financiare</strong>.
      </div>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 20px', display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
        {companies.length > 1 && (
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Kompania</label>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)} style={{ ...I, width:'auto', minWidth:180 }}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Muaji</label>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ ...I, width:'auto' }}>
            {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Viti</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ ...I, width:'auto' }}>
            {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={() => setShowAddModal(true)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10, border:'1px solid rgba(90,31,214,0.3)', background:'rgba(90,31,214,0.1)', color:'#9B5CF8', fontSize:13, fontWeight:700, cursor:'pointer' }}>
          <Plus size={14}/> Shto Punonjës
        </button>
      </div>

      {/* Summary KPIs */}
      {employees.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[
            { label:'Paga Bruto', value:`€${totals.gross.toFixed(2)}`, color:'#9B5CF8' },
            { label:'Pension Total (10%)', value:`€${(totals.pen*2).toFixed(2)}`, color:'#F59E0B' },
            { label:'TAP Total', value:`€${totals.tap.toFixed(2)}`, color:'#EF4444' },
            { label:'Paga Neto', value:`€${totals.net.toFixed(2)}`, color:'#10B981' },
          ].map(k => (
            <div key={k.label} style={{ background:'var(--bg-card)', border:`1px solid ${k.color}25`, borderRadius:14, padding:'14px 16px', borderTop:`2px solid ${k.color}` }}>
              <p style={{ fontSize:11, color:'var(--text-3)', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</p>
              <p style={{ fontFamily:'Poppins,sans-serif', fontSize:22, fontWeight:800, color:k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Employees Table */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
          <Users2 size={16} style={{ color:'var(--text-3)' }}/>
          <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)' }}>Punonjësit — {MONTHS[month-1]} {year}</p>
          <span style={{ marginLeft:'auto', fontSize:12, color:'var(--text-3)' }}>{employees.length} punonjës</span>
        </div>

        {loadingEmps ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>
            <Loader2 size={20} className="animate-spin" style={{ margin:'0 auto 8px' }}/>
            <p style={{ fontSize:13 }}>Duke ngarkuar...</p>
          </div>
        ) : employees.length === 0 ? (
          <div style={{ padding:48, textAlign:'center' }}>
            <Users2 size={36} style={{ color:'var(--text-3)', margin:'0 auto 12px' }}/>
            <p style={{ fontSize:14, color:'var(--text-3)', marginBottom:16 }}>Nuk ka punonjës të shtuar</p>
            <button onClick={() => setShowAddModal(true)}
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, background:'rgba(90,31,214,0.1)', border:'1px solid rgba(90,31,214,0.25)', color:'#9B5CF8', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              <Plus size={14}/> Shto Punonjësin e Parë
            </button>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Emri','Nr. Personal','Pozita','Paga Bruto','Pension 5% (P)','TAP','Paga Neto',''].map((h,i) => (
                    <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
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
                      <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{emp.full_name}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-3)' }}>{emp.personal_id || '—'}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-3)' }}>{emp.position || '—'}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <input type="number" value={emp.gross_salary} onChange={e => updateSalary(emp.id, e.target.value)}
                          style={{ ...I, width:100, padding:'6px 10px', fontSize:13 }}/>
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:13, color:'#F59E0B', fontWeight:600 }}>€{pen.toFixed(2)}</td>
                      <td style={{ padding:'10px 14px', fontSize:13, color:'var(--text-1)', fontWeight:600 }}>€{tap.toFixed(2)}</td>
                      <td style={{ padding:'10px 14px', fontSize:13, color:'var(--text-1)', fontWeight:700 }}>€{net.toFixed(2)}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <button onClick={() => removeEmployee(emp.id)}
                          style={{ padding:'5px 8px', borderRadius:7, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.07)', color:'var(--text-1)', cursor:'pointer', display:'flex', alignItems:'center' }}>
                          <Trash2 size={13}/>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:'2px solid rgba(90,31,214,0.2)', background:'rgba(90,31,214,0.05)' }}>
                  <td colSpan={3} style={{ padding:'12px 14px', fontSize:12, fontWeight:700, color:'var(--text-3)' }}>TOTALI ({employees.length} punonjës)</td>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:800, color:'#9B5CF8' }}>€{totals.gross.toFixed(2)}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:700, color:'#F59E0B' }}>€{totals.pen.toFixed(2)}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:700, color:'var(--text-1)' }}>€{totals.tap.toFixed(2)}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:800, color:'var(--text-1)' }}>€{totals.net.toFixed(2)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* TAP Info */}
      <div style={{ padding:'14px 18px', borderRadius:12, background:'rgba(90,31,214,0.05)', border:'1px solid rgba(90,31,214,0.15)', fontSize:12, color:'var(--text-3)', lineHeight:1.7 }}>
        <strong style={{ color:'var(--purple-light)' }}>Brackets TAP Kosovë:</strong> 0% deri €80 · 4% €80-250 · 8% €250-450 · 10% mbi €450 &nbsp;|&nbsp; <strong style={{ color:'var(--purple-light)' }}>Pension:</strong> 5% punonjësi + 5% punëdhënësi &nbsp;|&nbsp; Afati: 15 i muajit pasues
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <>
          <div onClick={() => setShowAddModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:99 }}/>
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:28, width:'min(420px,92vw)', zIndex:100 }}>
            <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:17, fontWeight:800, color:'var(--text-1)', marginBottom:20 }}>Shto Punonjës</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { label:'Emri dhe Mbiemri *', field:'full_name', type:'text', placeholder:'p.sh. Agim Berisha' },
                { label:'Numri Personal', field:'personal_id', type:'text', placeholder:'p.sh. 1234567890' },
                { label:'Pozita', field:'position', type:'text', placeholder:'p.sh. Menaxher, Kontabilist, Teknik' },
                { label:'Paga Bruto (€)', field:'gross_salary', type:'number', placeholder:'p.sh. 450' },
              ].map(f => (
                <div key={f.field}>
                  <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    value={newEmp[f.field as keyof typeof newEmp]}
                    onChange={e => setNewEmp(prev => ({ ...prev, [f.field]: e.target.value }))}
                    style={I}/>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:22 }}>
              <button onClick={() => setShowAddModal(false)}
                style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-3)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Anulo
              </button>
              <button onClick={addEmployee}
                style={{ flex:2, padding:'10px', borderRadius:10, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontSize:13, fontWeight:700, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                <Save size={14}/> Shto Punonjësin
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
