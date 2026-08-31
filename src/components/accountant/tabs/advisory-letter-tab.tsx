'use client'

import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, Mail, Copy, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Company { id: string; name: string; email?: string }

interface Summary {
  thisRev: number; lastRev: number; thisExp: number; lastExp: number
  revChangePct: number | null; expChangePct: number | null
  overdueCount: number; overdueTotal: number; topCategory: string | null
}

export default function AdvisoryLetterTab({ company }: { company: Company }) {
  const [letter, setLetter] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/accountant/advisory-letter?company_id=${company.id}`)
      const data = await res.json()
      setLetter(data.letter || '')
      setSummary(data.summary || null)
    } catch {
      toast.error('Gabim gjatë gjenerimit')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [company.id])

  function copyLetter() {
    navigator.clipboard.writeText(letter)
    toast.success('Letra u kopjua')
  }

  function sendByEmail() {
    if (!company.email) {
      toast.error('Klienti nuk ka email të regjistruar')
      return
    }
    const subject = encodeURIComponent(`Përmbledhje Financiare — ${company.name}`)
    const body = encodeURIComponent(letter)
    window.location.href = `mailto:${company.email}?subject=${subject}&body=${body}`
  }

  if (loading) {
    return <p style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: 30 }}>Duke gjeneruar letrën...</p>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
          Letër automatike, gjeneruar nga të dhënat e këtij muaji. Mund ta redaktosh para se ta dërgosh.
        </p>
        <button onClick={load} style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 9, padding: 8, cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0 }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Quick summary chips */}
      {summary && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {summary.revChangePct !== null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, padding: '5px 11px', borderRadius: 20, background: summary.revChangePct >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: summary.revChangePct >= 0 ? '#10B981' : '#EF4444' }}>
              {summary.revChangePct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              Të ardhura {summary.revChangePct >= 0 ? '+' : ''}{summary.revChangePct}%
            </span>
          )}
          {summary.overdueCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, padding: '5px 11px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
              <AlertTriangle size={12} /> {summary.overdueCount} fatura vonë
            </span>
          )}
        </div>
      )}

      <textarea
        value={letter}
        onChange={e => setLetter(e.target.value)}
        style={{
          width: '100%', minHeight: 320, padding: 16, borderRadius: 12,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          color: 'var(--text-1)', fontSize: 13.5, lineHeight: 1.7,
          fontFamily: 'inherit', resize: 'vertical',
        }}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={copyLetter}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Copy size={14} /> Kopjo
        </button>
        {company.email && (
          <button onClick={sendByEmail} className="finex-button-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px' }}>
            <Mail size={14} /> Dërgo me Email
          </button>
        )}
      </div>
    </div>
  )
}
