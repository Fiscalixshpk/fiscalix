'use client'
import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Play, Square, Clock, Calendar, TrendingUp, Filter } from 'lucide-react'

function safeDate(val: any): Date | null {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}
function fmtTime(val: any): string {
  const d = safeDate(val)
  if (!d) return '--:--'
  return d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(val: any): string {
  const d = safeDate(val)
  if (!d) return '—'
  return d.toLocaleDateString('sq-AL', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtDur(mins: number): string {
  if (!mins || isNaN(mins)) return '—'
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}
function elapsedStr(clockIn: any): string {
  const d = safeDate(clockIn)
  if (!d) return '00:00'
  const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000))
  const h = Math.floor(diff / 60), m = diff % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

export default function TimeTrackingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [activeEntry, setActiveEntry] = useState<any>(null)
  const [tick, setTick] = useState(0)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [filter, setFilter] = useState<'week'|'month'|'all'>('week')
  const timerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const s = sessionStorage.getItem('employee_session')
    if (!s) { router.push(`/employee/${slug}/login`); return }
    const p = JSON.parse(s); setSession(p)
    loadEntries(p.employee.id)
  }, [slug])

  useEffect(() => {
    if (activeEntry?.clock_in) {
      timerRef.current = setInterval(() => setTick(t => t + 1), 30000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activeEntry])

  async function loadEntries(empId: string) {
    try {
      const res = await fetch(`/api/employee/time?employee_id=${empId}&limit=60`)
      if (!res.ok) return
      const data = await res.json()
      const arr = Array.isArray(data) ? data : []
      setEntries(arr)
      const today = new Date().toISOString().split('T')[0]
      const active = arr.find((e: any) => e.date === today && !e.clock_out)
      setActiveEntry(active || null)
    } catch {}
  }

  async function handleClock() {
    if (!session || loading) return
    setLoading(true)
    try {
      if (activeEntry?.id) {
        const res = await fetch('/api/employee/time', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clock_out', entry_id: activeEntry.id, employee_id: session.employee.id, company_id: session.company.id })
        })
        if (res.ok) { setActiveEntry(null); if (timerRef.current) clearInterval(timerRef.current) }
      } else {
        const res = await fetch('/api/employee/time', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clock_in', employee_id: session.employee.id, company_id: session.company.id, notes: notes || null })
        })
        if (res.ok) { const data = await res.json(); setActiveEntry(data); setNotes('') }
      }
      await loadEntries(session.employee.id)
    } catch {}
    finally { setLoading(false) }
  }

  if (!session) return <div style={{minHeight:'100vh',background:'#F8F7FF',display:'flex',alignItems:'center',justifyContent:'center',color:'#9CA3AF'}}>Duke ngarkuar...</div>

  const now = new Date()
  const filtered = entries.filter(e => {
    const d = safeDate(e.date)
    if (!d) return false
    if (filter === 'week') return (now.getTime() - d.getTime()) <= 7 * 86400000
    if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    return true
  })
  const totalMins = filtered.filter(e => e.duration_minutes).reduce((s:number, e:any) => s + (e.duration_minutes||0), 0)
  const todayMins = entries.filter(e => e.date === now.toISOString().split('T')[0] && e.duration_minutes).reduce((s:number,e:any)=>s+(e.duration_minutes||0),0)
  const currentElapsed = activeEntry?.clock_in ? elapsedStr(activeEntry.clock_in) : '00:00'
  const nowStr = now.toLocaleDateString('sq-AL', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const clockInTime = fmtTime(activeEntry?.clock_in)

  return (
    <div style={{minHeight:'100vh',background:'#F8F7FF'}}>
      {/* Header */}
      <div style={{background:'#fff',borderBottom:'1px solid #EDE9FF',padding:'0 16px'}}>
        <div style={{maxWidth:720,margin:'0 auto',display:'flex',alignItems:'center',gap:12,height:52}}>
          <Link href={`/employee/${slug}/dashboard`} style={{color:'#9CA3AF',display:'flex'}}><ArrowLeft size={20}/></Link>
          <h1 style={{fontSize:16,fontWeight:700,color:'#111827',margin:0}}>Time Tracking</h1>
        </div>
      </div>

      <div style={{maxWidth:720,margin:'0 auto',padding:'16px',display:'flex',flexDirection:'column',gap:14}}>

        {/* Clock Card */}
        <div style={{
          background: activeEntry ? 'linear-gradient(135deg,#5B21B6 0%,#7C3AED 60%,#A78BFA 100%)' : '#fff',
          borderRadius:20,padding:'24px 20px',
          border: activeEntry ? 'none' : '1px solid #EDE9FF',
          boxShadow: activeEntry ? '0 12px 40px rgba(91,33,182,.35)' : '0 2px 8px rgba(0,0,0,.04)'
        }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:activeEntry?'#4ADE80':'#9CA3AF',boxShadow:activeEntry?'0 0 0 3px rgba(74,222,128,.3)':'none'}}/>
                <span style={{fontSize:12,fontWeight:700,color:activeEntry?'rgba(255,255,255,.8)':'#9CA3AF',textTransform:'uppercase',letterSpacing:'.06em'}}>
                  {activeEntry ? 'Aktiv' : 'Joaktiv'}
                </span>
              </div>
              <p style={{fontSize:12,color:activeEntry?'rgba(255,255,255,.6)':'#9CA3AF',margin:0}}>{nowStr}</p>
            </div>
            {activeEntry && (
              <div style={{textAlign:'right'}}>
                <p style={{fontSize:11,color:'rgba(255,255,255,.6)',margin:'0 0 2px'}}>Hyrja</p>
                <p style={{fontSize:15,fontWeight:700,color:'#fff',margin:0,fontVariantNumeric:'tabular-nums'}}>{clockInTime}</p>
              </div>
            )}
          </div>

          <div style={{textAlign:'center',marginBottom:24}}>
            <p style={{fontSize:52,fontWeight:900,color:activeEntry?'#fff':'#111827',margin:0,letterSpacing:'-3px',fontVariantNumeric:'tabular-nums',lineHeight:1}}>
              {currentElapsed}
            </p>
            <p style={{fontSize:13,color:activeEntry?'rgba(255,255,255,.6)':'#9CA3AF',margin:'8px 0 0'}}>
              {activeEntry ? 'Kohëzgjatja aktuale' : `Sot: ${fmtDur(todayMins)}`}
            </p>
          </div>

          {!activeEntry && (
            <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Shënim opsional..."
              style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #EDE9FF',background:'#F8F7FF',fontSize:13,boxSizing:'border-box',outline:'none',marginBottom:14,color:'#374151'}}/>
          )}

          <button onClick={handleClock} disabled={loading}
            style={{
              width:'100%',padding:'14px',borderRadius:14,border:'none',cursor:loading?'not-allowed':'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',gap:10,
              fontSize:15,fontWeight:800,transition:'all .15s',
              background: activeEntry ? 'rgba(255,255,255,.15)' : 'linear-gradient(135deg,#7C3AED,#A78BFA)',
              color:'#fff',
              boxShadow: activeEntry ? 'inset 0 0 0 1.5px rgba(255,255,255,.25)' : '0 4px 18px rgba(124,58,237,.45)',
              opacity: loading ? .7 : 1
            }}>
            {loading ? '...' : activeEntry
              ? <><Square size={16} fill="#fff"/> Regjistro Daljen</>
              : <><Play size={16} fill="#fff"/> Regjistro Hyrjen</>
            }
          </button>
        </div>

        {/* KPI strip */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
          {[
            {l:'Sot',v:fmtDur(todayMins+(activeEntry?Math.floor((Date.now()-new Date(activeEntry.clock_in).getTime())/60000):0)),c:'#7C3AED'},
            {l:'Kjo javë',v:fmtDur(entries.filter(e=>(Date.now()-new Date(e.date).getTime())<=7*86400000&&e.duration_minutes).reduce((s:number,e:any)=>s+(e.duration_minutes||0),0)),c:'#3B82F6'},
            {l:'Ky muaj',v:fmtDur(entries.filter(e=>{const d=new Date(e.date);return d.getMonth()===now.getMonth()&&e.duration_minutes}).reduce((s:number,e:any)=>s+(e.duration_minutes||0),0)),c:'#10B981'},
          ].map(s=>(
            <div key={s.l} style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #EDE9FF',textAlign:'center'}}>
              <p style={{fontSize:10,fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'.05em',margin:'0 0 5px'}}>{s.l}</p>
              <p style={{fontSize:17,fontWeight:800,color:s.c,margin:0}}>{s.v}</p>
            </div>
          ))}
        </div>

        {/* Filter + History */}
        <div style={{background:'#fff',borderRadius:16,border:'1px solid #EDE9FF',overflow:'hidden'}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid #EDE9FF',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <p style={{fontWeight:700,fontSize:14,color:'#111827',margin:0}}>Historia</p>
            <div style={{display:'flex',gap:4,background:'#F3F0FF',borderRadius:8,padding:3}}>
              {(['week','month','all'] as const).map(f=>(
                <button key={f} onClick={()=>setFilter(f)}
                  style={{padding:'5px 10px',borderRadius:6,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,
                    background:filter===f?'#fff':'transparent',color:filter===f?'#7C3AED':'#9CA3AF',
                    boxShadow:filter===f?'0 1px 3px rgba(0,0,0,.1)':'none',transition:'all .15s'}}>
                  {f==='week'?'Java':f==='month'?'Muaji':'Të gjitha'}
                </button>
              ))}
            </div>
          </div>
          {filtered.length===0 ? (
            <div style={{textAlign:'center',padding:'40px',color:'#9CA3AF'}}>
              <Clock size={28} style={{opacity:.3,marginBottom:8}}/>
              <p style={{fontSize:13}}>Nuk ka rekorde</p>
            </div>
          ) : filtered.map((e,i)=>{
            const clockIn = safeDate(e.clock_in)
            const clockOut = safeDate(e.clock_out)
            const isToday = e.date === now.toISOString().split('T')[0]
            return(
              <div key={e.id} style={{padding:'13px 16px',borderTop:i>0?'1px solid #F3F0FF':'none',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <p style={{fontWeight:700,fontSize:13,color:'#374151',margin:0}}>
                      {isToday ? 'Sot' : fmtDate(e.date)}
                    </p>
                    {!e.clock_out && <span style={{fontSize:10,fontWeight:700,color:'#10B981',background:'rgba(16,185,129,.1)',padding:'2px 7px',borderRadius:99}}>Aktiv</span>}
                  </div>
                  <p style={{fontSize:11,color:'#9CA3AF',margin:'3px 0 0'}}>
                    {fmtTime(e.clock_in)} {e.clock_out ? `→ ${fmtTime(e.clock_out)}` : '→ aktiv'}
                    {e.notes && ` · ${e.notes}`}
                  </p>
                </div>
                <p style={{fontWeight:800,fontSize:14,color:e.duration_minutes?'#7C3AED':'#10B981',margin:0}}>
                  {e.duration_minutes ? fmtDur(e.duration_minutes) : elapsedStr(e.clock_in)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
