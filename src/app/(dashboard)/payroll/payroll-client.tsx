'use client'
import { useState, useEffect, useMemo } from 'react'
import {
  Users, Plus, Trash2, Edit2, Download, Save, X, Check,
  Clock, Calendar, TrendingUp, Search, Filter, ChevronDown,
  AlertCircle, CheckCircle, XCircle, ArrowUpRight, Briefcase,
  DollarSign, BarChart3, FileText, Bell, RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

// ── Types ───────────────────────────────────────────────────────────
interface Employee {
  id: string; full_name: string; personal_id?: string; position?: string
  department?: string; contract_type?: string; gross_salary: number
  start_date?: string; bank_account?: string; notes?: string
  email?: string; password_hash?: string; portal_enabled?: boolean; is_active: boolean
}
interface LeaveReq { id: string; employee_id: string; type: string; start_date: string; end_date: string; days: number; reason?: string; status: string; created_at: string }
interface OvertimeReq { id: string; employee_id: string; date: string; hours: number; reason?: string; status: string }
interface TimeEntry { id: string; employee_id: string; date: string; clock_in: string; clock_out?: string; duration_minutes?: number; notes?: string }

type Tab = 'overview'|'employees'|'payroll'|'attendance'|'leaves'|'overtime'|'payslips'|'reports'|'requests'|'portal'

// ── Kosovo TAP ──────────────────────────────────────────────────────
const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']
const DEPTS  = ['Menaxhment','Prodhim','Shitje','Marketing','Financa','IT','HR','Logjistikë','Tjetër']
const CTYPES = ['I Plotë','Gjysmë-kohe','Kontratë','Provë']
const LTYPES = ['Pushim Vjetor','Sëmundje','Mungesë','Pushim Lindje','Pushim Familjar','Tjetër']

function tap(g: number) {
  if (g <= 80) return 0; if (g <= 250) return (g-80)*.04
  if (g <= 450) return 170*.04+(g-250)*.08; return 170*.04+200*.08+(g-450)*.10
}
function calc(gross: number, bonus=0, ded=0) {
  const t=gross+bonus; const pE=+(t*.05).toFixed(2); const pR=+(t*.05).toFixed(2)
  const tx=+tap(t).toFixed(2); const net=+(t-pE-tx-ded).toFixed(2)
  return {pE,pR,tx,net,total:t}
}
const fmt  = (n:number) => `€${Number(n||0).toFixed(2)}`
const fmtN = (n:number) => Number(n||0).toLocaleString('sq-AL')

function safeDate(v:any): Date|null { const d=new Date(v); return isNaN(d.getTime())?null:d }
function fmtTime(v:any) { const d=safeDate(v); return d?d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'}):'--:--' }
function fmtDur(m:number) { if(!m||isNaN(m)) return '—'; return `${Math.floor(m/60)}h ${m%60}m` }

const STATUS_COLOR: Record<string,string> = {
  pending:'#F59E0B', approved:'#10B981', rejected:'#EF4444',
  active:'#10B981',  draft:'#9CA3AF',    expired:'#F59E0B'
}

// ── Styles ──────────────────────────────────────────────────────────
const inp = {width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid var(--border)',background:'var(--bg-input)',color:'var(--text-1)',fontSize:13,boxSizing:'border-box' as const,outline:'none',fontFamily:'inherit'}
const lbl = {fontSize:11,fontWeight:700,color:'var(--text-3)',display:'block',marginBottom:5,textTransform:'uppercase' as const,letterSpacing:'.05em'}
const card= {background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14}

// ── Main ────────────────────────────────────────────────────────────
export default function PayrollClient({company,employees:init,payrollRecords:initRec,companyId}:{company:any;employees:Employee[];payrollRecords:any[];companyId:string}) {
  const [tab,setTab]         = useState<Tab>('overview')
  const [employees,setEmployees] = useState<Employee[]>(init)
  const [leaveReqs,setLeaveReqs] = useState<LeaveReq[]>([])
  const [otReqs,setOtReqs]   = useState<OvertimeReq[]>([])
  const [timeEntries,setTimeEntries] = useState<TimeEntry[]>([])
  const [showEmpForm,setShowEmpForm] = useState(false)
  const [editEmp,setEditEmp] = useState<Employee|null>(null)
  const [saving,setSaving]   = useState(false)
  const [exporting,setExporting] = useState(false)
  const [search,setSearch]   = useState('')
  const [deptFilter,setDeptFilter] = useState('')
  const [copied,setCopied]   = useState(false)
  const [loadingReqs,setLoadingReqs] = useState(false)

  const now = new Date()
  const [year,setYear]   = useState(now.getFullYear())
  const [month,setMonth] = useState(now.getMonth()+1)
  const [bonuses,setBonuses]       = useState<Record<string,number>>({})
  const [deductions,setDeductions] = useState<Record<string,number>>({})
  const [attEmpFilter,setAttEmpFilter] = useState('')
  const [attPeriod,setAttPeriod]   = useState<'today'|'week'|'month'>('week')

  const emptyForm = {full_name:'',personal_id:'',position:'',department:'',contract_type:'I Plotë',gross_salary:'',start_date:'',bank_account:'',notes:'',email:'',password_hash:'',portal_enabled:false}
  const [form,setForm] = useState<any>(emptyForm)

  // Load requests + time entries
  useEffect(() => { fetchRequests(); fetchTimeEntries() }, [])

  async function fetchRequests() {
    setLoadingReqs(true)
    try {
      const [lR,oR] = await Promise.all([
        fetch('/api/employee/leaves?company_id='+companyId),
        fetch('/api/employee/overtime?company_id='+companyId)
      ])
      setLeaveReqs(await lR.json())
      setOtReqs(await oR.json())
    } catch {}
    finally { setLoadingReqs(false) }
  }

  async function fetchTimeEntries() {
    try {
      const res = await fetch('/api/payroll/attendance?company_id='+companyId)
      if (res.ok) { const d=await res.json(); setTimeEntries(Array.isArray(d)?d:[]) }
    } catch {}
  }

  async function saveEmployee() {
    if (!form.full_name.trim()) { toast.error('Emri kërkohet'); return }
    setSaving(true)
    try {
      const payload = {...form, gross_salary:Number(form.gross_salary)||0, company_id:companyId}
      const method  = editEmp ? 'PATCH' : 'POST'
      const body    = editEmp ? {id:editEmp.id,...payload} : payload
      const res  = await fetch('/api/employees',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (editEmp) { setEmployees(p=>p.map(e=>e.id===editEmp.id?data:e)); toast.success('U ndryshua') }
      else         { setEmployees(p=>[...p,data]); toast.success('U shtua') }
      setShowEmpForm(false); setEditEmp(null); setForm(emptyForm)
    } catch(e:any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function removeEmployee(id:string) {
    if (!confirm('A je i sigurt?')) return
    await fetch('/api/employees',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    setEmployees(p=>p.filter(e=>e.id!==id))
    toast.success('U hoq')
  }

  async function reviewLeave(id:string,status:string) {
    await fetch('/api/employee/leaves',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status})})
    setLeaveReqs(p=>p.map(r=>r.id===id?{...r,status}:r))
    toast.success(status==='approved'?'U aprovua':'U refuzua')
  }

  async function reviewOvertime(id:string,status:string) {
    await fetch('/api/employee/overtime',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status})})
    setOtReqs(p=>p.map(r=>r.id===id?{...r,status}:r))
    toast.success(status==='approved'?'U aprovua':'U refuzua')
  }

  async function exportPayroll() {
    if (!employees.length) { toast.error('Nuk ka punëtorë'); return }
    setExporting(true)
    try {
      const res = await fetch('/api/payroll',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({company_id:companyId,year,month,employees:employees.map(e=>({...e,name:e.full_name,bonus:bonuses[e.id]||0,deductions:deductions[e.id]||0}))})})
      if (!res.ok) throw new Error()
      const blob=await res.blob(); const a=document.createElement('a')
      a.href=URL.createObjectURL(blob); a.download=`Listepagesa_${MONTHS[month-1]}_${year}.xlsx`; a.click()
      toast.success('Listëpagesa u shkarkua')
    } catch { toast.error('Gabim') }
    finally { setExporting(false) }
  }

  // Computed
  const rows = employees.map(e=>({...e,...calc(e.gross_salary,bonuses[e.id]||0,deductions[e.id]||0),bonus:bonuses[e.id]||0,ded:deductions[e.id]||0}))
  const totGross=rows.reduce((s,r)=>s+r.total,0), totNet=rows.reduce((s,r)=>s+r.net,0)
  const totTAP=rows.reduce((s,r)=>s+r.tx,0), totPen=rows.reduce((s,r)=>s+r.pE+r.pR,0)
  const totCost=rows.reduce((s,r)=>s+r.total+r.pR,0)
  const pendingLeaves=leaveReqs.filter(r=>r.status==='pending').length
  const pendingOT=otReqs.filter(r=>r.status==='pending').length
  const filteredEmps = employees.filter(e=>{
    const matchS = !search || e.full_name.toLowerCase().includes(search.toLowerCase()) || (e.position||'').toLowerCase().includes(search.toLowerCase())
    const matchD = !deptFilter || e.department===deptFilter
    return matchS && matchD
  })

  // Attendance filter
  const filteredAtt = useMemo(()=>{
    return timeEntries.filter(e=>{
      const d=safeDate(e.date); if(!d) return false
      if (attEmpFilter && e.employee_id!==attEmpFilter) return false
      if (attPeriod==='today') return e.date===now.toISOString().split('T')[0]
      if (attPeriod==='week')  return (now.getTime()-d.getTime())<=7*86400000
      return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()
    })
  },[timeEntries,attEmpFilter,attPeriod])

  const TABS: {id:Tab;icon:string;label:string;badge?:number}[] = [
    {id:'overview',    icon:'📊', label:'Overview'},
    {id:'employees',   icon:'👥', label:'Punëtorët'},
    {id:'attendance',  icon:'⏱️', label:'Attendance'},
    {id:'payroll',     icon:'📋', label:'Listëpagesa'},
    {id:'payslips',    icon:'🧾', label:'Payslips'},
    {id:'requests',    icon:'📬', label:'Kërkesat', badge:(pendingLeaves+pendingOT)||undefined},
    {id:'reports',     icon:'📈', label:'Raporte'},
    {id:'portal',      icon:'🔗', label:'Portali'},
  ]

  const slug = company?.slug || companyId.slice(0,8)
  const portalUrl = typeof window!=='undefined' ? `${window.location.origin}/employee/${slug}/login` : `/employee/${slug}/login`

  return (
    <div style={{padding:'24px 20px',maxWidth:1140,margin:'0 auto'}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:'var(--text-1)',margin:'0 0 4px',letterSpacing:'-.04em'}}>Payroll</h1>
          <p style={{fontSize:13,color:'var(--text-3)',margin:0}}>{company?.name} · {employees.length} punëtorë aktiv</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          {(pendingLeaves+pendingOT)>0 && (
            <button onClick={()=>{setTab('requests');fetchRequests()}}
              style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:10,border:'1.5px solid rgba(245,158,11,.3)',background:'rgba(245,158,11,.06)',color:'#F59E0B',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              <Bell size={14}/> {pendingLeaves+pendingOT} kërkesa
            </button>
          )}
          <button onClick={()=>{setShowEmpForm(true);setEditEmp(null);setForm(emptyForm)}}
            style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:10,border:'none',background:'#7C3AED',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',boxShadow:'0 2px 10px rgba(124,58,237,.35)'}}>
            <Plus size={14}/> Shto Punëtor
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:2,marginBottom:24,padding:4,background:'var(--bg-muted)',borderRadius:12,width:'fit-content',flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'8px 14px',borderRadius:9,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,transition:'all .15s',position:'relative',
              background:tab===t.id?'var(--bg-card)':'transparent',
              color:tab===t.id?'var(--text-1)':'var(--text-3)',
              boxShadow:tab===t.id?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {t.icon} {t.label}
            {t.badge && <span style={{position:'absolute',top:2,right:2,background:'#EF4444',color:'#fff',borderRadius:99,fontSize:9,fontWeight:800,padding:'1px 4px',minWidth:14,textAlign:'center'}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══ */}
      {tab==='overview' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* KPI grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
            {[
              {l:'Punëtorë',v:String(employees.length),sub:'aktiv',c:'#7C3AED',bg:'rgba(124,58,237,.06)'},
              {l:'Fond Pagash',v:fmt(employees.reduce((s,e)=>s+e.gross_salary,0)),sub:'bruto/muaj',c:'#3B82F6',bg:'rgba(59,130,246,.06)'},
              {l:'Kosto Totale',v:fmt(employees.reduce((s,e)=>s+e.gross_salary*1.05,0)),sub:'me pension',c:'#EF4444',bg:'rgba(239,68,68,.06)'},
              {l:'Kërkesat',v:String(pendingLeaves+pendingOT),sub:'në pritje',c:'#F59E0B',bg:'rgba(245,158,11,.06)'},
              {l:'Pension',v:fmt(employees.reduce((s,e)=>s+e.gross_salary*.10,0)),sub:'5%+5%/muaj',c:'#10B981',bg:'rgba(16,185,129,.06)'},
            ].map(s=>(
              <div key={s.l} style={{background:s.bg,border:`1px solid ${s.c}22`,borderRadius:14,padding:'16px 18px'}}>
                <p style={{fontSize:10,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.05em',margin:'0 0 8px'}}>{s.l}</p>
                <p style={{fontSize:22,fontWeight:800,color:s.c,margin:'0 0 2px'}}>{s.v}</p>
                <p style={{fontSize:11,color:'var(--text-3)',margin:0}}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Recent employees + pending requests */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div style={{...card,overflow:'hidden'}}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <p style={{fontWeight:700,fontSize:14,color:'var(--text-1)',margin:0}}>Punëtorët</p>
                <button onClick={()=>setTab('employees')} style={{fontSize:12,color:'#7C3AED',fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>Shiko të gjithë →</button>
              </div>
              {employees.slice(0,5).map((e,i)=>{
                const c=calc(e.gross_salary)
                return(
                  <div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 18px',borderTop:i>0?'1px solid var(--border)':'none'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#7C3AED,#A78BFA)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:13,flexShrink:0}}>
                        {e.full_name.charAt(0)}
                      </div>
                      <div>
                        <p style={{fontWeight:600,fontSize:13,color:'var(--text-1)',margin:0}}>{e.full_name}</p>
                        <p style={{fontSize:11,color:'var(--text-3)',margin:0}}>{e.position||'—'}</p>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <p style={{fontWeight:700,fontSize:13,color:'#10B981',margin:0}}>{fmt(c.net)}</p>
                      <p style={{fontSize:10,color:'var(--text-3)',margin:0}}>neto</p>
                    </div>
                  </div>
                )
              })}
              {employees.length===0 && <p style={{textAlign:'center',padding:24,color:'var(--text-3)',fontSize:13}}>Nuk ka punëtorë</p>}
            </div>

            <div style={{...card,overflow:'hidden'}}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <p style={{fontWeight:700,fontSize:14,color:'var(--text-1)',margin:0}}>Kërkesat në pritje</p>
                <button onClick={()=>{setTab('requests');fetchRequests()}} style={{fontSize:12,color:'#7C3AED',fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>Menaxho →</button>
              </div>
              {[...leaveReqs.filter(r=>r.status==='pending').map(r=>({...r,_type:'leave'})),
                ...otReqs.filter(r=>r.status==='pending').map(r=>({...r,_type:'ot'}))
              ].slice(0,5).map((r:any,i)=>{
                const emp=employees.find(e=>e.id===r.employee_id)
                return(
                  <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 18px',borderTop:i>0?'1px solid var(--border)':'none'}}>
                    <div>
                      <p style={{fontWeight:600,fontSize:12,color:'var(--text-1)',margin:0}}>{emp?.full_name||'—'}</p>
                      <p style={{fontSize:11,color:'var(--text-3)',margin:0}}>{r._type==='leave'?r.type:`${r.hours}h orë shtesë`}</p>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>r._type==='leave'?reviewLeave(r.id,'approved'):reviewOvertime(r.id,'approved')}
                        style={{padding:'4px 8px',borderRadius:7,border:'none',background:'rgba(16,185,129,.1)',color:'#10B981',fontSize:11,fontWeight:700,cursor:'pointer'}}>✓</button>
                      <button onClick={()=>r._type==='leave'?reviewLeave(r.id,'rejected'):reviewOvertime(r.id,'rejected')}
                        style={{padding:'4px 8px',borderRadius:7,border:'none',background:'rgba(239,68,68,.08)',color:'#EF4444',fontSize:11,fontWeight:700,cursor:'pointer'}}>✕</button>
                    </div>
                  </div>
                )
              })}
              {(pendingLeaves+pendingOT)===0 && <p style={{textAlign:'center',padding:24,color:'var(--text-3)',fontSize:13}}>✓ Nuk ka kërkesa në pritje</p>}
            </div>
          </div>

          {/* Salary breakdown */}
          {employees.length>0 && (
            <div style={{...card,padding:'18px 20px'}}>
              <p style={{fontWeight:700,fontSize:14,color:'var(--text-1)',margin:'0 0 14px'}}>Ndarja e Pagave</p>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {employees.map(e=>{
                  const pct=employees.reduce((s,x)=>s+x.gross_salary,0)>0?(e.gross_salary/employees.reduce((s,x)=>s+x.gross_salary,0))*100:0
                  return(
                    <div key={e.id} style={{display:'flex',alignItems:'center',gap:12}}>
                      <p style={{fontSize:12,fontWeight:600,color:'var(--text-2)',margin:0,width:160,flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.full_name}</p>
                      <div style={{flex:1,height:6,background:'var(--bg-muted)',borderRadius:99,overflow:'hidden'}}>
                        <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,#7C3AED,#A78BFA)',borderRadius:99}}/>
                      </div>
                      <p style={{fontSize:12,fontWeight:700,color:'var(--text-1)',margin:0,width:80,textAlign:'right',flexShrink:0}}>{fmt(e.gross_salary)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ EMPLOYEES ══ */}
      {tab==='employees' && (
        <div>
          {/* Employee Form */}
          {showEmpForm && (
            <div style={{...card,padding:22,marginBottom:20,borderColor:'rgba(124,58,237,.2)',boxShadow:'0 4px 24px rgba(0,0,0,.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
                <h3 style={{margin:0,fontSize:15,fontWeight:700,color:'var(--text-1)'}}>{editEmp?'✏️ Ndrysho':'➕ Punëtor i ri'}</h3>
                <button onClick={()=>{setShowEmpForm(false);setEditEmp(null)}} style={{background:'var(--bg-muted)',border:'none',cursor:'pointer',color:'var(--text-3)',width:30,height:30,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14}/></button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {[
                  ['Emri dhe Mbiemri *','full_name','text','Bardhyl Krasniqi'],
                  ['Nr. Personal','personal_id','text','1234567890'],
                  ['Pozita','position','text','Kamarier...'],
                  ['Paga Bruto (€)','gross_salary','number','450'],
                  ['Data e Fillimit','start_date','date',''],
                  ['Llogaria Bankare','bank_account','text','BKPR...'],
                  ['Email Portali','email','email','punetor@email.com'],
                  ['Fjalëkalimi Portali','password_hash','text',''],
                ].map(([l,f,t,ph])=>(
                  <div key={f as string}><label style={lbl}>{l}</label>
                    <input style={inp} type={t as string} placeholder={ph as string}
                      value={form[f as string]||''} onChange={e=>setForm((p:any)=>({...p,[f as string]:e.target.value}))}/>
                  </div>
                ))}
                <div><label style={lbl}>Departamenti</label>
                  <select style={inp} value={form.department} onChange={e=>setForm((p:any)=>({...p,department:e.target.value}))}>
                    <option value="">Zgjidh...</option>
                    {DEPTS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select></div>
                <div><label style={lbl}>Lloji i Kontratës</label>
                  <select style={inp} value={form.contract_type} onChange={e=>setForm((p:any)=>({...p,contract_type:e.target.value}))}>
                    {CTYPES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select></div>
                {form.gross_salary && Number(form.gross_salary)>0 && (
                  <div style={{gridColumn:'1/-1',padding:'12px 16px',background:'rgba(16,185,129,.06)',border:'1px solid rgba(16,185,129,.15)',borderRadius:10,display:'flex',gap:20,flexWrap:'wrap',fontSize:12}}>
                    {(()=>{const c=calc(Number(form.gross_salary));return<>
                      <span style={{color:'var(--text-3)'}}>Neto: <strong style={{color:'#10B981'}}>{fmt(c.net)}</strong></span>
                      <span style={{color:'var(--text-3)'}}>Pension: <strong style={{color:'#F59E0B'}}>{fmt(c.pE)}</strong></span>
                      <span style={{color:'var(--text-3)'}}>TAP: <strong style={{color:'#EF4444'}}>{fmt(c.tx)}</strong></span>
                      <span style={{color:'var(--text-3)'}}>Kosto: <strong style={{color:'#8B5CF6'}}>{fmt(Number(form.gross_salary)*1.05)}</strong></span>
                    </>})()}
                  </div>
                )}
                <div style={{gridColumn:'1/-1',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:'var(--bg-muted)',borderRadius:10,border:'1px solid var(--border)'}}>
                  <div>
                    <p style={{fontSize:13,fontWeight:600,color:'var(--text-1)',margin:0}}>Aktivizo Portalin</p>
                    <p style={{fontSize:11,color:'var(--text-3)',margin:'2px 0 0'}}>Punëtori hyn me email + fjalëkalim</p>
                  </div>
                  <button type="button" onClick={()=>setForm((p:any)=>({...p,portal_enabled:!p.portal_enabled}))}
                    style={{fontSize:22,background:'none',border:'none',cursor:'pointer',color:form.portal_enabled?'#10B981':'var(--text-3)'}}>
                    {form.portal_enabled?'●':'○'}
                  </button>
                </div>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Shënime</label>
                  <textarea style={{...inp,height:56,resize:'none'}} value={form.notes} onChange={e=>setForm((p:any)=>({...p,notes:e.target.value}))}/></div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:18,paddingTop:14,borderTop:'1px solid var(--border)'}}>
                <button onClick={()=>{setShowEmpForm(false);setEditEmp(null)}} style={{padding:'9px 18px',borderRadius:10,border:'1.5px solid var(--border)',background:'none',color:'var(--text-2)',fontSize:13,fontWeight:600,cursor:'pointer'}}>Anulo</button>
                <button onClick={saveEmployee} disabled={saving} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 20px',borderRadius:10,border:'none',background:'#7C3AED',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',opacity:saving?.7:1}}>
                  <Save size={13}/> {saving?'Duke ruajtur...':'Ruaj'}
                </button>
              </div>
            </div>
          )}

          {/* Search + filter */}
          <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:200,position:'relative'}}>
              <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
              <input style={{...inp,paddingLeft:34}} placeholder="Kërko punëtor..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select style={{...inp,width:'auto'}} value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}>
              <option value="">Të gjitha dept.</option>
              {DEPTS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {filteredEmps.length===0 ? (
            <div style={{...card,textAlign:'center',padding:'56px 20px'}}>
              <Users size={36} style={{opacity:.2,marginBottom:12}}/>
              <p style={{fontWeight:600,color:'var(--text-1)',marginBottom:4}}>
                {search||deptFilter?'Nuk u gjet asnjë punëtor':'Nuk ka punëtorë'}
              </p>
              {!search && !deptFilter && <p style={{fontSize:12,color:'var(--text-3)'}}>Kliko "Shto Punëtor" për të filluar</p>}
            </div>
          ) : (
            <div style={{...card,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:'var(--bg-muted)'}}>
                  {['Punëtori','Pozita · Dep.','Kontrata','Bruto','Neto','Kosto','Portal',''].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:10,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.05em'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredEmps.map((e,i)=>{
                    const c=calc(e.gross_salary)
                    return(
                      <tr key={e.id} style={{borderTop:i>0?'1px solid var(--border)':'none'}}>
                        <td style={{padding:'12px 14px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:34,height:34,borderRadius:10,background:'linear-gradient(135deg,#7C3AED,#A78BFA)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:14,flexShrink:0}}>
                              {e.full_name.charAt(0)}
                            </div>
                            <div>
                              <p style={{fontWeight:700,fontSize:13,color:'var(--text-1)',margin:0}}>{e.full_name}</p>
                              {e.email && <p style={{fontSize:11,color:'var(--text-3)',margin:0}}>{e.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'12px 14px'}}>
                          <p style={{fontSize:13,color:'var(--text-2)',margin:0}}>{e.position||'—'}</p>
                          {e.department&&<p style={{fontSize:11,color:'var(--text-3)',margin:0}}>{e.department}</p>}
                        </td>
                        <td style={{padding:'12px 14px'}}>
                          <span style={{padding:'3px 9px',borderRadius:99,fontSize:11,fontWeight:600,background:'rgba(124,58,237,.1)',color:'#7C3AED'}}>
                            {e.contract_type||'I Plotë'}
                          </span>
                        </td>
                        <td style={{padding:'12px 14px',fontWeight:700,fontSize:13,color:'var(--text-1)'}}>{fmt(e.gross_salary)}</td>
                        <td style={{padding:'12px 14px',fontWeight:700,fontSize:13,color:'#10B981'}}>{fmt(c.net)}</td>
                        <td style={{padding:'12px 14px',fontSize:13,color:'var(--text-2)'}}>{fmt(e.gross_salary*1.05)}</td>
                        <td style={{padding:'12px 14px'}}>
                          <span style={{fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:99,
                            background:e.portal_enabled?'rgba(16,185,129,.1)':'rgba(113,113,122,.1)',
                            color:e.portal_enabled?'#10B981':'#71717A'}}>
                            {e.portal_enabled?'✓ Aktiv':'Joaktiv'}
                          </span>
                        </td>
                        <td style={{padding:'12px 14px'}}>
                          <div style={{display:'flex',gap:6}}>
                            <button onClick={()=>{setEditEmp(e);setForm({...e,gross_salary:String(e.gross_salary)});setShowEmpForm(true)}}
                              style={{width:30,height:30,borderRadius:8,border:'1.5px solid var(--border)',background:'none',cursor:'pointer',color:'var(--text-3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <Edit2 size={12}/>
                            </button>
                            <button onClick={()=>removeEmployee(e.id)}
                              style={{width:30,height:30,borderRadius:8,border:'1.5px solid rgba(239,68,68,.2)',background:'none',cursor:'pointer',color:'#EF4444',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <Trash2 size={12}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ ATTENDANCE ══ */}
      {tab==='attendance' && (
        <div>
          <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
            <select style={{...inp,width:'auto'}} value={attEmpFilter} onChange={e=>setAttEmpFilter(e.target.value)}>
              <option value="">Të gjithë punëtorët</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
            <div style={{display:'flex',gap:4,background:'var(--bg-muted)',borderRadius:9,padding:3}}>
              {(['today','week','month'] as const).map(p=>(
                <button key={p} onClick={()=>setAttPeriod(p)}
                  style={{padding:'6px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
                    background:attPeriod===p?'var(--bg-card)':'transparent',
                    color:attPeriod===p?'var(--text-1)':'var(--text-3)',
                    boxShadow:attPeriod===p?'0 1px 3px rgba(0,0,0,.1)':'none'}}>
                  {p==='today'?'Sot':p==='week'?'Java':'Muaji'}
                </button>
              ))}
            </div>
            <button onClick={fetchTimeEntries} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',borderRadius:9,border:'1.5px solid var(--border)',background:'none',color:'var(--text-2)',fontSize:12,fontWeight:600,cursor:'pointer'}}>
              <RefreshCw size={12}/> Rifresko
            </button>
          </div>

          {/* Summary */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
            {[
              {l:'Ditë të punuara',v:String(new Set(filteredAtt.map(e=>e.date)).size),c:'#7C3AED'},
              {l:'Orë totale',v:fmtDur(filteredAtt.filter(e=>e.duration_minutes).reduce((s:number,e:any)=>s+(e.duration_minutes||0),0)),c:'#3B82F6'},
              {l:'Aktiv tani',v:String(filteredAtt.filter(e=>!e.clock_out).length),c:'#10B981'},
            ].map(s=>(
              <div key={s.l} style={{...card,padding:'14px 18px',borderLeft:`3px solid ${s.c}`}}>
                <p style={{fontSize:10,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.05em',margin:'0 0 4px'}}>{s.l}</p>
                <p style={{fontSize:20,fontWeight:800,color:s.c,margin:0}}>{s.v}</p>
              </div>
            ))}
          </div>

          {filteredAtt.length===0 ? (
            <div style={{...card,textAlign:'center',padding:'48px 20px'}}>
              <Clock size={32} style={{opacity:.2,marginBottom:12}}/>
              <p style={{fontWeight:600,color:'var(--text-1)',marginBottom:4}}>Nuk ka rekorde attendance</p>
              <p style={{fontSize:12,color:'var(--text-3)'}}>Punëtorët duhet të bëjnë clock in nga portali</p>
            </div>
          ) : (
            <div style={{...card,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{background:'var(--bg-muted)'}}>
                  {['Punëtori','Data','Clock In','Clock Out','Orë të punuara','Shënime','Status'].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:10,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.05em'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredAtt.map((e,i)=>{
                    const emp=employees.find(x=>x.id===e.employee_id)
                    const isActive=!e.clock_out
                    return(
                      <tr key={e.id} style={{borderTop:i>0?'1px solid var(--border)':'none',background:isActive?'rgba(16,185,129,.02)':''}}>
                        <td style={{padding:'11px 14px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#7C3AED,#A78BFA)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:12,flexShrink:0}}>
                              {(emp?.full_name||'?').charAt(0)}
                            </div>
                            <p style={{fontWeight:600,fontSize:12,color:'var(--text-1)',margin:0}}>{emp?.full_name||'—'}</p>
                          </div>
                        </td>
                        <td style={{padding:'11px 14px',color:'var(--text-2)'}}>
                          {safeDate(e.date)?.toLocaleDateString('sq-AL',{day:'numeric',month:'short',year:'numeric'})||e.date}
                        </td>
                        <td style={{padding:'11px 14px',fontWeight:600,color:'var(--text-1)',fontVariantNumeric:'tabular-nums'}}>{fmtTime(e.clock_in)}</td>
                        <td style={{padding:'11px 14px',color:'var(--text-2)',fontVariantNumeric:'tabular-nums'}}>{e.clock_out?fmtTime(e.clock_out):'—'}</td>
                        <td style={{padding:'11px 14px',fontWeight:700,color:'#7C3AED'}}>{fmtDur(e.duration_minutes||0)}</td>
                        <td style={{padding:'11px 14px',color:'var(--text-3)',fontSize:11}}>{e.notes||'—'}</td>
                        <td style={{padding:'11px 14px'}}>
                          <span style={{fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:99,
                            background:isActive?'rgba(16,185,129,.1)':'rgba(113,113,122,.1)',
                            color:isActive?'#10B981':'#71717A'}}>
                            {isActive?'🟢 Aktiv':'✓ Komplet'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ PAYROLL ══ */}
      {tab==='payroll' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:16,flexWrap:'wrap',gap:10}}>
            <div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
              {[
                {l:'Muaji',val:month,set:setMonth,opts:MONTHS.map((m,i)=>({v:i+1,l:m}))},
                {l:'Viti',val:year,set:setYear,opts:[2024,2025,2026,2027].map(y=>({v:y,l:String(y)}))},
              ].map(s=>(
                <div key={s.l}><label style={lbl}>{s.l}</label>
                  <select style={{...inp,width:'auto'}} value={s.val} onChange={e=>s.set(Number(e.target.value))}>
                    {s.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                  </select></div>
              ))}
            </div>
            <button onClick={exportPayroll} disabled={exporting||!employees.length}
              style={{display:'flex',alignItems:'center',gap:8,padding:'10px 20px',borderRadius:10,border:'none',background:'#10B981',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',boxShadow:'0 2px 8px rgba(16,185,129,.35)',opacity:exporting||!employees.length?.6:1}}>
              <Download size={14}/> {exporting?'Duke gjeneruar...':'Shkarko Excel ATK'}
            </button>
          </div>

          {/* KPI */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
            {[
              {l:'Bruto',v:fmt(totGross),c:'#3B82F6'},
              {l:'Neto',v:fmt(totNet),c:'#10B981'},
              {l:'TAP',v:fmt(totTAP),c:'#F59E0B'},
              {l:'Pensioni',v:fmt(totPen),c:'#8B5CF6'},
              {l:'Kosto',v:fmt(totCost),c:'#EF4444'},
            ].map(s=>(
              <div key={s.l} style={{background:`${s.c}0d`,border:`1px solid ${s.c}22`,borderRadius:12,padding:'14px 16px'}}>
                <p style={{fontSize:10,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.05em',margin:'0 0 6px'}}>{s.l}</p>
                <p style={{fontSize:18,fontWeight:800,color:s.c,margin:0}}>{s.v}</p>
              </div>
            ))}
          </div>

          {!employees.length ? (
            <div style={{...card,textAlign:'center',padding:'40px'}}>
              <p style={{color:'var(--text-3)',fontSize:13}}>Shto punëtorë te tab "Punëtorët"</p>
            </div>
          ) : (
            <div style={{...card,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{background:'var(--bg-muted)'}}>
                  {['Emri','Bruto','Bonus','Zbritje','Pension (5%+5%)','TAP','Neto','Kosto Emp.'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.05em'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rows.map((r,i)=>(
                    <tr key={r.id} style={{borderTop:i>0?'1px solid var(--border)':'none'}}>
                      <td style={{padding:'11px 12px',fontWeight:600,color:'var(--text-1)',fontSize:13}}>{r.full_name}</td>
                      <td style={{padding:'11px 12px'}}>{fmt(r.total-r.bonus)}</td>
                      <td style={{padding:'6px 12px'}}>
                        <input type="number" min="0" step="0.01" placeholder="0" value={bonuses[r.id]||''}
                          onChange={e=>setBonuses(p=>({...p,[r.id]:Number(e.target.value)||0}))}
                          style={{width:70,padding:'5px 8px',borderRadius:7,border:'1.5px solid var(--border)',background:'var(--bg-input)',color:'var(--text-1)',fontSize:12,outline:'none'}}/>
                      </td>
                      <td style={{padding:'6px 12px'}}>
                        <input type="number" min="0" step="0.01" placeholder="0" value={deductions[r.id]||''}
                          onChange={e=>setDeductions(p=>({...p,[r.id]:Number(e.target.value)||0}))}
                          style={{width:70,padding:'5px 8px',borderRadius:7,border:'1.5px solid var(--border)',background:'var(--bg-input)',color:'var(--text-1)',fontSize:12,outline:'none'}}/>
                      </td>
                      <td style={{padding:'11px 12px',color:'#8B5CF6',fontWeight:600}}>{fmt(r.pE+r.pR)}</td>
                      <td style={{padding:'11px 12px',color:'#F59E0B',fontWeight:600}}>{fmt(r.tx)}</td>
                      <td style={{padding:'11px 12px',color:'#10B981',fontWeight:700}}>{fmt(r.net)}</td>
                      <td style={{padding:'11px 12px',fontWeight:700,color:'var(--text-1)'}}>{fmt(r.total+r.pR)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr style={{background:'var(--bg-muted)',borderTop:'2px solid var(--border)'}}>
                  <td style={{padding:'12px',fontWeight:800,fontSize:13,color:'var(--text-1)'}}>TOTALI</td>
                  <td style={{padding:'12px',fontWeight:700}}>{fmt(totGross-Object.values(bonuses).reduce((a:number,b:unknown)=>a+(b as number),0))}</td>
                  <td style={{padding:'12px',fontWeight:700,color:'#10B981'}}>{fmt(Object.values(bonuses).reduce((a:number,b:unknown)=>a+(b as number),0))}</td>
                  <td style={{padding:'12px',fontWeight:700,color:'#EF4444'}}>{fmt(Object.values(deductions).reduce((a:number,b:unknown)=>a+(b as number),0))}</td>
                  <td style={{padding:'12px',fontWeight:700,color:'#8B5CF6'}}>{fmt(totPen)}</td>
                  <td style={{padding:'12px',fontWeight:700,color:'#F59E0B'}}>{fmt(totTAP)}</td>
                  <td style={{padding:'12px',fontWeight:700,color:'#10B981'}}>{fmt(totNet)}</td>
                  <td style={{padding:'12px',fontWeight:700}}>{fmt(totCost)}</td>
                </tr></tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ PAYSLIPS ══ */}
      {tab==='payslips' && (
        <div>
          <div style={{display:'flex',gap:10,marginBottom:16}}>
            {[
              {l:'Muaji',val:month,set:setMonth,opts:MONTHS.map((m,i)=>({v:i+1,l:m}))},
              {l:'Viti',val:year,set:setYear,opts:[2024,2025,2026,2027].map(y=>({v:y,l:String(y)}))},
            ].map(s=>(
              <div key={s.l}><label style={lbl}>{s.l}</label>
                <select style={{...inp,width:'auto'}} value={s.val} onChange={e=>s.set(Number(e.target.value))}>
                  {s.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select></div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
            {employees.map(e=>{
              const bonus=bonuses[e.id]||0, ded=deductions[e.id]||0
              const c=calc(e.gross_salary,bonus,ded)
              return(
                <div key={e.id} style={{...card,overflow:'hidden'}}>
                  <div style={{padding:'18px 20px',background:'linear-gradient(135deg,#5B21B6 0%,#7C3AED 60%,#A78BFA 100%)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div>
                        <p style={{fontWeight:700,fontSize:14,color:'#fff',margin:0}}>{e.full_name}</p>
                        <p style={{fontSize:11,color:'rgba(255,255,255,.7)',margin:'2px 0 0'}}>{e.position||'Punonjës'}{e.department?` · ${e.department}`:''}</p>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,background:'rgba(255,255,255,.15)',color:'#fff',padding:'3px 9px',borderRadius:99}}>
                        {MONTHS[month-1]} {year}
                      </span>
                    </div>
                    <p style={{fontSize:28,fontWeight:900,color:'#fff',margin:'14px 0 0',letterSpacing:'-.03em'}}>{fmt(c.net)}</p>
                    <p style={{fontSize:11,color:'rgba(255,255,255,.65)',margin:'2px 0 0'}}>Paga Neto</p>
                  </div>
                  <div style={{padding:'14px 20px',display:'flex',flexDirection:'column',gap:8}}>
                    {[
                      ['Paga Bruto',fmt(e.gross_salary),'var(--text-2)'],
                      ...(bonus>0?[['Bonus',`+${fmt(bonus)}`,'#10B981']]:[] as any),
                      ['Pension Punonjësi 5%',`-${fmt(c.pE)}`,'#F59E0B'],
                      ['Pension Punëdhënësi 5%',fmt(c.pR),'#9CA3AF'],
                      ['TAP',`-${fmt(c.tx)}`,'#EF4444'],
                      ...(ded>0?[['Zbritje',`-${fmt(ded)}`,'#EF4444']]:[] as any),
                    ].map(([l,v,col]:any)=>(
                      <div key={l} style={{display:'flex',justifyContent:'space-between'}}>
                        <span style={{fontSize:12,color:'var(--text-3)'}}>{l}</span>
                        <span style={{fontSize:12,fontWeight:600,color:col}}>{v}</span>
                      </div>
                    ))}
                    <div style={{borderTop:'1.5px solid var(--border)',paddingTop:10,display:'flex',justifyContent:'space-between'}}>
                      <span style={{fontSize:13,fontWeight:700,color:'var(--text-1)'}}>Paga Neto</span>
                      <span style={{fontSize:16,fontWeight:800,color:'#10B981'}}>{fmt(c.net)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            {!employees.length && <p style={{color:'var(--text-3)',fontSize:13,textAlign:'center',gridColumn:'1/-1',padding:40}}>Shto punëtorë fillimisht</p>}
          </div>
        </div>
      )}

      {/* ══ REQUESTS ══ */}
      {tab==='requests' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <button onClick={fetchRequests} disabled={loadingReqs}
              style={{display:'flex',alignItems:'center',gap:7,padding:'9px 16px',borderRadius:10,border:'none',background:'#7C3AED',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',opacity:loadingReqs?.7:1}}>
              <RefreshCw size={13}/> Rifresko
            </button>
          </div>

          {/* Leave requests */}
          <div style={{...card,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)'}}>
              <p style={{fontWeight:700,fontSize:14,color:'var(--text-1)',margin:0}}>
                🏖️ Kërkesa Pushimi
                {leaveReqs.filter(r=>r.status==='pending').length>0 && (
                  <span style={{marginLeft:8,background:'#F59E0B',color:'#fff',borderRadius:99,fontSize:10,fontWeight:800,padding:'2px 7px'}}>
                    {leaveReqs.filter(r=>r.status==='pending').length} në pritje
                  </span>
                )}
              </p>
            </div>
            {leaveReqs.length===0 ? (
              <p style={{textAlign:'center',padding:'28px',color:'var(--text-3)',fontSize:13}}>Nuk ka kërkesa</p>
            ) : leaveReqs.map((r,i)=>{
              const emp=employees.find(e=>e.id===r.employee_id)
              return(
                <div key={r.id} style={{padding:'13px 18px',borderTop:i>0?'1px solid var(--border)':'none',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <p style={{fontWeight:700,fontSize:13,color:'var(--text-1)',margin:0}}>{emp?.full_name||'—'}</p>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:99,fontWeight:600,
                        background:r.status==='pending'?'rgba(245,158,11,.12)':r.status==='approved'?'rgba(16,185,129,.12)':'rgba(239,68,68,.12)',
                        color:r.status==='pending'?'#F59E0B':r.status==='approved'?'#10B981':'#EF4444'}}>
                        {r.status==='pending'?'Në pritje':r.status==='approved'?'Aprovuar':'Refuzuar'}
                      </span>
                    </div>
                    <p style={{fontSize:12,color:'var(--text-3)',margin:0}}>{r.type} · {r.start_date} → {r.end_date} · <strong style={{color:'var(--text-2)'}}>{r.days} ditë</strong></p>
                    {r.reason && <p style={{fontSize:11,color:'var(--text-3)',margin:'4px 0 0',fontStyle:'italic'}}>{r.reason}</p>}
                  </div>
                  {r.status==='pending' && (
                    <div style={{display:'flex',gap:7,flexShrink:0}}>
                      <button onClick={()=>reviewLeave(r.id,'approved')}
                        style={{display:'flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:9,border:'none',background:'rgba(16,185,129,.12)',color:'#10B981',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                        <Check size={13}/> Aprovo
                      </button>
                      <button onClick={()=>reviewLeave(r.id,'rejected')}
                        style={{display:'flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:9,border:'none',background:'rgba(239,68,68,.08)',color:'#EF4444',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                        <X size={13}/> Refuzo
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Overtime requests */}
          <div style={{...card,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)'}}>
              <p style={{fontWeight:700,fontSize:14,color:'var(--text-1)',margin:0}}>
                ⚡ Orë Shtesë
                {otReqs.filter(r=>r.status==='pending').length>0 && (
                  <span style={{marginLeft:8,background:'#F59E0B',color:'#fff',borderRadius:99,fontSize:10,fontWeight:800,padding:'2px 7px'}}>
                    {otReqs.filter(r=>r.status==='pending').length} në pritje
                  </span>
                )}
              </p>
            </div>
            {otReqs.length===0 ? (
              <p style={{textAlign:'center',padding:'28px',color:'var(--text-3)',fontSize:13}}>Nuk ka kërkesa</p>
            ) : otReqs.map((r,i)=>{
              const emp=employees.find(e=>e.id===r.employee_id)
              return(
                <div key={r.id} style={{padding:'13px 18px',borderTop:i>0?'1px solid var(--border)':'none',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <p style={{fontWeight:700,fontSize:13,color:'var(--text-1)',margin:0}}>{emp?.full_name||'—'}</p>
                      <span style={{fontSize:14,fontWeight:800,color:'#7C3AED'}}>{r.hours}h</span>
                    </div>
                    <p style={{fontSize:12,color:'var(--text-3)',margin:0}}>{new Date(r.date).toLocaleDateString('sq-AL',{day:'numeric',month:'long'})}</p>
                    {r.reason && <p style={{fontSize:11,color:'var(--text-3)',margin:'4px 0 0',fontStyle:'italic'}}>{r.reason}</p>}
                  </div>
                  {r.status==='pending' ? (
                    <div style={{display:'flex',gap:7,flexShrink:0}}>
                      <button onClick={()=>reviewOvertime(r.id,'approved')} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:9,border:'none',background:'rgba(16,185,129,.12)',color:'#10B981',fontSize:12,fontWeight:700,cursor:'pointer'}}><Check size={13}/> Aprovo</button>
                      <button onClick={()=>reviewOvertime(r.id,'rejected')} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:9,border:'none',background:'rgba(239,68,68,.08)',color:'#EF4444',fontSize:12,fontWeight:700,cursor:'pointer'}}><X size={13}/> Refuzo</button>
                    </div>
                  ) : <span style={{fontSize:12,fontWeight:700,color:r.status==='approved'?'#10B981':'#EF4444'}}>{r.status==='approved'?'✓ Aprovuar':'✕ Refuzuar'}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ REPORTS ══ */}
      {tab==='reports' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {[
              {l:'Punëtorë Aktiv',v:String(employees.length),sub:'persona',c:'#7C3AED'},
              {l:'Fond Pagash/Muaj',v:fmt(employees.reduce((s,e)=>s+e.gross_salary,0)),sub:'bruto',c:'#3B82F6'},
              {l:'Kosto Emp./Muaj',v:fmt(employees.reduce((s,e)=>s+e.gross_salary*1.05,0)),sub:'me pensionin',c:'#EF4444'},
              {l:'Pension Total/Muaj',v:fmt(employees.reduce((s,e)=>s+e.gross_salary*.10,0)),sub:'5%+5%',c:'#F59E0B'},
            ].map(s=>(
              <div key={s.l} style={{...card,padding:'18px 20px',borderLeft:`3px solid ${s.c}`}}>
                <p style={{fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.05em',margin:'0 0 8px'}}>{s.l}</p>
                <p style={{fontSize:22,fontWeight:800,color:s.c,margin:'0 0 2px'}}>{s.v}</p>
                <p style={{fontSize:11,color:'var(--text-3)',margin:0}}>{s.sub}</p>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div style={{...card,padding:'18px 20px'}}>
              <h3 style={{margin:'0 0 14px',fontSize:14,fontWeight:700,color:'var(--text-1)'}}>🏛️ Detyrimet Ligjore</h3>
              {[
                {title:'Pensioni',desc:'5% punonjësi + 5% punëdhënësi — Ligji Nr. 04/L-101',c:'#F59E0B'},
                {title:'TAP',desc:'0% ≤€80 · 4% €80-250 · 8% €250-450 · 10% >€450',c:'#3B82F6'},
                {title:'Afati',desc:'Deri më 15 të muajit pasues — edi.atk-ks.org',c:'#10B981'},
              ].map(s=>(
                <div key={s.title} style={{padding:'10px 12px',borderRadius:10,background:'var(--bg-muted)',borderLeft:`3px solid ${s.c}`,marginBottom:8}}>
                  <p style={{fontSize:12,fontWeight:700,color:'var(--text-1)',margin:'0 0 2px'}}>{s.title}</p>
                  <p style={{fontSize:11,color:'var(--text-3)',margin:0}}>{s.desc}</p>
                </div>
              ))}
            </div>
            <div style={{...card,padding:'18px 20px'}}>
              <h3 style={{margin:'0 0 14px',fontSize:14,fontWeight:700,color:'var(--text-1)'}}>👥 Ndarja sipas Punëtorëve</h3>
              {employees.length===0 ? <p style={{color:'var(--text-3)',fontSize:13}}>Nuk ka punëtorë</p> :
              employees.map(e=>{
                const c=calc(e.gross_salary)
                return(
                  <div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
                    <div>
                      <p style={{fontWeight:600,fontSize:13,color:'var(--text-1)',margin:0}}>{e.full_name}</p>
                      <p style={{fontSize:11,color:'var(--text-3)',margin:0}}>{e.position||'—'}</p>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <p style={{fontWeight:700,fontSize:13,color:'#10B981',margin:0}}>{fmt(c.net)}</p>
                      <p style={{fontSize:11,color:'var(--text-3)',margin:0}}>neto</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ PORTAL ══ */}
      {tab==='portal' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{...card,padding:'22px 24px'}}>
            <h3 style={{margin:'0 0 6px',fontSize:15,fontWeight:700,color:'var(--text-1)'}}>🔗 Portali i Punëtorëve</h3>
            <p style={{fontSize:13,color:'var(--text-3)',margin:'0 0 20px'}}>Çdo kompani ka URL unik. Punëtorët hyjnë me email + fjalëkalim.</p>
            <div style={{display:'flex',gap:10,alignItems:'stretch',marginBottom:20}}>
              <div style={{flex:1,padding:'12px 16px',background:'var(--bg-muted)',borderRadius:10,border:'1px solid var(--border)',fontFamily:'Geist Mono,monospace',fontSize:13,color:'var(--text-2)',wordBreak:'break-all'}}>
                {portalUrl}
              </div>
              <button onClick={()=>{navigator.clipboard.writeText(portalUrl);setCopied(true);setTimeout(()=>setCopied(false),2000)}}
                style={{padding:'0 16px',borderRadius:10,border:'1.5px solid var(--border)',background:'none',color:copied?'#10B981':'var(--text-2)',fontSize:13,fontWeight:600,cursor:'pointer',flexShrink:0,transition:'color .2s'}}>
                {copied?'✓ Kopjuar':'Kopjo'}
              </button>
            </div>
            <div style={{background:'rgba(245,158,11,.06)',border:'1px solid rgba(245,158,11,.2)',borderRadius:12,padding:'14px 16px'}}>
              <p style={{fontSize:13,fontWeight:600,color:'#F59E0B',margin:'0 0 8px'}}>⚠️ Si aktivizohet aksesi</p>
              <ol style={{margin:0,paddingLeft:18,fontSize:13,color:'var(--text-2)',lineHeight:1.9}}>
                <li>Shko te tab <strong>Punëtorët</strong></li>
                <li>Shto ose ndrysho punëtorin</li>
                <li>Vendos <strong>email</strong> dhe <strong>fjalëkalim</strong></li>
                <li>Aktivizo <strong>Portalin</strong></li>
                <li>Dërgoji URL-in dhe kredencialet punëtorit</li>
              </ol>
            </div>
          </div>

          <div style={{...card,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)'}}>
              <p style={{fontWeight:700,fontSize:14,color:'var(--text-1)',margin:0}}>Statusi i Aksesit</p>
            </div>
            {employees.length===0 ? (
              <p style={{textAlign:'center',padding:'28px',color:'var(--text-3)',fontSize:13}}>Shto punëtorë fillimisht</p>
            ) : employees.map((e,i)=>(
              <div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 18px',borderTop:i>0?'1px solid var(--border)':'none'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#7C3AED,#A78BFA)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:13}}>
                    {e.full_name.charAt(0)}
                  </div>
                  <div>
                    <p style={{fontWeight:600,fontSize:13,color:'var(--text-1)',margin:0}}>{e.full_name}</p>
                    <p style={{fontSize:11,color:'var(--text-3)',margin:0}}>{e.email||'Pa email'}</p>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {e.email && <span style={{fontSize:11,color:'var(--text-3)'}}>✉️ {e.email}</span>}
                  <span style={{fontSize:12,fontWeight:600,padding:'4px 11px',borderRadius:99,
                    background:e.portal_enabled?'rgba(16,185,129,.1)':'rgba(113,113,122,.1)',
                    color:e.portal_enabled?'#10B981':'#71717A'}}>
                    {e.portal_enabled?'✓ Aktiv':'Joaktiv'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
