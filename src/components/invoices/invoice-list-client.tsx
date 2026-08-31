'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Search, Download, Filter, FileText, Trash2, Edit, Eye, QrCode } from 'lucide-react'
import type { Invoice, Company, InvoiceStatus } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import StatusBadge from '@/components/shared/status-badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { exportInvoicesCSV } from '@/lib/export'

// PDF download button - fetches data and generates PDF client-side
function DownloadPdfButton({ invoiceId, invoiceNumber }: { invoiceId: string; invoiceNumber: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      // Fetch full invoice data
      const res = await fetch(`/api/invoices/${invoiceId}`)
      if (!res.ok) throw new Error('Fetch failed')
      const { invoice, company } = await res.json()

      // Generate PDF using existing lib
      const { generateInvoicePDF } = await import('@/lib/pdf')
      await generateInvoicePDF({
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name,
        client_email: invoice.client_email,
        client_address: invoice.client_address,
        client_phone: invoice.client_phone,
        client_vat: invoice.client_vat,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        currency: invoice.currency || 'EUR',
        payment_method: invoice.payment_method,
        payment_split: invoice.payment_split,
        notes: invoice.notes,
        status: invoice.status,
        subtotal: Number(invoice.subtotal || 0),
        tax_rate: Number(invoice.tax_rate || 18),
        tax_amount: Number(invoice.tax_amount || 0),
        total_amount: Number(invoice.total_amount || invoice.total || 0),
        items: (invoice.invoice_items || []).map((it: Record<string,unknown>) => ({
          description: String(it.description || ''),
          quantity: Number(it.quantity || 1),
          unit: String(it.unit || 'copë'),
          unit_price: Number(it.unit_price || 0),
          discount_percent: Number(it.discount_percent || 0),
          total: Number(it.total || 0),
        })),
        company: company || null,
      })
    } catch (err) {
      console.error('PDF error:', err)
      // Fallback: open invoice page in new tab
      window.open(`/invoices/${invoiceId}`, '_blank')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleDownload} disabled={loading}
      title="Shkarko PDF"
      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, background:'var(--purple-bg)', border:'1px solid var(--border-purple)', color:'var(--purple-light)', fontSize:11, fontWeight:700, cursor:'pointer', opacity:loading?0.6:1 }}>
      <Download size={12}/>
      {loading ? '...' : 'PDF'}
    </button>
  )
}


const STATUS_FILTERS: { label: string; value: InvoiceStatus | 'all' }[] = [
  { label: 'Të gjitha', value: 'all' },
  { label: 'Paguar', value: 'paid' },
  { label: 'Në pritje', value: 'pending' },
  { label: 'Vonuar', value: 'overdue' },
  { label: 'Draft', value: 'draft' },
]

interface Props {
  isAccountantView?: boolean
  clientCompanyId?: string
  invoices: Invoice[]
  company: Company | null
}

