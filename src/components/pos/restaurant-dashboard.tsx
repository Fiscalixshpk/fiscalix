'use client'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { TrendingUp, ShoppingBag, Users, Utensils, BarChart2, Clock } from 'lucide-react'
import { SalesLineChart, IncomePieChart } from './restaurant-charts'

const C = {
  bg:'var(--bg-base)', card:'var(--bg-card)', purple:'#5B21B6', purpleL:'#7C3AED',
  purpleBg:'var(--purple-bg)', amber:'#F59E0B', green:'#10B981', blue:'#3B82F6',
  text1:'var(--text-1)', text2:'var(--text-2)', text3:'var(--text-3)', border:'var(--border)',
}

const fmtEUR = (atk: number) => `€${(atk / 10000).toFixed(2)}`
const PERIODS = ['Sot', 'Javë', 'Muaj'] as const
type Period = typeof PERIODS[number]

interface Props {
  companyName: string
  allSales: any[]
  totalToday: number
  totalMonth: number
  txCountToday: number
  txCountMonth: number
  trendingDishes: { name: string; count: number; revenue: number }[]
  cashTotal: number
  cardTotal: number
  expensesToday: number
}

function card(content: React.ReactNode) {
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {content}
    </div>
  )
}

export default function RestaurantDashboard({
  companyName, allSales, totalToday, totalMonth,
  txCountToday, txCountMonth, trendingDishes,
  cashTotal, cardTotal, expensesToday
}: Props) {
  const [period, setPeriod] = useState<Period>('Sot')

  const displayTotal    = period === 'Sot' ? totalToday : totalMonth
  const displayTxCount  = period === 'Sot' ? txCountToday : txCountMonth
  const profit          = displayTotal - expensesToday * 10000

  const donutData = [
    { name: 'Cash', value: cashTotal },
    { name: 'Kartë', value: cardTotal },
  ]

  const hour  = new Date().getHours()
  const greet = hour < 12 ? 'Mirëmëngjes' : hour < 17 ? 'Mirëdita' : 'Mirëmbrëma'
  const date  = new Date().toLocaleDateString('sq-AL', { weekday:'long', day:'numeric', month:'long' })

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100%', fontFamily: 'Inter,sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text1, letterSpacing: '-0.03em', marginBottom: 2 }}>
            {greet}, {companyName}
          </h1>
          <p style={{ fontSize: 13, color: C.text3 }}>{date}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: 4, background: C.card, borderRadius: 12, padding: 4, border: `1px solid ${C.border}` }}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{ padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
                  background: period === p ? C.purple : 'transparent',
                  color: period === p ? 'white' : C.text3 }}>
                {p}
              </button>
            ))}
          </div>
          <Link href="/pos" style={{ padding: '9px 18px', borderRadius: 10, background: C.purpleL, color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Hap POS
          </Link>
        </div>
      </div>

      {/* Row 1 — Chart + Donut + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 200px', gap: 16, marginBottom: 16 }}>

        {/* Daily Sales */}
        {card(
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text3, marginBottom: 6 }}>Shitjet — {period}</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: C.purpleL }}>{fmtEUR(displayTotal)}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <TrendingUp size={13} color={C.green} />
                  <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>{displayTxCount} transaksione</span>
                </div>
              </div>
              <Link href="/pos/reports" style={{ padding: '7px 16px', borderRadius: 10, background: C.purple, color: 'white', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
                Raporti
              </Link>
            </div>
          </div>
        )}

        {/* Donut */}
        {card(
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>Të Ardhurat</p>
              <span style={{ fontSize: 12, color: C.text3 }}>Sot</span>
            </div>
            <div style={{ marginBottom: 10 }}>
              <IncomePieChart data={donutData} total={displayTotal} />
            </div>
            {donutData.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ['#5B21B6','#10B981'][i] }} />
                  <span style={{ color: C.text2 }}>{d.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: C.text1 }}>{fmtEUR(d.value)}</span>
              </div>
            ))}
          </div>
        )}

        {/* KPI cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {card(
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.text1, marginBottom: 4 }}>Porositë</p>
                <p style={{ fontSize: 10, color: C.green, fontWeight: 600, marginBottom: 8 }}>+{txCountToday} sot</p>
                <p style={{ fontSize: 24, fontWeight: 900, color: C.text1 }}>{txCountMonth.toLocaleString()}</p>
                <div style={{ width: '100%', height: 3, background: C.amber, borderRadius: 2, marginTop: 8 }} />
              </div>
              <ShoppingBag size={18} color={C.amber} />
            </div>
          )}
          {card(
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.text1, marginBottom: 4 }}>Fitimi</p>
                <p style={{ fontSize: 10, color: profit >= 0 ? C.green : '#EF4444', fontWeight: 600, marginBottom: 8 }}>
                  {profit >= 0 ? '+' : ''}{fmtEUR(Math.abs(profit))}
                </p>
                <p style={{ fontSize: 24, fontWeight: 900, color: C.text1 }}>{fmtEUR(totalMonth)}</p>
                <div style={{ width: '100%', height: 3, background: C.green, borderRadius: 2, marginTop: 8 }} />
              </div>
              <Users size={18} color={C.green} />
            </div>
          )}
        </div>
      </div>

      {/* Row 2 — Trending + Pagesa */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Trending dishes */}
        {card(
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>Pjatat më të shitura</p>
              <Utensils size={16} color={C.text3} />
            </div>
            {trendingDishes.length === 0 ? (
              <p style={{ fontSize: 13, color: C.text3, textAlign: 'center', padding: '20px 0' }}>Nuk ka të dhëna ende</p>
            ) : trendingDishes.slice(0, 5).map((dish, i) => (
              <div key={dish.name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: C.purpleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: C.purpleL, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text1, marginBottom: 2 }}>{dish.name}</p>
                  <p style={{ fontSize: 11, color: C.text3 }}>{dish.count} herë</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.purpleL }}>{fmtEUR(dish.revenue)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pagesa breakdown */}
        {card(
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>Mënyra e Pagesës</p>
              <BarChart2 size={16} color={C.text3} />
            </div>
            {[
              { label: 'Cash', value: cashTotal, color: C.green },
              { label: 'Kartë', value: cardTotal, color: C.blue },
              { label: 'Total', value: cashTotal + cardTotal, color: C.purpleL },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color }} />
                  <span style={{ fontSize: 13, color: C.text2 }}>{row.label}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: row.color }}>{fmtEUR(row.value)}</span>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, color: C.text3, marginBottom: 8 }}>Shpenzimet (sot)</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#EF4444' }}>€{expensesToday.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
