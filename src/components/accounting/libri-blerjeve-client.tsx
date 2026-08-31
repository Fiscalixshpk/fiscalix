'use client'

import { useState } from 'react'
import { ShoppingCart, Download, Filter } from 'lucide-react'
import { toast } from 'sonner'
import type { Expense, Company } from '@/types'

interface Props {
  expenses: (Expense & { expense_categories?: { name_sq?: string; name_en?: string } })[]
  company: Company | null
}

const QUARTERS = [
  { label: 'T1 — Jan-Mar', months: [1,2,3] },
  { label: 'T2 — Prill-Qer', months: [4,5,6] },
  { label: 'T3 — Kor-Sht', months: [7,8,9] },
  { label: 'T4 — Tet-Dhj', months: [10,11,12] },
]

export default function LibriBlerjeveClient({ expenses, company }: Props) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth()+1)/3))

  const q = QUARTERS[quarter-1]
  const filtered = expenses.filter(exp => {
    const d = new Date(exp.expense_date || '')
    return d.getFullYear() === year && q.months.includes(d.getMonth()+1)
  })

  const totAmt = filtered.reduce((s,e) => s+Number(e.amount||0), 0)
  const totBase = totAmt / 1.18
  const totTax = totAmt - totBase

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('sq-AL',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'
  const fmt = (n: number) => `€${n.toFixed(2)}`

  async function exportExcel() {
    try {
      const { generateProfessionalExcel } = await import('@/lib/excel-export')
      const periodLabel = `${q.label} ${year}`
      const headers = ['NR.', 'DATA FATURËS', 'NR. FATURËS', 'SHITËSI (FURNITORI)', 'NUI/NF SHITËSI', 'BAZA (€)', 'TVSH 18% (€)', 'TVSH 8% (€)', 'TOTALI (€)']
      const rows = filtered.map((exp, i) => {
        const amt = Number(exp.amount||0)
        const base = amt / 1.18
        const tax = amt - base
        return [
          i+1,
          fmtDate(exp.expense_date||''),
          exp.reference_number || `BL-${String(i+1).padStart(4,'0')}`,
          exp.vendor_name || '',
          '',
          base.toFixed(2),
          tax.toFixed(2),
          '0.00',
          amt.toFixed(2),
        ]
      })
      const totalsRow = ['', '', '', '', 'TOTALI:', totBase.toFixed(2), totTax.toFixed(2), '0.00', totAmt.toFixed(2)]

      const buf = await generateProfessionalExcel({
        title: 'LIBRI I BLERJEVE',
        companyName: company?.name || '',
        vatNumber: company?.vat_number || company?.tax_number || undefined,
        periodLabel,
        sheetName: 'Libri Blerjeve',
        headers,
        rows,
        currencyColumns: [5, 6, 7, 8],
        totalsRow,
      })
      const blob = new Blob([buf], {type:'application/octet-stream'})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href=url
      a.download=`LibriBlerjeve_${q.label.replace(/[ —]/g,'_')}_${year}.xlsx`
      a.click(); URL.revokeObjectURL(url)
      toast.success('Excel u eksportua!')
    } catch { toast.error('Gabim gjatë eksportimit') }
  }

  return (
    <div className="page-enter space-y-6">
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontFamily:'Poppins,sans-serif',fontSize:24,fontWeight:700,color:'var(--text-1)',marginBottom:4,display:'flex',alignItems:'center',gap:10}}>
            <ShoppingCart size={22} style={{color:'var(--text-1)'}}/> Libri i Blerjeve
          </h1>
          <p style={{color:'var(--text-3)',fontSize:13}}>Format ATK/EDI — deklarohet çdo tremujor</p>
        </div>
        <button onClick={exportExcel}
          style={{display:'flex',alignItems:'center',gap:8,padding:'10px 20px',borderRadius:10,background:'#3B82F6',border:'none',color:'white',fontSize:13,fontWeight:700,cursor:'pointer'}}>
          <Download size={15}/> Eksporto Excel (ATK)
        </button>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:12,flexWrap:'wrap',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <Filter size={14} style={{color:'var(--text-3)'}}/>
          <span style={{fontSize:13,color:'var(--text-3)',fontWeight:600}}>Periudha:</span>
        </div>
        <select value={year} onChange={e=>setYear(Number(e.target.value))} className="finex-input" style={{width:'auto'}}>
          {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
        </select>
        <div className="quarter-row" style={{display:'flex',gap:8}}>
          {QUARTERS.map((q2,i)=>(
            <button key={i} className="quarter-btn" onClick={()=>setQuarter(i+1)}
              style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',
                border:`1.5px solid ${quarter===i+1?'#3B82F6':'var(--border)'}`,
                background:quarter===i+1?'rgba(59,130,246,0.1)':'var(--bg-muted)',
                color:quarter===i+1?'#3B82F6':'var(--text-2)'}}>
              {q2.label.split('—')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="accounting-grid grid-4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[
          {l:'Blerje Totale', v:String(filtered.length), col:'#9B5CF8'},
          {l:'Baza TVSH', v:`€${totBase.toFixed(2)}`, col:'#3B82F6'},
          {l:'TVSH e Zbritshme', v:`€${totTax.toFixed(2)}`, col:'#F59E0B'},
          {l:'Totali Blerjeve', v:`€${totAmt.toFixed(2)}`, col:'#EF4444'},
        ].map((card,i)=>(
          <div key={i} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:16,borderTop:`3px solid ${card.col}`}}>
            <p style={{fontSize:11,color:'var(--text-3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{card.l}</p>
            <p style={{fontSize:20,fontWeight:800,color:card.col,fontFamily:'Poppins,sans-serif'}}>{card.v}</p>
          </div>
        ))}
      </div>

      <div style={{background:'rgba(59,130,246,0.05)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:12,padding:'12px 16px',display:'flex',gap:12}}>
        <span style={{fontSize:18}}>ℹ️</span>
        <div>
          <p style={{fontSize:13,fontWeight:700,color:'var(--text-1)',marginBottom:4}}>Udhëzim — Libri i Blerjeve</p>
          <p style={{fontSize:12,color:'var(--text-3)',lineHeight:1.6}}>
            TVSH-ja e paguar në blerje është <strong>e zbritshme</strong> nga TVSH-ja e mbledhur në shitje.
            Deklarohet bashkë me Librin e Shitjeve çdo tremujor në EDI.
          </p>
        </div>
      </div>

      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
        {filtered.length === 0 ? (
          <div style={{padding:'48px 24px',textAlign:'center'}}>
            <p style={{color:'var(--text-3)',fontSize:14}}>Nuk ka blerje për {q.label} {year}</p>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table className="finex-table">
              <thead>
                <tr>
                  <th style={{width:40}}>Nr.</th>
                  <th>Data</th>
                  <th>Nr. Faturës</th>
                  <th>Furnitori</th>
                  <th>Kategoria</th>
                  <th style={{textAlign:'right'}}>Baza (€)</th>
                  <th style={{textAlign:'right'}}>TVSH 18%</th>
                  <th style={{textAlign:'right'}}>Totali (€)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp,i) => {
                  const amt = Number(exp.amount||0)
                  const base = amt/1.18; const tax = amt-base
                  const cat = exp.expense_categories?.name_sq || exp.expense_categories?.name_en || '—'
                  return (
                    <tr key={exp.id}>
                      <td style={{color:'var(--text-3)',fontSize:12}}>{i+1}</td>
                      <td style={{fontSize:13,color:'var(--text-3)'}}>{fmtDate(exp.expense_date||'')}</td>
                      <td style={{fontSize:12,color:'var(--text-3)'}}>{exp.reference_number||`BL-${String(i+1).padStart(4,'0')}`}</td>
                      <td style={{fontWeight:600,fontSize:13}}>{exp.vendor_name||'—'}</td>
                      <td><span style={{fontSize:11,padding:'2px 9px',borderRadius:20,background:'var(--purple-bg)',color:'var(--purple-light)',fontWeight:600}}>{cat}</span></td>
                      <td style={{textAlign:'right',fontSize:13}}>{fmt(base)}</td>
                      <td style={{textAlign:'right',fontSize:13,color:'#F59E0B'}}>{fmt(tax)}</td>
                      <td style={{textAlign:'right',fontWeight:700,fontSize:13,color:'var(--text-1)'}}>{fmt(amt)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{background:'rgba(59,130,246,0.05)'}}>
                  <td colSpan={5} style={{fontWeight:700,fontSize:13,padding:'10px 12px'}}>TOTALI</td>
                  <td style={{textAlign:'right',fontWeight:700,fontSize:13,padding:'10px 12px'}}>{fmt(totBase)}</td>
                  <td style={{textAlign:'right',fontWeight:700,fontSize:13,padding:'10px 12px',color:'#F59E0B'}}>{fmt(totTax)}</td>
                  <td style={{textAlign:'right',fontWeight:800,fontSize:14,padding:'10px 12px',color:'var(--text-1)'}}>{fmt(totAmt)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