export default function InvoiceListClient({ invoices: initialInvoices, company, isAccountantView = false }: Props) {
  const isHealth = company?.business_type === 'health'
  const supabase = createClient()
  const [invoices, setInvoices] = useState(initialInvoices)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = !search ||
        inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        inv.client_name.toLowerCase().includes(search.toLowerCase()) ||
        inv.client_email?.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [invoices, search, statusFilter])

  const totalFiltered = filtered.reduce((s, i) => s + i.total, 0)
  const paidFiltered = filtered.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)

  async function handleDelete(id: string) {
    if (!confirm('Jeni të sigurt që doni të fshini këtë faturë?')) return
    setDeleting(id)
    try {
      await supabase.from('invoice_items').delete().eq('invoice_id', id)
      const { error } = await supabase.from('invoices').delete().eq('id', id)
      if (error) throw error
      setInvoices(prev => prev.filter(i => i.id !== id))
      toast.success('Fatura u fshi me sukses')
    } catch {
      toast.error('Gabim gjatë fshirjes')
    } finally {
      setDeleting(null)
    }
  }

  async function handleMarkPaid(id: string) {
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] })
      .eq('id', id)

    if (error) { toast.error(`Gabim: ${error.message}`); return }
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid', paid_date: new Date().toISOString().split('T')[0] } : i))
    toast.success('Fatura u shënua si e paguar')
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" suppressHydrationWarning>Faturat</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{invoices.length} fatura gjithsej</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportInvoicesCSV(filtered)}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 16px", borderRadius:10, border:"1px solid var(--border)", background:"var(--bg-card)", color:"var(--text-2)", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            <Download size={15} /> Eksporto CSV
          </button>
          {!isAccountantView && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isHealth && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 11, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  
                  <div>
                    <p style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>{initialInvoices.filter(i => i.issue_date === new Date().toISOString().split('T')[0]).length} sot</p>
                    <p style={{ fontSize: 9, color: 'var(--text-3)', lineHeight: 1 }}>raporte</p>
                  </div>
                </div>
              )}
              <Link href="/invoices/new" style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 18px", borderRadius:10, background:"#7C3AED", color:'white', fontSize:13, fontWeight:700, textDecoration:"none" }}>
                <Plus size={15} /> {isHealth ? 'Raport i Ri' : company?.business_type === 'construction' ? 'Situatë e Re' : 'Faturë e re'}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      {isHealth ? (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Raporte Sot', value: initialInvoices.filter(i => i.issue_date === new Date().toISOString().split('T')[0]).length, suffix: ' rap.', color: 'text-blue-400' },
            { label: 'Këtë Muaj', value: initialInvoices.filter(i => i.issue_date?.startsWith(new Date().toISOString().slice(0,7))).length, suffix: ' rap.', color: 'text-purple-400' },
            { label: 'Të Ardhura', value: formatCurrency(totalFiltered), suffix: '', color: 'text-emerald-500' },
          ].map((s, i) => (
            <div key={i} className="glass rounded-xl p-3" style={{ minWidth:0 }}>
              <p className="text-muted-foreground" style={{ fontSize:10, lineHeight:1.3, marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.label}</p>
              <p className={`font-bold ${s.color}`} style={{ fontSize:16, lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.value}{s.suffix}</p>
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Totali', value: formatCurrency(totalFiltered), color: '' },
          { label: 'Paguar', value: formatCurrency(paidFiltered), color: 'text-emerald-500' },
          { label: 'Në pritje', value: formatCurrency(filtered.filter(i => i.status === 'pending').reduce((s, i) => s + i.total, 0)), color: 'text-amber-500' },
          { label: 'Vonuar', value: formatCurrency(filtered.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0)), color: 'text-red-400' },
        ].map((s, i) => (
          <div key={i} className="glass rounded-xl p-4">
            <p className="text-muted-foreground text-xs">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color || 'text-foreground'}`} style={{ color: s.color ? undefined : 'var(--text-1)' }}>{s.value}</p>
          </div>
        ))}
      </div>
      )}

      {/* Filters */}
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 search-input-wrap">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Kërko fatura, klientë..."
              className="finex-input pl-9"
            />
          </div>
          {!isHealth && (
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  statusFilter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="finex-table">
          <thead>
            <tr className="border-b border-border">
              <th>Nr. {isHealth ? 'Raportit' : 'Faturës'}</th>
              <th>{isHealth ? 'Pacienti' : 'Klienti'}</th>
              <th>{isHealth ? 'Data e Kontrollit' : 'Data'}</th>
              {!isHealth && <th>Skadenca</th>}
              <th>Totali</th>
              <th>Statusi</th>
              <th className="text-right">Veprime</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  {search || statusFilter !== 'all' ? 'Nuk u gjet asnjë faturë' : (
                    <div className="flex flex-col items-center gap-3">
                      <FileText size={40} className="opacity-20" />
                      <p>Nuk keni asnjë faturë ende</p>
                      {!isAccountantView && <Link href="/invoices/new" style={{ display:"inline-flex", alignItems:"center", padding:"7px 16px", borderRadius:10, background:"#7C3AED", color:'white', fontSize:13, fontWeight:700, textDecoration:"none" }}>Krijo faturën e parë</Link>}
                    </div>
                  )}
                </td>
              </tr>
            ) : filtered.map(inv => (
              <tr key={inv.id} className="group">
                <td className="font-mono text-sm font-medium">{inv.invoice_number}</td>
                <td>
                  <div>
                    <p className="font-medium text-sm">{inv.client_name}</p>
                    {isHealth && (inv as { diagnosis?: string }).diagnosis && (
                      <p className="text-xs text-muted-foreground">{(inv as { diagnosis?: string }).diagnosis}</p>
                    )}
                    {!isHealth && inv.client_email && <p className="text-xs text-muted-foreground">{inv.client_email}</p>}
                  </div>
                </td>
                <td className="text-sm text-muted-foreground">{formatDate(inv.issue_date)}</td>
                {!isHealth && <td className="text-sm text-muted-foreground">
                  {inv.due_date ? (
                    <span className={new Date(inv.due_date) < new Date() && inv.status !== 'paid' ? 'text-red-400' : ''}>
                      {formatDate(inv.due_date)}
                    </span>
                  ) : '-'}
                </td>}
                <td className="font-semibold">{formatCurrency(inv.total)}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isHealth ? (
                      <>
                        <a href={`/api/invoices/${inv.id}/medical-pdf`} target="_blank" rel="noopener noreferrer"
                          style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:9, background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.2)', color:'var(--text-1)', fontSize:12, fontWeight:700, textDecoration:'none' }}>
                          PDF
                        </a>
                        <button onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all text-muted-foreground hover:text-red-400">
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : company?.business_type === 'construction' ? (
                      <>
                        <a href={`/api/invoices/${inv.id}/construction-pdf`} target="_blank" rel="noopener noreferrer"
                          style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:9, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', color:'#F59E0B', fontSize:12, fontWeight:700, textDecoration:'none' }}>
                          PDF
                        </a>
                        {inv.status !== 'paid' && (
                          <button onClick={() => handleMarkPaid(inv.id)}
                            className="px-2 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all">
                            Paguar
                          </button>
                        )}
                        <button onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all text-muted-foreground hover:text-red-400">
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : company?.business_type === 'legal' ? (
                      <>
                        <a href={`/api/invoices/${inv.id}/legal-pdf`} target="_blank" rel="noopener noreferrer"
                          style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:9, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.25)', color:'var(--text-1)', fontSize:12, fontWeight:700, textDecoration:'none' }}>
                          PDF
                        </a>
                        {inv.status !== 'paid' && (
                          <button onClick={() => handleMarkPaid(inv.id)}
                            className="px-2 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all">
                            Paguar
                          </button>
                        )}
                        <button onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all text-muted-foreground hover:text-red-400">
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : company?.business_type === 'agency' ? (
                      <>
                        <a href={`/api/invoices/${inv.id}/agency-pdf`} target="_blank" rel="noopener noreferrer"
                          style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:9, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.25)', color:'var(--text-1)', fontSize:12, fontWeight:700, textDecoration:'none' }}>PDF</a>
                        {inv.status !== 'paid' && <button onClick={() => handleMarkPaid(inv.id)} className="px-2 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all">Paguar</button>}
                        <button onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all text-muted-foreground hover:text-red-400"><Trash2 size={15}/></button>
                      </>
                    ) : company?.business_type === 'it' ? (
                      <>
                        <a href={`/api/invoices/${inv.id}/it-pdf`} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:9, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', color:'var(--text-1)', fontSize:12, fontWeight:700, textDecoration:'none' }}>PDF</a>
                        {inv.status !== 'paid' && <button onClick={() => handleMarkPaid(inv.id)} className="px-2 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all">Paguar</button>}
                        <button onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all text-muted-foreground hover:text-red-400"><Trash2 size={15}/></button>
                      </>
                    ) : ['transport','education','import_export','tourism','services'].includes(company?.business_type || '') ? (
                      <>
                        <a href={`/api/invoices/${inv.id}/${(company?.business_type || '').replace('_','-')}-pdf`} target="_blank" rel="noopener noreferrer"
                          style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:9, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)', color:'#818CF8', fontSize:12, fontWeight:700, textDecoration:'none' }}>PDF</a>
                        {inv.status !== 'paid' && <button onClick={() => handleMarkPaid(inv.id)} className="px-2 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all">Paguar</button>}
                        <button onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all text-muted-foreground hover:text-red-400"><Trash2 size={15}/></button>
                      </>
                    ) : isAccountantView ? (
                      <DownloadPdfButton invoiceId={inv.id} invoiceNumber={inv.invoice_number} />
                    ) : (
                      <>
                        <Link href={`/invoices/${inv.id}`}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-all text-muted-foreground hover:text-foreground"
                          title="Shiko">
                          <Eye size={15} />
                        </Link>
                        <Link href={`/invoices/${inv.id}/edit`}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-all text-muted-foreground hover:text-foreground"
                          title="Edito">
                          <Edit size={15} />
                        </Link>
                        {inv.status !== 'paid' && (
                          <button onClick={() => handleMarkPaid(inv.id)}
                            className="px-2 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all">
                            Paguar
                          </button>
                        )}
                        <button onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all text-muted-foreground hover:text-red-400"
                          title="Fshi">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
