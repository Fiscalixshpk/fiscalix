'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Search, Package } from 'lucide-react'

interface Service {
  id: string
  name: string
  description?: string
  price: number
  unit: string
}

interface Props {
  companyId: string
  onSelect: (service: Service) => void
}

export default function ServicePicker({ companyId, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/services?company_id=${companyId}`)
        const data = await res.json()
        setServices(Array.isArray(data) ? data : [])
      } catch { setServices([]) }
      finally { setLoading(false) }
    }
    if (open) load()
  }, [open, companyId])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9,
          border: '1px solid var(--border-purple)', background: 'var(--purple-bg)',
          color: 'var(--purple)', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
        <Package size={13} /> Shto nga Shërbimet <ChevronDown size={12}/>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, width: 300, background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kërko shërbim..."
              autoFocus style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13, flex: 1 }}/>
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {loading ? (
              <p style={{ padding: '16px 14px', fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>Duke ngarkuar...</p>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '20px 14px', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>
                  {services.length === 0 ? 'Nuk keni shërbime të shtuara' : 'Asnjë rezultat'}
                </p>
                {services.length === 0 && (
                  <a href="/settings?tab=services" style={{ fontSize: 11, color: '#9B5CF8', textDecoration: 'none' }}>
                    → Shto shërbime te Cilësimet
                  </a>
                )}
              </div>
            ) : filtered.map(s => (
              <button key={s.id} type="button" onClick={() => { onSelect(s); setOpen(false); setSearch('') }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(90,31,214,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 1 }}>{s.name}</p>
                  {s.description && <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.description}</p>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#9B5CF8' }}>€{Number(s.price).toFixed(2)}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-3)' }}>/{s.unit}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
