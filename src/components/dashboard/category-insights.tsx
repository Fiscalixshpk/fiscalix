'use client'

import Link from 'next/link'
import { FileText, ShoppingBag, BarChart2, Stethoscope, Scissors, Dumbbell, Pill, ArrowRight } from 'lucide-react'
import type { CategoryConfig } from '@/lib/category-config'

interface Props {
  config: CategoryConfig
  businessType: string
}

function ActionIcon({ icon }: { icon: string }) {
  const map: Record<string, any> = {
    '🩺': Stethoscope, '💊': Pill, '📊': BarChart2,
    '✂': Scissors, '🏋': Dumbbell, 'dot': ArrowRight,
  }
  const Icon = Object.entries(map).find(([k]) => icon?.includes(k))?.[1] || FileText
  return <Icon size={14} />
}

export default function CategoryInsights({ config, businessType }: Props) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Quick Actions */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'18px 20px' }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Veprime të Shpejta</p>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {config.quickActions.map((action, i) => (
            <Link key={i} href={action.href}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 14px', borderRadius:10,
                background:'var(--purple-bg)', border:'1px solid var(--border-purple)',
                color:'var(--purple)', fontSize:13, fontWeight:600, textDecoration:'none', whiteSpace:'nowrap' as const }}>
              <ActionIcon icon={action.icon} />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:16, padding:'18px 20px' }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-1)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Këshilla për {businessType}</p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {config.tips.map((tip, i) => (
            <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <span style={{ color:'var(--text-1)', fontSize:12, flexShrink:0, marginTop:1 }}>→</span>
              <p style={{ fontSize:12.5, color:'var(--text-2)', lineHeight:1.6 }}>{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
