'use client'

import { useState, useEffect } from 'react'
import { Check, Plus, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface ChecklistItem {
  id: string
  label: string
  is_done: boolean
  sort_order: number
}
interface Checklist {
  id: string
  period_month: number
  period_year: number
  closing_checklist_items: ChecklistItem[]
}

const MONTHS_SQ = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

export default function ChecklistTab({ companyId }: { companyId: string }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [adding, setAdding] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/accountant/checklist?company_id=${companyId}&month=${month}&year=${year}`)
      const data = await res.json()
      setChecklist(data.checklist || null)
    } catch {
      toast.error('Gabim gjatë ngarkimit')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [companyId, month, year])

  function changeMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m > 12) { m = 1; y += 1 }
    if (m < 1) { m = 12; y -= 1 }
    setMonth(m); setYear(y)
  }

  async function toggleItem(id: string, current: boolean) {
    setChecklist(prev => prev ? {
      ...prev,
      closing_checklist_items: prev.closing_checklist_items.map(i => i.id === id ? { ...i, is_done: !current } : i)
    } : prev)
    try {
      await fetch(`/api/accountant/checklist/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_done: !current }),
      })
    } catch {
      toast.error('Gabim')
      load()
    }
  }

  async function addItem() {
    if (!newItem.trim() || !checklist) return
    setAdding(true)
    try {
      const res = await fetch('/api/accountant/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist_id: checklist.id, label: newItem }),
      })
      if (!res.ok) throw new Error()
      setNewItem('')
      await load()
    } catch {
      toast.error('Gabim gjatë shtimit')
    } finally {
      setAdding(false)
    }
  }

  async function deleteItem(id: string) {
    try {
      await fetch(`/api/accountant/checklist/items/${id}`, { method: 'DELETE' })
      setChecklist(prev => prev ? { ...prev, closing_checklist_items: prev.closing_checklist_items.filter(i => i.id !== id) } : prev)
    } catch {
      toast.error('Gabim')
    }
  }

  const items = checklist?.closing_checklist_items?.slice().sort((a,b) => a.sort_order - b.sort_order) || []
  const doneCount = items.filter(i => i.is_done).length
  const pct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0

  return (
    <div>
      {/* Month selector */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginBottom:20 }}>
        <button onClick={() => changeMonth(-1)} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:9, padding:8, cursor:'pointer', color:'var(--text-1)' }}>
          <ChevronLeft size={16}/>
        </button>
        <p style={{ fontFamily:'Poppins,sans-serif', fontSize:16, fontWeight:700, color:'var(--text-1)', minWidth:160, textAlign:'center' }}>
          {MONTHS_SQ[month-1]} {year}
        </p>
        <button onClick={() => changeMonth(1)} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:9, padding:8, cursor:'pointer', color:'var(--text-1)' }}>
          <ChevronRight size={16}/>
        </button>
      </div>

      {loading ? (
        <p style={{ color:'var(--text-3)', fontSize:13, textAlign:'center', padding:30 }}>Duke ngarkuar...</p>
      ) : (
        <>
          {/* Progress bar */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:13, color:'var(--text-3)' }}>{doneCount} nga {items.length} të kryera</span>
              <span style={{ fontSize:13, fontWeight:700, color: pct===100 ? '#10B981' : 'var(--purple-light)' }}>{pct}%</span>
            </div>
            <div style={{ height:8, background:'var(--bg-muted)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ width:`${pct}%`, height:'100%', background: pct===100 ? '#10B981' : 'linear-gradient(90deg,#5A1FD6,#9B5CF8)', borderRadius:4, transition:'width 0.4s ease' }}/>
            </div>
          </div>

          {/* Items */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
            {items.map(item => (
              <div key={item.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                <button onClick={() => toggleItem(item.id, item.is_done)}
                  style={{
                    width:20, height:20, borderRadius:6, flexShrink:0, cursor:'pointer',
                    border: item.is_done ? 'none' : '2px solid var(--border)',
                    background: item.is_done ? '#10B981' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                  {item.is_done && <Check size={13} color="white" strokeWidth={3}/>}
                </button>
                <span style={{ flex:1, fontSize:14, color: item.is_done ? 'var(--text-3)' : 'var(--text-1)', textDecoration: item.is_done ? 'line-through' : 'none' }}>
                  {item.label}
                </span>
                <button onClick={() => deleteItem(item.id)}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:'var(--text-3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                  <Trash2 size={13}/>
                </button>
              </div>
            ))}
          </div>

          {/* Add item */}
          <div style={{ display:'flex', gap:8 }}>
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Shto detyrë të re..."
              className="finex-input"
              style={{ flex:1 }}
            />
            <button onClick={addItem} disabled={adding || !newItem.trim()}
              className="finex-button-secondary" style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px' }}>
              {adding ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
