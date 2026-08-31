'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, Loader2, TrendingUp, TrendingDown, AlertCircle, Shield } from 'lucide-react'
import { toast } from 'sonner'

const QUARTERS = ['T1 — Jan-Mar','T2 — Pri-Qer','T3 — Kor-Sht','T4 — Tet-Dhj']

export default function TVSHTab({ companyId, isVatRegistered }: { companyId: string; isVatRegistered?: boolean }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth()+1)/3))
  const [summary, setSummary] = useState<{ vatOut:number; vatIn:number; balance:number; invoiceCount:number; expenseCount:number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const sm = (quarter-1)*3+1
      const startDate = `${year}-${String(sm).padStart(2,'0')}-01`
      const endDate = `${year}-${String(sm+2).padStart(2,'0')}-31`
      const [invRes, expRes] = await Promise.all([
        fetch(`/api/invoices?company_id=${companyId}&from=${startDate}&to=${endDate}&limit=1000`),
        fetch(`/api/expenses?company_id=${companyId}&from=${startDate}&to=${endDate}&limit=1000`),
      ])
      const invData = invRes.ok ? await invRes.json() : []
      const expData = expRes.ok ? await expRes.json() : []
      const invoices = Array.isArray(invData) ? invData : (invData.invoices || [])
      const expenses = Array.isArray(expData) ? expData : (expData.expenses || [])

      let vatOut = 0
      invoices.forEach((inv: { total_amount?:number; total?:number; vat_rate?:number }) => {
        const total = Number(inv.total_amount||inv.total||0)
        const vr = Number(inv.vat_rate||18)
        vatOut += total - total/(1+vr/100)
      })
      let vatIn = 0
      expenses.filter((e: { is_vat_applicable?:boolean }) => e.is_vat_applicable).forEach((exp: { amount?:number; vat_rate?:number }) => {
        vatIn += Number(exp.amount||0) * Number(exp.vat_rate||18) / 100
      })
      setSummary({ vatOut:+vatOut.toFixed(2), vatIn:+vatIn.toFixed(2), balance:+(vatOut-vatIn).toFixed(2), invoiceCount:invoices.length, expenseCount:expenses.filter((e: { is_vat_applicable?:boolean }) => e.is_vat_applicable).length })
    } catch { setSummary(null) }
    finally { setLoading(false) }
  }, [companyId, year, quarter])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  async function exportExcel() {
    setExporting(true)
    try {
      const res = await fetch(`/api/vat-export?company_id=${companyId}&year=${year}&quarter=${quarter}`)
      if (!res.ok) throw new Error('Gabim')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `TVSH_T${quarter}_${year}.xlsx`
      a.click()
      toast.success('Deklarata TVSH u shkarkua')
    } catch { toast.error('Gabim gjatë shkarkimit') }
    finally { setExporting(false) }
  }

  if (!isVatRegistered) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <Shield size={36} style={{ color:'var(--text-3)', margin:'0 auto 12px', opacity:0.3 }}/>
      <p style={{ fontSize:14, color:'var(--text-3)' }}>Ky klient nuk është i regjistruar për TVSH.</p>
    </div>
  )

  const deadlineMonth = quarter * 3
  const deadlineLabel = ['Prill','Korrik','Tetor','Janar'][quarter-1]
  const isUrgent = now.getMonth() + 1 === deadlineMonth && now.getDate() >= 15

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, outline:'none' }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <select value={quarter} onChange={e => setQuarter(parseInt(e.target.value))} style={{ ...I, minWidth:180 }}>
          {QUARTERS.map((q,i) => <option key={i+1} value={i+1}>{q}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={I}>
          {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={exportExcel} disabled={exporting}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', marginLeft:'auto' }}>
          {exporting ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}
          Eksporto ATK
        </button>
      </div>

      {isUrgent && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={15} style={{ color:'var(--text-1)' }}/>
          <p style={{ fontSize:13, color:'var(--text-1)', fontWeight:600 }}>⚠️ Afati: deri më 20 {deadlineLabel} {year}</p>
        </div>
      )}

      {loading ? (
        <div style={{ padding:32, textAlign:'center' }}><Loader2 size={18} className="animate-spin" style={{ margin:'0 auto' }}/></div>
      ) : summary && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <div style={{ background:'var(--bg-muted)', borderRadius:12, padding:'14px 16px', borderTop:'2px solid #10B981' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <TrendingUp size={13} style={{ color:'white' }}/>
                <p style={{ fontSize:10, fontWeight:700, color:'white', textTransform:'uppercase', letterSpacing:'0.06em' }}>TVSH Dalëse</p>
              </div>
              <p style={{ fontFamily:'Poppins,sans-serif', fontSize:22, fontWeight:900, color:'white' }}>€{summary.vatOut.toFixed(2)}</p>
              <p style={{ fontSize:11, color:'white', marginTop:2 }}>{summary.invoiceCount} fatura</p>
            </div>
            <div style={{ background:'var(--bg-muted)', borderRadius:12, padding:'14px 16px', borderTop:'2px solid #EF4444' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <TrendingDown size={13} style={{ color:'white' }}/>
                <p style={{ fontSize:10, fontWeight:700, color:'white', textTransform:'uppercase', letterSpacing:'0.06em' }}>TVSH Hyrëse</p>
              </div>
              <p style={{ fontFamily:'Poppins,sans-serif', fontSize:22, fontWeight:900, color:'white' }}>€{summary.vatIn.toFixed(2)}</p>
              <p style={{ fontSize:11, color:'white', marginTop:2 }}>{summary.expenseCount} blerje</p>
            </div>
            <div style={{ background:'var(--bg-muted)', borderRadius:12, padding:'14px 16px', borderTop:`2px solid ${summary.balance>=0?'#9B5CF8':'#10B981'}` }}>
              <p style={{ fontSize:10, fontWeight:700, color: summary.balance>=0?'#9B5CF8':'#10B981', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                {summary.balance>=0?'Paguaj ATK':'Rimbursim'}
              </p>
              <p style={{ fontFamily:'Poppins,sans-serif', fontSize:22, fontWeight:900, color: summary.balance>=0?'#9B5CF8':'#10B981' }}>€{Math.abs(summary.balance).toFixed(2)}</p>
              <p style={{ fontSize:11, color:'white', marginTop:2 }}>T{quarter} {year}</p>
            </div>
          </div>

          <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(90,31,214,0.05)', border:'1px solid rgba(90,31,214,0.15)', fontSize:12, color:'var(--text-3)' }}>
            Afatet: T1→20 Prill · T2→20 Korrik · T3→20 Tetor · T4→20 Janar · Normat: 18% standarde · 8% ushqim/ilaçe
          </div>
        </>
      )}
    </div>
  )
}
