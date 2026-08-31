'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Upload, FileText, Download, X, Send, Loader2, Clock, CheckCircle2,
  Paperclip, MessageSquare, FolderOpen, Eye, ChevronDown, ChevronRight,
  Image, File, FileSpreadsheet, Plus
} from 'lucide-react'
import { toast } from 'sonner'

interface DocRequest { id: string; title: string; description?: string; status: string; due_date?: string; created_at: string }
interface SharedDoc { id: string; file_name: string; file_size: number; category: string; url: string | null; created_at: string; uploader?: { full_name: string; role: string } }
interface ChatMessage { id: string; message: string; created_at: string; sender_id: string; sender?: { full_name: string; role: string } }

const MONTHS_SQ = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']
const CATEGORY_LABELS: Record<string, string> = {
  invoice: 'Faturë', receipt: 'Faturë blerjeje', contract: 'Kontratë',
  bank_statement: 'Ekstrakt bankar', other: 'Tjetër'
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['jpg','jpeg','png','gif','webp'].includes(ext||'')) return Image
  if (['xlsx','xls','csv'].includes(ext||'')) return FileSpreadsheet
  return FileText
}

function groupByMonthYear(docs: SharedDoc[]) {
  const groups: Record<string, SharedDoc[]> = {}
  docs.forEach(doc => {
    const d = new Date(doc.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(doc)
  })
  return Object.entries(groups).sort((a,b) => b[0].localeCompare(a[0]))
}

export default function DocumentsTab({ accountantId, companyId }: { accountantId: string; companyId: string }) {
  const [subTab, setSubTab] = useState<'vault'|'requests'|'chat'>('vault')
  const [docs, setDocs] = useState<SharedDoc[]>([])
  const [requests, setRequests] = useState<DocRequest[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [previewDoc, setPreviewDoc] = useState<SharedDoc | null>(null)
  const [showNewRequest, setShowNewRequest] = useState(false)
  const [reqTitle, setReqTitle] = useState('')
  const [reqDesc, setReqDesc] = useState('')
  const [reqDueDate, setReqDueDate] = useState('')
  const [submittingReq, setSubmittingReq] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [uploadCategory, setUploadCategory] = useState('other')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [docsRes, reqRes, msgRes] = await Promise.all([
        fetch(`/api/accountant/documents?company_id=${companyId}`),
        fetch(`/api/accountant/document-requests?company_id=${companyId}`),
        fetch(`/api/accountant/messages?company_id=${companyId}`),
      ])
      const docsData = await docsRes.json()
      const reqData = await reqRes.json()
      const msgData = await msgRes.json()
      setDocs(docsData.documents || [])
      setRequests(reqData.requests || [])
      setMessages(msgData.messages || [])
      // Auto-expand current month
      const now = new Date()
      const key = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
      setExpandedGroups(new Set([key]))
    } catch { toast.error('Gabim gjatë ngarkimit') }
    finally { setLoading(false) }
  }, [companyId])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, subTab])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('company_id', companyId)
      formData.append('category', uploadCategory)
      const res = await fetch('/api/accountant/documents', { method:'POST', body:formData })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success('Dokumenti u ngarkua')
      await loadAll()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gabim') }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value='' }
  }

  async function createRequest() {
    if (!reqTitle.trim()) return
    setSubmittingReq(true)
    try {
      const res = await fetch('/api/accountant/document-requests', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ company_id:companyId, title:reqTitle, description:reqDesc, due_date:reqDueDate||null }),
      })
      if (!res.ok) throw new Error()
      setReqTitle(''); setReqDesc(''); setReqDueDate(''); setShowNewRequest(false)
      await loadAll(); toast.success('Kërkesa u dërgua')
    } catch { toast.error('Gabim') }
    finally { setSubmittingReq(false) }
  }

  async function sendChat() {
    if (!chatInput.trim()) return
    setSendingChat(true)
    try {
      const res = await fetch('/api/accountant/messages', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ company_id:companyId, message:chatInput }),
      })
      if (!res.ok) throw new Error()
      setChatInput(''); await loadAll()
    } catch { toast.error('Gabim') }
    finally { setSendingChat(false) }
  }

  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function isPreviewable(doc: SharedDoc) {
    const ext = doc.file_name.split('.').pop()?.toLowerCase()
    return ['jpg','jpeg','png','gif','webp','pdf'].includes(ext||'')
  }

  const pendingRequests = requests.filter(r => r.status==='pending')
  const grouped = groupByMonthYear(docs)

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:18 }}>
        {[
          { key:'vault' as const, label:'Dokumentet', icon:FolderOpen, count:docs.length },
          { key:'requests' as const, label:'Kërkesat', icon:Clock, count:pendingRequests.length },
          { key:'chat' as const, label:'Mesazhet', icon:MessageSquare, count:0 },
        ].map(t => {
          const Icon = t.icon
          const active = subTab === t.key
          return (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9,
                background: active?'var(--purple-bg)':'var(--bg-card)',
                border:`1px solid ${active?'var(--border-purple)':'var(--border)'}`,
                color: active?'var(--purple-light)':'var(--text-3)',
                fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
              <Icon size={13}/> {t.label}
              {t.count > 0 && <span style={{ fontSize:10, background:active?'var(--purple-light)':'var(--text-3)', color:'var(--text-1)', borderRadius:20, padding:'1px 6px' }}>{t.count}</span>}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p style={{ color:'var(--text-3)', fontSize:13, textAlign:'center', padding:30 }}>Duke ngarkuar...</p>
      ) : (
        <>
          {/* ── VAULT ── */}
          {subTab === 'vault' && (
            <div>
              {/* Upload area */}
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
                  style={{ ...I, width:'auto', minWidth:150 }}>
                  <option value="invoice">Faturë</option>
                  <option value="receipt">Faturë blerjeje</option>
                  <option value="bank_statement">Ekstrakt bankar</option>
                  <option value="contract">Kontratë</option>
                  <option value="other">Tjetër</option>
                </select>
                <input ref={fileInputRef} type="file" onChange={handleFileUpload} style={{ display:'none' }}
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"/>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10,
                    border:'1.5px dashed rgba(90,31,214,0.4)', background:'rgba(90,31,214,0.06)',
                    color:'var(--purple-light)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  {uploading ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}
                  {uploading ? 'Duke ngarkuar...' : 'Ngarko Dokument'}
                </button>
              </div>

              {docs.length === 0 ? (
                <div style={{ textAlign:'center', padding:48, color:'var(--text-3)', fontSize:13 }}>
                  <FolderOpen size={36} style={{ margin:'0 auto 12px', opacity:0.3 }}/>
                  <p>Nuk ka dokumente të ngarkuara ende.</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {grouped.map(([key, groupDocs]) => {
                    const [yr, mo] = key.split('-')
                    const label = `${MONTHS_SQ[parseInt(mo)-1]} ${yr}`
                    const isOpen = expandedGroups.has(key)
                    return (
                      <div key={key} style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
                        {/* Group header */}
                        <button onClick={() => toggleGroup(key)}
                          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px',
                            background:'var(--bg-muted)', border:'none', cursor:'pointer', color:'var(--text-1)' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {isOpen ? <ChevronDown size={14} style={{ color:'var(--purple-light)' }}/> : <ChevronRight size={14} style={{ color:'var(--text-3)' }}/>}
                            <span style={{ fontSize:13, fontWeight:700, color: isOpen?'var(--purple-light)':'var(--text-1)' }}>{label}</span>
                          </div>
                          <span style={{ fontSize:11, color:'var(--text-3)', background:'var(--bg-muted)', borderRadius:20, padding:'2px 8px' }}>
                            {groupDocs.length} dokument{groupDocs.length!==1?'e':''}
                          </span>
                        </button>

                        {/* Group docs */}
                        {isOpen && (
                          <div style={{ padding:'8px 10px', display:'flex', flexDirection:'column', gap:6 }}>
                            {groupDocs.map(doc => {
                              const FileIcon = getFileIcon(doc.file_name)
                              const canPreview = isPreviewable(doc)
                              return (
                                <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10,
                                  background:'var(--bg-card)', border:'1px solid var(--border)', transition:'border-color .15s' }}
                                  onMouseEnter={e => e.currentTarget.style.borderColor='rgba(90,31,214,0.25)'}
                                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                                  <div style={{ width:34, height:34, borderRadius:8, background:'var(--purple-bg)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    <FileIcon size={15} style={{ color:'var(--purple-light)' }}/>
                                  </div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.file_name}</p>
                                    <p style={{ fontSize:11, color:'var(--text-3)' }}>
                                      {CATEGORY_LABELS[doc.category]||doc.category} · {(doc.file_size/1024).toFixed(0)}KB
                                      {doc.uploader ? ` · ${doc.uploader.full_name}` : ''}
                                    </p>
                                  </div>
                                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                                    {canPreview && doc.url && (
                                      <button onClick={() => setPreviewDoc(doc)}
                                        style={{ padding:'6px 8px', borderRadius:8, background:'var(--bg-muted)', border:'1px solid var(--border)', color:'var(--purple-light)', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600 }}>
                                        <Eye size={13}/> Shiko
                                      </button>
                                    )}
                                    {doc.url && (
                                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                        style={{ padding:'6px 8px', borderRadius:8, background:'var(--bg-muted)', border:'1px solid var(--border)', color:'var(--text-3)', display:'flex', alignItems:'center' }}>
                                        <Download size={14}/>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── REQUESTS ── */}
          {subTab === 'requests' && (
            <div>
              <button onClick={() => setShowNewRequest(true)}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10,
                  border:'1px solid rgba(90,31,214,0.25)', background:'rgba(90,31,214,0.07)',
                  color:'var(--purple-light)', fontSize:13, fontWeight:600, cursor:'pointer', marginBottom:14 }}>
                <Plus size={13}/> Kërkesë e Re
              </button>

              {showNewRequest && (
                <div style={{ background:'var(--bg-card)', border:'1px solid rgba(90,31,214,0.2)', borderRadius:12, padding:16, marginBottom:14 }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <input placeholder="Titulli i kërkesës *" value={reqTitle} onChange={e=>setReqTitle(e.target.value)} style={I}/>
                    <textarea placeholder="Përshkrim (opcionale)" value={reqDesc} onChange={e=>setReqDesc(e.target.value)} rows={2} style={{ ...I, resize:'none' }}/>
                    <input type="date" value={reqDueDate} onChange={e=>setReqDueDate(e.target.value)} style={I}/>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setShowNewRequest(false)} style={{ flex:1, padding:9, borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-3)', cursor:'pointer', fontSize:13 }}>Anulo</button>
                      <button onClick={createRequest} disabled={submittingReq} style={{ flex:2, padding:9, borderRadius:9, background:'var(--purple-bg)', border:'1px solid var(--border-purple)', color:'var(--purple-light)', cursor:'pointer', fontWeight:700, fontSize:13 }}>
                        {submittingReq ? 'Duke dërguar...' : 'Dërgo Kërkesën'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {requests.length === 0 ? (
                <p style={{ textAlign:'center', padding:40, color:'var(--text-3)', fontSize:13 }}>Nuk ka kërkesa aktive.</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {requests.map(req => (
                    <div key={req.id} style={{ padding:'12px 14px', borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:13, fontWeight:600, color:'var(--text-1)', marginBottom:2 }}>{req.title}</p>
                          {req.description && <p style={{ fontSize:12, color:'var(--text-3)' }}>{req.description}</p>}
                          {req.due_date && <p style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>Afati: {req.due_date}</p>}
                        </div>
                        <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:700,
                          background: req.status==='completed'?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)',
                          color: req.status==='completed'?'#10B981':'#F59E0B', flexShrink:0 }}>
                          {req.status==='completed'?'Kompletuar':'Në pritje'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CHAT ── */}
          {subTab === 'chat' && (
            <div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:380, overflowY:'auto', marginBottom:14, padding:'4px 0' }}>
                {messages.length === 0 ? (
                  <p style={{ textAlign:'center', padding:40, color:'var(--text-3)', fontSize:13 }}>Asnjë mesazh ende.</p>
                ) : messages.map(msg => {
                  const isOwn = msg.sender_id === accountantId
                  return (
                    <div key={msg.id} style={{ display:'flex', justifyContent: isOwn?'flex-end':'flex-start' }}>
                      <div style={{ maxWidth:'75%', padding:'10px 14px', borderRadius: isOwn?'14px 14px 4px 14px':'14px 14px 14px 4px',
                        background: isOwn?'rgba(90,31,214,0.15)':'var(--bg-card)',
                        border:`1px solid ${isOwn?'rgba(90,31,214,0.25)':'var(--border)'}` }}>
                        {!isOwn && <p style={{ fontSize:10, fontWeight:700, color:'var(--purple-light)', marginBottom:3 }}>{msg.sender?.full_name}</p>}
                        <p style={{ fontSize:13, color:'var(--text-1)', lineHeight:1.5 }}>{msg.message}</p>
                        <p style={{ fontSize:10, color:'var(--text-3)', marginTop:4, textAlign:'right' }}>
                          {new Date(msg.created_at).toLocaleString('sq-AL', { hour:'2-digit', minute:'2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={chatEndRef}/>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendChat() }}}
                  placeholder="Shkruaj mesazhin..." style={{ ...I, flex:1 }}/>
                <button onClick={sendChat} disabled={sendingChat||!chatInput.trim()}
                  style={{ padding:'9px 16px', borderRadius:10, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontWeight:600, fontSize:13 }}>
                  {sendingChat?<Loader2 size={13} className="animate-spin"/>:<Send size={13}/>}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PREVIEW MODAL ── */}
      {previewDoc && previewDoc.url && (
        <>
          <div onClick={() => setPreviewDoc(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:200 }}/>
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(800px,92vw)', maxHeight:'88vh',
            background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, overflow:'hidden', zIndex:201, display:'flex', flexDirection:'column' }}>
            {/* Modal header */}
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{previewDoc.file_name}</p>
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                <a href={previewDoc.url} target="_blank" rel="noopener noreferrer" download
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, background:'var(--bg-muted)', border:'1px solid var(--border)', color:'var(--text-1)', fontSize:12, fontWeight:600, textDecoration:'none' }}>
                  <Download size={13}/> Shkarko
                </a>
                <button onClick={() => setPreviewDoc(null)}
                  style={{ padding:7, borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-3)', cursor:'pointer' }}>
                  <X size={15}/>
                </button>
              </div>
            </div>
            {/* Preview content */}
            <div style={{ flex:1, overflow:'auto', padding:16, display:'flex', alignItems:'center', justifyContent:'center', background:'#000' }}>
              {['jpg','jpeg','png','gif','webp'].includes(previewDoc.file_name.split('.').pop()?.toLowerCase()||'') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewDoc.url} alt={previewDoc.file_name} style={{ maxWidth:'100%', maxHeight:'70vh', objectFit:'contain', borderRadius:8 }}/>
              ) : (
                <iframe src={previewDoc.url} title={previewDoc.file_name} style={{ width:'100%', height:'70vh', border:'none', borderRadius:8, background:'white' }}/>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
