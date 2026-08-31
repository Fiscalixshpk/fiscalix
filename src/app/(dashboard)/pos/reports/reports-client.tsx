'use client'
// Raporti X (lexim pa mbyllje) dhe Raporti Z (mbyllje ditore)

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Printer, BarChart3, X as XIcon, Zap } from 'lucide-react'
import RegisterStatsWidget from '@/components/pos/register-stats-widget'

interface SaleItem { name: string; price: number; quantity: number; total: number; tax_rate: string }
interface Sale { id: string; total_amount: number; total_tax: number; total_no_tax: number; payment_method: string; issued_at: string; sale_items?: SaleItem[] }
interface Props {
  company:      { id: string; name: string; nui: string }
  todaySales:   Sale[]
  monthSales:   Sale[]
  businessType: string
}

const TAX_RATES: Record<string, number> = { A: 0, C: 0, D: 0.08, E: 0.18 }
const fmt  = (cents: number) => `€${(cents / 100).toFixed(2)}`

function calcReport(sales: Sale[]) {
  const totalAmount = sales.reduce((s, r) => s + r.total_amount, 0)
  const totalTax    = sales.reduce((s, r) => s + r.total_tax,    0)
  const totalNoTax  = sales.reduce((s, r) => s + r.total_no_tax, 0)

  const byTaxRate: Record<string, { totalForTax: number; totalTax: number; label: string }> = {
    E: { totalForTax: 0, totalTax: 0, label: 'E — 18%' },
    D: { totalForTax: 0, totalTax: 0, label: 'D — 8%'  },
    A: { totalForTax: 0, totalTax: 0, label: 'A — 0%'  },
    C: { totalForTax: 0, totalTax: 0, label: 'C — 0%'  },
  }

  for (const sale of sales) {
    for (const item of sale.sale_items ?? []) {
      const rate    = TAX_RATES[item.tax_rate] ?? 0.18
      const eur     = item.total / 10000
      const noTax   = eur / (1 + rate)
      const tax     = eur - noTax
      if (byTaxRate[item.tax_rate]) {
        byTaxRate[item.tax_rate].totalForTax += Math.round(noTax * 100)
        byTaxRate[item.tax_rate].totalTax    += Math.round(tax   * 100)
      }
    }
  }

  const cash = sales.filter(s => s.payment_method === 'cash').reduce((s, r) => s + r.total_amount, 0)
  const card = sales.filter(s => s.payment_method === 'card').reduce((s, r) => s + r.total_amount, 0)

  return { totalAmount, totalTax, totalNoTax, byTaxRate, cash, card, count: sales.length }
}

