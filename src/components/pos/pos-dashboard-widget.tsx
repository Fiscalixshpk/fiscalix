'use client'
// src/components/pos/pos-dashboard-widget.tsx
// Shfaqet mbi DashboardClient vetëm kur pos_enabled = true
// Tregon: shitjet sot, muaji, transaksione, 5 kuponë e fundit

import Link from 'next/link'
import { ShoppingBag, Zap, ArrowRight, TrendingUp } from 'lucide-react'

interface RecentSale {
  receiptNumber: string
  totalEUR:      number
  paymentMethod: string
  issuedAt:      string
  status:        string
}

interface Props {
  totalToday:    number
  totalMonth:    number
  txCountToday:  number
  recentSales:   RecentSale[]
}

const STATUS_COLOR: Record<string, string> = {
  fiscalized: '#10B981',
  offline:    '#F59E0B',
  failed:     '#EF4444',
  pending:    '#6B7280',
}

const STATUS_LABEL: Record<string, string> = {
  fiscalized: 'Fiskalizuar',
  offline:    'Offline',
  failed:     'Dështoi',
  pending:    'Pritur',
}

const PAY_LABEL: Record<string, string> = {
  cash: '💵 Cash',
  card: '💳 Kartë',
  split: '🔀 Split',
  insurance: '🏥 Sigurim',
}

export default function POSDashboardWidget({ totalToday, totalMonth, txCountToday, recentSales }: Props) {
  const now = new Date()

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.02) 100%)',
      border: '1px solid rgba(16,185,129,0.2)',
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={16} color="#10B981" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Arka Fiskale — Sot</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {now.toLocaleDateString('sq-AL', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>
        </div>
        <Link href="/pos"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background:'var(--bg-muted)', color:'var(--text-1)', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
          <Zap size={13} /> Hap POS <ArrowRight size={12} />
        </Link>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: recentSales.length > 0 ? 16 : 0 }}>
        {[
          { label: 'Shitjet Sot',    value: `€${totalToday.toFixed(2)}`,    color: '#10B981', sub: 'Totali i ditës' },
          { label: 'Transaksione',   value: txCountToday.toString(),          color: '#10B981', sub: 'Kuponë fiskalë' },
          { label: 'Ky Muaj',        value: `€${totalMonth.toFixed(0)}`,      color: '#6B7280', sub: 'Shitjet mujore' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '12px 14px',
          }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: stat.color, fontFamily: 'Poppins,sans-serif', lineHeight: 1, marginBottom: 6 }}>
              {stat.value}
            </p>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{stat.label}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent sales */}
      {recentSales.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Kuponët e fundit
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentSales.map((sale, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 8,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-2)', fontWeight: 600, flex: 1 }}>
                  {sale.receiptNumber || '—'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'Poppins,sans-serif' }}>
                  €{sale.totalEUR.toFixed(2)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {PAY_LABEL[sale.paymentMethod] || sale.paymentMethod}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                  background: `${STATUS_COLOR[sale.status] || '#6B7280'}15`,
                  color: STATUS_COLOR[sale.status] || '#6B7280',
                  border: `1px solid ${STATUS_COLOR[sale.status] || '#6B7280'}30`,
                }}>
                  {STATUS_LABEL[sale.status] || sale.status}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                  {new Date(sale.issuedAt).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>

          <Link href="/pos/history"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#10B981', textDecoration: 'none', fontWeight: 600, marginTop: 8 }}>
            Shiko të gjitha kuponët <ArrowRight size={11} />
          </Link>
        </div>
      )}

      {/* Empty state */}
      {recentSales.length === 0 && txCountToday === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-3)' }}>
          <ShoppingBag size={24} style={{ opacity: 0.3, marginBottom: 6 }} />
          <p style={{ fontSize: 12 }}>Asnjë shitje sot ende</p>
        </div>
      )}
    </div>
  )
}
