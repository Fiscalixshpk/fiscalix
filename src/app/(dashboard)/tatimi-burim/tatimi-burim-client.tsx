'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Download, Loader2, Receipt } from 'lucide-react'
import { toast } from 'sonner'

interface Company { id: string; name: string }
interface WHTRecord { id: string; vendor_name: string; service_description?: string; amount: number; tax_rate: number; tax_amount: number; payment_date: string }

const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

export default function TatimiBurimClient({ companies }: { companies: Company[] }) {
  const now = new Date()
  const [companyId, setCompanyId] = useState(companies[0]?.id || '')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [records, setRecords] = useState<WHTRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ vendor_name: '', service_description: '', amount: '', tax_rate: '9', payment_date: new Date().toISOString().split('T')[0] })

  const fetchRecords = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/withholding-tax?company_id=${companyId}&year=${year}&month=${month}`)
      const data = await res.json()
      setRecords(Array.isArray(data) ? data : [])
    } catch { setRecords([]) }
    finally { setLoading(false) }
  }, [companyId, year, month])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  async function addRecord() {
    if (!form.vendor_name.trim() || !form.amount) { toast.error('Plotëso fushat e kërkuara'); return }
    try {
      const res = await fetch('/api/withholding-tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount), tax_rate: Number(form.tax_rate), company_id: companyId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRecords(prev => [...prev, data])
      setForm({ vendor_name: '', service_description: '', amount: '', tax_rate: '9', payment_date: new Date().toISOString().split('T')[0] })
      setShowModal(false)
      toast.success('Rekordi u shtua')
    } catch (err: unknown) { toast.error((err as Error).message) }
  }

  async function deleteRecord(id: string) {
    if (!window.confirm('A je i sigurt?')) return
    await fetch('/api/withholding-tax', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setRecords(prev => prev.filter(r => r.id !== id))
    toast.success('U fshi')
  }

  async function exportExcel() {
    setExporting(true)
    try {
      const res = await fetch(`/api/withholding-tax/export?company_id=${companyId}&year=${year}&month=${month}`)
      if (!res.ok) throw new Error('Gabim')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `Tatimi_Burim_${MONTHS[month-1]}_${year}.xlsx`
      a.click()
      toast.success('Deklarata u shkarkua')
    } catch { toast.error('Gabim gjatë shkarkimit') }
    finally { setExporting(false) }
  }

  const totAmount = records.reduce((s, r) => s + Number(r.amount), 0)
  const totTax = records.reduce((s, r) => s + Number(r.tax_amount), 0)
  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }

  return (
    <div className="page-enter space-y-6">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>Tatimi në Burim</h1>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>Evidencë dhe deklaratë e tatimit në burim 9%</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => setShowModal(true)}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:11, border:'1px solid rgba(90,31,214,0.3)', background:'rgba(90,31,214,0.1)', color:'#9B5CF8', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            <Plus size={14}/> Shto Rekord
          </button>
          <button onClick={exportExcel} disabled={exporting || records.length === 0}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:11, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', opacity:records.length===0?0.5:1 }}>
            {exporting ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}
            Gjenero Deklaratë ATK
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 20px', display:'flex', gap:12, flexWrap:'wrap' }}>
        {companies.length > 1 && (
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Kompania</label>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)} style={{ ...I, width:'auto', minWidth:180 }}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Muaji</label>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ ...I, width:'auto' }}>
            {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5 }}>Viti</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ ...I, width:'auto' }}>
            {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI */}
      {records.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {[
            { label:'Totali Shërbimeve', value:`€${totAmount.toFixed(2)}`, color:'#3B82F6' },
            { label:'Tatimi 9%', value:`€${totTax.toFixed(2)}`, color:'#EF4444' },
            { label:'Numri Rekordeve', value:records.length.toString(), color:'#9B5CF8' },
          ].map(k => (
            <div key={k.label} style={{ background:'var(--bg-card)', border:`1px solid ${k.color}25`, borderRadius:14, padding:'14px 16px', borderTop:`2px solid ${k.color}` }}>
              <p style={{ fontSize:11, color:'var(--text-3)', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</p>
              <p style={{ fontFamily:'Poppins,sans-serif', fontSize:22, fontWeight:800, color:k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
          <Receipt size={15} style={{ color:'var(--text-3)' }}/>
          <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)' }}>Rekordet — {MONTHS[month-1]} {year}</p>
        </div>
        {loading ? (
          <div style={{ padding:40, textAlign:'center' }}><Loader2 size={20} className="animate-spin" style={{ margin:'0 auto' }}/></div>
        ) : records.length === 0 ? (
          <div style={{ padding:48, textAlign:'center' }}>
            <Receipt size={36} style={{ color:'var(--text-3)', margin:'0 auto 12px' }}/>
            <p style={{ fontSize:14, color:'var(--text-3)' }}>Nuk ka rekorde për këtë periudhë</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Data','Furnizuesi','Shërbimi','Shuma (€)','Norma','Tatimi (€)',''].map((h,i) => (
                    <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom:'1px solid var(--border)', background:i%2===0?'transparent':'var(--bg-muted)' }}>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-3)' }}>{r.payment_date}</td>
                    <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{r.vendor_name}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-3)' }}>{r.service_description || '—'}</td>
                    <td style={{ padding:'10px 14px', fontSize:13, color:'var(--text-1)', fontWeight:600 }}>€{Number(r.amount).toFixed(2)}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-3)' }}>{r.tax_rate}%</td>
                    <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:'var(--text-1)' }}>€{Number(r.tax_amount).toFixed(2)}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <button onClick={() => deleteRecord(r.id)}
                        style={{ padding:'5px 8px', borderRadius:7, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.07)', color:'var(--text-1)', cursor:'pointer', display:'flex', alignItems:'center' }}>
                        <Trash2 size={13}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(90,31,214,0.05)', border:'1px solid rgba(90,31,214,0.15)', fontSize:12, color:'var(--text-3)' }}>
        <strong style={{ color:'var(--purple-light)' }}>Tatimi në Burim 9%</strong> — aplikohet për shërbime profesionale, qira, komisione. Afati pagesës: 15 i muajit pasues. Deklaro në: edi.atk-ks.org
      </div>

      {/* Modal */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:99 }}/>
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:28, width:'min(420px,92vw)', zIndex:100 }}>
            <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:17, fontWeight:800, color:'var(--text-1)', marginBottom:20 }}>Shto Rekord Tatimi</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { label:'Furnizuesi *', field:'vendor_name', type:'text', placeholder:'p.sh. Agron Gjoshi' },
                { label:'Shërbimi', field:'service_description', type:'text', placeholder:'p.sh. Shërbim dizajni' },
                { label:'Shuma Pagesës (€) *', field:'amount', type:'number', placeholder:'p.sh. 500' },
                { label:'Norma Tatimore (%)', field:'tax_rate', type:'number', placeholder:'9' },
                { label:'Data e Pagesës', field:'payment_date', type:'date', placeholder:'' },
              ].map(f => (
                <div key={f.field}>
                  <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    value={form[f.field as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.field]: e.target.value }))}
                    style={I}/>
                </div>
              ))}
              {form.amount && (
                <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
                  <p style={{ fontSize:12, color:'var(--text-1)', fontWeight:600 }}>
                    Tatimi {form.tax_rate}%: <strong>€{(Number(form.amount) * Number(form.tax_rate) / 100).toFixed(2)}</strong>
                  </p>
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:22 }}>
              <button onClick={() => setShowModal(false)}
                style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-3)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Anulo
              </button>
              <button onClick={addRecord}
                style={{ flex:2, padding:'10px', borderRadius:10, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontSize:13, fontWeight:700, border:'none', cursor:'pointer' }}>
                Shto Rekordin
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
