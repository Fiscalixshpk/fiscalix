'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, FileText, Receipt, Plus,
  Settings, BarChart3, RefreshCw, BookMarked, ShoppingCart, Users2, Landmark, X,
  Zap, Store, MessageSquare, UserPlus, MoreHorizontal, FileSpreadsheet, LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  role?: string
  hasLinkedAccountant?: boolean
}

export default function BottomNav({ role, hasLinkedAccountant }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [showMore, setShowMore] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const isAccountant = role === 'accountant'

  async function handleLogout() {
    setLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      toast.error('Gabim gjatë daljes')
      setLoggingOut(false)
    }
  }

  const mainItems = isAccountant
    ? [
        { href: '/accountant',          icon: Zap,      label: 'Portofoli' },
        { href: '/accountant/markets',  icon: Store,    label: 'Markete' },
        { href: '/invoices/new',        icon: Plus,     label: 'E re', isAction: true },
        { href: '/invoices',            icon: FileText, label: 'Faturat' },
      ]
    : [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
        { href: '/invoices',  icon: FileText,         label: 'Faturat' },
        { href: '/invoices/new', icon: Plus, label: 'E re', isAction: true },
        { href: '/expenses',  icon: Receipt,          label: 'Shpenz.' },
      ]

  const moreItems = isAccountant
    ? [
        { href: '/accountant-invites', icon: UserPlus,    label: 'Ftesat', color: '#F59E0B' },
        { href: '/raporte',            icon: FileSpreadsheet, label: 'Raporte', color: '#10B981' },
        { href: '/tvsh-deklarata',     icon: Receipt,     label: 'TVSH', color: '#F59E0B' },
        { href: '/settings',           icon: Settings,    label: 'Cilësimet', color: '#6B7280' },
      ]
    : [
        { href: '/invoices',  icon: FileText,  label: 'Faturat',    color: '#9B5CF8' },
        { href: '/expenses',  icon: Receipt,   label: 'Shpenzimet', color: '#3B82F6' },
        ...(hasLinkedAccountant ? [{ href: '/accountant-chat', icon: MessageSquare, label: 'Kontabilisti', color: '#F59E0B' }] : []),
        { href: '/settings',  icon: Settings,  label: 'Cilësimet',  color: '#6B7280' },
      ]

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div
          onClick={() => setShowMore(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 99, backdropFilter: 'blur(4px)'
          }}
        />
      )}

      {/* More menu sheet */}
      {showMore && (
        <div style={{
          position: 'fixed', bottom: 66, left: 0, right: 0,
          background: 'var(--bg-card)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          zIndex: 100,
          padding: '16px 16px 8px',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
              Meny
            </p>
            <button onClick={() => setShowMore(false)}
              style={{ padding: 6, borderRadius: 8, background: 'var(--bg-muted)', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {moreItems.map(item => {
              const Icon = item.icon
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link key={item.href} href={item.href}
                  onClick={() => setShowMore(false)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '14px 8px', borderRadius: 14, textDecoration: 'none',
                    background: active ? 'var(--purple-bg)' : 'var(--bg-muted)',
                    border: `1px solid ${active ? 'var(--border-purple)' : 'var(--border)'}`,
                  }}>
                  <Icon size={22} style={{ color: active ? 'var(--purple-light)' : item.color }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: active ? 'var(--purple-light)' : 'var(--text-2)', textAlign: 'center', lineHeight: 1.2 }}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              width: '100%', marginTop: 12, padding: '14px',
              borderRadius: 14, border: '1px solid rgba(239,68,68,0.25)',
              background: 'rgba(239,68,68,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              cursor: 'pointer', color: '#EF4444',
            }}>
            <LogOut size={18} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              {loggingOut ? 'Duke dalur...' : 'Dil nga Llogaria'}
            </span>
          </button>

          <div style={{ height: 'env(safe-area-inset-bottom)' }} />
        </div>
      )}

      {/* Bottom bar */}
      <nav className="bottom-nav">
        {mainItems.map(item => {
          const active = pathname === item.href || (item.href !== '/invoices/new' && pathname.startsWith(item.href + '/'))
          const Icon = item.icon

          if (item.isAction) {
            return (
              <Link key={item.href} href={item.href}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textDecoration: 'none' }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#5A1FD6,#9B5CF8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(123,44,245,0.5)',
                  marginBottom: -6,
                }}>
                  <Icon size={22} color="white" />
                </div>
              </Link>
            )
          }

          return (
            <Link key={item.href} href={item.href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, textDecoration: 'none', flex: 1, padding: '5px 0',
                color: active ? 'var(--purple-light)' : 'var(--text-3)',
              }}>
              <Icon size={21} />
              <span className="bottom-nav-label" style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* More button */}
        <button onClick={() => setShowMore(!showMore)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '5px 0',
            color: showMore ? 'var(--purple-light)' : 'var(--text-3)',
          }}>
          <MoreHorizontal size={21} />
          <span className="bottom-nav-label" style={{ fontSize: 10, fontWeight: 400 }}>Meny</span>
        </button>
      </nav>
    </>
  )
}
