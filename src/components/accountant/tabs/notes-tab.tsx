'use client'

import { useState, useEffect } from 'react'
import { Pin, Trash2, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

interface Note {
  id: string
  content: string
  is_pinned: boolean
  created_at: string
}

export default function NotesTab({ accountantId, companyId }: { accountantId: string; companyId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/accountant/notes?company_id=${companyId}`)
      const data = await res.json()
      setNotes(data.notes || [])
    } catch {
      toast.error('Gabim gjatë ngarkimit')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [companyId])

  async function addNote() {
    if (!newNote.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/accountant/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, content: newNote }),
      })
      if (!res.ok) throw new Error()
      setNewNote('')
      await load()
      toast.success('Shënimi u shtua')
    } catch {
      toast.error('Gabim gjatë shtimit')
    } finally {
      setSubmitting(false)
    }
  }

  async function togglePin(id: string, current: boolean) {
    try {
      await fetch(`/api/accountant/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !current }),
      })
      await load()
    } catch {
      toast.error('Gabim')
    }
  }

  async function deleteNote(id: string) {
    if (!confirm('Fshi shënimin?')) return
    try {
      await fetch(`/api/accountant/notes/${id}`, { method: 'DELETE' })
      setNotes(prev => prev.filter(n => n.id !== id))
      toast.success('Shënimi u fshi')
    } catch {
      toast.error('Gabim')
    }
  }

  return (
    <div>
      {/* Add note */}
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Shto një shënim privat për këtë klient... (vetëm ti e sheh)"
          className="finex-input"
          style={{ flex:1, resize:'vertical', minHeight:60 }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
        />
        <button onClick={addNote} disabled={submitting || !newNote.trim()}
          className="finex-button-primary"
          style={{ alignSelf:'flex-end', padding:'10px 18px', display:'flex', alignItems:'center', gap:6, opacity: submitting || !newNote.trim() ? 0.5 : 1 }}>
          {submitting ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
          Shto
        </button>
      </div>

      {loading ? (
        <p style={{ color:'var(--text-3)', fontSize:13, textAlign:'center', padding:30 }}>Duke ngarkuar...</p>
      ) : notes.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'var(--text-3)', fontSize:13 }}>
          Nuk ka shënime ende. Shto të parin më lart.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {notes.map(note => (
            <div key={note.id} style={{
              background: note.is_pinned ? 'rgba(245,158,11,0.06)' : 'var(--bg-card)',
              border: `1px solid ${note.is_pinned ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`,
              borderRadius:12, padding:14,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                <p style={{ fontSize:14, color:'var(--text-1)', lineHeight:1.6, whiteSpace:'pre-wrap', flex:1 }}>{note.content}</p>
                <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                  <button onClick={() => togglePin(note.id, note.is_pinned)}
                    style={{ background:'none', border:'none', cursor:'pointer', padding:5, borderRadius:7, color: note.is_pinned ? '#F59E0B' : 'var(--text-3)' }}>
                    <Pin size={14} fill={note.is_pinned ? '#F59E0B' : 'none'}/>
                  </button>
                  <button onClick={() => deleteNote(note.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', padding:5, borderRadius:7, color:'white' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
              <p style={{ fontSize:11, color:'var(--text-3)', marginTop:8 }}>
                {new Date(note.created_at).toLocaleDateString('en-GB')} · {new Date(note.created_at).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
