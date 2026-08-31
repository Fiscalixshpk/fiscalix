'use client'
// Widget statistikat multi-arka — cila arkë ka shitur më shumë sot

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Banknote, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react'

interface RegStat {
  device_id: string; pos_id: number; device_name: string; cashier_name: string | null
  count: number; total: number; cash: number; card: number
}

const REG_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#9B5CF8', '#EC4899']
const fmtCnt = (c: number) => `€${(c / 100).toFixed(2)}`

export default function RegisterStatsWidget() {
  const [stats,       setStats]       = useState<RegStat[]>([])
  const [grandTotal,  setGrandTotal]  = useState(0)
  const [grandCount,  setGrandCount]  = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [date,        setDate]        = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/pos/register-stats?date=${date}`)
      .then(r => r.json())
      .then(d => {
        setStats(d.registers || [])
        setGrandTotal(d.grandTotal || 0)
        setGrandCount(d.grandCount || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [date])

  function prevDay() {
    const d = new Date(date); d.setDate(d.getDate() - 1)
    setDate(d.toISOString().split('T')[0])
  }
  function nextDay() {
    const d = new Date(date); d.setDate(d.getDate() + 1)
    setDate(d.toISOString().split('T')[0])
  }

  const isToday = date === new Date().toISOString().split('T')[0]
  const maxTotal = Math.max(...stats.map(s => s.total), 1)

  if (stats.length === 0 && !loading) return null

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={16} color="var(--purple-light)" />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Statistikat Arkave</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={prevDay} style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={13} color="var(--text-2)" />
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-2)', minWidth: 60, textAlign: 'center' }}>
            {isToday ? 'Sot' : date.split('-').slice(1).reverse().join('/')}
          </span>
          <button onClick={nextDay} disabled={isToday} style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: isToday ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isToday ? 0.4 : 1 }}>
            <ChevronRight size={13} color="var(--text-2)" />
          </button>
        </div>
      </div>

      {/* Grand total */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)', fontFamily: 'Poppins,sans-serif', lineHeight: 1, marginBottom: 3 }}>{fmtCnt(grandTotal)}</p>
          <p style={{ fontSize: 10, color: 'var(--text-3)' }}>Totali ditës</p>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--purple-light)', fontFamily: 'Poppins,sans-serif', lineHeight: 1, marginBottom: 3 }}>{grandCount}</p>
          <p style={{ fontSize: 10, color: 'var(--text-3)' }}>Shitje gjithsej</p>
        </div>
      </div>

      {/* Per-register bars */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60, color: 'var(--text-3)', gap: 8 }}>
          <div style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTop: '2px solid var(--purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 12 }}>Duke ngarkuar...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.map((reg, i) => {
            const color   = REG_COLORS[i % REG_COLORS.length]
            const barPct  = grandTotal > 0 ? (reg.total / maxTotal) * 100 : 0
            const isLeader = reg.total === maxTotal && reg.total > 0

            return (
              <div key={reg.device_id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{reg.device_name}</span>
                    {reg.cashier_name && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{reg.cashier_name}</span>}
                    {isLeader && reg.total > 0 && <span style={{ fontSize: 9, background: `${color}20`, color, padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>↑ Lider</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{reg.count} shitje</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'Poppins,sans-serif' }}>{fmtCnt(reg.total)}</span>
                  </div>
                </div>

                {/* Bar */}
                <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-muted)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${barPct}%`, borderRadius: 3, background: color, transition: 'width 0.4s ease' }} />
                </div>

                {/* Cash/Card breakdown */}
                {reg.total > 0 && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Banknote size={10} /> Cash: {fmtCnt(reg.cash)}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <CreditCard size={10} /> Kartë: {fmtCnt(reg.card)}
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          {stats.every(r => r.total === 0) && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '8px 0' }}>
              Asnjë shitje {isToday ? 'sot' : 'këtë ditë'}
            </p>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
