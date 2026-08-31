'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, CheckCircle2, XCircle, Zap, Link2, AlertTriangle, Landmark } from 'lucide-react'
import { toast } from 'sonner'

interface Company { id: string; name: string }
interface BankEntry { id: string; entry_date: string; description?: string; amount: number; entry_type: string }
interface Invoice { id: string; client_name?: string; bill_to_name?: string; total_amount?: number; total?: number; status: string; issue_date: string }
interface AutoMatch { entryId: string; invoiceId: string; confidence: number; amount: number }
interface Stats { total: number; reconciled: number; unreconciled: number; autoMatchFound: number }

const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

export default function RakordimClient({ companies }: { companies: Company[] }) {
  const now = new Date()
  const [companyId, setCompanyId] = useState(companies[0]?.id || '')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<{ bankEntries: BankEntry[]; invoices: Invoice[]; reconciled: { id: string; bank_entry_id: string; invoice_id?: string }[]; autoMatches: AutoMatch[]; stats: Stats } | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/bank-reconciliation?company_id=${companyId}&year=${year}&month=${month}`)
      const d = await res.json()
      setData(d)
    } catch { toast.error('Gabim gjatë ngarkimit') }
    finally { setLoading(false) }
  }, [companyId, year, month])

  useEffect(() => { fetchData() }, [fetchData])

  async function applyAutoMatch(match: AutoMatch) {
    setProcessing(match.entryId)
    try {
      const res = await fetch('/api/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, bank_entry_id: match.entryId, invoice_id: match.invoiceId, status: 'matched' })
      })
      if (!res.ok) throw new Error()
      toast.success('U rakordua dhe fatura u shënua si e paguar')
      await fetchData()
    } catch { toast.error('Gabim gjatë rakordimit') }
    finally { setProcessing(null) }
  }

  async function manualMatch() {
    if (!selectedEntry || !selectedInvoice) { toast.error('Zgjidh hyrjen bankare dhe faturën'); return }
    setProcessing(selectedEntry)
    try {
      const res = await fetch('/api/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, bank_entry_id: selectedEntry, invoice_id: selectedInvoice, status: 'manual' })
      })
      if (!res.ok) throw new Error()
      toast.success('Rakordim manual i kryer')
      setSelectedEntry(null); setSelectedInvoice(null)
      await fetchData()
    } catch { toast.error('Gabim') }
    finally { setProcessing(null) }
  }

  async function markUnmatched(entryId: string) {
    setProcessing(entryId)
    try {
      await fetch('/api/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, bank_entry_id: entryId, status: 'unmatched', notes: 'Pa faturë përkatëse' })
      })
      await fetchData()
    } catch {}
    finally { setProcessing(null) }
  }

  const reconciledIds = new Set(data?.reconciled.map(r => r.bank_entry_id) || [])
  const unreconciledEntries = (data?.bankEntries || []).filter(e => !reconciledIds.has(e.id))
  const unpaidInvoices = (data?.invoices || []).filter(inv => inv.status !== 'paid')

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, outline:'none' }

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>Rakordim Bankar</h1>
        <p style={{ fontSize:13, color:'var(--text-3)' }}>Krahasimi automatik i transaksioneve bankare me faturat</p>
      </div>

      {/* Filters */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 20px', display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
        {companies.length > 1 && (
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Kompania</label>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)} style={{ ...I, minWidth:180 }}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Muaji</label>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={I}>
            {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Viti</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={I}>
            {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--text-3)' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin:'0 auto 10px' }}/>
          <p style={{ fontSize:13 }}>Duke analizuar transaksionet...</p>
        </div>
      ) : data && (
        <>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[
              { label:'Total Hyrje Banka', value:data.stats.total, color:'#3B82F6' },
              { label:'Të Rakorduara', value:data.stats.reconciled, color:'#10B981' },
              { label:'Pa Rakorduar', value:data.stats.unreconciled, color:'#EF4444' },
              { label:'Auto-Match Gjetur', value:data.stats.autoMatchFound, color:'#9B5CF8' },
            ].map(k => (
              <div key={k.label} style={{ background:'var(--bg-card)', border:`1px solid ${k.color}25`, borderRadius:14, padding:'14px 16px', borderTop:`2px solid ${k.color}` }}>
                <p style={{ fontSize:10, color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{k.label}</p>
                <p style={{ fontFamily:'Poppins,sans-serif', fontSize:26, fontWeight:900, color:k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Auto Matches */}
          {data.autoMatches.length > 0 && (
            <div style={{ background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:14, padding:'16px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <Zap size={16} style={{ color:'var(--text-1)' }}/>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)' }}>Auto-Match — {data.autoMatches.length} match i gjetur</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {data.autoMatches.map(match => {
                  const entry = data.bankEntries.find(e => e.id === match.entryId)
                  const invoice = data.invoices.find(i => i.id === match.invoiceId)
                  if (!entry || !invoice) return null
                  return (
                    <div key={match.entryId} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:10, background:'var(--bg-card)', border:'1px solid rgba(16,185,129,0.2)', flexWrap:'wrap' }}>
                      <div style={{ flex:1, minWidth:200 }}>
                        <p style={{ fontSize:12, color:'var(--text-3)', marginBottom:2 }}>Banka: {entry.entry_date}</p>
                        <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>{entry.description || 'Hyrje bankare'}</p>
                        <p style={{ fontSize:13, color:'var(--text-1)', fontWeight:700 }}>€{Number(entry.amount).toFixed(2)}</p>
                      </div>
                      <div style={{ color:'var(--text-3)', fontSize:18 }}>↔</div>
                      <div style={{ flex:1, minWidth:200 }}>
                        <p style={{ fontSize:12, color:'var(--text-3)', marginBottom:2 }}>Fatura: {invoice.issue_date}</p>
                        <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>{invoice.client_name || invoice.bill_to_name || '—'}</p>
                        <p style={{ fontSize:13, color:'var(--text-1)', fontWeight:700 }}>€{Number(invoice.total_amount||invoice.total||0).toFixed(2)}</p>
                      </div>
                      <div style={{ display:'flex', gap:7, flexShrink:0 }}>
                        <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, background:'rgba(16,185,129,0.1)', color:'var(--text-1)', fontWeight:700 }}>
                          {match.confidence}% match
                        </span>
                        <button onClick={() => applyAutoMatch(match)} disabled={processing === match.entryId}
                          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, background:'var(--bg-muted)', color:'var(--text-1)', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                          {processing === match.entryId ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>}
                          Konfirmo
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Manual matching */}
          {unreconciledEntries.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {/* Unreconciled bank entries */}
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                  <Landmark size={14} style={{ color:'var(--text-3)' }}/>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>Hyrjet Pa Rakorduar ({unreconciledEntries.length})</p>
                </div>
                <div style={{ maxHeight:300, overflowY:'auto' }}>
                  {unreconciledEntries.map(entry => (
                    <div key={entry.id} onClick={() => setSelectedEntry(entry.id === selectedEntry ? null : entry.id)}
                      style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background .15s',
                        background: selectedEntry === entry.id ? 'rgba(90,31,214,0.1)' : 'transparent',
                        borderLeft: selectedEntry === entry.id ? '3px solid #9B5CF8' : '3px solid transparent' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <p style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{entry.description || 'Hyrje bankare'}</p>
                          <p style={{ fontSize:11, color:'var(--text-3)' }}>{entry.entry_date}</p>
                        </div>
                        <p style={{ fontSize:14, fontWeight:800, color:'var(--text-1)' }}>€{Number(entry.amount).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unpaid invoices */}
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                  <AlertTriangle size={14} style={{ color:'#F59E0B' }}/>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>Faturat Pa Paguar ({unpaidInvoices.length})</p>
                </div>
                <div style={{ maxHeight:300, overflowY:'auto' }}>
                  {unpaidInvoices.length === 0 ? (
                    <p style={{ padding:24, textAlign:'center', color:'var(--text-3)', fontSize:13 }}>Të gjitha faturat janë paguar</p>
                  ) : unpaidInvoices.map(inv => (
                    <div key={inv.id} onClick={() => setSelectedInvoice(inv.id === selectedInvoice ? null : inv.id)}
                      style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background .15s',
                        background: selectedInvoice === inv.id ? 'rgba(90,31,214,0.1)' : 'transparent',
                        borderLeft: selectedInvoice === inv.id ? '3px solid #9B5CF8' : '3px solid transparent' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <p style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{inv.client_name || inv.bill_to_name || '—'}</p>
                          <p style={{ fontSize:11, color:'var(--text-3)' }}>{inv.issue_date}</p>
                        </div>
                        <p style={{ fontSize:14, fontWeight:800, color:'#F59E0B' }}>€{Number(inv.total_amount||inv.total||0).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Manual match button */}
          {selectedEntry && selectedInvoice && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, padding:'16px 20px', background:'rgba(90,31,214,0.08)', border:'1px solid rgba(90,31,214,0.25)', borderRadius:14 }}>
              <Link2 size={16} style={{ color:'#9B5CF8' }}/>
              <p style={{ fontSize:14, color:'var(--text-1)', fontWeight:600 }}>Rakordim manual i zgjedhur</p>
              <button onClick={manualMatch} disabled={!!processing}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', border:'none', cursor:'pointer', fontWeight:700, fontSize:14 }}>
                {processing ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle2 size={14}/>}
                Konfirmo Rakordimin
              </button>
            </div>
          )}

          {/* Reconciled history */}
          {data.reconciled.length > 0 && (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                <CheckCircle2 size={14} style={{ color:'var(--text-1)' }}/>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>Të Rakorduara ({data.reconciled.length})</p>
              </div>
              <div style={{ padding:'8px 16px', display:'flex', flexDirection:'column', gap:4 }}>
                {data.reconciled.slice(0,5).map(r => {
                  const entry = data.bankEntries.find(e => e.id === r.bank_entry_id)
                  return (
                    <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                      <CheckCircle2 size={13} style={{ color:'var(--text-1)', flexShrink:0 }}/>
                      <p style={{ fontSize:12, color:'var(--text-3)', flex:1 }}>{entry?.description || 'Hyrje bankare'} — {entry?.entry_date}</p>
                      <p style={{ fontSize:12, fontWeight:600, color:'var(--text-1)' }}>€{Number(entry?.amount||0).toFixed(2)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
