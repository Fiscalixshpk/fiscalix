'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, Loader2, FileSpreadsheet, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Company { id: string; name: string }

const QUARTERS = [
  { q: 1, label: 'T1 — Janar, Shkurt, Mars', months: 'Jan-Mar' },
  { q: 2, label: 'T2 — Prill, Maj, Qershor', months: 'Pri-Qer' },
  { q: 3, label: 'T3 — Korrik, Gusht, Shtator', months: 'Kor-Sht' },
  { q: 4, label: 'T4 — Tetor, Nëntor, Dhjetor', months: 'Tet-Dhj' },
]

interface VATSummary {
  vatOut: number
  vatIn: number
  balance: number
  invoiceCount: number
  expenseCount: number
}

export default function TVSHClient({ companies }: { companies: Company[] }) {
  const now = new Date()
  const currentQ = Math.ceil((now.getMonth() + 1) / 3)
  const [companyId, setCompanyId] = useState(companies[0]?.id || '')
  const [year, setYear] = useState(now.getFullYear())
  const [quarter, setQuarter] = useState(currentQ)
  const [summary, setSummary] = useState<VATSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fetchSummary = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const startMonth = (quarter - 1) * 3 + 1
      const endMonth = startMonth + 2
      const startDate = `${year}-${String(startMonth).padStart(2,'0')}-01`
      const endDate = `${year}-${String(endMonth).padStart(2,'0')}-31`

      const [invRes, expRes] = await Promise.all([
        fetch(`/api/invoices?company_id=${companyId}&from=${startDate}&to=${endDate}&limit=1000`),
        fetch(`/api/expenses?company_id=${companyId}&from=${startDate}&to=${endDate}&limit=1000`),
      ])

      const invData = invRes.ok ? await invRes.json() : []
      const expData = expRes.ok ? await expRes.json() : []

      const invoices = Array.isArray(invData) ? invData : (invData.invoices || [])
      const expenses = Array.isArray(expData) ? expData : (expData.expenses || [])

      let vatOut = 0
      invoices.forEach((inv: { total_amount?: number; total?: number; vat_rate?: number }) => {
        const total = Number(inv.total_amount || inv.total || 0)
        const vr = Number(inv.vat_rate || 18)
        vatOut += total - total / (1 + vr / 100)
      })

      let vatIn = 0
      expenses.filter((e: { is_vat_applicable?: boolean }) => e.is_vat_applicable).forEach((exp: { amount?: number; vat_rate?: number }) => {
        const amt = Number(exp.amount || 0)
        const vr = Number(exp.vat_rate || 18)
        vatIn += amt * vr / 100
      })

      setSummary({
        vatOut: +vatOut.toFixed(2),
        vatIn: +vatIn.toFixed(2),
        balance: +(vatOut - vatIn).toFixed(2),
        invoiceCount: invoices.length,
        expenseCount: expenses.filter((e: { is_vat_applicable?: boolean }) => e.is_vat_applicable).length,
      })
    } catch { setSummary(null) }
    finally { setLoading(false) }
  }, [companyId, year, quarter])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  async function exportExcel() {
    setExporting(true)
    try {
      const res = await fetch(`/api/vat-export?company_id=${companyId}&year=${year}&quarter=${quarter}`)
      if (!res.ok) throw new Error('Gabim gjatë gjenerimit')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `Deklarata_TVSH_T${quarter}_${year}.xlsx`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('Deklarata TVSH u shkarkua')
    } catch { toast.error('Gabim gjatë shkarkimit') }
    finally { setExporting(false) }
  }

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, outline:'none' }

  // VAT deadline
  const deadlineMonth = quarter * 3 + 1
  const deadlineLabel = ['Prill','Korrik','Tetor','Janar'][quarter-1]
  const isUrgent = now.getMonth() + 1 === deadlineMonth - 1 && now.getDate() >= 10

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>Deklarata TVSH</h1>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>Llogaritja dhe eksporti i TVSH tremujore — format ATK</p>
        </div>
        <button onClick={exportExcel} disabled={exporting || !companyId}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:12, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontWeight:700, fontSize:14, border:'none', cursor:'pointer' }}>
          {exporting ? <Loader2 size={15} className="animate-spin"/> : <Download size={15}/>}
          {exporting ? 'Duke gjeneruar...' : 'Eksporto Excel ATK'}
        </button>
      </div>

      {/* Deadline Alert */}
      {isUrgent && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderRadius:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle size={18} style={{ color:'var(--text-1)', flexShrink:0 }}/>
          <p style={{ fontSize:13, color:'var(--text-1)', fontWeight:600 }}>
            ⚠️ Afati i deklarimit të TVSH për T{quarter} {year} — deri më 20 {deadlineLabel} {year}
          </p>
        </div>
      )}

      {/* Client selector — kontabilisti */}
      {companies.length > 1 && (
        <div style={{ background:'linear-gradient(135deg,rgba(90,31,214,0.1),rgba(90,31,214,0.05))', border:'1px solid rgba(90,31,214,0.25)', borderRadius:14, padding:'16px 20px' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#9B5CF8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
            👤 Zgjidh Klientin
          </p>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {companies.map(c => (
              <button key={c.id} onClick={() => setCompanyId(c.id)}
                style={{ padding:'9px 18px', borderRadius:10, border:`1px solid ${companyId===c.id ? 'rgba(90,31,214,0.5)' : 'var(--border)'}`, background:companyId===c.id ? 'rgba(90,31,214,0.15)' : 'var(--bg-card)', color:companyId===c.id ? 'var(--purple)' : 'var(--text-2)', fontSize:13, fontWeight:companyId===c.id ? 700 : 400, cursor:'pointer' }}>
                {companyId===c.id ? '✓ ' : ''}{c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 20px', display:'flex', gap:14, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Tremujori</label>
          <select value={quarter} onChange={e => setQuarter(parseInt(e.target.value))} style={{ ...I, minWidth:220 }}>
            {QUARTERS.map(q => <option key={q.q} value={q.q}>{q.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Viti</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ ...I }}>
            {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--text-3)' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin:'0 auto 10px' }}/>
          <p style={{ fontSize:13 }}>Duke llogaritur TVSH-në...</p>
        </div>
      ) : summary && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            <div style={{ background:'var(--bg-card)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:16, padding:'20px 22px', borderTop:'3px solid #10B981' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <TrendingUp size={16} style={{ color:'var(--text-1)' }}/>
                <p style={{ fontSize:12, fontWeight:700, color:'var(--text-1)', textTransform:'uppercase', letterSpacing:'0.06em' }}>TVSH Dalëse</p>
              </div>
              <p style={{ fontFamily:'Poppins,sans-serif', fontSize:28, fontWeight:900, color:'var(--text-1)', marginBottom:4 }}>€{summary.vatOut.toFixed(2)}</p>
              <p style={{ fontSize:12, color:'var(--text-1)' }}>{summary.invoiceCount} fatura shitjeje</p>
            </div>

            <div style={{ background:'var(--bg-card)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:16, padding:'20px 22px', borderTop:'3px solid #EF4444' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <TrendingDown size={16} style={{ color:'var(--text-1)' }}/>
                <p style={{ fontSize:12, fontWeight:700, color:'var(--text-1)', textTransform:'uppercase', letterSpacing:'0.06em' }}>TVSH Hyrëse</p>
              </div>
              <p style={{ fontFamily:'Poppins,sans-serif', fontSize:28, fontWeight:900, color:'var(--text-1)', marginBottom:4 }}>€{summary.vatIn.toFixed(2)}</p>
              <p style={{ fontSize:12, color:'var(--text-1)' }}>{summary.expenseCount} fatura blerjeje</p>
            </div>

            <div style={{ background:'var(--bg-card)', border:`1px solid ${summary.balance >= 0 ? 'rgba(90,31,214,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius:16, padding:'20px 22px', borderTop:`3px solid ${summary.balance >= 0 ? '#5A1FD6' : '#10B981'}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <FileSpreadsheet size={16} style={{ color: summary.balance >= 0 ? '#9B5CF8' : '#10B981' }}/>
                <p style={{ fontSize:12, fontWeight:700, color: summary.balance >= 0 ? '#9B5CF8' : '#10B981', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  {summary.balance >= 0 ? 'TVSH në Pagesë' : 'TVSH Rimbursim'}
                </p>
              </div>
              <p style={{ fontFamily:'Poppins,sans-serif', fontSize:28, fontWeight:900, color: summary.balance >= 0 ? '#9B5CF8' : '#10B981', marginBottom:4 }}>
                €{Math.abs(summary.balance).toFixed(2)}
              </p>
              <p style={{ fontSize:12, color:'var(--text-3)' }}>
                {summary.balance >= 0 ? `Për t'u paguar deri 20 ${deadlineLabel}` : 'Rimbursim nga ATK'}
              </p>
            </div>
          </div>

          {/* Formula */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 22px' }}>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', marginBottom:14, textTransform:'uppercase', letterSpacing:'0.06em' }}>Formula e Llogaritjes</p>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>TVSH Dalëse</p>
                <p style={{ fontSize:18, fontWeight:800, color:'var(--text-1)' }}>€{summary.vatOut.toFixed(2)}</p>
              </div>
              <p style={{ fontSize:22, color:'var(--text-3)', fontWeight:300 }}>−</p>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>TVSH Hyrëse</p>
                <p style={{ fontSize:18, fontWeight:800, color:'var(--text-1)' }}>€{summary.vatIn.toFixed(2)}</p>
              </div>
              <p style={{ fontSize:22, color:'var(--text-3)', fontWeight:300 }}>=</p>
              <div style={{ textAlign:'center', padding:'10px 18px', borderRadius:12, background: summary.balance >= 0 ? 'rgba(90,31,214,0.1)' : 'rgba(16,185,129,0.1)', border:`1px solid ${summary.balance >= 0 ? 'rgba(90,31,214,0.25)' : 'rgba(16,185,129,0.25)'}` }}>
                <p style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>{summary.balance >= 0 ? 'Paguaj ATK' : 'Rimburso nga ATK'}</p>
                <p style={{ fontSize:20, fontWeight:800, color: summary.balance >= 0 ? '#9B5CF8' : '#10B981' }}>€{Math.abs(summary.balance).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Export CTA */}
          <div style={{ padding:'18px 22px', borderRadius:14, background:'rgba(90,31,214,0.06)', border:'1px solid rgba(90,31,214,0.18)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14 }}>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:3 }}>Gati për ATK</p>
              <p style={{ fontSize:12, color:'var(--text-3)' }}>Eksporti përmban: Librin e Shitjeve, Librin e Blerjeve dhe Deklaratën TVSH në një Excel</p>
            </div>
            <button onClick={exportExcel} disabled={exporting}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:11, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontWeight:700, fontSize:14, border:'none', cursor:'pointer', flexShrink:0 }}>
              {exporting ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
              {exporting ? 'Duke gjeneruar...' : 'Shkarko Deklaratën'}
            </button>
          </div>
        </>
      )}

      {/* Info */}
      <div style={{ padding:'14px 18px', borderRadius:12, background:'rgba(90,31,214,0.05)', border:'1px solid rgba(90,31,214,0.15)', fontSize:12, color:'var(--text-3)', lineHeight:1.8 }}>
        <strong style={{ color:'var(--purple-light)' }}>Afatet e deklarimit:</strong> T1 → 20 Prill · T2 → 20 Korrik · T3 → 20 Tetor · T4 → 20 Janar &nbsp;|&nbsp; <strong style={{ color:'var(--purple-light)' }}>Normat:</strong> 18% standarde · 8% ushqim/ilaçe &nbsp;|&nbsp; Deklaro: edi.atk-ks.org
      </div>
    </div>
  )
}
