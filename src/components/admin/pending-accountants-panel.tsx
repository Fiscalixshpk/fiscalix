'use client'

import { useState } from 'react'
import { Check, Loader2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface PendingAccountant {
  id: string
  plan: string
  price_monthly: number
  status: string
  created_at: string
  user: { full_name: string; email: string } | null
}

const PLAN_COLORS: Record<string, string> = { starter: '#3B82F6', pro: '#9B5CF8', elite: '#10B981' }

export default function PendingAccountantsPanel({ pending }: { pending: PendingAccountant[] }) {
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const router = useRouter()

  async function activate(id: string) {
    setActivatingId(id)
    try {
      const res = await fetch(`/api/admin/accountant-subscriptions/${id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months: 1 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Llogaria u aktivizua!')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally {
      setActivatingId(null)
    }
  }

  if (pending.length === 0) return null

  return (
    <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Clock size={16} style={{ color: '#F59E0B' }} />
        <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 14, fontWeight: 700, color:'var(--text-1)' }}>
          Kontabilistë në pritje pagese ({pending.length})
        </h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pending.map(p => {
          const col = PLAN_COLORS[p.plan] || '#6B7280'
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12, background: 'var(--bg-card)', border:'1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color:'var(--text-1)' }}>{p.user?.full_name || 'Pa emër'}</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.user?.email} · {formatDate(p.created_at)}</p>
              </div>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: `${col}18`, color: col, textTransform: 'capitalize', flexShrink: 0 }}>
                {p.plan} · €{p.price_monthly}
              </span>
              <button onClick={() => activate(p.id)} disabled={activatingId === p.id}
                style={{ padding: '7px 16px', borderRadius: 10, border: 'none', background:'var(--bg-muted)', color:'var(--text-1)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {activatingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Aktivizo
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
