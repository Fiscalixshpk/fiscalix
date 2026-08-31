'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Check, X, AlertTriangle, Download, Loader2, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ExpenseCategory } from '@/types'

interface Props {
  userId: string
  companyId: string
  categories: ExpenseCategory[]
  plan: string
}

interface BankRow {
  id: string
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  reference: string
  selected: boolean
  category_id: string
  vendor_name: string
}

const BANK_FORMATS = [
  { id: 'procredit', name: 'ProCredit Bank', cols: { date: 0, desc: 2, debit: 4, credit: 5 } },
  { id: 'raiffeisen', name: 'Raiffeisen Bank', cols: { date: 0, desc: 1, debit: 3, credit: 4 } },
  { id: 'teb', name: 'TEB Bank', cols: { date: 0, desc: 2, debit: 4, credit: 5 } },
  { id: 'bkt', name: 'BKT (Banka Kombëtare Tregtare)', cols: { date: 0, desc: 1, debit: 3, credit: 4 } },
  { id: 'nlb', name: 'NLB Bank', cols: { date: 0, desc: 2, debit: 4, credit: 5 } },
  { id: 'generic', name: 'Format i Përgjithshëm (date,desc,debit,credit)', cols: { date: 0, desc: 1, debit: 2, credit: 3 } },
]

function parseAmount(val: string): number {
  if (!val) return 0
  return parseFloat(val.replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0
}

function parseDate(val: string): string {
  if (!val) return new Date().toISOString().split('T')[0]
  // Try various date formats
  const clean = val.trim()
  // DD.MM.YYYY or DD/MM/YYYY
  const match1 = clean.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  if (match1) return `${match1[3]}-${match1[2].padStart(2,'0')}-${match1[1].padStart(2,'0')}`
  // YYYY-MM-DD
  const match2 = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match2) return clean
  // MM/DD/YYYY
  const match3 = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match3) return `${match3[3]}-${match3[1].padStart(2,'0')}-${match3[2].padStart(2,'0')}`
  return new Date().toISOString().split('T')[0]
}

