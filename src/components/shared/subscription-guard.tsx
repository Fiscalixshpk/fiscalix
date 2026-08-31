'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Subscription } from '@/types'

interface Props {
  subscription: Subscription | null
  children: React.ReactNode
  role?: string
}

export function SubscriptionGuard({ subscription, children, role }: Props) {
  const router = useRouter()

  useEffect(() => {
    // Admin role is never blocked
    if (role === 'admin') return
    // Only redirect if subscription exists AND is explicitly expired
    if (subscription && subscription.status === 'expired') {
      const end = subscription.current_period_end ? new Date(subscription.current_period_end) : null
      if (end) {
        const graceDays = (Date.now() - end.getTime()) / 86400000
        if (graceDays > 5) {
          router.push('/billing/expired')
        }
      }
    }
  }, [subscription, router])

  // Always show children - let admins and users without subscriptions through
  return <>{children}</>
}

export default SubscriptionGuard
