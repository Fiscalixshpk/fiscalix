'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Loader2, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ChatPartner {
  companyId: string
  name: string
}
interface ChatMessage { id: string; message: string; created_at: string; sender_id: string; sender?: { full_name: string; role: string } }

interface Props {
  userId: string
  role: 'business_owner' | 'accountant' | 'admin' | 'staff'
  partners: ChatPartner[]
}

export default function FloatingChatWidget({ userId, role, partners }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [activePartner, setActivePartner] = useState<ChatPartner | null>(partners.length === 1 ? partners[0] : null)
  const [showPartnerList, setShowPartnerList] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [unreadTotal, setUnreadTotal] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  async function loadMessages(companyId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/accountant/messages?company_id=${companyId}`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {
      toast.error('Gabim gjatë ngarkimit të mesazheve')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && activePartner) {
      loadMessages(activePartner.companyId)
    }
  }, [isOpen, activePartner?.companyId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!activePartner) return
    const channel = supabase
      .channel(`chat-${activePartner.companyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'client_messages', filter: `company_id=eq.${activePartner.companyId}` },
        (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new as ChatMessage]
          })
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activePartner?.companyId])

  useEffect(() => {
    let cancelled = false
    async function checkUnread() {
      try {
        let total = 0
        for (const p of partners) {
          const res = await fetch(`/api/accountant/messages?company_id=${p.companyId}&unread_only=1`)
          const data = await res.json()
          total += (data.messages || []).filter((m: ChatMessage) => m.sender_id !== userId).length
        }
        if (!cancelled) setUnreadTotal(total)
      } catch {}
    }
    checkUnread()
    const interval = setInterval(checkUnread, 20000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [partners.map(p => p.companyId).join(','), isOpen])

  async function sendMessage() {
    if (!input.trim() || !activePartner) return
    setSending(true)
    try {
      const res = await fetch('/api/accountant/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: activePartner.companyId, message: input.trim() }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      setInput('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë dërgimit')
    } finally {
      setSending(false)
    }
  }

  function openChat() {
    setIsOpen(true)
    setUnreadTotal(0)
    if (partners.length > 1 && !activePartner) setShowPartnerList(true)
  }

  if (partners.length === 0) return null

  return (
    <div className="floating-chat-widget" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 200, fontFamily: 'inherit' }}>
      {!isOpen && (
        <button onClick={openChat}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg,#5A1FD6,#9B5CF8)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(123,44,245,0.4)', position: 'relative',
          }}>
          <MessageCircle size={24} color="white" />
          {unreadTotal > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', color: 'white', fontSize: 11, fontWeight: 800, borderRadius: 20, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-base)' }}>
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="floating-chat-box" style={{
          width: 'min(340px, 92vw)', height: 460, borderRadius: 16, overflow: 'hidden',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}>
          <div style={{ padding: '12px 14px', background: 'linear-gradient(135deg,#5A1FD6,#7B2CF5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <button onClick={() => partners.length > 1 ? setShowPartnerList(o => !o) : null}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: partners.length > 1 ? 'pointer' : 'default', color:'var(--text-1)', minWidth: 0 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {role === 'business_owner' ? 'Kontabilisti' : ''} {activePartner ? `— ${activePartner.name}` : 'Zgjedh klient'}
              </span>
              {partners.length > 1 && <ChevronDown size={14} />}
            </button>
            <button onClick={() => { setIsOpen(false); setShowPartnerList(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color:'var(--text-1)', flexShrink: 0 }}>
              <X size={18} />
            </button>
          </div>

          {showPartnerList && (
            <div style={{ position: 'absolute', top: 50, left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, margin: '0 8px', maxHeight: 220, overflowY: 'auto', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              {partners.map(p => (
                <button key={p.companyId} onClick={() => { setActivePartner(p); setShowPartnerList(false) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: activePartner?.companyId === p.companyId ? 'var(--purple-bg)' : 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-1)', fontSize: 13 }}>
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {activePartner ? (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loading ? (
                  <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 20 }}>Duke ngarkuar...</p>
                ) : messages.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 20 }}>Asnjë mesazh ende. Fillo bisedën.</p>
                ) : messages.map(msg => {
                  const isMine = msg.sender_id === userId
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '78%', padding: '8px 12px', borderRadius: 12, background: isMine ? 'linear-gradient(135deg,#5A1FD6,#7B2CF5)' : 'var(--bg-muted)', color: isMine ? 'white' : 'var(--text-1)' }}>
                        <p style={{ fontSize: 13, lineHeight: 1.4 }}>{msg.message}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Shkruaj..." style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-1)', fontSize: 13 }} />
                <button onClick={sendMessage} disabled={sending || !input.trim()}
                  style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--purple)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {sending ? <Loader2 size={15} color="white" className="animate-spin" /> : <Send size={15} color="white" />}
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>Zgjedh një klient nga lista lart për të biseduar.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
