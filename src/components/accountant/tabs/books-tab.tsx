'use client'

import { useState } from 'react'
import { Download, Loader2, BookMarked, ShoppingCart, Wallet, Landmark } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  companyId: string
  companyName: string
}

const BOOKS = [
  { type: 'shitjeve' as const, label: 'Libri i Shitjeve', icon: BookMarked, color: '#10B981' },
  { type: 'blerjeve' as const, label: 'Libri i Blerjeve', icon: ShoppingCart, color: '#3B82F6' },
  { type: 'arka' as const,     label: 'Libri i Arkës',    icon: Wallet, color: '#F59E0B' },
  { type: 'banka' as const,    label: 'Libri i Bankës',   icon: Landmark, color: '#9B5CF8' },
]

function defaultFrom() {
  const d = new Date()
  return `${d.getFullYear()}-01-01`
}
function defaultTo() {
  return new Date().toISOString().slice(0, 10)
}

export default function BooksTab({ companyId, companyName }: Props) {
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())
  const [downloadingType, setDownloadingType] = useState<string | null>(null)

  async function download(type: typeof BOOKS[number]['type']) {
    setDownloadingType(type)
    try {
      const res = await fetch(`/api/accountant/books?company_id=${companyId}&type=${type}&from=${from}&to=${to}`)
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Gabim gjatë gjenerimit')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_${companyName.replace(/\s+/g, '_')}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Libri u shkarkua!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë shkarkimit')
    } finally {
      setDownloadingType(null)
    }
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 18 }}>
        Zgjedh periudhën dhe shkarko librat e gatshëm për ATK — Excel format.
      </p>

      {/* Date range */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Nga Data</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="finex-input" />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Deri Data</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="finex-input" />
        </div>
      </div>

      {/* Book cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {BOOKS.map(book => {
          const Icon = book.icon
          const isLoading = downloadingType === book.type
          return (
            <div key={book.type} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${book.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={17} style={{ color: book.color }} />
                </div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)' }}>{book.label}</p>
              </div>
              <button onClick={() => download(book.type)} disabled={isLoading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 0', borderRadius: 10, background: `${book.color}15`, border: `1px solid ${book.color}35`, color: book.color, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {isLoading ? 'Duke shkarkuar...' : 'Shkarko Excel'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