export default function BankImportClient({ userId, companyId, categories, plan }: Props) {
  const [bankFormat, setBankFormat] = useState('procredit')
  const [rows, setRows] = useState<BankRow[]>([])
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload')
  const [imported, setImported] = useState(0)

  const onDrop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').filter(l => l.trim())
        const fmt = BANK_FORMATS.find(f => f.id === bankFormat)!
        const { date: dc, desc: dsc, debit: dbc, credit: crc } = fmt.cols

        const parsed: BankRow[] = []
        for (let i = 1; i < lines.length; i++) { // skip header
          const cols = lines[i].split(/[,;|\t]/).map(c => c.trim().replace(/^"|"$/g, ''))
          if (cols.length < Math.max(dc, dsc, dbc, crc) + 1) continue

          const debit = parseAmount(cols[dbc] || '')
          const credit = parseAmount(cols[crc] || '')
          const amount = debit > 0 ? debit : credit
          if (amount <= 0) continue

          // Auto-guess category
          const descLower = (cols[dsc] || '').toLowerCase()
          let cat = ''
          if (/ushqim|market|kafe|restorant|super/.test(descLower)) cat = categories.find(c => /ushqim/i.test(c.name_sq))?.id || ''
          else if (/transport|taxi|karburant|benzin/.test(descLower)) cat = categories.find(c => /transport/i.test(c.name_sq))?.id || ''
          else if (/qira|rent/.test(descLower)) cat = categories.find(c => /qira/i.test(c.name_sq))?.id || ''
          else if (/elektrik|uj|komunal/.test(descLower)) cat = categories.find(c => /komunal/i.test(c.name_sq))?.id || ''

          parsed.push({
            id: `row-${i}`,
            date: parseDate(cols[dc] || ''),
            description: cols[dsc] || '',
            amount,
            type: debit > 0 ? 'debit' : 'credit',
            reference: cols[cols.length - 1] || '',
            selected: debit > 0, // auto-select debits (expenses)
            category_id: cat,
            vendor_name: (cols[dsc] || '').slice(0, 60),
          })
        }

        setRows(parsed)
        setStep('review')
        toast.success(`${parsed.length} transaksione u lexuan`)
      } catch {
        toast.error('Gabim gjatë leximit. Kontrollo formatin e fajllit.')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }, [bankFormat, categories])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'], 'application/vnd.ms-excel': ['.csv'] },
    maxFiles: 1,
  })

  function toggleRow(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r))
  }

  function updateRow(id: string, field: keyof BankRow, value: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  async function handleImport() {
    const selected = rows.filter(r => r.selected && r.type === 'debit')
    if (selected.length === 0) { toast.error('Zgjidh të paktën 1 transaksion'); return }

    setImporting(true)
    let count = 0
    try {
      for (const row of selected) {
        const fd = new FormData()
        fd.append('vendor_name', row.vendor_name || row.description.slice(0, 60))
        fd.append('amount', String(row.amount))
        fd.append('expense_date', row.date)
        fd.append('description', row.description)
        fd.append('category_id', row.category_id || '')
        fd.append('payment_method', 'bank_transfer')
        fd.append('reference_number', row.reference)
        fd.append('notes', 'Import bankar automatik')

        const res = await fetch('/api/expenses', { method: 'POST', body: fd })
        if (res.ok) count++
      }
      setImported(count)
      setStep('done')
      toast.success(`${count} shpenzime u importuan!`)
    } catch {
      toast.error('Gabim gjatë importimit')
    } finally {
      setImporting(false)
    }
  }

  const selectedCount = rows.filter(r => r.selected && r.type === 'debit').length
  const totalAmount = rows.filter(r => r.selected && r.type === 'debit').reduce((s,r) => s+r.amount, 0)

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div>
        <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:700, color:'var(--text-1)', marginBottom:4, display:'flex', alignItems:'center', gap:10 }}>
          <Building2 size={22} style={{ color:'var(--purple-light)' }}/> Import Bankar
        </h1>
        <p style={{ color:'var(--text-3)', fontSize:14 }}>
          Importo ekstraktin bankar — shpenzimet krijohen automatikisht
        </p>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Bank format selector */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:14, fontFamily:'Poppins,sans-serif' }}>
              1. Zgjidh bankën tënde
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {BANK_FORMATS.map(fmt => (
                <button key={fmt.id} onClick={() => setBankFormat(fmt.id)}
                  style={{
                    padding:'10px 14px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer',
                    border:`1.5px solid ${bankFormat===fmt.id ? 'var(--purple)' : 'var(--border)'}`,
                    background: bankFormat===fmt.id ? 'var(--purple-bg)' : 'var(--bg-muted)',
                    color: bankFormat===fmt.id ? 'var(--purple-light)' : 'var(--text-2)',
                    textAlign:'left'
                  }}>
                  {fmt.name}
                </button>
              ))}
            </div>
          </div>

          {/* Dropzone */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:14, fontFamily:'Poppins,sans-serif' }}>
              2. Ngarko ekstraktin bankar (CSV)
            </p>
            <div {...getRootProps()} style={{
              border:`2px dashed ${isDragActive ? 'var(--purple)' : 'var(--border-purple)'}`,
              borderRadius:12, padding:'36px 24px', textAlign:'center', cursor:'pointer',
              background: isDragActive ? 'var(--purple-bg)' : 'var(--bg-muted)', transition:'all 0.2s',
            }}>
              <input {...getInputProps()} />
              <Upload size={32} style={{ color:'var(--purple-light)', margin:'0 auto 12px', display:'block' }}/>
              <p style={{ fontSize:14, fontWeight:600, color:'var(--text-1)', marginBottom:6 }}>
                {isDragActive ? 'Lëshoje...' : 'Tërhiq CSV ose kliko'}
              </p>
              <p style={{ fontSize:12, color:'var(--text-3)' }}>Eksporto CSV nga internet banking i bankës tënde</p>
            </div>

            {/* Instructions */}
            <div style={{ marginTop:14, background:'var(--purple-bg)', border:'1px solid var(--border-purple)', borderRadius:10, padding:'12px 14px' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--purple-light)', marginBottom:8, fontFamily:'Poppins,sans-serif' }}>
                💡 SI TË EKSPORTOSH CSV NGA BANKA
              </p>
              <div style={{ fontSize:12, color:'var(--text-3)', display:'flex', flexDirection:'column', gap:3 }}>
                <p>▸ <strong>ProCredit:</strong> E-Banking → Llogaria → Eksporto → CSV</p>
                <p>▸ <strong>Raiffeisen:</strong> E-Banking → Transaksionet → Shkarko → CSV</p>
                <p>▸ <strong>TEB:</strong> Online Banking → Historiku → Eksporto CSV</p>
                <p>▸ <strong>BKT:</strong> Internet Banking → Lëvizjet → Eksporto</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 'review' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Summary bar */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-purple)', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', gap:20 }}>
              <div>
                <p style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Gjithsej</p>
                <p style={{ fontSize:18, fontWeight:800, color:'var(--text-1)', fontFamily:'Poppins,sans-serif' }}>{rows.length}</p>
              </div>
              <div>
                <p style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Zgjedhur</p>
                <p style={{ fontSize:18, fontWeight:800, color:'var(--purple-light)', fontFamily:'Poppins,sans-serif' }}>{selectedCount}</p>
              </div>
              <div>
                <p style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Totali</p>
                <p style={{ fontSize:18, fontWeight:800, color:'var(--text-1)', fontFamily:'Poppins,sans-serif' }}>€{totalAmount.toFixed(2)}</p>
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setStep('upload')}
                className="finex-button-secondary px-4 py-2 text-sm flex items-center gap-2">
                <X size={13}/> Anullo
              </button>
              <button onClick={handleImport} disabled={importing || selectedCount===0}
                className="finex-button-primary px-5 py-2 text-sm font-semibold flex items-center gap-2">
                {importing ? <><Loader2 size={14} className="animate-spin"/>Duke importuar...</> : <><Check size={14}/>Importo {selectedCount} shpenzime</>}
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table className="finex-table">
                <thead>
                  <tr>
                    <th style={{ width:40 }}>✓</th>
                    <th>Data</th>
                    <th>Përshkrimi / Furnitori</th>
                    <th>Kategoria</th>
                    <th style={{ textAlign:'right' }}>Shuma</th>
                    <th style={{ textAlign:'center' }}>Tipi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} style={{ opacity: row.type==='credit' ? 0.4 : 1 }}>
                      <td style={{ textAlign:'center' }}>
                        {row.type === 'debit' && (
                          <input type="checkbox" checked={row.selected}
                            onChange={() => toggleRow(row.id)}
                            style={{ width:15, height:15, cursor:'pointer' }}/>
                        )}
                      </td>
                      <td style={{ fontSize:12, color:'var(--text-3)' }}>{row.date}</td>
                      <td>
                        <input
                          value={row.vendor_name}
                          onChange={e => updateRow(row.id, 'vendor_name', e.target.value)}
                          className="finex-input"
                          style={{ fontSize:12, padding:'4px 8px', maxWidth:220 }}
                        />
                      </td>
                      <td>
                        <select value={row.category_id}
                          onChange={e => updateRow(row.id, 'category_id', e.target.value)}
                          className="finex-input" style={{ fontSize:12, padding:'4px 8px', minWidth:130 }}>
                          <option value="">— Kategoria —</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name_sq || cat.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign:'right', fontWeight:700, fontSize:13, color: row.type==='debit'?'#EF4444':'#10B981' }}>
                        {row.type==='debit'?'-':'+'} €{row.amount.toFixed(2)}
                      </td>
                      <td style={{ textAlign:'center' }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: row.type==='debit'?'rgba(239,68,68,0.1)':'rgba(16,185,129,0.1)', color: row.type==='debit'?'#EF4444':'#10B981', fontWeight:600 }}>
                          {row.type==='debit'?'Dalje':'Hyrje'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 'done' && (
        <div style={{ maxWidth:480, margin:'60px auto', textAlign:'center', background:'var(--bg-card)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:20, padding:'48px 32px' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(16,185,129,0.1)', border:'2px solid #10B981', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <Check size={32} style={{ color:'var(--text-1)' }}/>
          </div>
          <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:22, fontWeight:700, color:'var(--text-1)', marginBottom:8 }}>
            Import i Suksesshëm!
          </h2>
          <p style={{ color:'var(--text-1)', fontSize:14, marginBottom:28 }}>
            {imported} shpenzime u shtuan automatikisht nga ekstrakti bankar.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
            <a href="/expenses" className="finex-button-primary px-6 py-2.5 text-sm font-semibold" style={{ textDecoration:'none' }}>
              Shiko Shpenzimet
            </a>
            <button onClick={() => { setStep('upload'); setRows([]); setImported(0) }}
              className="finex-button-secondary px-5 py-2.5 text-sm">
              Import i ri
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
