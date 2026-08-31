'use client'

import { useState } from 'react'
import { Download, Loader2, FileSpreadsheet, TrendingUp, Wallet, BarChart3, Shield, Users2, Receipt, Database } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  companyId: string
  companyName: string
  isVatRegistered?: boolean
}

const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']
const QUARTERS = ['T1 (Jan-Mar)','T2 (Pri-Qer)','T3 (Kor-Sht)','T4 (Tet-Dhj)']

export default function RaporteATKTab({ companyId, companyName, isVatRegistered }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3))
  const [loading, setLoading] = useState<string | null>(null)

  async function download(url: string, filename: string, label: string) {
    setLoading(label)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Gabim gjatë gjenerimit')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success(`${label} u shkarkua`)
    } catch {
      toast.error('Gabim gjatë shkarkimit')
    } finally {
      setLoading(null)
    }
  }

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, outline:'none' }

  const reports = [
    {
      group: '🏛️ Eksportime ATK',
      items: [
        {
          id: 'atk-full',
          label: 'Eksport i Plotë ATK',
          desc: `Libri Shitjeve, Blerjeve, Arkës, Bankës + Përmbledhja — T${quarter} ${year}`,
          icon: Shield,
          color: '#5A1FD6',
          url: `/api/reports/atk-full?company_id=${companyId}&year=${year}&quarter=${quarter}`,
          filename: `ATK_Komplet_T${quarter}_${year}_${companyName}.xlsx`,
        },
        ...(isVatRegistered ? [{
          id: 'tvsh',
          label: 'Deklarata TVSH',
          desc: `TVSH Dalëse, Hyrëse dhe Saldo — T${quarter} ${year}`,
          icon: FileSpreadsheet,
          color: '#F59E0B',
          url: `/api/vat-export?company_id=${companyId}&year=${year}&quarter=${quarter}`,
          filename: `TVSH_T${quarter}_${year}_${companyName}.xlsx`,
        }] : []),
        {
          id: 'wht',
          label: 'Tatimi në Burim 9%',
          desc: `Deklarata tatimit në burim — ${MONTHS[month-1]} ${year}`,
          icon: Receipt,
          color: '#EF4444',
          url: `/api/withholding-tax/export?company_id=${companyId}&year=${year}&month=${month}`,
          filename: `Tatimi_Burim_${MONTHS[month-1]}_${year}_${companyName}.xlsx`,
        },
        {
          id: 'payroll',
          label: 'Listëpagesa + Pension',
          desc: `Format ATK — ${MONTHS[month-1]} ${year}`,
          icon: Users2,
          color: '#10B981',
          url: '', // POST — trajtohet ndryshe
          filename: `Listepagesa_${MONTHS[month-1]}_${year}_${companyName}.xlsx`,
          isPayroll: true,
        },
      ]
    },
    {
      group: '📊 Raporte Financiare',
      items: [
        {
          id: 'pl',
          label: 'Profit & Loss',
          desc: `Hyrjet, daljet dhe fitimi — viti ${year}`,
          icon: TrendingUp,
          color: '#10B981',
          url: `/api/reports/pl?company_id=${companyId}&year=${year}&format=excel`,
          filename: `PL_${year}_${companyName}.xlsx`,
        },
        {
          id: 'cashflow',
          label: 'Cash Flow',
          desc: `Rrjedha e parasë — viti ${year}`,
          icon: Wallet,
          color: '#3B82F6',
          url: `/api/reports/cashflow?company_id=${companyId}&year=${year}&format=excel`,
          filename: `CashFlow_${year}_${companyName}.xlsx`,
        },
        {
          id: 'trial',
          label: 'Trial Balance',
          desc: `Gjendja e llogarive — viti ${year}`,
          icon: BarChart3,
          color: '#9B5CF8',
          url: `/api/reports/trial-balance?company_id=${companyId}&year=${year}&format=excel`,
          filename: `TrialBalance_${year}_${companyName}.xlsx`,
        },
        {
          id: 'backup',
          label: 'Backup i Plotë',
          desc: 'Të gjitha të dhënat: fatura, shpenzime, arka, bankë',
          icon: Database,
          color: '#6B7280',
          url: `/api/backup?company_id=${companyId}`,
          filename: `Backup_${companyName}_${now.toISOString().split('T')[0]}.xlsx`,
        },
      ]
    },
  ]

  return (
    <div className="space-y-6">
      {/* Filtrat */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>Viti</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={I}>
            {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>Tremujori (TVSH/ATK)</label>
          <select value={quarter} onChange={e => setQuarter(parseInt(e.target.value))} style={{ ...I, minWidth:160 }}>
            {QUARTERS.map((q,i) => <option key={i+1} value={i+1}>{q}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>Muaji (Pagat/Tatimi)</label>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={I}>
            {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Raportet */}
      {reports.map(group => (
        <div key={group.group}>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:10 }}>{group.group}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {group.items.map(item => {
              const Icon = item.icon
              const isLoading = loading === item.label
              return (
                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border)', transition:'border-color .2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor=`${item.color}30`}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                  <div style={{ width:40, height:40, borderRadius:11, background:`${item.color}12`, border:`1px solid ${item.color}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon size={18} style={{ color:item.color }}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:2 }}>{item.label}</p>
                    <p style={{ fontSize:11, color:'var(--text-3)' }}>{item.desc}</p>
                  </div>
                  {!(item as { isPayroll?: boolean }).isPayroll && (
                    <button
                      onClick={() => download(item.url, item.filename, item.label)}
                      disabled={isLoading}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, border:`1px solid ${item.color}25`, background:`${item.color}0D`, color:item.color, fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' as const, transition:'all .15s' }}
                      onMouseEnter={e => e.currentTarget.style.background=`${item.color}1A`}
                      onMouseLeave={e => e.currentTarget.style.background=`${item.color}0D`}>
                      {isLoading ? <Loader2 size={12} className="animate-spin"/> : <Download size={12}/>}
                      {isLoading ? 'Duke gjeneruar...' : 'Shkarko Excel'}
                    </button>
                  )}
                  {(item as { isPayroll?: boolean }).isPayroll && (
                    <span style={{ fontSize:11, color:'var(--text-3)', padding:'6px 12px', borderRadius:9, border:'1px solid var(--border)', background:'transparent', flexShrink:0 }}>
                      Shko te tab Listëpagesa
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(90,31,214,0.05)', border:'1px solid rgba(90,31,214,0.15)', fontSize:11, color:'var(--text-3)', lineHeight:1.7 }}>
        <strong style={{ color:'var(--purple-light)' }}>Afatet ATK:</strong> TVSH → T1: 20 Prill · T2: 20 Korrik · T3: 20 Tetor · T4: 20 Janar &nbsp;|&nbsp; Tatimi Burim → 15 i muajit pasues &nbsp;|&nbsp; Pension/TAP → 15 i muajit pasues
      </div>
    </div>
  )
}
