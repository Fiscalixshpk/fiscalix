'use client'
// Import bulk produktesh nga CSV/Excel
// Detekton kolonat automatikisht, tregon preview, validon para importit

import React, { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Upload, FileSpreadsheet, ArrowLeft, Check, AlertTriangle,
  X, ChevronRight, RotateCcw, Download, Package
} from 'lucide-react'

interface ParsedRow { [key: string]: string }

interface MappedProduct {
  name:      string
  priceEUR:  number
  category:  string
  barcode:   string
  tax_rate:  string
  unit:      string
  stock:     number | null
  _row:      number
  _error?:   string
}

interface ColumnMapping {
  name:      string
  price:     string
  category:  string
  barcode:   string
  tax_rate:  string
  unit:      string
  stock:     string
}

interface Props { companyId: string; companyName: string }

// ── COLUMN DETECTOR ──────────────────────────────────────────
const NAME_HINTS     = ['name', 'emri', 'artikulli', 'produkti', 'description', 'produkt', 'article', 'item', 'pershkrimi']
const PRICE_HINTS    = ['price', 'cmimi', 'çmimi', 'vlera', 'value', 'amount', 'cost', 'shitja', 'cmim']
const CATEGORY_HINTS = ['category', 'kategoria', 'grup', 'group', 'type', 'lloji', 'kategori']
const BARCODE_HINTS  = ['barcode', 'barkodi', 'ean', 'kod', 'code', 'kodi', 'barkod']
const TAX_HINTS      = ['tax', 'tvsh', 'vat', 'norma', 'rate', 'tatim']
const UNIT_HINTS     = ['unit', 'njesia', 'njësia', 'um', 'uom']
const STOCK_HINTS    = ['stock', 'stoku', 'sasia', 'qty', 'quantity', 'inventory', 'stoqe']

function detectColumn(headers: string[], hints: string[]): string {
  for (const h of headers) {
    const lh = h.toLowerCase().trim()
    if (hints.some(hint => lh.includes(hint) || hint.includes(lh))) return h
  }
  return ''
}

function autoMap(headers: string[]): ColumnMapping {
  return {
    name:     detectColumn(headers, NAME_HINTS),
    price:    detectColumn(headers, PRICE_HINTS),
    category: detectColumn(headers, CATEGORY_HINTS),
    barcode:  detectColumn(headers, BARCODE_HINTS),
    tax_rate: detectColumn(headers, TAX_HINTS),
    unit:     detectColumn(headers, UNIT_HINTS),
    stock:    detectColumn(headers, STOCK_HINTS),
  }
}

