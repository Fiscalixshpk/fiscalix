'use client'

import { FileText } from 'lucide-react'
import type { CategoryConfig } from '@/lib/category-config'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  discount: number
  total: number
}

interface Props {
  config: CategoryConfig
  onApply: (items: InvoiceItem[]) => void
}

export default function InvoiceTemplates({ config, onApply }: Props) {
  if (!config.invoiceTemplates || config.invoiceTemplates.length === 0) return null

  function applyTemplate(template: { label: string; items: { description: string; unit_price: number }[] }) {
    const items: InvoiceItem[] = template.items.map((item, i) => ({
      id: `item-${i}-${Date.now()}`,
      description: item.description,
      quantity: 1,
      unit_price: item.unit_price,
      discount: 0,
      total: item.unit_price,
    }))
    onApply(items)
  }

  return (
    <div style={{ marginBottom:16 }}>
      <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Template të Shpejta</p>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {config.invoiceTemplates.map((template, i) => (
          <button key={i} type="button" onClick={() => applyTemplate(template)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9,
              border:'1px dashed rgba(90,31,214,0.3)', background:'rgba(90,31,214,0.05)',
              color:'var(--purple)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            <FileText size={12}/> {template.label}
          </button>
        ))}
      </div>
    </div>
  )
}
