'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface User {
  id: string
  full_name?: string
  email: string
  role?: string
  is_active?: boolean
  created_at: string
  companies?: { name?: string } | null
}

export default function AdminUsersClient({ users: initialUsers, currentUserId }: { users: User[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(userId: string, userName: string) {
    const ok = window.confirm(`A je i sigurt që dëshiron të fshish "${userName}"?\n\nKjo veprim nuk mund të kthehet mbrapa.`)
    if (!ok) return

    setDeletingId(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })

      let errorMsg = `HTTP ${res.status}`
      try {
        const d = await res.json()
        if (d?.error) errorMsg = d.error
      } catch {}

      if (!res.ok) throw new Error(errorMsg)

      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success('Përdoruesi u fshi me sukses')
    } catch (err: unknown) {
      console.error('Delete error:', err)
      toast.error((err as Error).message || 'Gabim gjatë fshirjes')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggle(userId: string, isActive: boolean) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action: isActive ? 'deactivate' : 'activate' }),
      })
      if (!res.ok) throw new Error('Gabim')
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !isActive } : u))
      toast.success(isActive ? 'Llogaria u çaktivizua' : 'Llogaria u aktivizua')
    } catch {
      toast.error('Gabim gjatë ndryshimit')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>
          Klientët & Përdoruesit
        </h1>
        <p style={{ color:'var(--text-3)', fontSize:14 }}>{users.length} përdorues total</p>
      </div>

      <div style={{ background:'var(--bg-muted)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Emri','Email','Roli','Kompania','Regjistruar','Statusi',''].map((h,i) => (
                  <th key={i} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const comp = u.companies as { name?: string } | null
                const isActive = u.is_active !== false
                const isDeleting = deletingId === u.id
                const isSelf = u.id === currentUserId
                return (
                  <tr key={u.id} style={{ borderBottom:'1px solid var(--border)', background: i%2===0?'transparent':'var(--bg-muted)', opacity: isDeleting ? 0.4 : 1, transition:'opacity .2s' }}>
                    <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:'var(--text-1)', whiteSpace:'nowrap' }}>{u.full_name || '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-2)' }}>{u.email}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:700,
                        background: u.role==='admin'?'rgba(239,68,68,0.15)':u.role==='accountant'?'rgba(245,158,11,0.15)':'rgba(155,92,248,0.15)',
                        color: u.role==='admin'?'#EF4444':u.role==='accountant'?'#F59E0B':'#9B5CF8'
                      }}>{u.role?.replace('_',' ') || 'user'}</span>
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-2)' }}>{comp?.name || '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)', whiteSpace:'nowrap' }}>{formatDate(u.created_at)}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <button onClick={() => !isSelf && handleToggle(u.id, isActive)} disabled={isSelf}
                        style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:700,
                          cursor: isSelf?'default':'pointer', border:'none',
                          background: isActive?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)',
                          color: isActive?'#10B981':'#EF4444'
                        }}>
                        {isActive ? 'Aktiv' : 'Joaktiv'}
                      </button>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      {!isSelf && (
                        <button
                          onClick={() => handleDelete(u.id, u.full_name || u.email)}
                          disabled={isDeleting}
                          style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8,
                            border:'1px solid rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.07)',
                            color:'white', fontSize:12, fontWeight:600, cursor:'pointer',
                            opacity: isDeleting ? 0.5 : 1, transition:'all .15s', whiteSpace:'nowrap'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.4)' }}
                          onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,0.07)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.25)' }}
                        >
                          {isDeleting
                            ? <><Loader2 size={12} className="animate-spin"/>Duke fshirë...</>
                            : <><Trash2 size={12}/>Fshi</>
                          }
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