function parsePrice(raw: string): number {
  if (!raw) return 0
  // Hiq çdo gjë që nuk është numër ose pikë dhjetore
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

function parseTaxRate(raw: string): string {
  if (!raw) return 'E'
  const v = raw.trim().toUpperCase()
  if (['A','C','D','E'].includes(v)) return v
  if (v.includes('18') || v.includes('0.18')) return 'E'
  if (v.includes('8')  || v.includes('0.08')) return 'D'
  if (v.includes('0')  || v.includes('0.00')) return 'A'
  return 'E'
}

function mapRows(rows: ParsedRow[], mapping: ColumnMapping): MappedProduct[] {
  return rows.slice(0, 500).map((row, i) => {
    const name     = (row[mapping.name]     || '').trim()
    const priceRaw = (row[mapping.price]    || '').trim()
    const price    = parsePrice(priceRaw)
    const category = (row[mapping.category] || '').trim()
    const barcode  = (row[mapping.barcode]  || '').trim()
    const taxRaw   = (row[mapping.tax_rate] || '').trim()
    const unit     = (row[mapping.unit]     || 'cope').trim() || 'cope'
    const stockRaw = (row[mapping.stock]    || '').trim()
    const stock    = stockRaw ? (parseInt(stockRaw) || null) : null

    const error = !name ? 'Emri mungon' : price <= 0 ? 'Çmim i pavlefshëm' : undefined

    return { name, priceEUR: price, category, barcode, tax_rate: parseTaxRate(taxRaw), unit, stock, _row: i + 2, _error: error }
  }).filter(p => p.name || p._error)
}

export default function ProductImportClient({ companyId, companyName }: Props) {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step,        setStep]        = useState<'upload' | 'map' | 'preview' | 'done'>('upload')
  const [headers,     setHeaders]     = useState<string[]>([])
  const [rows,        setRows]        = useState<ParsedRow[]>([])
  const [mapping,     setMapping]     = useState<ColumnMapping>({ name: '', price: '', category: '', barcode: '', tax_rate: '', unit: '', stock: '' })
  const [products,    setProducts]    = useState<MappedProduct[]>([])
  const [importing,   setImporting]   = useState(false)
  const [result,      setResult]      = useState<{ imported: number; errors: number } | null>(null)
  const [fileName,    setFileName]    = useState('')
  const [dragging,    setDragging]    = useState(false)

  // ── PARSE FILE ────────────────────────────────────────────
  async function parseFile(file: File) {
    setFileName(file.name)
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

    try {
      if (isExcel) {
        const XLSX  = await import('xlsx')
        const buf   = await file.arrayBuffer()
        const wb    = XLSX.read(buf, { type: 'array' })
        const ws    = wb.Sheets[wb.SheetNames[0]]
        const data  = XLSX.utils.sheet_to_json<ParsedRow>(ws, { raw: false, defval: '' })
        const hdrs  = data.length > 0 ? Object.keys(data[0]) : []
        finish(hdrs, data)
      } else {
        const Papa = await import('papaparse')
        const text = await file.text()
        const res  = Papa.default.parse<ParsedRow>(text, { header: true, skipEmptyLines: true, dynamicTyping: false })
        const hdrs = res.meta?.fields ?? []
        finish(hdrs, res.data)
      }
    } catch (err) {
      toast.error('Gabim gjatë leximit të fajllit')
      console.error(err)
    }
  }

  function finish(hdrs: string[], data: ParsedRow[]) {
    setHeaders(hdrs)
    setRows(data)
    const m = autoMap(hdrs)
    setMapping(m)
    setStep('map')
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  function goPreview() {
    if (!mapping.name)  { toast.error('Zgjidh kolonën e Emrit'); return }
    if (!mapping.price) { toast.error('Zgjidh kolonën e Çmimit'); return }
    setProducts(mapRows(rows, mapping))
    setStep('preview')
  }

  // ── IMPORT ────────────────────────────────────────────────
  async function doImport() {
    const valid = products.filter(p => !p._error)
    if (!valid.length) { toast.error('Asnjë produkt valid'); return }
    setImporting(true)
    try {
      const res  = await fetch('/api/pos/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ products: valid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult({ imported: data.imported, errors: data.errors ?? 0 })
      setStep('done')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë importit')
    } finally { setImporting(false) }
  }

  // ── DOWNLOAD TEMPLATE ─────────────────────────────────────
  function downloadTemplate() {
    const csv = `Emri,Çmimi,Kategoria,Barkodi,TVSH,Njesia,Stoku
Espresso,1.50,Kafe,29230,E,cope,
Coca-Cola 0.5L,1.20,Pije,16285,E,cope,100
Sanduiç Pule,3.50,Ushqim,,D,cope,50`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'template-produktet.csv' })
    a.click()
  }

  const valid   = products.filter(p => !p._error)
  const invalid = products.filter(p => p._error)

  const S = {
    card:  { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 },
    label: { fontSize: 10, fontWeight: 700 as const, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.push('/pos/products')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, background: 'var(--bg-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' }}>
          <ArrowLeft size={14} /> Produktet
        </button>
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>Import Produktesh</h1>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{companyName} — ngarko CSV ose Excel nga sistemi i vjetër</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
        {[['upload','Ngarko'], ['map','Kolonat'], ['preview','Preview'], ['done','Gati']].map(([id, label], i) => {
          const steps = ['upload','map','preview','done']
          const done  = steps.indexOf(step) > i
          const active = step === id
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: done ? '#10B981' : active ? 'var(--purple)' : 'var(--bg-muted)', border: `2px solid ${done ? '#10B981' : active ? 'var(--purple)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  {done ? <Check size={14} color="white" /> : <span style={{ fontSize: 12, fontWeight: 700, color: active ? 'white' : 'var(--text-3)' }}>{i+1}</span>}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: active ? 'var(--purple-light)' : done ? '#10B981' : 'var(--text-3)', whiteSpace: 'nowrap' }}>{label}</span>
              </div>
              {i < 3 && <div style={{ flex: 1, height: 1, background: done ? '#10B981' : 'var(--border)', margin: '0 6px', marginBottom: 16, transition: 'background 0.3s' }} />}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: UPLOAD ── */}
      {step === 'upload' && (
        <div style={S.card}>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${dragging ? 'var(--purple)' : 'var(--border)'}`, borderRadius: 14, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'var(--purple-bg)' : 'var(--bg-muted)', transition: 'all 0.15s' }}>
            <FileSpreadsheet size={40} style={{ margin: '0 auto 12px', color: dragging ? 'var(--purple-light)' : 'var(--text-3)', opacity: dragging ? 1 : 0.4 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>Zvarrit fajllin këtu</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 14 }}>ose kliko për të zgjedhur</p>
            <div style={{ display: 'inline-flex', gap: 8 }}>
              <span style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: 12, fontWeight: 700 }}>CSV</span>
              <span style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(59,130,246,0.1)', color: '#3B82F6', fontSize: 12, fontWeight: 700 }}>Excel .xlsx</span>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileChange} style={{ display: 'none' }} />
          </div>

          {/* Template download */}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#3B82F6', marginBottom: 2 }}>Template CSV</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Shkarko template me kolonat e sakta nëse nuk ke fajll ekzistues</p>
            </div>
            <button onClick={downloadTemplate}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#3B82F6', whiteSpace: 'nowrap' }}>
              <Download size={13} /> Shkarko Template
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: MAP COLUMNS ── */}
      {step === 'map' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <FileSpreadsheet size={18} color="var(--purple-light)" />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{fileName}</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{rows.length} rreshta u lexuan</p>
              </div>
            </div>

            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 }}>
              Lidhja e kolonave — sistemi i ka detektuar automatikisht. Kontrollo dhe ndrysho nëse nevojitet:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                { key: 'name',     label: 'Emri *',       required: true  },
                { key: 'price',    label: 'Çmimi (€) *',  required: true  },
                { key: 'category', label: 'Kategoria',    required: false },
                { key: 'barcode',  label: 'Barkodi',      required: false },
                { key: 'tax_rate', label: 'TVSH',         required: false },
                { key: 'unit',     label: 'Njësia',       required: false },
                { key: 'stock',    label: 'Stoku',        required: false },
              ] as { key: keyof ColumnMapping; label: string; required: boolean }[]).map(field => (
                <div key={field.key}>
                  <label style={S.label}>
                    {field.label}
                    {mapping[field.key] && <span style={{ color: '#10B981', marginLeft: 4 }}>✓</span>}
                    {!mapping[field.key] && field.required && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
                  </label>
                  <select
                    value={mapping[field.key]}
                    onChange={e => setMapping(m => ({ ...m, [field.key]: e.target.value }))}
                    className="finex-input" style={{ fontSize: 13, cursor: 'pointer' }}>
                    <option value="">— Mos importo —</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview of first 3 rows */}
          {rows.length > 0 && (
            <div style={S.card}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Shembull (3 rreshtat e parë)
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {headers.map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                          {h}
                          {Object.values(mapping).includes(h) && <span style={{ color: 'var(--purple-light)', marginLeft: 4 }}>●</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i}>
                        {headers.map(h => (
                          <td key={h} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row[h] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setStep('upload'); setRows([]); setHeaders([]) }}
              className="finex-button-secondary" style={{ padding: '10px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <RotateCcw size={13} /> Ndrysho Fajllin
            </button>
            <button onClick={goPreview} className="finex-button-primary"
              style={{ flex: 1, padding: '10px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              Vazhdo te Preview <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: PREVIEW ── */}
      {step === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Gjithsej',  value: products.length, color: 'var(--purple-light)' },
              { label: 'Valid',     value: valid.length,    color: '#10B981' },
              { label: 'Me gabim', value: invalid.length,  color: invalid.length > 0 ? '#EF4444' : 'var(--text-3)' },
            ].map(s => (
              <div key={s.label} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-muted)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 900, color: s.color, fontFamily: 'Poppins,sans-serif', lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Errors */}
          {invalid.length > 0 && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', marginBottom: 8 }}>Rreshtat me gabime (do të kalohen):</p>
              {invalid.slice(0, 5).map(p => (
                <p key={p._row} style={{ fontSize: 11, color: '#EF4444', marginBottom: 2 }}>
                  Rreshti {p._row}: "{p.name || 'Pa emër'}" — {p._error}
                </p>
              ))}
              {invalid.length > 5 && <p style={{ fontSize: 11, color: '#EF4444' }}>+{invalid.length - 5} të tjerë...</p>}
            </div>
          )}

          {/* Preview table */}
          <div style={S.card}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Produktet që do të importohen ({Math.min(valid.length, 10)} nga {valid.length})
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 60px 60px', gap: 0, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {['Emri', 'Çmimi', 'Kategoria', 'TVSH', 'Stoku'].map(h => (
                <div key={h} style={{ padding: '7px 10px', background: 'var(--bg-muted)', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>{h}</div>
              ))}
              {valid.slice(0, 10).map((p, i) => (
                <React.Fragment key={i}>
                  <div key={`n${i}`} style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-1)', fontWeight: 600, borderBottom: i < 9 ? '1px solid var(--border)' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div key={`p${i}`} style={{ padding: '8px 10px', fontSize: 12, color: 'var(--purple-light)', fontWeight: 700, borderBottom: i < 9 ? '1px solid var(--border)' : 'none' }}>€{p.priceEUR.toFixed(2)}</div>
                  <div key={`c${i}`} style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-2)', borderBottom: i < 9 ? '1px solid var(--border)' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.category || '—'}</div>
                  <div key={`t${i}`} style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-2)', borderBottom: i < 9 ? '1px solid var(--border)' : 'none' }}>{p.tax_rate}</div>
                  <div key={`s${i}`} style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-2)', borderBottom: i < 9 ? '1px solid var(--border)' : 'none' }}>{p.stock ?? '∞'}</div>
                </React.Fragment>
              ))}
            </div>
            {valid.length > 10 && (
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, textAlign: 'center' }}>
                +{valid.length - 10} produkte të tjera do të importohen
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('map')} className="finex-button-secondary" style={{ padding: '10px 20px', fontSize: 13 }}>
              ← Mbrapa
            </button>
            <button onClick={doImport} disabled={importing || valid.length === 0} className="finex-button-primary"
              style={{ flex: 1, padding: '12px 0', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800 }}>
              {importing
                ? <><span style={{ width: 18, height: 18, border: '2.5px solid var(--border-color,#e2dcff)', borderTop: '2.5px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Duke importuar...</>
                : <><Upload size={16} /> Importo {valid.length} Produkte</>}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: DONE ── */}
      {step === 'done' && result && (
        <div style={{ ...S.card, textAlign: 'center', padding: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Check size={26} color="#10B981" />
          </div>
          <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 22, fontWeight: 900, color:'var(--text-1)', marginBottom: 8 }}>
            {result.imported} produkte u importuan
          </p>
          {result.errors > 0 && (
            <p style={{ fontSize: 13, color: '#F59E0B', marginBottom: 8 }}>{result.errors} produkte u kaluan (gabime)</p>
          )}
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>
            Produktet janë të disponueshme te POS direkt.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => router.push('/pos/products')}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
              <Package size={14} /> Shiko Produktet
            </button>
            <button onClick={() => { setStep('upload'); setRows([]); setHeaders([]); setProducts([]); setResult(null) }}
              className="finex-button-primary" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', fontSize: 13 }}>
              <Upload size={14} /> Import i Ri
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
