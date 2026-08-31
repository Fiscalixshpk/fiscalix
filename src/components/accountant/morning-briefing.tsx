'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Clock, Calendar, ChevronRight, X, Loader2, Bell, Mail } from 'lucide-react'
import { toast } from 'sonner'

interface Task {
  id: string
  client: string
  clientId: string
  issue: string
  action: string
  href: string
}

interface Briefing {
  urgent: Task[]
  today: Task[]
  week: Task[]
}

export default function MorningBriefing() {
  const router = useRouter()
  const [data, setData] = useState<Briefing | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Mirëmëngjesi' : hour < 17 ? 'Mirëdita' : 'Mirëmbrëma'
  const total = data ? data.urgent.length + data.today.length + data.week.length : 0

  useEffect(() => {
    fetch('/api/accountant/morning-briefing')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function sendReminder(clientId: string, clientName: string) {
    setSendingId(clientId)
    try {
      const res = await fetch('/api/accountant/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: clientId }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Gabim')
      }
      toast.success(`Kujtues u dërgua te ${clientName}`)
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setSendingId(null)
    }
  }

  if (dismissed || (!loading && total === 0)) return null

  const S = {
    wrap: { background:'var(--bg-muted)', border:'1px solid var(--border)', borderRadius:16, padding:20, marginBottom:20, position:'relative' as const },
    sectionTitle: { fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' as const, marginBottom:10 },
    task: { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'var(--bg-muted)', border:'1px solid var(--border)', marginBottom:6, cursor:'pointer' as const, transition:'all .15s' },
    taskClient: { fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:2 },
    taskIssue: { fontSize:12, color:'var(--text-3)' },
    actionBtn: { marginLeft:'auto', flexShrink:0, display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, border:'none', cursor:'pointer' as const, fontSize:12, fontWeight:600, transition:'all .15s' },
  }

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'rgba(90,31,214,0.15)', border:'1px solid rgba(90,31,214,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Bell size={16} color="#9B5CF8" />
          </div>
          <div>
            <p style={{ fontSize:15, fontWeight:700, color:'var(--text-1)', marginBottom:1 }}>{greeting} — Sot ke {loading ? '...' : total} gjëra</p>
            <p style={{ fontSize:12, color:'var(--text-3)' }}>
              {new Date().toLocaleDateString('sq-AL', { weekday:'long', day:'numeric', month:'long' })}
            </p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)}
          style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-3)' }}>
          <X size={13} />
        </button>
      </div>

      {loading && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 0', gap:8, color:'var(--text-3)', fontSize:13 }}>
          <Loader2 size={14} className="animate-spin" /> Duke ngarkuar...
        </div>
      )}

      {!loading && data && (
        <>
          {/* URGENT */}
          {data.urgent.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <p style={{ ...S.sectionTitle, color:'var(--text-1)' }}>
                🔴 Urgjente tani ({data.urgent.length})
              </p>
              {data.urgent.map(task => (
                <div key={task.id} style={{ ...S.task, borderColor:'rgba(239,68,68,0.15)', background:'rgba(239,68,68,0.04)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(239,68,68,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(239,68,68,0.15)')}>
                  <AlertTriangle size={14} color="#EF4444" style={{ flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={S.taskClient}>{task.client}</p>
                    <p style={S.taskIssue}>{task.issue}</p>
                  </div>
                  {task.issue.includes('dokument') ? (
                    <button onClick={() => sendReminder(task.clientId, task.client)}
                      disabled={sendingId === task.clientId}
                      style={{ ...S.actionBtn, background:'rgba(239,68,68,0.12)', color:'var(--text-1)', border:'1px solid rgba(239,68,68,0.2)' }}>
                      {sendingId === task.clientId ? <Loader2 size={11} className="animate-spin"/> : <Mail size={11}/>}
                      {sendingId === task.clientId ? 'Duke dërguar...' : 'Dërgo kujtues'}
                    </button>
                  ) : (
                    <button onClick={() => router.push(task.href)}
                      style={{ ...S.actionBtn, background:'rgba(239,68,68,0.12)', color:'var(--text-1)', border:'1px solid rgba(239,68,68,0.2)' }}>
                      {task.action} <ChevronRight size={11}/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TODAY */}
          {data.today.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <p style={{ ...S.sectionTitle, color:'#F59E0B' }}>
                🟡 Sot ({data.today.length})
              </p>
              {data.today.map(task => (
                <div key={task.id} style={{ ...S.task, borderColor:'rgba(245,158,11,0.15)', background:'rgba(245,158,11,0.03)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(245,158,11,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(245,158,11,0.15)')}>
                  <Clock size={14} color="#F59E0B" style={{ flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={S.taskClient}>{task.client}</p>
                    <p style={S.taskIssue}>{task.issue}</p>
                  </div>
                  {task.issue.includes('dokument') ? (
                    <button onClick={() => sendReminder(task.clientId, task.client)}
                      disabled={sendingId === task.clientId}
                      style={{ ...S.actionBtn, background:'rgba(245,158,11,0.1)', color:'#F59E0B', border:'1px solid rgba(245,158,11,0.2)' }}>
                      {sendingId === task.clientId ? <Loader2 size={11} className="animate-spin"/> : <Mail size={11}/>}
                      {sendingId === task.clientId ? 'Duke dërguar...' : 'Dërgo kujtues'}
                    </button>
                  ) : (
                    <button onClick={() => router.push(task.href)}
                      style={{ ...S.actionBtn, background:'rgba(245,158,11,0.1)', color:'#F59E0B', border:'1px solid rgba(245,158,11,0.2)' }}>
                      {task.action} <ChevronRight size={11}/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* THIS WEEK */}
          {data.week.length > 0 && (
            <div>
              <p style={{ ...S.sectionTitle, color:'var(--text-1)' }}>
                🟢 Kete javë ({data.week.length})
              </p>
              {data.week.map(task => (
                <div key={task.id} style={{ ...S.task }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(59,130,246,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor='var(--border)')}>
                  <Calendar size={14} color="#3B82F6" style={{ flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={S.taskClient}>{task.client}</p>
                    <p style={S.taskIssue}>{task.issue}</p>
                  </div>
                  <button onClick={() => router.push(task.href)}
                    style={{ ...S.actionBtn, background:'rgba(59,130,246,0.1)', color:'var(--text-1)', border:'1px solid rgba(59,130,246,0.15)' }}>
                    {task.action} <ChevronRight size={11}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
