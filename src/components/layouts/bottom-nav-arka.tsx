'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  LayoutDashboard, Receipt, History, BarChart2, Settings, LogOut, X, Menu
} from 'lucide-react'

export default function BottomNavArka() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [open, setOpen]   = useState(false)
  const [out,  setOut]    = useState(false)

  const items = [
    { href: '/dashboard',    label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pos',          label: 'Kupon',     icon: Receipt        },
    { href: '/pos/history',  label: 'Historia',  icon: History        },
    { href: '/pos/reports',  label: 'Raportet',  icon: BarChart2      },
    { href: '/settings',     label: 'Cilësimet', icon: Settings       },
  ]

  async function signOut() {
    setOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      toast.error('Gabim gjatë daljes')
      setOut(false)
    }
  }

  const P = '#7C3AED'

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 98,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Slide-up menu */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border)',
        borderBottom: 'none',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
        zIndex: 99,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
        padding: '16px 16px 32px',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>Menyja</p>
          <button onClick={() => setOpen(false)}
            style={{ background: 'var(--bg-muted)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--text-3)' }}>
            <X size={16}/>
          </button>
        </div>

        {/* Nav items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon   = item.icon
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 16px', borderRadius: 12, textDecoration: 'none',
                  background: active ? 'var(--purple-bg)' : 'transparent',
                  border: active ? '1px solid var(--border-purple)' : '1px solid transparent',
                }}>
                <Icon size={20} color={active ? P : 'var(--text-3)'}/>
                <span style={{ fontSize: 15, fontWeight: active ? 700 : 500, color: active ? P : 'var(--text-1)' }}>
                  {item.label}
                </span>
              </Link>
            )
          })}

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }}/>

          {/* Sign out */}
          <button onClick={signOut} disabled={out}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '13px 16px', borderRadius: 12,
              background: '#FEF2F2', border: '1px solid #FECACA',
              cursor: 'pointer', width: '100%',
            }}>
            <LogOut size={20} color="#DC2626"/>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#DC2626' }}>
              {out ? 'Duke dalë...' : 'Dil nga Llogaria'}
            </span>
          </button>
        </div>
      </div>

      {/* Bottom bar — always visible */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 64,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        zIndex: 97,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Quick links */}
        {items.slice(0, 4).map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon   = item.icon
          return (
            <Link key={item.href} href={item.href}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                textDecoration: 'none', padding: '6px 0',
              }}>
              <Icon size={22} color={active ? P : 'var(--text-3)'}/>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? P : 'var(--text-3)' }}>
                {item.label}
              </span>
              {active && (
                <div style={{ position: 'absolute', top: 0, width: 28, height: 2, background: P, borderRadius: '0 0 2px 2px' }}/>
              )}
            </Link>
          )
        })}

        {/* Menu button */}
        <button onClick={() => setOpen(o => !o)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3,
            background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0',
          }}>
          <Menu size={22} color={open ? P : 'var(--text-3)'}/>
          <span style={{ fontSize: 10, fontWeight: 500, color: open ? P : 'var(--text-3)' }}>Më shumë</span>
        </button>
      </div>

      {/* Spacer */}
      <div style={{ height: 64 }}/>
    </>
  )
}
