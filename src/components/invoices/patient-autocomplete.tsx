'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, User, Plus } from 'lucide-react'

interface Patient { id: string; full_name: string; gender?: string; birth_year?: number }

interface Props {
  companyId: string
  value: string
  onChange: (name: string) => void
  onSelect: (patient: Patient) => void
}

export default function PatientAutocomplete({ companyId, value, onChange, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!value || value.length < 2) { setResults([]); return }
      setLoading(true)
      try {
        const res = await fetch(`/api/patients?company_id=${companyId}&search=${encodeURIComponent(value)}`)
        setResults(await res.json())
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [value, companyId])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const GENDER: Record<string, string> = { M: 'Mashkull', F: 'Femër', other: 'Tjetër' }

  return (
    <div ref={ref} className="patient-search-wrap" style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Kërko pacientin ose shto të ri..."
          className="finex-input"
          style={{ paddingLeft: 34, fontSize: 14 }}
        />
      </div>

      {open && value.length >= 2 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 999, overflow: 'hidden' }}>
          {loading ? (
            <p style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-3)' }}>Duke kërkuar...</p>
          ) : results.length === 0 ? (
            <div style={{ padding: '12px 14px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>Asnjë pacient me këtë emër</p>
              <button type="button" onClick={() => { setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9B5CF8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <Plus size={12} /> Shto "{value}" si pacient të ri
              </button>
            </div>
          ) : (
            <div>
              {results.map(p => (
                <button key={p.id} type="button"
                  onClick={() => { onSelect(p); setOpen(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(90,31,214,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: p.gender === 'F' ? 'rgba(236,72,153,0.15)' : 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    {p.gender === 'F' ? 'F' : p.gender === 'M' ? 'M' : '-'}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 1 }}>{p.full_name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {p.gender ? GENDER[p.gender] : ''}
                      {p.birth_year ? ` · ${new Date().getFullYear() - p.birth_year} vjeç (${p.birth_year})` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
