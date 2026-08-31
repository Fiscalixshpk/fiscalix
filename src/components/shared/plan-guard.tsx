'use client'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { hasFeature } from '@/lib/plans'
import type { PlanFeatures } from '@/lib/plans'

interface Props {
  plan:     string | null | undefined
  feature:  keyof PlanFeatures
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PlanGuard({ plan, feature, children, fallback }: Props) {
  if (hasFeature(plan, feature)) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 300, padding: 40, textAlign: 'center',
      background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)'
    }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Lock size={22} color="#7C3AED" />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>
        Kjo funksion nuk është në planin tuaj
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20, maxWidth: 320, lineHeight: 1.6 }}>
        Kaloni te plani Pro ose Business për të pasur qasje te kjo veçori.
      </p>
      <Link href="/billing/expired" style={{
        padding: '10px 22px', borderRadius: 10,
        background: 'linear-gradient(135deg,#5A1FD6,#7B2CF5)',
        color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none'
      }}>
        Kaloni planin
      </Link>
    </div>
  )
}

export default PlanGuard
