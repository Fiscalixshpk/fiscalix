'use client'

import { useState } from 'react'
import { BookMarked, Download, Filter } from 'lucide-react'
import { toast } from 'sonner'
import type { Invoice, Company } from '@/types'

interface Props {
  invoices: Invoice[]
  company: Company | null
}

const QUARTERS = [
  { label: 'T1 — Jan-Mar', months: [1,2,3] },
  { label: 'T2 — Prill-Qer', months: [4,5,6] },
  { label: 'T3 — Kor-Sht', months: [7,8,9] },
  { label: 'T4 — Tet-Dhj', months: [10,11,12] },
]

export default function LibriShitjeveClient({ invoices, company }: Props) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth()+1)/3))

  const q = QUARTERS[quarter-1]
  const filtered = invoices.filter(inv => {
    const d = new Date(inv.issue_date)
    return d.getFullYear() === year && q.months.includes(d.getMonth()+1)
  })

  const totSubtotal = filtered.reduce((s,i) => s+Number(i.subtotal||0), 0)
  const tot18 = filtered.filter(i=>Number(i.tax_rate||18)===18).reduce((s,i) => s+Number(i.tax_amount||0), 0)
  const tot8  = filtered.filter(i=>Number(i.tax_rate||18)===8).reduce((s,i) => s+Number(i.tax_amount||0), 0)
  const totTotal = filtered.reduce((s,i) => s+Number((i as {total_amount?:number;total?:number}).total_amount||i.total||0), 0)

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('sq-AL',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'
  const fmt = (n: number) => `€${n.toFixed(2)}`

  async function exportExcel() {
    try {
      const { generateProfessionalExcel } = await import('@/lib/excel-export')
      const periodLabel = `${q.label} ${year}`
      const headers = ['NR.', 'DATA FATURËS', 'NR. FATURËS', 'BLERËSI', 'NUI/NF BLERËSI', 'BAZA TVSH (€)', 'TVSH 18% (€)', 'TVSH 8% (€)', 'TOTALI (€)']
      const rows = filtered.map((inv, i) => {
        const base = Number(inv.subtotal||0)
        const tax = Number(inv.tax_amount||0)
        const rate = Number(inv.tax_rate||18)
        return [
          i+1,
          fmtDate(inv.issue_date),
          inv.invoice_number,
          inv.client_name,
          inv.client_vat || '',
          base.toFixed(2),
          rate===18 ? tax.toFixed(2) : '0.00',
          rate===8  ? tax.toFixed(2) : '0.00',
          Number((inv as {total_amount?:number;total?:number}).total_amount||inv.total||0).toFixed(2),
        ]
      })
      const totalsRow = ['', '', '', '', 'TOTALI:', totSubtotal.toFixed(2), tot18.toFixed(2), tot8.toFixed(2), totTotal.toFixed(2)]

      const buf = await generateProfessionalExcel({
        title: 'LIBRI I SHITJEVE',
        companyName: company?.name || '',
        vatNumber: company?.vat_number || company?.tax_number || undefined,
        periodLabel,
        sheetName: 'Libri Shitjeve',
        headers,
        rows,
        currencyColumns: [5, 6, 7, 8],
        totalsRow,
      })
      const blob = new Blob([buf], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `LibriShitjeve_${q.label.replace(/[ —]/g,'_')}_${year}.xlsx`
      a.click(); URL.revokeObjectURL(url)
      toast.success('Excel u eksportua!')
    } catch { toast.error('Gabim gjatë eksportimit') }
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontFamily:'Poppins,sans-serif',fontSize:24,fontWeight:700,color:'var(--text-1)',marginBottom:4,display:'flex',alignItems:'center',gap:10}}>
            <BookMarked size={22} style={{color:'var(--text-1)'}}/> Libri i Shitjeve
          </h1>
          <p style={{color:'var(--text-3)',fontSize:13}}>
            Format ATK/EDI — deklarohet çdo tremujor (deri 15-ta e muajit pasues)
          </p>
        </div>
        <button onClick={exportExcel}
          style={{display:'flex',alignItems:'center',gap:8,padding:'10px 20px',borderRadius:10,background:'var(--bg-muted)',border:'none',color:'var(--text-1)',fontSize:13,fontWeight:700,cursor:'pointer'}}>
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
          {QUARTERS.map((q2,i) => (
            <button key={i} className="quarter-btn" onClick={()=>setQuarter(i+1)}
              style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',
                border:`1.5px solid ${quarter===i+1?'#10B981':'var(--border)'}`,
                background:quarter===i+1?'rgba(16,185,129,0.1)':'var(--bg-muted)',
                color:quarter===i+1?'#10B981':'var(--text-2)'}}>
              {q2.label.split('—')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="accounting-grid grid-4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[
          {l:'Fatura Totale', v:String(filtered.length), col:'#9B5CF8'},
          {l:'Baza TVSH', v:`€${totSubtotal.toFixed(2)}`, col:'#3B82F6'},
          {l:'TVSH e Mbledhur', v:`€${(tot18+tot8).toFixed(2)}`, col:'#F59E0B'},
          {l:'Totali Shitjeve', v:`€${totTotal.toFixed(2)}`, col:'#10B981'},
        ].map((card,i)=>(
          <div key={i} style={{background:'var(--bg-card)',border:`1px solid var(--border)`,borderRadius:12,padding:16,borderTop:`3px solid ${card.col}`}}>
            <p style={{fontSize:11,color:'var(--text-3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{card.l}</p>
            <p style={{fontSize:20,fontWeight:800,color:card.col,fontFamily:'Poppins,sans-serif'}}>{card.v}</p>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div style={{background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:12,padding:'12px 16px',display:'flex',gap:12,alignItems:'flex-start'}}>
        <span style={{fontSize:18}}>ℹ️</span>
        <div>
          <p style={{fontSize:13,fontWeight:700,color:'var(--text-1)',marginBottom:4}}>Udhëzim ATK — Libri i Shitjeve</p>
          <p style={{fontSize:12,color:'var(--text-3)',lineHeight:1.6}}>
            Deklarohet çdo <strong>3 muaj</strong> në EDI (edi.atk-ks.org) nga data <strong>1 deri 15-ta</strong> e muajit pasues të tremujorit.
            Afatet: T1→15 Prill, T2→15 Korrik, T3→15 Tetor, T4→15 Janar.
          </p>
        </div>
      </div>

      {/* Table */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
        {filtered.length === 0 ? (
          <div style={{padding:'48px 24px',textAlign:'center'}}>
            <p style={{color:'var(--text-3)',fontSize:14}}>Nuk ka shitje për {q.label} {year}</p>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table className="finex-table">
              <thead>
                <tr>
                  <th style={{width:40}}>Nr.</th>
                  <th>Data</th>
                  <th>Nr. Faturës</th>
                  <th>Blerësi</th>
                  <th>NUI/NF</th>
                  <th style={{textAlign:'right'}}>Baza (€)</th>
                  <th style={{textAlign:'right'}}>TVSH 18%</th>
                  <th style={{textAlign:'right'}}>TVSH 8%</th>
                  <th style={{textAlign:'right'}}>Totali (€)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv,i) => {
                  const base = Number(inv.subtotal||0)
                  const tax = Number(inv.tax_amount||0)
                  const rate = Number(inv.tax_rate||18)
                  const total = Number((inv as {total_amount?:number;total?:number}).total_amount||inv.total||0)
                  return (
                    <tr key={inv.id}>
                      <td style={{color:'var(--text-3)',fontSize:12}}>{i+1}</td>
                      <td style={{fontSize:13,color:'var(--text-3)'}}>{fmtDate(inv.issue_date)}</td>
                      <td style={{fontWeight:700,color:'var(--purple-light)',fontSize:13}}>{inv.invoice_number}</td>
                      <td style={{fontSize:13}}>{inv.client_name}</td>
                      <td style={{fontSize:12,color:'var(--text-3)'}}>{inv.client_vat||'—'}</td>
                      <td style={{textAlign:'right',fontSize:13}}>{fmt(base)}</td>
                      <td style={{textAlign:'right',fontSize:13,color:rate===18?'#F59E0B':'var(--text-3)'}}>
                        {rate===18 ? fmt(tax) : '—'}
                      </td>
                      <td style={{textAlign:'right',fontSize:13,color:rate===8?'#F59E0B':'var(--text-3)'}}>
                        {rate===8 ? fmt(tax) : '—'}
                      </td>
                      <td style={{textAlign:'right',fontWeight:700,fontSize:13,color:'var(--text-1)'}}>{fmt(total)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{background:'rgba(16,185,129,0.05)'}}>
                  <td colSpan={5} style={{fontWeight:700,fontSize:13,padding:'10px 12px'}}>TOTALI</td>
                  <td style={{textAlign:'right',fontWeight:700,fontSize:13,padding:'10px 12px'}}>{fmt(totSubtotal)}</td>
                  <td style={{textAlign:'right',fontWeight:700,fontSize:13,padding:'10px 12px',color:'#F59E0B'}}>{fmt(tot18)}</td>
                  <td style={{textAlign:'right',fontWeight:700,fontSize:13,padding:'10px 12px',color:'#F59E0B'}}>{fmt(tot8)}</td>
                  <td style={{textAlign:'right',fontWeight:800,fontSize:14,padding:'10px 12px',color:'var(--text-1)'}}>{fmt(totTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
