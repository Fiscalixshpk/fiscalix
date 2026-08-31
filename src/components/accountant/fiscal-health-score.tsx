'use client'

import { useState, useEffect } from 'react'
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface HealthData {
  score: number
  grade: string
  color: string
  label: string
  metrics: { totalRevenue: number; totalExpenses: number; profit: number; margin: number; overdueCount: number; paymentRate: number }
  issues: { type: 'error'|'warning'|'ok'; label: string }[]
}

export default function FiscalHealthScore({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/accountant/health-score?company_id=${companyId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [companyId])

  if (loading) return (
    <div style={{ padding:'16px 20px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, display:'flex', alignItems:'center', gap:10 }}>
      <Activity size={16} style={{ color:'var(--text-3)' }}/>
      <p style={{ fontSize:13, color:'var(--text-3)' }}>Duke llogaritur shëndetin financiar...</p>
    </div>
  )

  if (!data) return null

  const circumference = 2 * Math.PI * 28
  const offset = circumference - (data.score / 100) * circumference

  return (
    <div style={{ background:'var(--bg-card)', border:`1px solid ${data.color}25`, borderRadius:16, padding:'20px 22px', borderLeft:`3px solid ${data.color}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
        {/* Circular score */}
        <div style={{ position:'relative', flexShrink:0 }}>
          <svg width="72" height="72" style={{ transform:'rotate(-90deg)' }}>
            <circle cx="36" cy="36" r="28" fill="none" stroke="var(--bg-muted)" strokeWidth="6"/>
            <circle cx="36" cy="36" r="28" fill="none" stroke={data.color} strokeWidth="6"
              strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
              style={{ transition:'stroke-dashoffset 1s ease' }}/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <p style={{ fontFamily:'Poppins,sans-serif', fontSize:18, fontWeight:900, color:data.color, lineHeight:1 }}>{data.score}</p>
            <p style={{ fontSize:10, fontWeight:800, color:data.color }}>{data.grade}</p>
          </div>
        </div>

        <div style={{ flex:1 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>Fiscal Health Score</p>
          <p style={{ fontSize:16, fontWeight:800, color:data.color, marginBottom:2 }}>{data.label}</p>
          <p style={{ fontSize:12, color:'var(--text-3)' }}>{companyName}</p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:10, color:'var(--text-3)' }}>Xhiro vjetore</p>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>€{data.metrics.totalRevenue.toFixed(0)}</p>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:10, color:'var(--text-3)' }}>Fitimi</p>
            <p style={{ fontSize:13, fontWeight:700, color: data.metrics.profit >= 0 ? '#10B981' : '#EF4444' }}>
              €{Math.abs(data.metrics.profit).toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Issues */}
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {data.issues.map((issue, i) => {
          const Icon = issue.type === 'error' ? XCircle : issue.type === 'warning' ? AlertTriangle : CheckCircle
          const color = issue.type === 'error' ? '#EF4444' : issue.type === 'warning' ? '#F59E0B' : '#10B981'
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:7 }}>
              <Icon size={12} style={{ color, flexShrink:0 }}/>
              <p style={{ fontSize:12, color: issue.type === 'ok' ? 'var(--text-3)' : color }}>{issue.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
