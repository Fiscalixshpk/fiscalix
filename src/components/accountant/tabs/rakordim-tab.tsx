'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, CheckCircle2, Zap, Link2, Landmark } from 'lucide-react'
import { toast } from 'sonner'

interface BankEntry { id: string; entry_date: string; description?: string; amount: number; entry_type: string }
interface Invoice { id: string; client_name?: string; bill_to_name?: string; total_amount?: number; total?: number; status: string; issue_date: string }
interface AutoMatch { entryId: string; invoiceId: string; confidence: number; amount: number }

const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

export default function RakordimTab({ companyId }: { companyId: string }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()+1)
  const [data, setData] = useState<{ bankEntries:BankEntry[]; invoices:Invoice[]; reconciled:{id:string;bank_entry_id:string;invoice_id?:string}[]; autoMatches:AutoMatch[]; stats:{total:number;reconciled:number;unreconciled:number;autoMatchFound:number} } | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<string|null>(null)
  const [selectedEntry, setSelectedEntry] = useState<string|null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<string|null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bank-reconciliation?company_id=${companyId}&year=${year}&month=${month}`)
      setData(await res.json())
    } catch {}
    finally { setLoading(false) }
  }, [companyId, year, month])

  useEffect(() => { fetchData() }, [fetchData])

  async function applyAutoMatch(match: AutoMatch) {
    setProcessing(match.entryId)
    try {
      await fetch('/api/bank-reconciliation', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ company_id:companyId, bank_entry_id:match.entryId, invoice_id:match.invoiceId, status:'matched' }) })
      toast.success('U rakordua — fatura u shënua si e paguar')
      await fetchData()
    } catch { toast.error('Gabim') }
    finally { setProcessing(null) }
  }

  async function manualMatch() {
    if (!selectedEntry || !selectedInvoice) return
    setProcessing(selectedEntry)
    try {
      await fetch('/api/bank-reconciliation', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ company_id:companyId, bank_entry_id:selectedEntry, invoice_id:selectedInvoice, status:'manual' }) })
      toast.success('Rakordim manual i kryer')
      setSelectedEntry(null); setSelectedInvoice(null)
      await fetchData()
    } catch { toast.error('Gabim') }
    finally { setProcessing(null) }
  }

  const reconciledIds = new Set(data?.reconciled.map(r => r.bank_entry_id) || [])
  const unreconciledEntries = (data?.bankEntries || []).filter(e => !reconciledIds.has(e.id) && e.entry_type==='hyrje')
  const unpaidInvoices = (data?.invoices || []).filter(inv => inv.status !== 'paid')

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, outline:'none' }

  return (
    <div className="space-y-4">
      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ ...I, width:'auto' }}>
          {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={I}>
          {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ padding:32, textAlign:'center' }}><Loader2 size={18} className="animate-spin" style={{ margin:'0 auto' }}/></div>
      ) : data && (
        <>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            {[
              { label:'Total Hyrje', value:data.stats.total, color:'#3B82F6' },
              { label:'Rakorduara', value:data.stats.reconciled, color:'#10B981' },
              { label:'Pa Rakorduar', value:data.stats.unreconciled, color:'#EF4444' },
              { label:'Auto-Match', value:data.stats.autoMatchFound, color:'#9B5CF8' },
            ].map(k => (
              <div key={k.label} style={{ background:'var(--bg-muted)', borderRadius:12, padding:'12px 14px', borderTop:`2px solid ${k.color}` }}>
                <p style={{ fontSize:10, color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', marginBottom:4 }}>{k.label}</p>
                <p style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:800, color:k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Auto matches */}
          {data.autoMatches.length > 0 && (
            <div style={{ background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <Zap size={14} style={{ color:'var(--text-1)' }}/>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>Auto-Match ({data.autoMatches.length})</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {data.autoMatches.map(match => {
                  const entry = data.bankEntries.find(e => e.id === match.entryId)
                  const invoice = data.invoices.find(i => i.id === match.invoiceId)
                  if (!entry || !invoice) return null
                  return (
                    <div key={match.entryId} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'var(--bg-card)', border:'1px solid rgba(16,185,129,0.2)', flexWrap:'wrap' }}>
                      <div style={{ flex:1, minWidth:150 }}>
                        <p style={{ fontSize:11, color:'var(--text-3)' }}>Banka: {entry.entry_date}</p>
                        <p style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>€{Number(entry.amount).toFixed(2)}</p>
                      </div>
                      <span style={{ color:'var(--text-3)' }}>↔</span>
                      <div style={{ flex:1, minWidth:150 }}>
                        <p style={{ fontSize:11, color:'var(--text-3)' }}>Fatura: {invoice.issue_date}</p>
                        <p style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{invoice.client_name||invoice.bill_to_name||'—'}</p>
                      </div>
                      <button onClick={() => applyAutoMatch(match)} disabled={processing===match.entryId}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, background:'var(--bg-muted)', color:'var(--text-1)', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0 }}>
                        {processing===match.entryId ? <Loader2 size={11} className="animate-spin"/> : <CheckCircle2 size={11}/>}
                        Konfirmo
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Manual match */}
          {unreconciledEntries.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6 }}>
                  <Landmark size={13} style={{ color:'var(--text-3)' }}/>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--text-1)' }}>Hyrjet Pa Rakorduar ({unreconciledEntries.length})</p>
                </div>
                <div style={{ maxHeight:200, overflowY:'auto' }}>
                  {unreconciledEntries.map(entry => (
                    <div key={entry.id} onClick={() => setSelectedEntry(entry.id===selectedEntry?null:entry.id)}
                      style={{ padding:'9px 12px', borderBottom:'1px solid var(--border)', cursor:'pointer',
                        background: selectedEntry===entry.id?'rgba(90,31,214,0.1)':'transparent',
                        borderLeft: selectedEntry===entry.id?'3px solid #9B5CF8':'3px solid transparent' }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <div>
                          <p style={{ fontSize:12, fontWeight:600, color:'var(--text-1)' }}>{entry.description||'Hyrje bankare'}</p>
                          <p style={{ fontSize:11, color:'var(--text-3)' }}>{entry.entry_date}</p>
                        </div>
                        <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>€{Number(entry.amount).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--text-1)' }}>Faturat Pa Paguar ({unpaidInvoices.length})</p>
                </div>
                <div style={{ maxHeight:200, overflowY:'auto' }}>
                  {unpaidInvoices.length === 0 ? (
                    <p style={{ padding:24, textAlign:'center', color:'var(--text-3)', fontSize:12 }}>Të gjitha të paguara ✅</p>
                  ) : unpaidInvoices.map(inv => (
                    <div key={inv.id} onClick={() => setSelectedInvoice(inv.id===selectedInvoice?null:inv.id)}
                      style={{ padding:'9px 12px', borderBottom:'1px solid var(--border)', cursor:'pointer',
                        background: selectedInvoice===inv.id?'rgba(90,31,214,0.1)':'transparent',
                        borderLeft: selectedInvoice===inv.id?'3px solid #9B5CF8':'3px solid transparent' }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <div>
                          <p style={{ fontSize:12, fontWeight:600, color:'var(--text-1)' }}>{inv.client_name||inv.bill_to_name||'—'}</p>
                          <p style={{ fontSize:11, color:'var(--text-3)' }}>{inv.issue_date}</p>
                        </div>
                        <p style={{ fontSize:13, fontWeight:700, color:'#F59E0B' }}>€{Number(inv.total_amount||inv.total||0).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedEntry && selectedInvoice && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'14px 18px', background:'rgba(90,31,214,0.08)', border:'1px solid rgba(90,31,214,0.2)', borderRadius:12 }}>
              <Link2 size={14} style={{ color:'#9B5CF8' }}/>
              <p style={{ fontSize:13, color:'var(--text-1)', fontWeight:600 }}>Rakordim manual i zgjedhur</p>
              <button onClick={manualMatch} disabled={!!processing}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', border:'none', cursor:'pointer', fontWeight:700, fontSize:13 }}>
                {processing?<Loader2 size={13} className="animate-spin"/>:<CheckCircle2 size={13}/>}
                Konfirmo
              </button>
            </div>
          )}

          {data.stats.reconciled > 0 && (
            <p style={{ fontSize:12, color:'var(--text-1)', textAlign:'center' }}>✅ {data.stats.reconciled} transaksione të rakorduara këtë muaj</p>
          )}
        </>
      )}
    </div>
  )
}
