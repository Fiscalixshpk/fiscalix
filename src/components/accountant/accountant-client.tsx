'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, TrendingUp, AlertTriangle, DollarSign, Clock,
  Plus, Search, X, FileText, Receipt, BarChart3,
  Trash2, Crown, Download, ChevronRight, ArrowLeft,
  CheckCircle2, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface Stats {
  totalRevenue: number; totalExpenses: number; profit: number
  invoiceCount: number; overdueCount: number; overdueAmount: number
  pendingCount: number; pendingAmount: number
}
interface Invoice {
  id: string; invoice_number: string; client_name: string
  issue_date: string; due_date: string; total_amount: number; status: string
}
interface Expense {
  id: string; vendor_name: string; amount: number
  expense_date: string
  expense_categories?: { name_sq?: string; name?: string }
}
interface Company {
  id: string; name: string; email?: string; phone?: string
  city?: string; logo_url?: string; is_active?: boolean
  subscriptions?: { plan: string }[]
}
interface ClientEntry {
  id: string; notes?: string; added_at: string
  company: Company | null; stats: Stats | null
  invoices?: Invoice[]; expenses?: Expense[]
}
interface AvailableCompany { id: string; name: string; email?: string; city?: string }

interface Props {
  accountantName: string
  clients: ClientEntry[]
  availableCompanies: AvailableCompany[]
  subscription: { plan: string; status: string; max_clients: number; current_period_end?: string } | null
  maxClients: number
}

