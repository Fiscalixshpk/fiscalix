'use client'

import { Bell, Search, X, CheckCheck, Check, UserPlus } from 'lucide-react'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface Notification { id: string; title: string; message: string; type: string; is_read: boolean; created_at: string; company_id?: string }
interface Props {
  user: { full_name: string; email: string; role: string }
  notifCount?: number
}

export default function Header({ user, notifCount: initialCount = 0 }: Props) {
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(initialCount)
  const [search, setSearch] = useState('')
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function loadNotifications() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(15)
    if (data) { setNotifications(data); setUnread(data.filter(n => !n.is_read).length) }
  }

  async function markAllRead() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', authUser.id).eq('is_read', false)
    setNotifications(n => n.map(x => ({ ...x, is_read: true })))
    setUnread(0)
  }

  async function markRead(id: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', authUser.id)
    setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
    setUnread(n => Math.max(0, n - 1))
  }

  async function respondToInvite(notif: Notification, action: 'accept' | 'reject') {
    if (!notif.company_id) return
    setRespondingId(notif.id)
    try {
      // Find the pending invite for this company
      const res = await fetch(`/api/business/accountant-invites`)
      const data = await res.json()
      const invite = (data.invites || []).find((i: { status: string; company_id?: string }) => i.status === 'pending')
      if (!invite) { toast.error('Ftesa nuk u gjet ose është trajtuar tashmë'); return }

      const respondRes = await fetch(`/api/business/accountant-invites/${invite.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const respondData = await respondRes.json()
      if (!respondRes.ok) throw new Error(respondData.error)

      toast.success(action === 'accept' ? 'E pranove! Kontabilisti tani ka qasje.' : 'Ftesa u refuzua.')
      await markRead(notif.id)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally {
      setRespondingId(null)
    }
  }

  const name = user.full_name || user.email || 'User'
  const initial = name.charAt(0).toUpperCase()

  return (
    <header className="app-header" style={{
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      flexShrink: 0,
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-header)',
      backdropFilter: 'blur(20px)',
      position: 'relative',
      zIndex: 20,
      gap: 10,
    }}>

      {/* Logo — vetëm mobile, kur sidebar fshihet */}
      <div className="header-logo-mobile" style={{ display: 'none', flexShrink: 0 }}>
        <Image src="/logo.svg" alt="Fiscalix" width={120} height={32} style={{ height: 28, width: 'auto' }} priority />
      </div>

      {/* Search — hidden on mobile */}
      <div className="header-search" style={{ position: 'relative', width: 240, flexShrink: 0 }}>
        <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kërko..."
          style={{ width: '100%', background: 'var(--bg-input)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '7px 12px 7px 32px', fontSize: 13, color: 'var(--text-1)', outline: 'none' }}
          onFocus={e => { e.target.style.borderColor = 'var(--purple)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
        />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button onClick={() => { if (!showNotifs) loadNotifications(); setShowNotifs(s => !s) }}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: showNotifs ? 'var(--purple-bg)' : 'var(--bg-card)',
              border: `1.5px solid ${showNotifs ? 'var(--border-purple)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: showNotifs ? 'var(--purple-light)' : 'var(--text-2)',
              position: 'relative', flexShrink: 0,
            }}>
            <Bell size={15} />
            {unread > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, background: 'var(--purple)', borderRadius: 20, color:'#ffffff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div style={{
              position: 'fixed', right: 12, top: 58,
              width: 'min(330px, calc(100vw - 24px))',
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              borderRadius: 14,
              boxShadow: 'var(--shadow)',
              zIndex: 200,
              overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)', fontFamily: 'Poppins,sans-serif' }}>
                  Njoftimet {unread > 0 && <span style={{ background: 'var(--purple)', color:'var(--text-1)', borderRadius: 20, padding: '1px 6px', fontSize: 10, marginLeft: 5 }}>{unread}</span>}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {unread > 0 && (
                    <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--purple-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none' }}>
                      <CheckCheck size={12} /> Shëno të gjitha
                    </button>
                  )}
                  <button onClick={() => setShowNotifs(false)} style={{ color: 'var(--text-3)', cursor: 'pointer', background: 'none', border: 'none' }}><X size={14} /></button>
                </div>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-3)' }}>
                    <Bell size={26} style={{ margin: '0 auto 8px', opacity: 0.3, display: 'block' }} />
                    <p style={{ fontSize: 13 }}>Nuk ka njoftime</p>
                  </div>
                ) : notifications.map(n => (
                  <div key={n.id} onClick={() => n.type !== 'accountant_invite' && markRead(n.id)}
                    style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: n.type === 'accountant_invite' ? 'default' : 'pointer', background: n.is_read ? 'transparent' : 'var(--purple-bg)' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: n.is_read ? 'transparent' : 'var(--purple)', marginTop: 5, flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: 'var(--text-1)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>{n.message}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{formatDate(n.created_at)}</p>

                        {n.type === 'accountant_invite' && !n.is_read && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <button onClick={(e) => { e.stopPropagation(); respondToInvite(n, 'reject') }} disabled={respondingId === n.id}
                              style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-3)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              <X size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }}/> Refuzo
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); respondToInvite(n, 'accept') }} disabled={respondingId === n.id}
                              style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background:'var(--bg-muted)', color:'var(--text-1)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              <Check size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }}/> {respondingId === n.id ? 'Duke procesuar...' : 'Prano'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {/* User — compact on mobile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #5A1FD6, #9B5CF8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: 'white', flexShrink: 0,
          }}>
            {initial}
          </div>
          <div className="header-search" style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
              {name.split(' ')[0]}
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'capitalize' }}>
              {user.role?.replace('_', ' ')}
            </p>
          </div>
        </div>

      </div>
    </header>
  )
}