export default function POSReportsClient({ company, todaySales, monthSales, businessType }: Props) {
  const isArke = businessType === 'other' || businessType === 'arka'
  const router  = useRouter()
  const [tab,   setTab]   = useState<'x' | 'z'>('x')
  const [printing, setPrinting] = useState(false)

  const reportToday = useMemo(() => calcReport(todaySales),  [todaySales])
  const reportMonth = useMemo(() => calcReport(monthSales),  [monthSales])

  const report = tab === 'x' ? reportToday : reportMonth

  // Kamarierët dhe performanca — nga shitjet e sotme
  const waiterStats = useMemo(() => {
    const map: Record<string, { name: string; amount: number; tables: number }> = {}
    for (const s of todaySales) {
      const name = (s as any).cashier_name || 'Pa emër'
      if (!map[name]) map[name] = { name, amount: 0, tables: 0 }
      map[name].amount += s.total_amount
      map[name].tables += 1
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount)
  }, [todaySales])

  const cashTotal = todaySales.filter(s => s.payment_method === 'cash').reduce((s, r) => s + r.total_amount, 0)
  const cardTotal = todaySales.filter(s => s.payment_method === 'card').reduce((s, r) => s + r.total_amount, 0)

  const now     = new Date()
  const dd      = String(now.getDate()).padStart(2, '0')
  const mm      = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy    = now.getFullYear()
  const hh      = String(now.getHours()).padStart(2, '0')
  const min     = String(now.getMinutes()).padStart(2, '0')
  const dateStr = `${dd}/${mm}/${yyyy}`
  const timeStr = `${hh}:${min}`

  function printReport() {
    window.print()
    if (tab === 'z') {
      toast.success('Raporti Z u printua — dita u mbyll')
    }
  }

  const sectionLabel = (txt: string) => (
    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 16 }}>{txt}</p>
  )

  const row = (label: string, value: string, bold?: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: bold ? 'var(--text-1)' : 'var(--text-2)', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 800 : 600, color: bold ? 'var(--purple-light)' : 'var(--text-1)', fontFamily: bold ? 'Poppins,sans-serif' : 'inherit' }}>{value}</span>
    </div>
  )

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/pos')}
            style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', fontSize: 13 }}>
            <ArrowLeft size={14} /> POS
          </button>
          <div>
            <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>Raportet POS</h1>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{company.name} · {dateStr}</p>
          </div>
        </div>
        <button onClick={printReport}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, background: 'var(--purple)', border: 'none', fontSize: 13, fontWeight: 600, color:'#FFFFFF', cursor: 'pointer' }}>
          <Printer size={14} /> Printo Raportin {tab.toUpperCase()}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {([
          ['x',     'Raporti X',       'Lexim pa mbyllje'],
          ['z',     'Raporti Z',       'Mbyllja ditore'],
        ] as const).map(([id, label, desc]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left' as const, transition: 'all 0.15s',
              background: tab === id ? 'var(--purple-bg)' : 'var(--bg-card)',
              outline: tab === id ? '1.5px solid var(--border-purple)' : '1px solid var(--border)' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: tab === id ? 'var(--purple-light)' : 'var(--text-1)', marginBottom: 3 }}>{label}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{desc}</p>
          </button>
        ))}
      </div>

      {/* Report card */}
      <div id="pos-report-print" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>

        {/* Report header */}
        <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
          <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--text-1)' }}>fiscalix</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{company.name}</p>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>NUI: {company.nui || '—'}</p>
          <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 20, background: tab === 'z' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', border: `1px solid ${tab === 'z' ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.25)'}` }}>
            {tab === 'z' ? <Zap size={12} color="#EF4444" /> : <BarChart3 size={12} color="#3B82F6" />}
            <span style={{ fontSize: 11, fontWeight: 700, color: tab === 'z' ? '#EF4444' : '#3B82F6' }}>
              RAPORTI {tab.toUpperCase()} — {dateStr} {timeStr}
            </span>
          </div>
        </div>

        {sectionLabel('Totalet e Ditës')}
        {row('Numri i Kuponëve',  String(report.count)           )}
        {row('Pa TVSH',           fmt(report.totalNoTax)         )}
        {row('TVSH Totale',       fmt(report.totalTax)           )}
        {row('TOTAL',             fmt(report.totalAmount), true  )}

        {sectionLabel('Sipas Normës TVSH')}
        {Object.entries(report.byTaxRate)
          .filter(([, v]) => v.totalForTax > 0)
          .map(([rate, v]) => (
            <div key={rate}>
              {row(`${v.label} — Bazë`, fmt(v.totalForTax))}
              {row(`${v.label} — TVSH`, fmt(v.totalTax))}
            </div>
          ))}

        {sectionLabel('Sipas Metodës së Pagesës')}
        {row('Cash',  fmt(report.cash))}
        {row('Kartë', fmt(report.card))}

        {sectionLabel('Muaji Aktual')}
        {row('Kuponë këtë muaj',  String(reportMonth.count))}
        {row('Total këtë muaj',   fmt(reportMonth.totalAmount))}
        {row('TVSH këtë muaj',    fmt(reportMonth.totalTax))}

        {tab === 'z' && (
          <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', marginBottom: 4 }}>MBYLLJA E DITËS</p>
            <p style={{ fontSize: 11, color: '#9CA3AF' }}>Ky raport konfirmon mbylljet e {dateStr}</p>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Orë: {timeStr}</p>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body * { visibility: hidden; }
          #pos-report-print, #pos-report-print * { visibility: visible; }
          #pos-report-print {
            position: fixed;
            left: 0; top: 0;
            width: 80mm;
            max-width: 80mm;
            background: white !important;
            color: black !important;
            border: none !important;
            padding: 4mm !important;
            font-family: 'Courier New', monospace !important;
            font-size: 11px !important;
          }
          #pos-report-print * {
            color: black !important;
            background: white !important;
            border-color: #ccc !important;
            font-family: 'Courier New', monospace !important;
          }
        }
      `}</style>

      {/* Multi-arka statistikat */}
      <div style={{ marginTop: 20 }}>
        <RegisterStatsWidget />
      </div>
    </div>
  )
}
