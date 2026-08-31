'use client'

import { useState, useEffect } from 'react'
import { generatePDFReport } from '@/lib/pdf-report'
import { Download, FileSpreadsheet, Lock, TrendingUp, Receipt, FileText, FilePdf } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface Invoice {
  id: string; invoice_number: string; client_name: string; client_vat?: string
  issue_date: string; total_amount: number; tax_amount: number; subtotal: number
  status: string; currency: string
}
interface Expense {
  id: string; vendor_name: string; description: string; amount: number
  expense_date: string; payment_method: string; reference_number?: string
  expense_categories?: { name_sq?: string; name?: string }
}
interface Company {
  name: string; vat_number?: string; email?: string; address?: string; city?: string
  is_vat_registered?: boolean
}

interface Props {
  hasAccess: boolean; plan: string
  invoices: Invoice[]; expenses: Expense[]; company: Company | null
  companies?: { id: string; name: string }[]
  userRole?: string
}

const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']
const YEARS = [2024, 2025, 2026]

export default function ReportsClient({ hasAccess, invoices: initialInvoices, expenses: initialExpenses, company: initialCompany, companies = [], userRole = 'business_owner' }: Props) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0]?.id || '')
  const [invoices, setInvoices] = useState(initialInvoices)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [company, setCompany] = useState(initialCompany)
  const [loadingClient, setLoadingClient] = useState(false)
  const isVatRegistered = company?.is_vat_registered !== false
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(0) // 0 = all

  // Ngarko të dhënat kur ndryshon klienti
  useEffect(() => {
    if (!selectedCompanyId || userRole !== 'accountant') return
    setLoadingClient(true)
    Promise.all([
      fetch(`/api/accountant/client-data?company_id=${selectedCompanyId}&type=invoices`).then(r => r.json()),
      fetch(`/api/accountant/client-data?company_id=${selectedCompanyId}&type=expenses`).then(r => r.json()),
      fetch(`/api/companies/${selectedCompanyId}`).then(r => r.json()).catch(() => null),
    ]).then(([inv, exp, comp]) => {
      if (Array.isArray(inv)) setInvoices(inv)
      if (Array.isArray(exp)) setExpenses(exp)
      if (comp && !comp.error) setCompany(comp)
    }).catch(() => toast.error('Gabim gjatë ngarkimit'))
    .finally(() => setLoadingClient(false))
  }, [selectedCompanyId])
  const [generating, setGenerating] = useState(false)
  const [clientFilter, setClientFilter] = useState('')

  const clients = [...new Set(invoices.map(i => i.client_name))].sort()

  function filterByPeriod<T extends { issue_date?: string; expense_date?: string }>(items: T[]): T[] {
    return items.filter(item => {
      const dateStr = (item as Invoice).issue_date || (item as Expense).expense_date || ''
      if (!dateStr) return false
      const d = new Date(dateStr)
      if (d.getFullYear() !== year) return false
      if (month > 0 && d.getMonth() + 1 !== month) return false
      return true
    })
  }

  const filteredInvoices = filterByPeriod(invoices)
  const filteredExpenses = filterByPeriod(expenses)

  const totalRevenue = filteredInvoices.reduce((s, i) => s + (parseFloat(String((i.total_amount ?? i.total))) || 0), 0)
  const totalTax = filteredInvoices.reduce((s, i) => s + (parseFloat(String(i.tax_amount)) || 0), 0)
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (parseFloat(String(e.amount)) || 0), 0)

  async function generateATKReport(type: 'tvsh' | 'fitimi' | 'shpenzime' | 'klient' | 'libri_blerjeve' | 'libri_shitjeve' | 'pension') {
    setGenerating(true)
    try {
      const { generateProfessionalExcel, generateMultiSheetExcel } = await import('@/lib/excel-export')

      const periodLabel = month > 0
        ? `${MONTHS[month-1]} ${year}`
        : `Viti ${year}`

      const compName = company?.name || ''
      const vatNum = company?.vat_number || undefined
      let buf: Buffer

      if (type === 'tvsh') {
        const headers = ['NR.', 'DATA', 'NR. FATURËS', 'KLIENTI', 'NUI/NF KLIENTI', 'BAZA TATIMORE (€)', 'TVSH 18% (€)', 'TOTALI (€)']
        const rows = filteredInvoices.map((inv, i) => [
          i + 1,
          new Date(inv.issue_date).toLocaleDateString('sq-AL'),
          inv.invoice_number,
          inv.client_name,
          inv.client_vat || '',
          Number(inv.subtotal || 0).toFixed(2),
          Number(inv.tax_amount || 0).toFixed(2),
          Number((inv.total_amount ?? inv.total) || 0).toFixed(2),
        ])
        const totalsRow = ['TOTALI', '', '', '', '',
          filteredInvoices.reduce((s, i) => s + Number(i.subtotal || 0), 0).toFixed(2),
          totalTax.toFixed(2), totalRevenue.toFixed(2)]
        buf = await generateProfessionalExcel({
          title: 'DEKLARATA E TVSH-SË', companyName: compName, vatNumber: vatNum, periodLabel,
          sheetName: 'TVSH', headers, rows, currencyColumns: [5, 6, 7], totalsRow,
        })

      } else if (type === 'fitimi') {
        const profit = totalRevenue - totalExpenses
        const headers = ['NR.', 'DATA', 'REFERENCA', 'PËRSHKRIMI', 'SHUMA (€)']
        const incomeRows = filteredInvoices.map((inv, i) => [
          i + 1, new Date(inv.issue_date).toLocaleDateString('sq-AL'), inv.invoice_number, inv.client_name, Number(inv.subtotal || 0).toFixed(2),
        ])
        buf = await generateProfessionalExcel({
          title: 'RAPORTI I TË ARDHURAVE DHE SHPENZIMEVE', companyName: compName, vatNumber: vatNum, periodLabel,
          sheetName: 'Tatim Fitimi', headers, rows: incomeRows, currencyColumns: [4],
          totalsRow: ['', '', '', 'TOTALI TË ARDHURA:', totalRevenue.toFixed(2)],
          notesSection: {
            heading: 'PËRMBLEDHJE',
            lines: [
              `Totali Shpenzime: €${totalExpenses.toFixed(2)}`,
              `Fitimi para Tatimit: €${profit.toFixed(2)}`,
              `Tatimi mbi Fitimin (10%): €${(profit * 0.1).toFixed(2)}`,
              `Fitimi pas Tatimit: €${(profit * 0.9).toFixed(2)}`,
            ],
          },
        })

      } else if (type === 'shpenzime') {
        const headers = ['NR.', 'DATA', 'FURNITORI', 'PËRSHKRIMI', 'KATEGORIA', 'MËNYRA PAGESËS', 'REFERENCA', 'SHUMA (€)']
        const rows = filteredExpenses.map((exp, i) => [
          i + 1, new Date(exp.expense_date).toLocaleDateString('sq-AL'), exp.vendor_name || '', exp.description || '',
          exp.expense_categories?.name_sq || exp.expense_categories?.name || '', exp.payment_method || 'cash',
          exp.reference_number || '', Number(exp.amount).toFixed(2),
        ])
        buf = await generateProfessionalExcel({
          title: 'REGJISTRI I SHPENZIMEVE', companyName: compName, vatNumber: vatNum, periodLabel,
          sheetName: 'Shpenzime', headers, rows, currencyColumns: [7],
          totalsRow: ['', '', '', '', '', '', 'TOTALI:', totalExpenses.toFixed(2)],
        })

      } else if (type === 'klient') {
        const clientInvoices = filteredInvoices.filter(i => !clientFilter || i.client_name === clientFilter)
        const byClient: Record<string, Invoice[]> = {}
        clientInvoices.forEach(inv => {
          if (!byClient[inv.client_name]) byClient[inv.client_name] = []
          byClient[inv.client_name].push(inv)
        })
        const headers = ['NR.', 'DATA', 'NR. FATURËS', 'STATUSI', 'TVSH (€)', 'TOTALI (€)']
        const sheets = Object.entries(byClient).map(([client, invs]) => {
          const total = invs.reduce((s, i) => s + Number((i.total_amount ?? i.total)), 0)
          const rows = invs.map((inv, i) => [
            i + 1, new Date(inv.issue_date).toLocaleDateString('sq-AL'), inv.invoice_number,
            inv.status === 'paid' ? 'Paguar' : inv.status === 'pending' ? 'Në pritje' : 'Vonuar',
            Number(inv.tax_amount || 0).toFixed(2), Number((inv.total_amount ?? inv.total)).toFixed(2),
          ])
          return {
            title: `RAPORTI PËR KLIENTIN: ${client}`, companyName: compName, vatNumber: vatNum, periodLabel,
            sheetName: client, headers, rows, currencyColumns: [4, 5],
            totalsRow: ['', '', '', '', 'TOTALI:', total.toFixed(2)],
          }
        })
        buf = await generateMultiSheetExcel(sheets)

      } else if (type === 'libri_shitjeve') {
        const headers = ['NR.', 'DATA E FATURËS', 'NR. FATURËS', 'BLERËSI (KLIENTI)', 'NUI/NF BLERËSI', 'VLERA E SHITJES (pa TVSH)', 'TVSH 18%', 'TVSH 8%', 'TOTALI (me TVSH)']
        const rows = filteredInvoices.map((inv, i) => {
          const base = Number(inv.subtotal || 0)
          const tax = Number(inv.tax_amount || 0)
          const taxRate = Number(inv.tax_rate || 18)
          return [
            i + 1, new Date(inv.issue_date).toLocaleDateString('sq-AL'), inv.invoice_number, inv.client_name, inv.client_vat || '',
            base.toFixed(2), taxRate === 18 ? tax.toFixed(2) : '0.00', taxRate === 8 ? tax.toFixed(2) : '0.00',
            Number((inv.total_amount ?? inv.total) || 0).toFixed(2),
          ]
        })
        const totBase = filteredInvoices.reduce((s,i) => s+Number(i.subtotal||0), 0)
        const tot18 = filteredInvoices.filter(i=>Number(i.tax_rate||18)===18).reduce((s,i) => s+Number(i.tax_amount||0), 0)
        const tot8 = filteredInvoices.filter(i=>Number(i.tax_rate||18)===8).reduce((s,i) => s+Number(i.tax_amount||0), 0)
        buf = await generateProfessionalExcel({
          title: 'LIBRI I SHITJEVE', companyName: compName, vatNumber: vatNum, periodLabel,
          sheetName: 'Libri Shitjeve', headers, rows, currencyColumns: [5, 6, 7, 8],
          totalsRow: ['', '', '', '', 'TOTALI:', totBase.toFixed(2), tot18.toFixed(2), tot8.toFixed(2), totalRevenue.toFixed(2)],
        })

      } else if (type === 'libri_blerjeve') {
        const headers = ['NR.', 'DATA E FATURËS', 'NR. FATURËS', 'SHITËSI (FURNITORI)', 'NUI/NF SHITËSI', 'VLERA E BLERJES (pa TVSH)', 'TVSH 18%', 'TVSH 8%', 'TOTALI (me TVSH)']
        const rows = filteredExpenses.map((exp, i) => {
          const amt = Number(exp.amount || 0)
          const base = amt / 1.18
          const tax = amt - base
          return [
            i + 1, new Date(exp.expense_date).toLocaleDateString('sq-AL'), exp.reference_number || `BL-${String(i+1).padStart(4,'0')}`,
            exp.vendor_name || '', '', base.toFixed(2), tax.toFixed(2), '0.00', amt.toFixed(2),
          ]
        })
        const totAmt = filteredExpenses.reduce((s,e) => s+Number(e.amount||0), 0)
        const totBase = totAmt / 1.18
        const totTax = totAmt - totBase
        buf = await generateProfessionalExcel({
          title: 'LIBRI I BLERJEVE', companyName: compName, vatNumber: vatNum, periodLabel,
          sheetName: 'Libri Blerjeve', headers, rows, currencyColumns: [5, 6, 7, 8],
          totalsRow: ['', '', '', '', 'TOTALI:', totBase.toFixed(2), totTax.toFixed(2), '0.00', totAmt.toFixed(2)],
        })

      } else {
        // pension
        const headers = ['NR.', 'EMRI I PUNONJËSIT', 'NR. PERSONAL', 'PAGA BRUTO (€)', 'KONTRIBUTI PUNONJËSI 5% (€)', 'KONTRIBUTI PUNËDHËNËSI 5% (€)', 'TOTALI KONTRIBUTEVE (€)']
        const rows = Array.from({length: 10}, (_, i) => [i+1, '', '', '0.00', '0.00', '0.00', '0.00'])
        buf = await generateProfessionalExcel({
          title: 'DEKLARATA E KONTRIBUTEVE PENSIONALE', companyName: compName, vatNumber: vatNum, periodLabel,
          sheetName: 'Kontributet Pensionale', headers, rows, currencyColumns: [3, 4, 5, 6],
          totalsRow: ['', '', 'TOTALI:', '0.00', '0.00', '0.00', '0.00'],
          notesSection: {
            heading: 'UDHËZIME',
            lines: [
              'Kontributi pensional: 5% punonjësi + 5% punëdhënësi = 10% e pagës bruto',
              'Afati i pagesës: 15-ta e muajit pasues',
              'Deklaro në: https://edi.atk-ks.org',
              'Ligji bazë: Ligji Nr. 04/L-101 për Fondin Pensional të Kosovës',
            ],
          },
        })
      }

      const fname = `Fiscalix_${type}_${periodLabel.replace(/ /g, '_')}.xlsx`
      const blob = new Blob([buf], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fname
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Raporti u gjenerua: ${fname}`)
    } catch (err) {
      console.error(err)
      toast.error('Gabim gjatë gjenerimit të raportit')
    } finally {
      setGenerating(false)
    }
  }

  if (!hasAccess) {
    return (
      <div className="page-enter">
        <div className="mb-8">
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Raporte ATK</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Raporte Excel të gatshme për ATK-në e Kosovës</p>
        </div>
        <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '48px 32px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--purple-bg)', border: '2px solid var(--border-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Lock size={28} style={{ color: 'var(--purple-light)' }} />
          </div>
          <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Funksion Advanced</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>Raportet ATK janë të disponueshme vetëm për planet <strong style={{ color: 'var(--text-2)' }}>Advanced</strong> dhe <strong style={{ color: 'var(--text-2)' }}>Enterprise</strong>.</p>
          <a href="/settings?tab=billing" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#5A1FD6,#9B5CF8)', color: 'white', padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14, fontFamily: 'Poppins,sans-serif', textDecoration: 'none' }}>Upgrade në Advanced →</a>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Raporte ATK</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Raporte Excel të gatshme për dorëzim në ATK — Administrata Tatimore e Kosovës</p>
      </div>

      {/* Client selector — vetëm për kontabilistin */}
      {userRole === 'accountant' && companies.length > 0 && (
        <div style={{ background:'linear-gradient(135deg,rgba(90,31,214,0.1),rgba(90,31,214,0.05))', border:'1px solid rgba(90,31,214,0.25)', borderRadius:14, padding:'16px 20px' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#9B5CF8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
            👤 Zgjidh Klientin për Raport
          </p>
          {loadingClient && <p style={{ fontSize:12, color:'var(--text-3)' }}>Duke ngarkuar...</p>}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {companies.map(c => (
              <button key={c.id} onClick={() => setSelectedCompanyId(c.id)}
                style={{ padding:'9px 18px', borderRadius:10, border:`1px solid ${selectedCompanyId===c.id ? 'rgba(90,31,214,0.5)' : 'var(--border)'}`, background:selectedCompanyId===c.id ? 'rgba(90,31,214,0.15)' : 'var(--bg-card)', color:selectedCompanyId===c.id ? 'var(--purple)' : 'var(--text-2)', fontSize:13, fontWeight:selectedCompanyId===c.id ? 700 : 400, cursor:'pointer' }}>
                {selectedCompanyId===c.id ? '✓ ' : ''}{c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Period selector */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontFamily: 'Poppins,sans-serif' }}>Zgjidh Periudhën</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="finex-input" style={{ width: 120 }}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="finex-input" style={{ width: 160 }}>
            <option value={0}>Të gjitha muajt</option>
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 13 }}>
            <span style={{ color: 'var(--text-3)' }}>Fatura: <strong style={{ color: 'var(--text-1)' }}>{filteredInvoices.length}</strong></span>
            <span style={{ color: 'var(--text-3)' }}>Të ardhura: <strong style={{ color: '#10B981' }}>{formatCurrency(totalRevenue)}</strong></span>
            <span style={{ color: 'var(--text-3)' }}>Shpenzime: <strong style={{ color: '#EF4444' }}>{formatCurrency(totalExpenses)}</strong></span>
          </div>
        </div>
      </div>

      {/* Report cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* TVSH — vetëm për biznese të regjistruara në TVSH */}
        {isVatRegistered && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(123,44,245,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={20} style={{ color: '#7B2CF5' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'Poppins,sans-serif' }}>Raporti i TVSH-së</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Deklarata mujore • Ligji Nr. 05/L-037</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 16 }}>
            Gjeneron listën e plotë të faturave me bazën tatimore dhe TVSH 18% — gati për dorëzim në ATK.
          </p>
          <div style={{ background: 'var(--bg-muted)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: 'var(--text-3)' }}>
            <strong style={{ color: 'var(--text-1)' }}>Totali TVSH:</strong> {formatCurrency(totalTax)} &nbsp;·&nbsp;
            <strong style={{ color: 'var(--text-1)' }}>Fatura:</strong> {filteredInvoices.length}
          </div>
          <button onClick={() => generateATKReport('tvsh')} disabled={generating}
            className="finex-button-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm">
            <Download size={15} /> Shkarko Excel TVSH
          </button>
        </div>
        )}

        {/* Tatim Fitimi */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'Poppins,sans-serif' }}>Tatimi mbi Fitimin</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Të ardhura & shpenzime • Ligji Nr. 05/L-029</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 16 }}>
            Raporti i plotë i të ardhurave dhe shpenzimeve me llogaritjen e tatimit mbi fitimin 10%.
          </p>
          <div style={{ background: 'var(--bg-muted)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: 'var(--text-3)' }}>
            <strong style={{ color: '#10B981' }}>Fitimi:</strong> {formatCurrency(totalRevenue - totalExpenses)} &nbsp;·&nbsp;
            <strong style={{ color: '#EF4444' }}>Tatimi 10%:</strong> {formatCurrency((totalRevenue - totalExpenses) * 0.1)}
          </div>
          <button onClick={() => generateATKReport('fitimi')} disabled={generating}
            className="finex-button-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm">
            <Download size={15} /> Shkarko Excel Fitimi
          </button>
        </div>

        {/* Shpenzime */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={20} style={{ color: '#EF4444' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'Poppins,sans-serif' }}>Regjistri i Shpenzimeve</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Shpenzime të zbritshme • Ligji Nr. 05/L-029</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 16 }}>
            Lista e plotë e shpenzimeve sipas kategorive — dokumentacion për shpenzime të zbritshme.
          </p>
          <div style={{ background: 'var(--bg-muted)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: 'var(--text-3)' }}>
            <strong style={{ color: 'var(--text-1)' }}>Totali:</strong> {formatCurrency(totalExpenses)} &nbsp;·&nbsp;
            <strong style={{ color: 'var(--text-1)' }}>Shpenzime:</strong> {filteredExpenses.length}
          </div>
          <button onClick={() => generateATKReport('shpenzime')} disabled={generating}
            className="finex-button-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm">
            <Download size={15} /> Shkarko Excel Shpenzime
          </button>
        </div>

        {/* Per Klient */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} style={{ color: '#10B981' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'Poppins,sans-serif' }}>Raporti per Klient</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Fatura sipas klientit — sheet individual</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 12 }}>
            Gjeneron Excel me sheet të veçantë për çdo klient ose për klientin e zgjedhur.
          </p>
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
            className="finex-input mb-3" style={{ fontSize: 13 }}>
            <option value="">-- Të gjithë klientët --</option>
            {clients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => generateATKReport('klient')} disabled={generating}
            className="finex-button-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm">
            <Download size={15} /> Shkarko Excel per Klient
          </button>
        </div>
      </div>

      {/* Note */}
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#F59E0B' }}>
        ⚠ <strong>Shënim:</strong> Raportet janë të bazuara në të dhënat e sistemit. Konsultohu me kontabilistin tënd para dorëzimit në ATK. Ligjet tatimore mund të ndryshojnë.
      </div>

      {/* PDF Reports */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 700, color:'var(--text-1)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} style={{ color: 'var(--purple-light)' }} />
            Raporte PDF Profesionale
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Raporte me charts, grafike dhe dizajn Fiscalix — gati për prezantim</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>📊 Raport Mujor PDF</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.5 }}>KPI cards, charts mujore, pie chart, tabela faturash — dizajn premium Fiscalix</p>
            <button
              onClick={async () => {
                generatePDFReport('mujor', invoices, expenses, company, year, month)
              }}
              disabled={generating}
              className="finex-button-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm">
              <Download size={14} /> Shkarko PDF Mujor
            </button>
          </div>
          <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>📈 Raport Vjetor PDF</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.5 }}>Analiza e plotë vjetore me trendet, breakdown kategorish dhe performanca 12-mujore</p>
            <button
              onClick={async () => {
                generatePDFReport('vjetor', invoices, expenses, company, year, 0)
              }}
              disabled={generating}
              className="finex-button-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm">
              <Download size={14} /> Shkarko PDF Vjetor
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// PDF Report Generator