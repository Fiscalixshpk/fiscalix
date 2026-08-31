'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Upload, Clock, CheckCircle2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface ChatMessage { id: string; message: string; created_at: string; sender_id: string; sender?: { full_name: string; role: string } }
interface DocRequest { id: string; title: string; description?: string; status: string; due_date?: string; created_at: string }

interface Props {
  userId: string
  companyId: string
  accountantName: string
}

export default function AccountantChatClient({ userId, companyId, accountantName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [requests, setRequests] = useState<DocRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingFileRequestId = useRef<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  async function loadAll() {
    setLoading(true)
    try {
      const [msgRes, reqRes] = await Promise.all([
        fetch(`/api/accountant/messages?company_id=${companyId}`),
        fetch(`/api/accountant/document-requests?company_id=${companyId}`),
      ])
      const msgData = await msgRes.json()
      const reqData = await reqRes.json()
      setMessages(msgData.messages || [])
      setRequests((reqData.requests || []).filter((r: DocRequest) => r.status === 'pending'))
    } catch {
      toast.error('Gabim gjatë ngarkimit')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [companyId])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendChat() {
    if (!chatInput.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/accountant/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, message: chatInput }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      setChatInput('')
      await loadAll()
    } catch (err) {
      toast.error(`Gabim: ${err instanceof Error ? err.message : 'E panjohur'}`)
    } finally {
      setSending(false)
    }
  }

  function triggerUploadFor(requestId: string) {
    pendingFileRequestId.current = requestId
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const requestId = pendingFileRequestId.current
    if (!file) return
    setUploadingFor(requestId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('company_id', companyId)
      formData.append('category', 'other')
      if (requestId) formData.append('request_id', requestId)
      const res = await fetch('/api/accountant/documents', { method: 'POST', body: formData })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success('Dokumenti u ngarkua dhe kontabilisti u njoftua')
      await loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ngarkimit')
    } finally {
      setUploadingFor(null)
      pendingFileRequestId.current = null
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="page-enter">
      <input ref={fileInputRef} type="file" onChange={handleFileSelected} style={{ display:'none' }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#F59E0B,#D97706)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <MessageSquare size={22} color="white"/>
        </div>
        <div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:800, color:'var(--text-1)' }}>{accountantName}</h1>
          <p style={{ fontSize:13, color:'var(--text-1)' }}>Kontabilisti yt</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color:'var(--text-3)', fontSize:13, textAlign:'center', padding:30 }}>Duke ngarkuar...</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:680 }}>

          {/* Pending document requests as banners inside the same flow */}
          {requests.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {requests.map(req => (
                <div key={req.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)' }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:'rgba(245,158,11,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Clock size={15} style={{ color:'#F59E0B' }}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>Kontabilisti kërkon: {req.title}</p>
                    {req.description && <p style={{ fontSize:12, color:'var(--text-3)' }}>{req.description}</p>}
                  </div>
                  <button onClick={() => triggerUploadFor(req.id)} disabled={uploadingFor === req.id}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, background:'#F59E0B', border:'none', color:'white', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                    {uploadingFor === req.id ? <Loader2 size={13} className="animate-spin"/> : <Upload size={13}/>}
                    Ngarko
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Chat */}
          <div style={{ display:'flex', flexDirection:'column', height:440, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:10, paddingBottom:12 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign:'center', padding:40, color:'var(--text-3)', fontSize:13 }}>Asnjë mesazh ende. Fillo bisedën me kontabilistin tënd.</div>
              ) : messages.map(msg => {
                const isMine = msg.sender_id === userId
                return (
                  <div key={msg.id} style={{ display:'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth:'75%' }}>
                      <div style={{
                        padding:'9px 13px', borderRadius:14,
                        background: isMine ? 'linear-gradient(135deg,#5A1FD6,#7B2CF5)' : 'var(--bg-muted)',
                        border: isMine ? 'none' : '1px solid var(--border)',
                        color: isMine ? 'white' : 'var(--text-1)',
                      }}>
                        {!isMine && <p style={{ fontSize:11, fontWeight:700, marginBottom:3, opacity:0.7 }}>{msg.sender?.full_name || accountantName}</p>}
                        <p style={{ fontSize:13.5, lineHeight:1.5 }}>{msg.message}</p>
                      </div>
                      <p style={{ fontSize:10.5, color:'var(--text-1)', marginTop:3, textAlign: isMine ? 'right' : 'left' }}>
                        {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef}/>
            </div>
            <div style={{ display:'flex', gap:8, paddingTop:10, borderTop:'1px solid var(--border)' }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=> e.key==='Enter' && sendChat()}
                placeholder="Shkruaj një mesazh..." className="finex-input" style={{ flex:1 }}/>
              <button onClick={sendChat} disabled={sending || !chatInput.trim()} className="finex-button-primary" style={{ padding:'10px 16px' }}>
                {sending ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
