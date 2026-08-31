'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, StickyNote, ListChecks, Activity, FolderOpen, MailPlus, BookMarked, Mail, Loader2, Users2, Receipt, Landmark, FileSpreadsheet, Shield } from 'lucide-react'
import { toast } from 'sonner'
import FiscalHealthScore from '@/components/accountant/fiscal-health-score'
import NotesTab from './tabs/notes-tab'
import ChecklistTab from './tabs/checklist-tab'
import TimelineTab from './tabs/timeline-tab'
import DocumentsTab from './tabs/documents-tab'
import AdvisoryLetterTab from './tabs/advisory-letter-tab'
import BooksTab from './tabs/books-tab'

// Lazy-load heavy tabs
import dynamic from 'next/dynamic'
const ListepagesaTab = dynamic(() => import('./tabs/listepagesa-tab'), { ssr: false })
const TVSHTab = dynamic(() => import('./tabs/tvsh-tab'), { ssr: false })
const TatimiBurimTab = dynamic(() => import('./tabs/tatimi-burim-tab'), { ssr: false })
const RakordimTab = dynamic(() => import('./tabs/rakordim-tab'), { ssr: false })
const RaporteATKTab = dynamic(() => import('./tabs/raporte-atk-tab'), { ssr: false })

interface Company {
  id: string; name: string; email?: string; phone?: string; city?: string
  vat_number?: string; logo_url?: string; is_vat_registered?: boolean
}

interface Props {
  accountantId: string
  company: Company
}

const TABS = [
  { key: 'notes',       label: 'Shënime',      icon: StickyNote,      group: 'main' },
  { key: 'checklist',   label: 'Checklist',    icon: ListChecks,      group: 'main' },
  { key: 'documents',   label: 'Dokumentet',   icon: FolderOpen,      group: 'main' },
  { key: 'books',       label: 'Librat',       icon: BookMarked,      group: 'main' },
  { key: 'listepagesa', label: 'Listëpagesa',  icon: Users2,          group: 'finance' },
  { key: 'tvsh',        label: 'TVSH',         icon: Shield,          group: 'finance' },
  { key: 'tatimi',      label: 'Tatimi Burim', icon: Receipt,         group: 'finance' },
  { key: 'rakordim',    label: 'Rakordim',     icon: Landmark,        group: 'finance' },
  { key: 'raporte',     label: 'Raporte ATK',  icon: FileSpreadsheet, group: 'finance' },
  { key: 'timeline',    label: 'Aktiviteti',   icon: Activity,        group: 'other' },
  { key: 'advisory',    label: 'Letra',        icon: MailPlus,        group: 'other' },
] as const

type TabKey = typeof TABS[number]['key']

export default function ClientWorkspace({ accountantId, company }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('notes')
  const [sending, setSending] = useState(false)
  const [tabGroup, setTabGroup] = useState<'main'|'finance'|'other'>('main')

  async function sendReminder() {
    if (!company.email) { toast.error('Klienti nuk ka email'); return }
    setSending(true)
    try {
      const res = await fetch('/api/accountant/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Gabim') }
      toast.success(`Kujtues u dërgua te ${company.name}`)
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally { setSending(false) }
  }

  const visibleTabs = TABS.filter(t => t.group === tabGroup)

  const groupLabels = {
    main: '📋 Kryesore',
    finance: '💰 Financiare',
    other: '📄 Tjetër',
  }

  return (
    <div className="page-enter">
      <button onClick={() => router.push('/accountant')}
        style={{ display:'flex', alignItems:'center', gap:6, marginBottom:18, background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:13 }}>
        <ArrowLeft size={15}/> Kthehu te Command Center
      </button>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#5A1FD6,#9B5CF8)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Poppins,sans-serif', fontWeight:800, fontSize:18, color:'white', flexShrink:0 }}>
          {company.name?.charAt(0)?.toUpperCase() || 'K'}
        </div>
        <div style={{ flex:1 }}>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:800, color:'var(--text-1)' }}>{company.name}</h1>
          <p style={{ fontSize:13, color:'var(--text-2)' }}>
            {company.email || ''}{company.vat_number ? ` · NUI: ${company.vat_number}` : ''}
            {company.is_vat_registered ? ' · TVSH' : ''}
          </p>
        </div>
        {company.email && (
          <button onClick={sendReminder} disabled={sending}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10, border:'1px solid rgba(90,31,214,0.25)', background:'rgba(90,31,214,0.08)', color:'#9B5CF8', fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0 }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(90,31,214,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(90,31,214,0.08)' }}>
            {sending ? <Loader2 size={13} className="animate-spin"/> : <Mail size={13}/>}
            {sending ? 'Duke dërguar...' : 'Dërgo Kujtues'}
          </button>
        )}
      </div>

      {/* Health Score */}
      <FiscalHealthScore companyId={company.id} companyName={company.name} />

      {/* Tab Group Selector */}
      <div style={{ display:'flex', gap:6, marginBottom:0, marginTop:20 }}>
        {(['main','finance','other'] as const).map(g => (
          <button key={g} onClick={() => { setTabGroup(g); setActiveTab(TABS.find(t=>t.group===g)!.key) }}
            style={{ padding:'6px 14px', borderRadius:'8px 8px 0 0', border:'1px solid var(--border)', borderBottom: tabGroup===g?'1px solid var(--bg-card)':'1px solid var(--border)',
              background: tabGroup===g?'var(--bg-card)':'transparent',
              color: tabGroup===g?'var(--text-1)':'var(--text-3)',
              fontSize:12, fontWeight:700, cursor:'pointer' }}>
            {groupLabels[g]}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, borderBottom:'1px solid var(--border)', background:'var(--bg-card)', borderRadius:'0 8px 0 0', padding:'0 8px', flexWrap:'wrap' }}>
        {visibleTabs.map(t => {
          const Icon = t.icon
          const active = activeTab === t.key
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 14px', borderRadius:0, background:'none', border:'none', cursor:'pointer',
                borderBottom: active?'2px solid var(--purple-light)':'2px solid transparent',
                color: active?'var(--purple-light)':'var(--text-3)',
                fontSize:12.5, fontWeight:700, marginBottom:-1, transition:'all 0.15s', whiteSpace:'nowrap' }}>
              <Icon size={14}/>{t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div style={{ marginTop:20 }}>
        {activeTab === 'notes'       && <NotesTab accountantId={accountantId} companyId={company.id} />}
        {activeTab === 'checklist'   && <ChecklistTab companyId={company.id} />}
        {activeTab === 'documents'   && <DocumentsTab accountantId={accountantId} companyId={company.id} />}
        {activeTab === 'books'       && <BooksTab companyId={company.id} companyName={company.name} />}
        {activeTab === 'listepagesa' && <ListepagesaTab companyId={company.id} companyName={company.name} />}
        {activeTab === 'tvsh'        && <TVSHTab companyId={company.id} isVatRegistered={company.is_vat_registered} />}
        {activeTab === 'tatimi'      && <TatimiBurimTab companyId={company.id} />}
        {activeTab === 'rakordim'    && <RakordimTab companyId={company.id} />}
        {activeTab === 'raporte'     && <RaporteATKTab companyId={company.id} companyName={company.name} isVatRegistered={company.is_vat_registered} />}
        {activeTab === 'timeline'    && <TimelineTab companyId={company.id} />}
        {activeTab === 'advisory'    && <AdvisoryLetterTab company={company} />}
      </div>
    </div>
  )
}