function fmt(n: number) {
  return '€' + Number(n || 0).toLocaleString('sq-AL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('sq-AL', { day:'2-digit', month:'2-digit', year:'numeric' })
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  paid:    { label: 'Paguar',   color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  pending: { label: 'Pritje',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  overdue: { label: 'Vonuar',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  draft:   { label: 'Draft',    color:'white', bg: 'rgba(107,114,128,0.1)' },
}

type Tab = 'overview' | 'invoices' | 'expenses' | 'employees' | 'financial'

export default function AccountantClient({
  accountantName, clients: initialClients, availableCompanies, subscription, maxClients
}: Props) {
  const [clients, setClients] = useState(initialClients)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [selected, setSelected] = useState<ClientEntry | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loadingClient, setLoadingClient] = useState<string | null>(null)
  const [clientData, setClientData] = useState<{ invoices: Invoice[]; expenses: Expense[] } | null>(null)

  const filtered = clients.filter(c =>
    !search || c.company?.name.toLowerCase().includes(search.toLowerCase())
  )
  const addFiltered = availableCompanies.filter(c =>
    !addSearch || c.name.toLowerCase().includes(addSearch.toLowerCase()) ||
    (c.email||'').toLowerCase().includes(addSearch.toLowerCase())
  )

  const totalRevenue = clients.reduce((s,c) => s+(c.stats?.totalRevenue||0), 0)
  const totalProfit  = clients.reduce((s,c) => s+(c.stats?.profit||0), 0)
  const alertClients = clients.filter(c => (c.stats?.overdueCount||0) > 0).length

  async function selectClient(client: ClientEntry) {
    setSelected(client)
    setActiveTab('overview')
    setClientData(null)
    setLoadingClient(client.id)
    try {
      const [invRes, expRes] = await Promise.all([
        fetch(`/api/accountant/client-data?company_id=${client.company?.id}&type=invoices`),
        fetch(`/api/accountant/client-data?company_id=${client.company?.id}&type=expenses`),
      ])
      const [invData, expData] = await Promise.all([invRes.json(), expRes.json()])
      setClientData({ invoices: invData || [], expenses: expData || [] })
    } catch { toast.error('Gabim gjatë ngarkimit') }
    finally { setLoadingClient(null) }
  }

  async function addClient(company: AvailableCompany) {
    setAdding(true)
    try {
      const res = await fetch('/api/accountant/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success(`${company.name} u shtua!`)
      setShowAdd(false); setAddSearch('')
      window.location.reload()
    } catch { toast.error('Gabim') }
    finally { setAdding(false) }
  }

  async function removeClient(clientId: string, companyId: string) {
    setRemoving(clientId)
    try {
      const res = await fetch('/api/accountant/clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      })
      if (res.ok) {
        setClients(prev => prev.filter(c => c.id !== clientId))
        if (selected?.id === clientId) setSelected(null)
        toast.success('Klienti u shkëput — lidhja u hoq, të dhënat mbetën')
      }
    } catch { toast.error('Gabim') }
    finally { setRemoving(null) }
  }

  async function exportClientCSV(type: 'invoices'|'expenses') {
    if (!clientData || !selected) return
    const items = type === 'invoices' ? clientData.invoices : clientData.expenses
    if (!items.length) { toast.error('Nuk ka të dhëna'); return }

    let csv = ''
    if (type === 'invoices') {
      csv = 'Nr. Faturës,Klienti,Data,Skadenca,Totali,Statusi\n'
      csv += clientData.invoices.map(i =>
        `"${i.invoice_number}","${i.client_name}","${fmtDate(i.issue_date)}","${fmtDate(i.due_date)}","${Number((i.total_amount ?? i.total)).toFixed(2)}","${STATUS_LABELS[i.status]?.label||i.status}"`
      ).join('\n')
    } else {
      csv = 'Data,Furnitori,Kategoria,Shuma\n'
      csv += clientData.expenses.map(e =>
        `"${fmtDate(e.expense_date)}","${e.vendor_name||''}","${(e.expense_categories as {name_sq?:string}|undefined)?.name_sq||''}","${Number(e.amount).toFixed(2)}"`
      ).join('\n')
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selected.company?.name}_${type}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV u eksportua!')
  }

  const PLAN_COLORS: Record<string,string> = {
    arka:'#06B6D4', basic:'#10B981', pro:'#2563EB', business:'#7C3AED', accountant:'#F59E0B'
  }

  return (
    <div className="page-enter" style={{ display:'flex', flexDirection:'column', gap:16, height:'calc(100vh - 80px)' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:22, fontWeight:700, color:'var(--text-1)', marginBottom:2, display:'flex', alignItems:'center', gap:10 }}>
            <Crown size={20} style={{ color:'#F59E0B' }}/> Paneli i Kontabilistit
          </h1>
          <p style={{ color:'var(--text-3)', fontSize:13 }}>
            {accountantName} · {clients.length}/{maxClients} klientë
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} disabled={clients.length >= maxClients}
          className="finex-button-primary flex items-center gap-2 px-4 py-2.5 text-sm font-semibold">
          <Plus size={15}/> Shto Klient
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, flexShrink:0 }}>
        {[
          { label:'Klientë Aktivë', value:String(clients.length), sub:`Maks ${maxClients}`, icon:Users, color:'#7B2CF5' },
          { label:'Të ardhura totale', value:fmt(totalRevenue), sub:'Të gjithë klientët', icon:DollarSign, color:'#10B981' },
          { label:'Fitimi total', value:fmt(totalProfit), sub:'Pas shpenzimeve', icon:TrendingUp, color:'#3B82F6' },
          { label:'Klientë me vonesa', value:String(alertClients), sub:alertClients>0?'Kërkon vëmendje':'Gjithçka OK', icon:AlertTriangle, color:alertClients>0?'#EF4444':'#10B981' },
        ].map((k,i) => {
          const Icon = k.icon
          return (
            <div key={i} className="kpi-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div style={{ width:34, height:34, borderRadius:9, background:`${k.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={16} style={{ color:k.color }}/>
                </div>
              </div>
              <p style={{ fontSize:20, fontWeight:800, fontFamily:'Poppins,sans-serif', color:'var(--text-1)', marginBottom:2 }}>{k.value}</p>
              <p style={{ fontSize:11, color:'var(--text-3)' }}>{k.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Main layout */}
      <div style={{ display:'grid', gridTemplateColumns: selected ? '280px 1fr' : '1fr', gap:14, flex:1, minHeight:0 }}>

        {/* Client list */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Kërko klientin..."
                className="finex-input" style={{ paddingLeft:30, fontSize:12, padding:'8px 10px 8px 30px' }}/>
            </div>
          </div>

          <div style={{ overflowY:'auto', flex:1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center' }}>
                <Users size={32} style={{ color:'var(--text-3)', margin:'0 auto 10px', display:'block', opacity:0.3 }}/>
                <p style={{ color:'var(--text-3)', fontSize:13 }}>Nuk ka klientë</p>
                <button onClick={() => setShowAdd(true)}
                  className="finex-button-primary px-4 py-2 text-sm mt-3 inline-flex items-center gap-2">
                  <Plus size={13}/> Shto klientin e parë
                </button>
              </div>
            ) : filtered.map(client => {
              const comp = client.company
              const stats = client.stats
              const isSelected = selected?.id === client.id
              const hasAlert = (stats?.overdueCount||0) > 0
              const plan = comp?.subscriptions?.[0]?.plan || 'basic'
              const isLoading = loadingClient === client.id

              return (
                <div key={client.id} onClick={() => selectClient(client)}
                  style={{
                    padding:'12px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer',
                    background: isSelected ? 'var(--purple-bg)' : 'transparent',
                    borderLeft: `3px solid ${isSelected ? 'var(--purple)' : 'transparent'}`,
                    transition:'all 0.15s', opacity: isLoading ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background='var(--bg-muted)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background='transparent' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#5A1FD6,#9B5CF8)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'white', flexShrink:0 }}>
                      {comp?.name?.charAt(0)||'?'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{comp?.name}</p>
                        {hasAlert && <AlertTriangle size={11} style={{ color:'white', flexShrink:0 }}/>}
                      </div>
                      <div style={{ display:'flex', gap:8, fontSize:11 }}>
                        <span style={{ color:'var(--text-1)', fontWeight:600 }}>{fmt(stats?.totalRevenue||0)}</span>
                        <span style={{ color:PLAN_COLORS[plan], fontWeight:600, textTransform:'capitalize' }}>{plan}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      {isLoading && <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid var(--purple)', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>}
                      <button onClick={e => {
                          e.stopPropagation()
                          if (confirm(`Shkëput klientin "${comp?.name}"?\n\nLidhja me kontabilistin hiqet. Klienti dhe të dhënat e tij mbeten të paprekura.`)) {
                            removeClient(client.id, comp?.id||'')
                          }
                        }}
                        disabled={removing===client.id}
                        title="Shkëput klientin"
                        style={{ padding:'4px 8px', borderRadius:6, background:'transparent', border:'1px solid transparent', cursor:'pointer', color:'white', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}
                        onMouseEnter={e => { e.currentTarget.style.background='#FEF2F2'; e.currentTarget.style.color='#DC2626'; e.currentTarget.style.borderColor='#FECACA' }}
                        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-3)'; e.currentTarget.style.borderColor='transparent' }}>
                        <Trash2 size={12}/> {!removing && <span>Shkëput</span>}
                      </button>
                      <ChevronRight size={13} style={{ color:'white' }}/>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Client Detail */}
        {selected && selected.company && (
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* Client header */}
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#5A1FD6,#9B5CF8)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:18, color:'white' }}>
                  {selected.company.name.charAt(0)}
                </div>
                <div>
                  <p style={{ fontSize:16, fontWeight:700, color:'white', fontFamily:'Poppins,sans-serif' }}>{selected.company.name}</p>
                  <p style={{ fontSize:12, color:'white' }}>{selected.company.email} {selected.company.city ? `· ${selected.company.city}` : ''}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ padding:6, borderRadius:8, background:'var(--bg-muted)', border:'1px solid var(--border)', cursor:'pointer', color:'var(--text-3)', display:'flex' }}>
                <X size={14}/>
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', gap:2, padding:'10px 18px 0', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              {([
                { id:'overview', label:'Pasqyra', icon:BarChart3 },
                { id:'invoices', label:'Faturat', icon:FileText },
                { id:'expenses', label:'Shpenzimet', icon:Receipt },
                { id:'employees', label:'Punëtorët', icon:Users2 },
                { id:'financial', label:'Raport Financiar', icon:TrendingUp },
              ] as {id:Tab;label:string;icon:typeof BarChart3}[]).map(tab => {
                const Icon = tab.icon
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:'8px 8px 0 0', fontSize:13, fontWeight:600, cursor:'pointer', border:'none', background: activeTab===tab.id?'var(--bg-base)':'transparent', color: activeTab===tab.id?'var(--purple-light)':'var(--text-3)', borderBottom: activeTab===tab.id?'2px solid var(--purple)':'2px solid transparent' }}>
                    <Icon size={14}/> {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            <div style={{ flex:1, overflowY:'auto', padding:'16px 18px' }}>

              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {/* KPI mini */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                    {[
                      { label:'Të ardhura', value:fmt(selected.stats?.totalRevenue||0), color:'#7B2CF5' },
                      { label:'Shpenzime', value:fmt(selected.stats?.totalExpenses||0), color:'#EF4444' },
                      { label:'Fitimi', value:fmt(selected.stats?.profit||0), color:'#10B981' },
                      { label:'Fatura', value:String(selected.stats?.invoiceCount||0), color:'#3B82F6' },
                    ].map(s => (
                      <div key={s.label} style={{ background:'var(--bg-muted)', borderRadius:10, padding:'12px 14px' }}>
                        <p style={{ fontSize:17, fontWeight:800, color:s.color, fontFamily:'Poppins,sans-serif' }}>{s.value}</p>
                        <p style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Alerts */}
                  {(selected.stats?.overdueCount||0) > 0 && (
                    <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:8 }}>
                      <AlertTriangle size={15} style={{ color:'var(--text-1)', flexShrink:0 }}/>
                      <p style={{ fontSize:13, color:'var(--text-1)', fontWeight:600 }}>
                        {selected.stats?.overdueCount} fatura vonuara — {fmt(selected.stats?.overdueAmount||0)} të bllokuara
                      </p>
                    </div>
                  )}
                  {(selected.stats?.pendingCount||0) > 0 && (
                    <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:8 }}>
                      <Clock size={15} style={{ color:'#F59E0B', flexShrink:0 }}/>
                      <p style={{ fontSize:13, color:'#F59E0B', fontWeight:600 }}>
                        {selected.stats?.pendingCount} fatura në pritje — {fmt(selected.stats?.pendingAmount||0)}
                      </p>
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ background:'var(--bg-muted)', borderRadius:12, padding:'14px 16px' }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:'Poppins,sans-serif' }}>Informacioni</p>
                    {[
                      ['Email', selected.company.email],
                      ['Telefon', selected.company.phone],
                      ['Qyteti', selected.company.city],
                      ['Plan aktual', selected.company.subscriptions?.[0]?.plan || 'basic'],
                      ['Shtuar si klient', new Date(selected.added_at).toLocaleDateString('sq-AL')],
                    ].filter(([,v]) => v).map(([k,v]) => (
                      <div key={k as string} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                        <span style={{ color:'var(--text-3)' }}>{k}</span>
                        <span style={{ color:'var(--text-1)', fontWeight:500, textTransform:'capitalize' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* INVOICES */}
              {activeTab === 'invoices' && (
                <div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <p style={{ fontSize:13, color:'var(--text-3)' }}>
                      {clientData ? `${clientData.invoices.length} fatura` : 'Duke ngarkuar...'}
                    </p>
                    <button onClick={() => exportClientCSV('invoices')}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:'var(--bg-muted)', border:'1px solid var(--border)', fontSize:12, color:'var(--text-2)', cursor:'pointer' }}>
                      <Download size={12}/> Eksporto CSV
                    </button>
                  </div>

                  {!clientData ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'var(--text-3)', fontSize:13 }}>Duke ngarkuar...</div>
                  ) : clientData.invoices.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'var(--text-3)', fontSize:13 }}>Nuk ka fatura</div>
                  ) : (
                    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
                      <table className="finex-table">
                        <thead>
                          <tr>
                            <th>Nr. Faturës</th>
                            <th>Klienti</th>
                            <th>Data</th>
                            <th>Skadenca</th>
                            <th style={{ textAlign:'right' }}>Totali</th>
                            <th style={{ textAlign:'center' }}>Statusi</th>
                            <th style={{ textAlign:'right' }}>PDF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientData.invoices.map(inv => {
                            const s = STATUS_LABELS[inv.status] || { label: inv.status, color:'#6B7280', bg:'rgba(107,114,128,0.1)' }
                            return (
                              <tr key={inv.id}>
                                <td style={{ fontWeight:600, color:'var(--purple-light)', fontSize:13 }}>{inv.invoice_number}</td>
                                <td style={{ fontSize:13 }}>{inv.client_name}</td>
                                <td style={{ fontSize:12, color:'var(--text-3)' }}>{fmtDate(inv.issue_date)}</td>
                                <td style={{ fontSize:12, color: inv.status==='overdue'?'#EF4444':'var(--text-3)' }}>{fmtDate(inv.due_date)}</td>
                                <td style={{ textAlign:'right', fontWeight:700, fontSize:13 }}>{fmt(Number((inv.total_amount ?? inv.total)))}</td>
                                <td style={{ textAlign:'center' }}>
                                  <span style={{ fontSize:11, padding:'3px 9px', borderRadius:20, background:s.bg, color:s.color, fontWeight:600 }}>{s.label}</span>
                                </td>
                                <td style={{ textAlign:'right' }}>
                                  {(() => {
                                    const bt = (selected?.company as {business_type?:string}|null)?.business_type || ''
                                    const pdfMap: Record<string,string> = {
                                      health:'medical-pdf', construction:'construction-pdf',
                                      legal:'legal-pdf', agency:'agency-pdf', it:'it-pdf',
                                      transport:'transport-pdf',
                                      education:'education-pdf', import_export:'import-export-pdf',
                                      tourism:'tourism-pdf', services:'services-pdf',
                                    }
                                    const pdfRoute = pdfMap[bt] || 'pdf'
                                    if (pdfRoute === 'pdf') return null
                                    return (
                                      <a href={`/api/invoices/${inv.id}/${pdfRoute}`} target="_blank" rel="noopener noreferrer"
                                        style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:7, background:'rgba(90,31,214,0.08)', border:'1px solid rgba(90,31,214,0.2)', color:'#9B5CF8', fontSize:11, fontWeight:700, textDecoration:'none' }}>
                                        PDF
                                      </a>
                                    )
                                  })()}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* EXPENSES */}
              {activeTab === 'expenses' && (
                <div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <p style={{ fontSize:13, color:'var(--text-3)' }}>
                      {clientData ? `${clientData.expenses.length} shpenzime` : 'Duke ngarkuar...'}
                    </p>
                    <button onClick={() => exportClientCSV('expenses')}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:'var(--bg-muted)', border:'1px solid var(--border)', fontSize:12, color:'var(--text-2)', cursor:'pointer' }}>
                      <Download size={12}/> Eksporto CSV
                    </button>
                  </div>

                  {!clientData ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'var(--text-3)', fontSize:13 }}>Duke ngarkuar...</div>
                  ) : clientData.expenses.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'var(--text-3)', fontSize:13 }}>Nuk ka shpenzime</div>
                  ) : (
                    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
                      <table className="finex-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Furnitori</th>
                            <th>Kategoria</th>
                            <th style={{ textAlign:'right' }}>Shuma</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientData.expenses.map(exp => (
                            <tr key={exp.id}>
                              <td style={{ fontSize:12, color:'var(--text-3)' }}>{fmtDate(exp.expense_date)}</td>
                              <td style={{ fontSize:13, fontWeight:500 }}>{exp.vendor_name || '—'}</td>
                              <td style={{ fontSize:12, color:'var(--text-3)' }}>
                                {(exp.expense_categories as {name_sq?:string}|undefined)?.name_sq || '—'}
                              </td>
                              <td style={{ textAlign:'right', fontWeight:700, fontSize:13 }}>{fmt(Number(exp.amount))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'employees' && (
                <EmployeesTab companyId={selected?.company?.id} companyName={selected?.company?.name} />
              )}

              {activeTab === 'financial' && (
                <FinancialReportTab
                  companyId={selected?.company?.id}
                  companyName={selected?.company?.name}
                  stats={selected?.stats}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)' }} onClick={() => setShowAdd(false)}/>
          <div style={{ position:'relative', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:28, width:'100%', maxWidth:480, maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:17, fontWeight:700, color:'var(--text-1)' }}>Shto Klient</h2>
              <button onClick={() => setShowAdd(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)' }}><X size={17}/></button>
            </div>
            <div style={{ marginBottom:12 }}>
              <div style={{ position:'relative' }}>
                <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
                <input value={addSearch} onChange={e => setAddSearch(e.target.value)}
                  placeholder="Kërko kompaninë..." autoFocus
                  className="finex-input" style={{ paddingLeft:32 }}/>
              </div>
            </div>
            <div style={{ overflowY:'auto', flex:1 }}>
              {addFiltered.length === 0 ? (
                <p style={{ textAlign:'center', color:'var(--text-3)', fontSize:13, padding:'28px 0' }}>
                  {addSearch ? 'Nuk u gjet' : 'Të gjitha kompanitë janë shtuar'}
                </p>
              ) : addFiltered.map(comp => (
                <div key={comp.id} onClick={() => addClient(comp)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:12, borderRadius:10, marginBottom:6, cursor:'pointer', border:'1px solid var(--border)', background:'var(--bg-muted)', transition:'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border-purple)'; (e.currentTarget as HTMLDivElement).style.background='var(--purple-bg)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLDivElement).style.background='var(--bg-muted)' }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#5A1FD6,#9B5CF8)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'white', flexShrink:0 }}>
                    {comp.name.charAt(0)}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'white' }}>{comp.name}</p>
                    <p style={{ fontSize:11, color:'white' }}>{comp.email}{comp.city ? ` · ${comp.city}` : ''}</p>
                  </div>
                  <Plus size={14} style={{ color:'var(--purple-light)', flexShrink:0 }}/>
                </div>
              ))}
            </div>
            <p style={{ fontSize:11, color:'var(--text-3)', marginTop:12, textAlign:'center' }}>
              {clients.length}/{maxClients} klientë
            </p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── EmployeesTab: shfaq punëtorët e klientit ──────────────────
function EmployeesTab({ companyId, companyName }: { companyId?: string; companyName?: string }) {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    supabase.from('employees')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => { setEmployees(data || []); setLoading(false) })
  }, [companyId])

  const totalGross = employees.reduce((s, e) => s + Number(e.gross_salary || 0), 0)
  const totalPensionER = totalGross * 0.05
  const totalPensionEE = totalGross * 0.05
  const totalCost = totalGross + totalPensionER

  if (loading) return <div style={{ textAlign:'center', padding:'40px', color:'var(--text-3)', fontSize:13 }}>Duke ngarkuar...</div>

  if (employees.length === 0) return (
    <div style={{ textAlign:'center', padding:'48px 20px' }}>
      <p style={{ fontSize:14, color:'var(--text-3)', marginBottom:8 }}>Biznesi nuk ka punëtorë të regjistruar</p>
      <p style={{ fontSize:12, color:'var(--text-3)', opacity:0.6 }}>Punëtorët regjistrohen nga biznesi te "Raporte Financiare"</p>
    </div>
  )

  return (
    <div>
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10, marginBottom:14 }}>
        {[
          { label:'Nr. Punëtorësh', value: employees.length.toString(), color:'#3B82F6' },
          { label:'Bruto/Muaj', value:`€${totalGross.toFixed(2)}`, color:'#10B981' },
          { label:'Pensioni ER (5%)', value:`€${totalPensionER.toFixed(2)}`, color:'#F59E0B' },
          { label:'Kosto Totale/Muaj', value:`€${totalCost.toFixed(2)}`, color:'#9B5CF8' },
        ].map((k,i)=>(
          <div key={i} style={{ background:'var(--bg-muted)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px', borderTop:`3px solid ${k.color}` }}>
            <p style={{ fontSize:9, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{k.label}</p>
            <p style={{ fontFamily:'Poppins,sans-serif', fontSize:18, fontWeight:800, color:k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table className="finex-table">
            <thead>
              <tr>
                <th>Emri</th>
                <th>Pozita</th>
                <th style={{ textAlign:'right' }}>Bruto</th>
                <th style={{ textAlign:'right' }}>Pensioni EE (5%)</th>
                <th style={{ textAlign:'right' }}>Pensioni ER (5%)</th>
                <th style={{ textAlign:'right' }}>Neto</th>
                <th style={{ textAlign:'right' }}>Kosto/Muaj</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp,i)=>{
                const gross = Number(emp.gross_salary||0)
                const pensEE = gross * 0.05
                const pensER = gross * 0.05
                const neto = gross - pensEE
                const cost = gross + pensER
                return (
                  <tr key={emp.id||i}>
                    <td style={{ fontWeight:700 }}>{emp.full_name}</td>
                    <td style={{ fontSize:12, color:'var(--text-3)' }}>{emp.position||'—'}</td>
                    <td style={{ textAlign:'right', fontWeight:600 }}>€{gross.toFixed(2)}</td>
                    <td style={{ textAlign:'right', color:'var(--text-1)', fontSize:12 }}>-€{pensEE.toFixed(2)}</td>
                    <td style={{ textAlign:'right', color:'#F59E0B', fontSize:12 }}>€{pensER.toFixed(2)}</td>
                    <td style={{ textAlign:'right', fontWeight:700, color:'var(--text-1)' }}>€{neto.toFixed(2)}</td>
                    <td style={{ textAlign:'right', fontWeight:800, color:'#9B5CF8' }}>€{cost.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:'2px solid var(--border)', background:'rgba(124,58,237,0.06)' }}>
                <td colSpan={2} style={{ padding:'10px 12px', fontSize:12, fontWeight:700, color:'var(--text-3)' }}>TOTALI</td>
                <td style={{ textAlign:'right', padding:'10px 12px', fontWeight:800 }}>€{totalGross.toFixed(2)}</td>
                <td style={{ textAlign:'right', padding:'10px 12px', color:'var(--text-1)', fontWeight:700 }}>-€{totalPensionEE.toFixed(2)}</td>
                <td style={{ textAlign:'right', padding:'10px 12px', color:'#F59E0B', fontWeight:700 }}>€{totalPensionER.toFixed(2)}</td>
                <td></td>
                <td style={{ textAlign:'right', padding:'10px 12px', fontWeight:900, color:'#9B5CF8', fontSize:15 }}>€{totalCost.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p style={{ fontSize:11, color:'var(--text-3)', marginTop:10, textAlign:'center' }}>
        Të dhënat regjistrohen nga biznesi · Kontributet llogariten automatikisht
      </p>
    </div>
  )
}

// ── FinancialReportTab: raport financiar per klientin ──────────
function FinancialReportTab({ companyId, companyName, stats }: { companyId?: string; companyName?: string; stats?: any }) {
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/analytics/summary?company_id=${companyId}&year=${year}&quarter=${quarter}`).then(r => r.json()),
      supabase.from('employees').select('*').eq('company_id', companyId).eq('is_active', true).then(({ data }) => data || []),
    ]).then(([summary, emps]) => {
      setData(summary)
      setEmployees(emps)
    }).finally(() => setLoading(false))
  }, [companyId, year, quarter])

  const QUARTERS = [
    { q: 1, label: 'Q1 (Janar-Mars)', start: year+'-01-01', end: year+'-03-31' },
    { q: 2, label: 'Q2 (Prill-Qershor)', start: year+'-04-01', end: year+'-06-30' },
    { q: 3, label: 'Q3 (Korrik-Shtator)', start: year+'-07-01', end: year+'-09-30' },
    { q: 4, label: 'Q4 (Tetor-Dhjetor)', start: year+'-10-01', end: year+'-12-31' },
  ]

  const revenue = Number(data?.revenue || 0)
  const expenses = Number(data?.expenses || 0)
  const profit = revenue - expenses
  const tax9 = Math.max(0, profit * 0.09)

  const totalGross = employees.reduce((s, e) => s + Number(e.gross_salary || 0), 0)
  const pensionER = totalGross * 0.05
  const pensionEE = totalGross * 0.05
  const totalCost = totalGross + pensionER

  const I = { background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 8px', color:'var(--text-1)', fontSize:12, outline:'none' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Selector */}
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <span style={{ fontSize:11, color:'var(--text-3)', fontWeight:600 }}>Periudha:</span>
        {[1,2,3,4].map(q => (
          <button key={q} onClick={() => setQuarter(q)}
            style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${quarter===q?'rgba(124,58,237,0.4)':'var(--border)'}`, background:quarter===q?'rgba(124,58,237,0.12)':'transparent', color:quarter===q?'var(--purple)':'var(--text-3)', fontSize:11, fontWeight:600, cursor:'pointer' }}>
            Q{q}
          </button>
        ))}
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ ...I, width:80 }}>
          {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'24px', color:'var(--text-3)', fontSize:13 }}>Duke ngarkuar...</div>
      ) : (
        <>
          {/* Tatimi */}
          <div style={{ background:'var(--bg-muted)', borderRadius:12, padding:'14px 16px' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>📊 Tatimi mbi Biznesin — Q{quarter} {year}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { label:'Qarkullimi', value:`€${revenue.toFixed(2)}`, color:'#10B981' },
                { label:'(-) Shpenzime', value:`€${expenses.toFixed(2)}`, color:'#EF4444' },
                { label:'(=) Fitimi Neto', value:`€${profit.toFixed(2)}`, color: profit >= 0 ? '#3B82F6' : '#EF4444' },
                { label:'Tatimi 9%', value:`€${tax9.toFixed(2)}`, color:'#F59E0B' },
              ].map((r, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px', borderRadius:8, background: i === 3 ? 'rgba(245,158,11,0.08)' : 'transparent', border: i === 3 ? '1px solid rgba(245,158,11,0.2)' : 'none' }}>
                  <span style={{ fontSize:12, color:'var(--text-3)' }}>{r.label}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:r.color, fontFamily:'Poppins,sans-serif' }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:8, padding:'8px 10px', borderRadius:8, background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.15)', fontSize:11, color:'var(--text-3)' }}>
              ⏰ Afati dorëzimit: {quarter===1?'15 Prill':quarter===2?'15 Korrik':quarter===3?'15 Tetor':'15 Janar'} {quarter===4?year+1:year}
            </div>
          </div>

          {/* Pagat & Kontributet */}
          {employees.length > 0 ? (
            <div style={{ background:'var(--bg-muted)', borderRadius:12, padding:'14px 16px' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>👥 Pagat & Kontributet — {employees.length} Punëtorë</p>
              <div style={{ overflowX:'auto' }}>
                <table className="finex-table">
                  <thead>
                    <tr>
                      <th>Punëtori</th>
                      <th style={{ textAlign:'right' }}>Bruto</th>
                      <th style={{ textAlign:'right' }}>Neto</th>
                      <th style={{ textAlign:'right' }}>Pension EE</th>
                      <th style={{ textAlign:'right' }}>Pension ER</th>
                      <th style={{ textAlign:'right' }}>Kosto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, i) => {
                      const g = Number(emp.gross_salary || 0)
                      return (
                        <tr key={emp.id || i}>
                          <td style={{ fontWeight:600, fontSize:12 }}>{emp.full_name}<br/><span style={{ fontSize:10, color:'var(--text-3)', fontWeight:400 }}>{emp.position || ''}</span></td>
                          <td style={{ textAlign:'right', fontSize:12 }}>€{g.toFixed(2)}</td>
                          <td style={{ textAlign:'right', fontSize:12, color:'var(--text-1)', fontWeight:600 }}>€{(g * 0.95).toFixed(2)}</td>
                          <td style={{ textAlign:'right', fontSize:12, color:'var(--text-1)' }}>€{(g * 0.05).toFixed(2)}</td>
                          <td style={{ textAlign:'right', fontSize:12, color:'#F59E0B' }}>€{(g * 0.05).toFixed(2)}</td>
                          <td style={{ textAlign:'right', fontSize:12, fontWeight:700, color:'#9B5CF8' }}>€{(g * 1.05).toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop:'2px solid var(--border)' }}>
                      <td style={{ fontWeight:700, fontSize:11, color:'var(--text-3)', padding:'8px 12px' }}>TOTALI/MUAJ</td>
                      <td style={{ textAlign:'right', fontWeight:700, padding:'8px 12px' }}>€{totalGross.toFixed(2)}</td>
                      <td style={{ textAlign:'right', padding:'8px 12px', color:'var(--text-1)', fontWeight:700 }}>€{(totalGross * 0.95).toFixed(2)}</td>
                      <td style={{ textAlign:'right', padding:'8px 12px', color:'var(--text-1)', fontWeight:700 }}>€{pensionEE.toFixed(2)}</td>
                      <td style={{ textAlign:'right', padding:'8px 12px', color:'#F59E0B', fontWeight:700 }}>€{pensionER.toFixed(2)}</td>
                      <td style={{ textAlign:'right', padding:'8px 12px', color:'#9B5CF8', fontWeight:800, fontSize:13 }}>€{totalCost.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ background:'var(--bg-muted)', borderRadius:12, padding:'14px 16px', textAlign:'center', color:'var(--text-3)', fontSize:12 }}>
              Biznesi nuk ka punëtorë të regjistruar
            </div>
          )}
        </>
      )}
    </div>
  )
}
