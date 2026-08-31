'use client'
import { useState, useMemo } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  type: 'shitjeve' | 'blerjeve' | 'tvsh'
  company: any
  invoices: any[]
  expenses: any[]
}

const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']
const QUARTERS = [
  { q: 1, label: 'Q1 (Jan–Mar)' },
  { q: 2, label: 'Q2 (Pri–Qer)' },
  { q: 3, label: 'Q3 (Kor–Sht)' },
  { q: 4, label: 'Q4 (Tek–Dhj)' },
]

export default function MjetetLibriClient({ type, company, invoices, expenses }: Props) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [exporting, setExporting] = useState(false)

  const qMonths: Record<number, number[]> = { 1:[1,2,3], 2:[4,5,6], 3:[7,8,9], 4:[10,11,12] }
  const months = qMonths[quarter]

  const filteredInvoices = useMemo(() => invoices.filter(inv => {
    const d = new Date(inv.issue_date)
    return d.getFullYear() === year && months.includes(d.getMonth() + 1)
  }), [invoices, year, quarter])

  const filteredExpenses = useMemo(() => expenses.filter(exp => {
    const d = new Date(exp.expense_date || exp.created_at)
    return d.getFullYear() === year && months.includes(d.getMonth() + 1)
  }), [expenses, year, quarter])

  const totalSales = filteredInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const totalVatSales = filteredInvoices.reduce((s, i) => s + Number(i.tax_amount || 0), 0)
  const totalPurchases = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const vatBalance = totalVatSales - (totalPurchases * 0.18)

  async function exportExcel() {
    setExporting(true)
    try {
      const res = await fetch(`/api/reports/atk-full?company_id=${company?.id}&year=${year}&quarter=${quarter}&type=${type}`)
      if (!res.ok) throw new Error('Gabim')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `libri_${type}_Q${quarter}_${year}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Libri u shkarkua')
    } catch {
      toast.error('Gabim gjatë shkarkimit')
    } finally {
      setExporting(false)
    }
  }

  const titles = {
    shitjeve: 'Libri i Shitjeve',
    blerjeve: 'Libri i Blerjeve',
    tvsh: 'TVSH e Firmës',
  }

  const S = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', marginBottom:14 }

  return (
    <div className="page-enter" style={{ maxWidth:900, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:22, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>
            {titles[type]}
          </h1>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>{company?.name} — Firmës suaj</p>
        </div>
        <button onClick={exportExcel} disabled={exporting}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:10, background:'linear-gradient(135deg,#1D4ED8,#3B82F6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', opacity:exporting?0.7:1 }}>
          <Download size={15}/> {exporting ? 'Duke shkarkuar...' : 'Shkarko Excel'}
        </button>
      </div>

      {/* Filters */}
      <div style={S}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:12, fontWeight:600, color:'var(--text-3)' }}>Periudha:</span>
          {QUARTERS.map(q => (
            <button key={q.q} onClick={() => setQuarter(q.q)}
              style={{ padding:'6px 14px', borderRadius:9, border:`1px solid ${quarter===q.q?'rgba(124,58,237,0.4)':'var(--border)'}`, background:quarter===q.q?'rgba(124,58,237,0.12)':'transparent', color:quarter===q.q?'var(--purple)':'var(--text-2)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              {q.label}
            </button>
          ))}
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            style={{ background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px', color:'var(--text-1)', fontSize:12, outline:'none' }}>
            {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI */}
      {type === 'tvsh' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:14 }}>
          {[
            { label:'TVSH e Mbledhur (18%)', value:`€${totalVatSales.toFixed(2)}`, color:'#10B981' },
            { label:'TVSH e Paguar (est.)', value:`€${(totalPurchases * 0.18).toFixed(2)}`, color:'#EF4444' },
            { label:'TVSH Neto', value:`€${vatBalance.toFixed(2)}`, color: vatBalance >= 0 ? '#F59E0B' : '#3B82F6' },
          ].map((k,i) => (
            <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 16px', borderTop:`3px solid ${k.color}` }}>
              <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{k.label}</p>
              <p style={{ fontFamily:'Poppins,sans-serif', fontSize:18, fontWeight:800, color:k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={S}>
        {(type === 'shitjeve' || type === 'tvsh') && (
          <>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>
              Faturat — Q{quarter} {year} ({filteredInvoices.length} fatura)
            </p>
            {filteredInvoices.length === 0 ? (
              <p style={{ fontSize:13, color:'var(--text-3)', textAlign:'center', padding:'20px 0' }}>Nuk ka fatura për këtë periudhë</p>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table className="finex-table">
                  <thead>
                    <tr>
                      <th>Nr. Faturës</th>
                      <th>Klienti</th>
                      <th>Data</th>
                      <th style={{ textAlign:'right' }}>Neto</th>
                      <th style={{ textAlign:'right' }}>TVSH</th>
                      <th style={{ textAlign:'right' }}>Totali</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv, i) => (
                      <tr key={inv.id || i}>
                        <td style={{ fontWeight:600, fontSize:12 }}>{inv.invoice_number}</td>
                        <td style={{ fontSize:12 }}>{inv.client_name || '—'}</td>
                        <td style={{ fontSize:12, color:'var(--text-3)' }}>{inv.issue_date}</td>
                        <td style={{ textAlign:'right', fontSize:12 }}>€{Number(inv.subtotal || 0).toFixed(2)}</td>
                        <td style={{ textAlign:'right', fontSize:12, color:'#F59E0B' }}>€{Number(inv.tax_amount || 0).toFixed(2)}</td>
                        <td style={{ textAlign:'right', fontSize:13, fontWeight:700 }}>€{Number(inv.total_amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop:'2px solid var(--border)', background:'rgba(59,130,246,0.05)' }}>
                      <td colSpan={3} style={{ padding:'8px 12px', fontSize:12, fontWeight:700, color:'var(--text-3)' }}>TOTALI</td>
                      <td style={{ textAlign:'right', padding:'8px 12px', fontWeight:700 }}>€{(totalSales - totalVatSales).toFixed(2)}</td>
                      <td style={{ textAlign:'right', padding:'8px 12px', fontWeight:700, color:'#F59E0B' }}>€{totalVatSales.toFixed(2)}</td>
                      <td style={{ textAlign:'right', padding:'8px 12px', fontWeight:800, fontSize:14 }}>€{totalSales.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}

        {(type === 'blerjeve' || type === 'tvsh') && (
          <div style={{ marginTop: type === 'tvsh' ? 20 : 0 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>
              Shpenzimet / Blerjet — Q{quarter} {year} ({filteredExpenses.length} regjistrime)
            </p>
            {filteredExpenses.length === 0 ? (
              <p style={{ fontSize:13, color:'var(--text-3)', textAlign:'center', padding:'20px 0' }}>Nuk ka shpenzime për këtë periudhë</p>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table className="finex-table">
                  <thead>
                    <tr>
                      <th>Shitësi</th>
                      <th>Kategoria</th>
                      <th>Data</th>
                      <th>Mënyra</th>
                      <th style={{ textAlign:'right' }}>Shuma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp, i) => (
                      <tr key={exp.id || i}>
                        <td style={{ fontWeight:600, fontSize:12 }}>{exp.vendor_name || '—'}</td>
                        <td style={{ fontSize:12, color:'var(--text-3)' }}>{exp.expense_categories?.name_sq || exp.category || '—'}</td>
                        <td style={{ fontSize:12, color:'var(--text-3)' }}>{exp.expense_date || '—'}</td>
                        <td style={{ fontSize:11, color:'var(--text-3)' }}>{exp.payment_method || '—'}</td>
                        <td style={{ textAlign:'right', fontSize:13, fontWeight:700 }}>€{Number(exp.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop:'2px solid var(--border)', background:'rgba(245,158,11,0.05)' }}>
                      <td colSpan={4} style={{ padding:'8px 12px', fontSize:12, fontWeight:700, color:'var(--text-3)' }}>TOTALI</td>
                      <td style={{ textAlign:'right', padding:'8px 12px', fontWeight:800, fontSize:14 }}>€{totalPurchases.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
