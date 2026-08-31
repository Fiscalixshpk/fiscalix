'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Users, CreditCard, BarChart3,
  Settings, LogOut, Shield, ChevronRight, Activity, Wallet
} from 'lucide-react'
import Link from 'next/link'
import { formatDateLongSq } from '@/lib/utils'

interface Props {
  user: { full_name: string; email: string }
  children: React.ReactNode
}

const navItems = [
  { href: '/admin',               label: 'Pasqyra',      icon: LayoutDashboard },
  { href: '/admin/payments',      label: 'Pagesat',      icon: Wallet },
  { href: '/admin/users',         label: 'Klientët',     icon: Users },
  { href: '/admin/subscriptions', label: 'Abonimet',     icon: CreditCard },
  { href: '/admin/analytics',     label: 'Analitika',    icon: BarChart3 },
]

export default function AdminLayout({ user, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background:'var(--bg-card)', overflow: 'hidden' }}>

      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0,
        background:'var(--bg-card)',
        borderRight: '1px solid rgba(123,44,245,0.15)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#5A1FD6,#9B5CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 15, fontFamily: 'Poppins,sans-serif' }}>F</div>
            <div>
              <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 14, fontWeight: 800, color:'var(--text-1)' }}>Fiscalix</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(123,44,245,0.12)', border: '1px solid rgba(123,44,245,0.3)', borderRadius: 8, padding: '4px 10px' }}>
            <Shield size={11} style={{ color: '#9B5CF8' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#9B5CF8', letterSpacing: '0.05em' }}>ADMIN PANEL</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10,
                  background: active ? 'rgba(123,44,245,0.18)' : 'transparent',
                  border: active ? '1px solid rgba(123,44,245,0.3)' : '1px solid transparent',
                  color: active ? 'var(--purple)' : 'var(--text-3)',
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  textDecoration: 'none', transition: 'all 0.15s',
                }}>
                <Icon size={16} style={{ flexShrink: 0 }} />
                {item.label}
                {active && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 10px', borderTop:'1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 10, background: 'var(--bg-card)' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#5A1FD6,#9B5CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: 'white', flexShrink: 0 }}>
              {(user.full_name || user.email).charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color:'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.full_name || user.email}
              </p>
              <p style={{ fontSize: 10, color: 'rgba(155,92,248,0.8)' }}>Administrator</p>
            </div>
            <button onClick={logout}
              style={{ padding: 5, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: 52, display: 'flex', alignItems: 'center',
          padding: '0 24px', flexShrink: 0,
          borderBottom:'1px solid var(--border)',
          background:'var(--bg-card)',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={14} style={{ color: '#9B5CF8' }} />
            <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
              {navItems.find(n => pathname === n.href || pathname.startsWith(n.href + '/'))?.label || 'Admin'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span suppressHydrationWarning style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {formatDateLongSq()}
            </span>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', color:'var(--text-1)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
