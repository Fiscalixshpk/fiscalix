'use client'
import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Clock, Calendar, FileText, Zap, TrendingUp, Bell, ChevronRight, Play, Square, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

function safeDate(v:any):Date|null { const d=new Date(v); return isNaN(d.getTime())?null:d }
function fmtTime(v:any):string { const d=safeDate(v); return d?d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'}):'--:--' }
function fmtDur(m:number):string { if(!m||isNaN(m)) return '0h 0m'; return `${Math.floor(m/60)}h ${m%60}m` }
function tap(g:number):number {
  if(g<=80) return 0; if(g<=250) return (g-80)*.04
  if(g<=450) return 170*.04+(g-250)*.08; return 170*.04+200*.08+(g-450)*.10
}

export default function EmployeeDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [session, setSession]       = useState<any>(null)
  const [activeEntry, setActiveEntry] = useState<any>(null)
  const [todayEntries, setTodayEntries] = useState<any[]>([])
  const [leaveReqs, setLeaveReqs]   = useState<any[]>([])
  const [otReqs, setOtReqs]         = useState<any[]>([])
  const [clockLoading, setClockLoading] = useState(false)
  const [elapsed, setElapsed]       = useState(0)
  const timerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const s = sessionStorage.getItem('employee_session')
    if (!s) { router.push(`/employee/${slug}/login`); return }
    const p = JSON.parse(s); setSession(p)
    loadAll(p.employee.id, p.company.id)
  }, [slug])

  useEffect(() => {
    if (!activeEntry?.clock_in) { setElapsed(0); return }
    const ci = safeDate(activeEntry.clock_in)
    if (!ci) return
    const update = () => setElapsed(Math.max(0,Math.floor((Date.now()-ci.getTime())/60000)))
    update()
    timerRef.current = setInterval(update, 30000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activeEntry])

  async function loadAll(empId:string, compId:string) {
    const today = new Date().toISOString().split('T')[0]
    try {
      const [tR,lR,oR] = await Promise.all([
        fetch(`/api/employee/time?employee_id=${empId}&limit=30`),
        fetch(`/api/employee/leaves?employee_id=${empId}`),
        fetch(`/api/employee/overtime?employee_id=${empId}`)
      ])
      const times  = tR.ok  ? await tR.json() : []
      const leaves = lR.ok  ? await lR.json() : []
      const ot     = oR.ok  ? await oR.json() : []
      const todayE = Array.isArray(times) ? times.filter((e:any)=>e.date===today) : []
      setTodayEntries(todayE)
      setActiveEntry(todayE.find((e:any)=>!e.clock_out)||null)
      setLeaveReqs(Array.isArray(leaves)?leaves.slice(0,3):[])
      setOtReqs(Array.isArray(ot)?ot.slice(0,3):[])
    } catch {}
  }

  async function handleClock() {
    if (!session || clockLoading) return
    setClockLoading(true)
    try {
      if (activeEntry?.id) {
        const r = await fetch('/api/employee/time',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'clock_out',entry_id:activeEntry.id,employee_id:session.employee.id,company_id:session.company.id})})
        if (r.ok) { setActiveEntry(null); if(timerRef.current)clearInterval(timerRef.current) }
      } else {
        const r = await fetch('/api/employee/time',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'clock_in',employee_id:session.employee.id,company_id:session.company.id})})
        if (r.ok) { const d=await r.json(); if(d&&d.id)setActiveEntry(d) }
      }
      await loadAll(session.employee.id,session.company.id)
    } catch {}
    finally { setClockLoading(false) }
  }

  if (!session) return (
    <div style={{minHeight:'100vh',background:'#F8F7FF',display:'flex',alignItems:'center',justifyContent:'center',color:'#9CA3AF',fontSize:14}}>Duke ngarkuar...</div>
  )

  const emp   = session.employee
  const gross = Number(emp.gross_salary)||0
  const penEmp= +(gross*.05).toFixed(2)
  const txAmt = +tap(gross).toFixed(2)
  const net   = +(gross-penEmp-txAmt).toFixed(2)
  const now   = new Date()

  const todayWorked  = todayEntries.filter((e:any)=>e.duration_minutes).reduce((s:number,e:any)=>s+(e.duration_minutes||0),0)
  const activeH = Math.floor(elapsed/60), activeM = elapsed%60
  const elapsedStr = `${String(activeH).padStart(2,'0')}:${String(activeM).padStart(2,'0')}`
  const clockInTime = fmtTime(activeEntry?.clock_in)

  const navItems = [
    {href:`/employee/${slug}/timetracking`,icon:'⏱️',label:'Time Tracking',sub:'Regjistro orët',c:'#7C3AED'},
    {href:`/employee/${slug}/payslips`,    icon:'🧾',label:'Pagat',        sub:'Shiko payslips',c:'#10B981'},
    {href:`/employee/${slug}/leaves`,      icon:'🏖️',label:'Pushimet',     sub:'Kërko pushim',c:'#3B82F6'},
    {href:`/employee/${slug}/overtime`,    icon:'⚡',label:'Orë Shtesë',   sub:'Deklaro shtesë',c:'#F59E0B'},
  ]

  const sColor=(s:string)=>s==='approved'?'#10B981':s==='rejected'?'#EF4444':'#F59E0B'
  const sLabel=(s:string)=>s==='approved'?'Aprovuar':s==='rejected'?'Refuzuar':'Në pritje'
  const sIcon=(s:string)=>s==='approved'?<CheckCircle size={12}/>:s==='rejected'?<XCircle size={12}/>:<AlertCircle size={12}/>

  return (
    <div style={{minHeight:'100vh',background:'#F8F7FF'}}>
      {/* Header */}
      <div style={{background:'#fff',borderBottom:'1px solid #EDE9FF',padding:'0 16px',position:'sticky',top:0,zIndex:10}}>
        <div style={{maxWidth:720,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',height:56}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:11,background:'linear-gradient(135deg,#7C3AED,#A78BFA)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:15}}>
              {emp.full_name.charAt(0)}
            </div>
            <div>
              <p style={{fontSize:14,fontWeight:700,color:'#111827',margin:0}}>{emp.full_name}</p>
              <p style={{fontSize:11,color:'#9CA3AF',margin:0}}>{emp.position||'Punonjës'} · {session.company.name}</p>
            </div>
          </div>
          <button onClick={()=>{sessionStorage.removeItem('employee_session');router.push(`/employee/${slug}/login`)}}
            style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:9,border:'1.5px solid #EDE9FF',background:'none',color:'#9CA3AF',fontSize:12,cursor:'pointer'}}>
            <LogOut size={13}/> Dil
          </button>
        </div>
      </div>

      <div style={{maxWidth:720,margin:'0 auto',padding:'16px',display:'flex',flexDirection:'column',gap:14}}>

        {/* Clock Card */}
        <div style={{
          background:activeEntry?'linear-gradient(135deg,#5B21B6 0%,#7C3AED 60%,#A78BFA 100%)':'#fff',
          borderRadius:20,padding:'22px 20px',
          border:activeEntry?'none':'1px solid #EDE9FF',
          boxShadow:activeEntry?'0 12px 40px rgba(91,33,182,.35)':'0 2px 8px rgba(0,0,0,.04)'
        }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:activeEntry?'#4ADE80':'#D1D5DB',boxShadow:activeEntry?'0 0 0 3px rgba(74,222,128,.3)':'none'}}/>
                <span style={{fontSize:11,fontWeight:700,color:activeEntry?'rgba(255,255,255,.75)':'#9CA3AF',textTransform:'uppercase',letterSpacing:'.06em'}}>
                  {activeEntry?'Aktiv':'Joaktiv'}
                </span>
              </div>
              <p style={{fontSize:12,color:activeEntry?'rgba(255,255,255,.6)':'#9CA3AF',margin:0}}>
                {now.toLocaleDateString('sq-AL',{weekday:'long',day:'numeric',month:'long'})}
              </p>
            </div>
            {activeEntry && (
              <div style={{textAlign:'right'}}>
                <p style={{fontSize:10,color:'rgba(255,255,255,.6)',margin:'0 0 1px'}}>Clock In</p>
                <p style={{fontSize:15,fontWeight:700,color:'#fff',margin:0,fontVariantNumeric:'tabular-nums'}}>{clockInTime}</p>
              </div>
            )}
          </div>

          <div style={{textAlign:'center',marginBottom:20}}>
            <p style={{fontSize:48,fontWeight:900,color:activeEntry?'#fff':'#111827',margin:0,letterSpacing:'-3px',fontVariantNumeric:'tabular-nums',lineHeight:1}}>
              {activeEntry?elapsedStr:fmtDur(todayWorked)}
            </p>
            <p style={{fontSize:13,color:activeEntry?'rgba(255,255,255,.6)':'#9CA3AF',margin:'8px 0 0'}}>
              {activeEntry?'Kohëzgjatja aktuale':`Sot punuar`}
            </p>
          </div>

          <button onClick={handleClock} disabled={clockLoading}
            style={{width:'100%',padding:'14px',borderRadius:14,border:'none',cursor:clockLoading?'not-allowed':'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontSize:15,fontWeight:800,transition:'all .15s',
              background:activeEntry?'rgba(255,255,255,.15)':'linear-gradient(135deg,#7C3AED,#A78BFA)',
              color:'#fff',boxShadow:activeEntry?'inset 0 0 0 1.5px rgba(255,255,255,.25)':'0 4px 18px rgba(124,58,237,.45)',
              opacity:clockLoading?.7:1}}>
            {clockLoading?'...':(activeEntry?<><Square size={16} fill="#fff"/> Regjistro Daljen</>:<><Play size={16} fill="#fff"/> Regjistro Hyrjen</>)}
          </button>
        </div>

        {/* Paga card */}
        <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #EDE9FF',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
            <div>
              <p style={{fontSize:10,fontWeight:700,color:'#9CA3AF',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'.05em'}}>
                Paga {MONTHS[now.getMonth()]} {now.getFullYear()}
              </p>
              <p style={{fontSize:28,fontWeight:800,color:'#10B981',margin:0,letterSpacing:'-.03em'}}>€{net.toFixed(2)}</p>
              <p style={{fontSize:11,color:'#9CA3AF',margin:'2px 0 0'}}>Paga neto</p>
            </div>
            <Link href={`/employee/${slug}/payslips`} style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'#7C3AED',fontWeight:600,textDecoration:'none',padding:'6px 10px',borderRadius:8,border:'1.5px solid rgba(124,58,237,.2)',background:'rgba(124,58,237,.04)'}}>
              Payslips <ChevronRight size={13}/>
            </Link>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {[
              {l:'Bruto',v:`€${gross.toFixed(2)}`,c:'#374151'},
              {l:'Pension 5%',v:`-€${penEmp.toFixed(2)}`,c:'#F59E0B'},
              {l:'TAP',v:`-€${txAmt.toFixed(2)}`,c:'#EF4444'},
            ].map(s=>(
              <div key={s.l} style={{background:'#F8F7FF',borderRadius:10,padding:'10px 12px',textAlign:'center'}}>
                <p style={{fontSize:9,color:'#9CA3AF',margin:'0 0 3px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em'}}>{s.l}</p>
                <p style={{fontSize:14,fontWeight:700,color:s.c,margin:0}}>{s.v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Nav grid */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {navItems.map(n=>(
            <Link key={n.href} href={n.href}
              style={{background:'#fff',borderRadius:14,padding:'16px',border:'1px solid #EDE9FF',textDecoration:'none',display:'flex',alignItems:'center',gap:12,boxShadow:'0 2px 6px rgba(0,0,0,.03)',transition:'all .15s'}}>
              <div style={{width:40,height:40,borderRadius:12,background:n.c+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
                {n.icon}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:700,color:'#374151',margin:0}}>{n.label}</p>
                <p style={{fontSize:11,color:'#9CA3AF',margin:'2px 0 0'}}>{n.sub}</p>
              </div>
              <ChevronRight size={14} style={{color:'#D1D5DB',flexShrink:0}}/>
            </Link>
          ))}
        </div>

        {/* Recent leave requests */}
        {leaveReqs.length>0 && (
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #EDE9FF',overflow:'hidden'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 16px',borderBottom:'1px solid #F3F0FF'}}>
              <p style={{fontWeight:700,fontSize:13,color:'#111827',margin:0}}>Kërkesat e fundit</p>
              <Link href={`/employee/${slug}/leaves`} style={{fontSize:12,color:'#7C3AED',fontWeight:600,textDecoration:'none'}}>Shiko →</Link>
            </div>
            {leaveReqs.map((l,i)=>(
              <div key={l.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 16px',borderTop:i>0?'1px solid #F3F0FF':'none'}}>
                <div>
                  <p style={{fontSize:13,fontWeight:600,color:'#374151',margin:0}}>{l.type}</p>
                  <p style={{fontSize:11,color:'#9CA3AF',margin:'2px 0 0'}}>{l.start_date} → {l.end_date} · {l.days} ditë</p>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700,color:sColor(l.status),padding:'4px 10px',borderRadius:99,background:sColor(l.status)+'15'}}>
                  {sIcon(l.status)} {sLabel(l.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
