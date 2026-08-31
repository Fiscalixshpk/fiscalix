'use client'

import { useState, useEffect } from 'react'
import { Check, X, Loader2, UserPlus, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Invite {
  id: string
  status: 'pending' | 'active' | 'rejected'
  added_at: string
  accountant: { full_name: string; email: string } | null
}

export default function AccountantInvitesClient() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const router = useRouter()

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/business/accountant-invites')
      const data = await res.json()
      setInvites(data.invites || [])
    } catch {
      toast.error('Gabim gjatë ngarkimit')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function respond(id: string, action: 'accept' | 'reject') {
    setRespondingId(id)
    try {
      const res = await fetch(`/api/business/accountant-invites/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(action === 'accept' ? 'E pranove! Kontabilisti tani ka qasje te llogaria jote.' : 'Ftesa u refuzua.')
      // Update state locally menjëherë
      setInvites(prev => prev.map(i => i.id === id ? { ...i, status: action === 'accept' ? 'active' : 'rejected' } : i))
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally {
      setRespondingId(null)
    }
  }

  const pending = invites.filter(i => i.status === 'pending')
  const resolved = invites.filter(i => i.status !== 'pending')

  return (
    <div className="page-enter">
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#5A1FD6,#9B5CF8)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <UserPlus size={22} color="white"/>
        </div>
        <div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:800, color:'var(--text-1)' }}>Ftesat e Kontabilistëve</h1>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>Prano ose refuzo bashkëpunimin</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color:'var(--text-3)', fontSize:13, textAlign:'center', padding:30 }}>Duke ngarkuar...</p>
      ) : invites.length === 0 ? (
        <div style={{ textAlign:'center', padding:50, color:'var(--text-3)', fontSize:13 }}>
          Nuk ke marrë ndonjë ftesë nga kontabilistë ende.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:600 }}>

          {pending.length > 0 && (
            <div>
              <p style={{ fontSize:11, fontWeight:700, color:'#F59E0B', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Në pritje</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {pending.map(inv => (
                  <div key={inv.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px', borderRadius:14, background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.25)' }}>
                    <div style={{ width:40, height:40, borderRadius:11, background:'rgba(245,158,11,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Clock size={18} style={{ color:'#F59E0B' }}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)' }}>{inv.accountant?.full_name || 'Kontabilist'}</p>
                      <p style={{ fontSize:12, color:'var(--text-3)' }}>{inv.accountant?.email} dëshiron të bashkëpunojë me ty</p>
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={() => respond(inv.id, 'reject')} disabled={respondingId === inv.id}
                        style={{ padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-3)', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                        <X size={13}/> Refuzo
                      </button>
                      <button onClick={() => respond(inv.id, 'accept')} disabled={respondingId === inv.id}
                        style={{ padding:'8px 14px', borderRadius:10, border:'none', background:'#10B981', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5, boxShadow:'0 2px 8px rgba(16,185,129,.35)' }}>
                        {respondingId === inv.id ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>} Prano
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Historiku</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {resolved.map(inv => (
                  <div key={inv.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                    {inv.status === 'active'
                      ? <CheckCircle2 size={16} style={{ color:'var(--text-1)', flexShrink:0 }}/>
                      : <XCircle size={16} style={{ color:'var(--text-3)', flexShrink:0 }}/>}
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{inv.accountant?.full_name || 'Kontabilist'}</p>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color: inv.status === 'active' ? '#10B981' : 'var(--text-3)' }}>
                      {inv.status === 'active' ? 'Bashkëpunim aktiv' : 'Refuzuar'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
