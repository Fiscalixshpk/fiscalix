'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Users, Building2, CreditCard, TrendingUp, Sparkles, Check, X,
  AlertCircle, Plus, Search, Activity, Package, Eye, Calendar,
  Ban, CheckCircle2, RefreshCw, Bell, Shield, Trash2, Crown
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface User { id: string; full_name: string; email: string; role: string; is_active: boolean; created_at: string }
interface Subscription { id: string; plan: string; status: string; current_period_end: string | null; company?: { name?: string } }
interface Payment { id: string; subscription_id: string; company_id: string; amount: number; method: string; reference_number: string | null; status: string; submitted_at: string; confirmed_at: string | null; period_months: number; company?: { name?: string } }
interface Company { id: string; name: string; email: string | null; phone: string | null; city: string | null; vat_number: string | null; is_active: boolean; created_at: string; subscriptions?: Subscription[]; users?: User[] }
interface AdminStats { totalCompanies: number; totalUsers: number; totalRevenue: number; monthlyRevenue: number; activeSubscriptions: number; expiredSubscriptions: number; planDistribution: Record<string, number>; aiScansThisMonth: number; totalAITokens: number }
interface Props { companies: Company[]; subscriptions: Subscription[]; recentPayments: Payment[]; stats: AdminStats }

const PC: Record<string, string> = {
  basic: 'text-[var(--text-3)]',
  starter: 'text-amber-500',
  professional: 'text-purple-400',
  premium: 'text-amber-500',
  advanced: 'text-blue-400'
}
const PB: Record<string, string> = {
  basic: 'bg-zinc-500/10',
  starter: 'bg-amber-500/10',
  professional: 'bg-purple-500/10',
  premium: 'bg-amber-500/10',
  advanced: 'bg-blue-500/10'
}
const SC: Record<string, string> = { active: 'bg-emerald-500/10 text-emerald-500', expired: 'bg-red-500/10 text-red-400', grace_period: 'bg-amber-500/10 text-amber-400', trialing: 'bg-blue-500/10 text-blue-400', pending: 'bg-amber-500/10 text-amber-500', confirmed: 'bg-emerald-500/10 text-emerald-500', rejected: 'bg-red-500/10 text-red-400' }
type TabType = 'overview' | 'clients' | 'payments' | 'subscriptions' | 'ai'

function CreateClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false)
  const [f, setF] = useState({ company_name: '', company_email: '', company_phone: '', company_city: '', company_vat: '', owner_name: '', owner_email: '', owner_password: '', plan: 'basic', period_months: 1 })
  const s = (k: string, v: string | number) => setF(p => ({ ...p, [k]: v }))
  async function submit() {
    if (!f.company_name || !f.owner_email || !f.owner_password) { toast.error('Plotëso fushat e detyrueshme'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Klienti "${f.company_name}" u krijua me sukses!`)
      onCreated(); onClose()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Gabim') }
    finally { setLoading(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div><h2 className="text-lg font-bold">Krijo Klient të Ri</h2><p className="text-xs text-muted-foreground">Shto klient manualisht me llogari aktive</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X size={16}/></button>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kompania</p>
          <input value={f.company_name} onChange={e => s('company_name', e.target.value)} placeholder="Emri i kompanisë *" className="finex-input"/>
          <div className="grid grid-cols-2 gap-3">
            <input value={f.company_email} onChange={e => s('company_email', e.target.value)} placeholder="Email kompanisë" className="finex-input"/>
            <input value={f.company_phone} onChange={e => s('company_phone', e.target.value)} placeholder="Telefoni" className="finex-input"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={f.company_city} onChange={e => s('company_city', e.target.value)} placeholder="Qyteti" className="finex-input"/>
            <input value={f.company_vat} onChange={e => s('company_vat', e.target.value)} placeholder="Nr. Fiskal" className="finex-input"/>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Llogaria (Pronari)</p>
          <input value={f.owner_name} onChange={e => s('owner_name', e.target.value)} placeholder="Emri i plotë" className="finex-input"/>
          <input value={f.owner_email} onChange={e => s('owner_email', e.target.value)} placeholder="Email *" type="email" className="finex-input"/>
          <input value={f.owner_password} onChange={e => s('owner_password', e.target.value)} placeholder="Fjalëkalimi fillestar *" type="password" className="finex-input"/>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pakoja & Periudha</p>
          <div className="grid grid-cols-2 gap-3">
            <select value={f.plan} onChange={e => s('plan', e.target.value)} className="finex-input">
              <option value="basic">Biznes — €19/muaj</option>
              <option disabled>── Kontabilistë ──</option>
              <option value="starter">Starter — €99/muaj</option>
              <option value="professional">Professional — €199/muaj</option>
            </select>
            <select value={f.period_months} onChange={e => s('period_months', Number(e.target.value))} className="finex-input">
              <option value={1}>1 muaj</option>
              <option value={3}>3 muaj</option>
              <option value={6}>6 muaj</option>
              <option value={12}>1 vit (12 muaj)</option>
            </select>
          </div>
          <div className={`rounded-xl p-3 ${PB[f.plan] || 'bg-zinc-500/10'} border border-border/50`}>
            <div className="flex justify-between items-center">
              <span className={`text-sm font-semibold capitalize ${PC[f.plan] || 'text-zinc-300'}`}>
                {f.plan === 'basic' ? 'Biznes' : f.plan === 'starter' ? 'Starter' : f.plan === 'professional' ? 'Professional' : f.plan}
              </span>
              <span className="text-sm font-bold">€{
                f.plan==='basic' ? 19*f.period_months :
                f.plan==='starter' ? 99*f.period_months :
                f.plan==='professional' ? 199*f.period_months : '?'
              }</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Skadon: {new Date(Date.now()+Number(f.period_months)*30*86400000).toLocaleDateString('sq-AL')}</p>
          </div>
        </div>
        <button onClick={submit} disabled={loading} className="w-full finex-button-primary py-3 font-semibold">{loading?'Duke krijuar...':'Krijo Klientin'}</button>
      </div>
    </div>
  )
}

function CompanyModal({ company, onClose, onUpdate }: { company: Company; onClose: () => void; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false)
  const [nt, setNt] = useState(''); const [nm, setNm] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [changePlanOpen, setChangePlanOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [selectedMonths, setSelectedMonths] = useState(1)
  const sub = company.subscriptions?.[0]
  const daysLeft = sub?.current_period_end ? Math.ceil((new Date(sub.current_period_end).getTime()-Date.now())/86400000) : 0

  async function act(action: string, extra?: Record<string, unknown>) {
    setLoading(true)
    const res = await fetch(`/api/admin/companies/${company.id}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({action,...extra})
    })
    if (res.ok) {
      toast.success('U krye me sukses!')
      onUpdate()
      if (!['send_notification','extend'].includes(action)) onClose()
    } else {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error || 'Gabim')
    }
    setLoading(false)
  }

  async function deleteCompany() {
    setLoading(true)
    const res = await fetch(`/api/admin/companies/${company.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Kompania u fshi plotësisht')
      onUpdate()
      onClose()
    } else {
      toast.error('Gabim gjatë fshirjes')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5"
        style={{background:'var(--bg-card)',border:'1px solid var(--border)'}}>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{background:'linear-gradient(135deg,#5A1FD6,#9B5CF8)',color:'white'}}>
              {company.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{color:'var(--text-1)',fontFamily:'Poppins,sans-serif'}}>{company.name}</h2>
              <div className="flex gap-2 mt-0.5">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{background:company.is_active?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)',color:company.is_active?'#10B981':'#EF4444'}}>
                  {company.is_active?'Aktive':'Joaktive'}
                </span>
                {sub&&<span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                  style={{background:'var(--purple-bg)',color:'var(--purple-light)'}}>
                  {sub.plan}
                </span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{background:'var(--bg-muted)',color:'var(--text-2)'}}>
            <X size={16}/>
          </button>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[['Email',company.email],['Telefon',company.phone],['Qyteti',company.city],['Nr. Fiskal',company.vat_number],['Regjistruar',formatDate(company.created_at)],['Përdorues',company.users?.length??0]].map(([k,v])=>(
            <div key={k as string} className="rounded-xl p-3" style={{background:'var(--bg-muted)'}}>
              <p className="text-xs mb-0.5" style={{color:'var(--text-3)'}}>{k}</p>
              <p className="font-medium" style={{color:'var(--text-1)'}}>{v||'—'}</p>
            </div>
          ))}
        </div>

        {/* Subscription Management */}
        {sub && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider" style={{color:'var(--text-3)',fontFamily:'Poppins,sans-serif'}}>Abonimenti</p>
            <div className="rounded-xl p-4 space-y-4" style={{background:'var(--bg-muted)',border:'1px solid var(--border)'}}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold capitalize" style={{color:'var(--purple-light)'}}>{sub.plan}</p>
                  <p className="text-xs" style={{color:'var(--text-3)'}}>
                    {sub.current_period_end ? `Skadon: ${formatDate(sub.current_period_end)}` : 'Pa datë'}
                    {daysLeft > 0 && <span className={daysLeft < 7 ? 'text-amber-500' : ''} style={{marginLeft:6}}>{daysLeft} ditë</span>}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-lg font-medium"
                  style={{background:'var(--purple-bg)',color:'var(--purple-light)'}}>
                  {sub.status}
                </span>
              </div>

              {/* AI bar */}
              {false && sub.ai_scans_limit > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1" style={{color:'var(--text-3)'}}>
                    <span>AI Skanime</span>
                    <span>{sub.ai_scans_used}/{sub.ai_scans_limit}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{background:'var(--border)'}}>
                    <div className="h-full rounded-full" style={{width:`${Math.min(100,(sub.ai_scans_used/sub.ai_scans_limit)*100)}%`,background:'linear-gradient(90deg,#5A1FD6,#9B5CF8)'}}/>
                  </div>
                </div>
              )}

              {/* Extend */}
              <div>
                <p className="text-xs mb-2" style={{color:'var(--text-3)'}}>Zgjat abonimin:</p>
                <div className="flex gap-2 flex-wrap">
                  {[1,3,6,12].map(m=>(
                    <button key={m} onClick={()=>act('extend',{months:m})} disabled={loading}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{background:'rgba(59,130,246,0.1)',color:'var(--text-1)',border:'1px solid rgba(59,130,246,0.2)'}}>
                      +{m===12?'1 vit':`${m} muaj`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change plan */}
              <div>
                <p className="text-xs mb-2" style={{color:'var(--text-3)'}}>Ndrysho pakon:</p>
                {!changePlanOpen ? (
                  <button onClick={()=>setChangePlanOpen(true)}
                    className="finex-button-primary px-4 py-2 text-xs flex items-center gap-2">
                    Ndrysho Pakon
                  </button>
                ) : (
                  <div className="flex gap-2 flex-wrap items-center">
                    <select value={selectedPlan} onChange={e=>setSelectedPlan(e.target.value)} className="finex-input" style={{width:'auto',padding:'6px 10px',fontSize:12}}>
                      <option value="">Zgjidh planin</option>
                      {['basic','starter','professional'].filter(p=>p!==sub.plan).map(p=>(
                        <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>
                      ))}
                    </select>
                    <select value={selectedMonths} onChange={e=>setSelectedMonths(Number(e.target.value))} className="finex-input" style={{width:'auto',padding:'6px 10px',fontSize:12}}>
                      <option value={1}>1 muaj</option>
                      <option value={3}>3 muaj</option>
                      <option value={6}>6 muaj</option>
                      <option value={12}>1 vit</option>
                    </select>
                    <button
                      onClick={()=>{ if(selectedPlan){ act('change_plan',{plan:selectedPlan,period_months:selectedMonths}); setChangePlanOpen(false) } else toast.error('Zgjidh planin') }}
                      disabled={loading||!selectedPlan}
                      className="finex-button-primary px-4 py-2 text-xs">
                      Konfirmo
                    </button>
                    <button onClick={()=>setChangePlanOpen(false)} className="text-xs" style={{color:'var(--text-3)'}}>Anulo</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {company.users && company.users.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider" style={{color:'var(--text-3)',fontFamily:'Poppins,sans-serif'}}>Përdoruesit ({company.users.length})</p>
            {company.users.map(u=>(
              <div key={u.id} className="flex items-center justify-between rounded-xl px-3 py-2" style={{background:'var(--bg-muted)'}}>
                <div>
                  <p className="text-sm font-medium" style={{color:'var(--text-1)'}}>{u.full_name||u.email}</p>
                  <p className="text-xs" style={{color:'var(--text-3)'}}>{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{background:'var(--bg-card)',color:'var(--text-1)',border:'1px solid var(--border)'}}>{u.role.replace('_',' ')}</span>
                  <span className={`w-2 h-2 rounded-full`} style={{background:u.is_active?'#10B981':'#EF4444'}}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Send Notification */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{color:'var(--text-3)',fontFamily:'Poppins,sans-serif'}}>
            <Bell size={12}/> Dërgo Njoftim
          </p>
          <input value={nt} onChange={e=>setNt(e.target.value)} placeholder="Titulli" className="finex-input"/>
          <textarea value={nm} onChange={e=>setNm(e.target.value)} placeholder="Mesazhi..." className="finex-input" style={{minHeight:70,resize:'none'}}/>
          <button onClick={()=>act('send_notification',{title:nt,message:nm})} disabled={loading||!nt||!nm}
            className="finex-button-secondary flex items-center gap-2 px-4 py-2 text-sm">
            <Bell size={14}/> Dërgo
          </button>
        </div>

        {/* Actions Row */}
        <div className="pt-2 flex items-center justify-between flex-wrap gap-3" style={{borderTop:'1px solid var(--border)'}}>
          <button onClick={()=>act(company.is_active?'deactivate':'activate')} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={company.is_active
              ? {background:'rgba(239,68,68,0.1)',color:'#EF4444',border:'1px solid rgba(239,68,68,0.2)'}
              : {background:'rgba(16,185,129,0.1)',color:'#10B981',border:'1px solid rgba(16,185,129,0.2)'}}>
            {company.is_active ? <><Ban size={14}/>Deaktivizo</> : <><CheckCircle2 size={14}/>Aktivizo</>}
          </button>

          {/* Delete */}
          {!showDelete ? (
            <button onClick={()=>setShowDelete(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{background:'rgba(239,68,68,0.06)',color:'var(--text-1)',border:'1px solid rgba(239,68,68,0.15)'}}>
              <Trash2 size={14}/> Fshi Llogarinë
            </button>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)'}}>
              <p className="text-xs font-medium" style={{color:'var(--text-1)'}}>Konfirmo fshirjen — nuk mund të kthehet!</p>
              <button onClick={deleteCompany} disabled={loading}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{background:'#EF4444',color:'white'}}>
                Po, Fshi
              </button>
              <button onClick={()=>setShowDelete(false)} className="px-3 py-1.5 rounded-lg text-xs" style={{color:'var(--text-1)'}}>Anulo</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


export default function AdminDashboardClient({ companies: ic, subscriptions: is_, recentPayments: ip, stats }: Props) {
  const supabase = createClient()
  const [companies, setCompanies] = useState(ic)
  const [subscriptions, setSubscriptions] = useState(is_)
  const [payments, setPayments] = useState(ip)
  const [tab, setTab] = useState<TabType>('overview')
  const [pid, setPid] = useState<string|null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [selCompany, setSelCompany] = useState<Company|null>(null)
  const [cs, setCs] = useState(''); const [pf, setPf] = useState('all'); const [sf, setSf] = useState('all')
  const [showAccountantModal, setShowAccountantModal] = useState(false)
  const [accForm, setAccForm] = useState({ email: '', full_name: '', password: '', months: 1, max_clients: 20 })
  const [accLoading, setAccLoading] = useState(false)

  async function refresh() {
    const [{data:comps},{data:subs}] = await Promise.all([
      supabase.from('companies').select('*, subscriptions(*), users(id,full_name,email,role,is_active,created_at)').order('created_at',{ascending:false}),
      supabase.from('subscriptions').select('*, company:companies(name)').order('created_at',{ascending:false})
    ])
    if(comps) setCompanies(comps as Company[])
    if(subs) setSubscriptions(subs as Subscription[])
  }

  async function createAccountant(e: React.FormEvent) {
    e.preventDefault()
    setAccLoading(true)
    try {
      const res = await fetch('/api/admin/accountant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accForm)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Kontabilisti u krijua!')
        setShowAccountantModal(false)
        setAccForm({ email: '', full_name: '', password: '', months: 1, max_clients: 20 })
        refresh()
      } else {
        toast.error(data.error || 'Gabim')
      }
    } catch { toast.error('Gabim') }
    finally { setAccLoading(false) }
  }

  async function confirmPayment(paymentId: string, subscriptionId: string, months: number) {
    setPid(paymentId)
    const {data:sub} = await supabase.from('subscriptions').select('current_period_end').eq('id',subscriptionId).single()
    const base = sub?.current_period_end ? new Date(sub.current_period_end) : new Date()
    if(base < new Date()) base.setTime(Date.now())
    base.setMonth(base.getMonth()+months)
    const grace = new Date(base.getTime()+5*86400000)
    await supabase.from('subscriptions').update({status:'active',current_period_end:base.toISOString(),grace_period_end:grace.toISOString(),activated_at:new Date().toISOString()}).eq('id',subscriptionId)
    await supabase.from('payments').update({status:'confirmed',confirmed_at:new Date().toISOString()}).eq('id',paymentId)
    setPayments(p=>p.map(x=>x.id===paymentId?{...x,status:'confirmed'}:x))
    toast.success(` Pagesa konfirmuar! Skadon: ${base.toLocaleDateString('sq-AL')}`)
    setPid(null)
  }

  async function rejectPayment(paymentId: string) {
    setPid(paymentId)
    await supabase.from('payments').update({status:'rejected'}).eq('id',paymentId)
    setPayments(p=>p.map(x=>x.id===paymentId?{...x,status:'rejected'}:x))
    toast.success('Pagesa u refuzua')
    setPid(null)
  }

  const filtered = useMemo(()=>companies.filter(c=>{
    const sub=c.subscriptions?.[0]
    return (!cs||c.name.toLowerCase().includes(cs.toLowerCase())||c.email?.toLowerCase().includes(cs.toLowerCase()))
      && (pf==='all'||sub?.plan===pf)
      && (sf==='all'||(sf==='active'&&c.is_active)||(sf==='inactive'&&!c.is_active))
  }),[companies,cs,pf,sf])

  const pending = payments.filter(p=>p.status==='pending')

  const tabs = [
    {id:'overview' as TabType, label:'Pasqyrë', icon:<Activity size={14}/>},
    {id:'clients' as TabType, label:'Klientët', icon:<Building2 size={14}/>, badge:companies.length},
    {id:'payments' as TabType, label:'Pagesat', icon:<CreditCard size={14}/>, badge:pending.length||undefined},
    {id:'subscriptions' as TabType, label:'Abonimet', icon:<Package size={14}/>},
  ]

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield size={22} className="text-blue-400"/>Admin Panel</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Menaxhimi i plotë i klientëve dhe sistemit</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Link href="/admin/create-client"
            style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:10,background:'var(--purple)',color:'#fff',fontSize:13,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 12px rgba(91,33,182,0.3)'}}>
            <Plus size={14}/> Krijo Llogari
          </Link>
          <Link href="/admin/create-client?type=b2b"
            style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:10,background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)',color:'#10B981',fontSize:13,fontWeight:600,textDecoration:'none'}}>
            <Plus size={14}/> Krijo B2B
          </Link>
          <button onClick={()=>setShowAccountantModal(true)}
            style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:10,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.3)',color:'#F59E0B',fontSize:13,fontWeight:600,cursor:'pointer'}}>
            <Crown size={14}/> Shto Kontabilist
          </button>
        </div>
      </div>

      {/* Alert */}
      {pending.length>0&&(
        <div className="glass-card border border-amber-500/20 bg-amber-500/5 cursor-pointer" onClick={()=>setTab('payments')}>
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-amber-500 shrink-0"/>
            <p className="text-sm"><span className="font-semibold text-amber-500">{pending.length} pagesa</span> presin konfirmimin tuaj</p>
            <span className="ml-auto text-xs text-amber-500">Shiko tani →</span>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {icon:Building2, label:'Klientë Total', value:stats.totalCompanies, sub:`${companies.filter(c=>c.is_active).length} aktiv`, color:'text-blue-400', bg:'bg-blue-500/10'},
          {icon:Users, label:'Përdorues', value:stats.totalUsers, sub:'të gjithë llogaritë', color:'text-emerald-500', bg:'bg-emerald-500/10'},
          {icon:TrendingUp, label:'Të ardhura (muaj)', value:formatCurrency(stats.monthlyRevenue), sub:`Total: ${formatCurrency(stats.totalRevenue)}`, color:'text-amber-500', bg:'bg-amber-500/10'},
        ].map((s,i)=>{const Icon=s.icon;return(
          <div key={i} className="kpi-card">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><Icon size={20} className={s.color}/></div>
            <p className="text-2xl font-bold" suppressHydrationWarning>{s.value}</p>
            <p className="text-muted-foreground text-xs mt-0.5">{s.label}</p>
            <p className="text-muted-foreground/60 text-xs">{s.sub}</p>
          </div>
        )})}
      </div>

      {/* Plan dist */}
      <div className="grid grid-cols-4 gap-3">
        {['basic','starter','professional'].map(plan=>(
          <div key={plan} className={`glass rounded-xl p-3 text-center border ${stats.planDistribution[plan]?'border-border':'border-transparent opacity-40'}`}>
            <p className={`text-2xl font-bold ${PC[plan]}`}>{stats.planDistribution[plan]||0}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{plan}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-full lg:w-fit overflow-x-auto">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab===t.id?'bg-background text-foreground shadow-sm':'text-muted-foreground hover:text-foreground'}`}>
            {t.icon}{t.label}
            {t.badge?<span className="ml-1 bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">{t.badge}</span>:null}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab==='overview'&&(
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity size={16}/>Pagesat e fundit</h3>
            <div className="space-y-3">
              {payments.slice(0,8).map(p=>(
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.status==='confirmed'?'bg-emerald-500/10':p.status==='rejected'?'bg-red-500/10':'bg-amber-500/10'}`}>
                      {p.status==='confirmed'?<Check size={14} className="text-emerald-500"/>:p.status==='rejected'?<X size={14} className="text-red-400"/>:<CreditCard size={14} className="text-amber-500"/>}
                    </div>
                    <div><p className="text-sm font-medium">{(p.company as {name?:string})?.name||'—'}</p><p className="text-xs text-muted-foreground">{formatDate(p.submitted_at)}</p></div>
                  </div>
                  <span className="font-semibold text-sm">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar size={16}/>Skadon së shpejti (14 ditë)</h3>
            <div className="space-y-3">
              {subscriptions
                .filter(s=>s.current_period_end&&s.status==='active')
                .map(s=>({...s,days:Math.ceil((new Date(s.current_period_end!).getTime()-Date.now())/86400000)}))
                .filter(s=>s.days<=14).sort((a,b)=>a.days-b.days).slice(0,8)
                .map(s=>(
                  <div key={s.id} className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">{(s.company as {name?:string})?.name}</p>
                      <p className={`text-xs font-medium ${s.days<=3?'text-red-400':s.days<=7?'text-amber-500':'text-muted-foreground'}`}>{s.days<=0?'Skaduar':`${s.days} ditë`}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg capitalize ${PB[s.plan]} ${PC[s.plan]}`}>{s.plan}</span>
                  </div>
                ))}
              {subscriptions.filter(s=>s.current_period_end&&s.status==='active'&&Math.ceil((new Date(s.current_period_end).getTime()-Date.now())/86400000)<=14).length===0&&(
                <p className="text-sm text-muted-foreground text-center py-6">Asnjë abonim nuk skadon brenda 14 ditëve ✓</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CLIENTS ── */}
      {tab==='clients'&&(
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input value={cs} onChange={e=>setCs(e.target.value)} placeholder="Kërko klient..." className="finex-input pl-9 w-full"/>
            </div>
            <select value={pf} onChange={e=>setPf(e.target.value)} className="finex-input w-auto">
              <option value="all">Të gjitha pakojet</option>
              <option value="basic">Biznes</option><option value="starter">Starter</option>
              <option value="professional">Professional</option>
            </select>
            <select value={sf} onChange={e=>setSf(e.target.value)} className="finex-input w-auto">
              <option value="all">Të gjitha</option><option value="active">Aktive</option><option value="inactive">Joaktive</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} klientë</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(c=>{
              const sub=c.subscriptions?.[0]
              const dl=sub?.current_period_end?Math.ceil((new Date(sub.current_period_end).getTime()-Date.now())/86400000):0
              return(
                <div key={c.id} onClick={()=>setSelCompany(c)} className="glass rounded-2xl p-4 cursor-pointer hover:border-[var(--border-strong)] transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-sm">{c.name.charAt(0)}</div>
                      <div><p className="font-semibold text-sm">{c.name}</p><p className="text-xs text-muted-foreground">{c.email||'Pa email'}</p></div>
                    </div>
                    <Eye size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1"/>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {sub&&<span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PB[sub.plan]} ${PC[sub.plan]}`}>{sub.plan}</span>}
                      <span className={`w-2 h-2 rounded-full ${c.is_active?'bg-emerald-500':'bg-red-400'}`}/>
                      <span className="text-xs text-muted-foreground">{c.is_active?'Aktive':'Joaktive'}</span>
                    </div>
                    {sub?.current_period_end&&<span className={`text-xs font-medium ${dl<=0?'text-red-400':dl<=7?'text-amber-500':'text-muted-foreground'}`}>{dl<=0?'Skaduar':`${dl}d`}</span>}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{c.users?.length||0} përd.</span>
                    {c.city&&<span>· {c.city}</span>}
                    <span>· {formatDate(c.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── PAYMENTS ── */}
      {tab==='payments'&&(
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">Pagesat</h3>
            <span className="text-xs text-muted-foreground">{pending.length} në pritje</span>
          </div>
          <div className="overflow-x-auto">
            <table className="finex-table">
              <thead><tr className="border-b border-border">
                <th>Kompania</th><th>Shuma</th><th>Periudha</th><th>Metoda</th><th>Referenca</th><th>Data</th><th>Statusi</th><th className="text-right">Veprime</th>
              </tr></thead>
              <tbody>
                {payments.map(p=>(
                  <tr key={p.id} className={p.status==='pending'?'bg-amber-500/3':''}>
                    <td className="font-medium text-sm">{(p.company as {name?:string})?.name||'—'}</td>
                    <td className="font-bold text-amber-500">{formatCurrency(p.amount)}</td>
                    <td className="text-sm text-muted-foreground">{p.period_months} muaj</td>
                    <td className="text-sm capitalize">{p.method.replace('_',' ')}</td>
                    <td className="font-mono text-xs text-muted-foreground">{p.reference_number||'—'}</td>
                    <td className="text-sm text-muted-foreground">{formatDate(p.submitted_at)}</td>
                    <td><span className={`text-xs px-2 py-1 rounded-lg font-medium ${SC[p.status]||'bg-muted text-muted-foreground'}`}>{p.status==='confirmed'?'✓ Konfirmuar':p.status==='rejected'?'✗ Refuzuar':'⏳ Në pritje'}</span></td>
                    <td className="text-right">{p.status==='pending'&&(
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={()=>confirmPayment(p.id,p.subscription_id,p.period_months)} disabled={pid===p.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all text-xs font-medium">
                          <Check size={13}/>Konfirmo
                        </button>
                        <button onClick={()=>rejectPayment(p.id)} disabled={pid===p.id}
                          className="px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs">
                          <X size={13}/>
                        </button>
                      </div>
                    )}</td>
                  </tr>
                ))}
                {payments.length===0&&<tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Nuk ka pagesa</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUBSCRIPTIONS ── */}
      {tab==='subscriptions'&&(
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="finex-table">
              <thead><tr className="border-b border-border">
                <th>Kompania</th><th>Pakoja</th><th>Statusi</th><th>Skadon</th><th>Ditë</th><th>AI</th><th className="text-right">Veprime</th>
              </tr></thead>
              <tbody>
                {subscriptions.map(s=>{
                  const dl=s.current_period_end?Math.ceil((new Date(s.current_period_end).getTime()-Date.now())/86400000):0
                  return(
                    <tr key={s.id}>
                      <td className="font-medium">{(s.company as {name?:string})?.name||'—'}</td>
                      <td><span className={`font-semibold capitalize text-sm ${PC[s.plan]}`}>{s.plan}</span></td>
                      <td><span className={`text-xs px-2 py-1 rounded-lg font-medium ${SC[s.status]||'bg-muted text-muted-foreground'}`}>{s.status}</span></td>
                      <td className="text-sm text-muted-foreground">{s.current_period_end?formatDate(s.current_period_end):'—'}</td>
                      <td className={`text-sm font-medium ${dl<=0?'text-red-400':dl<=7?'text-amber-500':'text-muted-foreground'}`}>{dl<=0?'Skaduar':`${dl}d`}</td>
                      <td className="text-sm text-muted-foreground" style={{display:'none'}}>{s.ai_scans_limit===0?'∞':`${s.ai_scans_used}/${s.ai_scans_limit}`}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {[1,3,12].map(m=>(
                            <button key={m} onClick={async()=>{
                              const r=await fetch(`/api/admin/subscriptions/${s.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'extend',months:m})})
                              if(r.ok){toast.success(`+${m===12?'1 vit':m+'m'}`);refresh()}
                            }} className="px-2 py-1 rounded-lg text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all">
                              {m===12?'+1vit':`+${m}m`}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AI USAGE ── */}
      {tab==='ai'&&(
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><Sparkles size={16} className="text-purple-400"/>AI Monitorimi</h3>
          <p className="text-xs text-muted-foreground mb-5">Përdorimi i AI OCR nga çdo klient këtë muaj</p>
          <div className="space-y-4">
            {subscriptions.filter(s=>s.plan!=='basic').map(s=>{
              const pct=s.ai_scans_limit>0?Math.min(100,(s.ai_scans_used/s.ai_scans_limit)*100):0
              return(
                <div key={s.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{(s.company as {name?:string})?.name}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${PC[s.plan]}`}>{s.plan}</span>
                      <span className="text-muted-foreground text-xs">{s.ai_scans_limit===0?`${s.ai_scans_used} (∞)`:`${s.ai_scans_used}/${s.ai_scans_limit}`}</span>
                      <button onClick={async()=>{
                        if(r.ok){toast.success('AI rivendosur');refresh()}
                      }} className="text-xs text-purple-400 hover:underline flex items-center gap-1">
                        <RefreshCw size={11}/> Reset
                      </button>
                    </div>
                  </div>
                  {false && s.ai_scans_limit>0&&(
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct>90?'bg-red-500':pct>70?'bg-amber-500':'bg-purple-500'}`} style={{width:`${pct}%`}}/>
                    </div>
                  )}
                </div>
              )
            })}
            {subscriptions.filter(s=>s.plan!=='basic').length===0&&<p className="text-sm text-muted-foreground text-center py-8">Asnjë klient me AI aktiv</p>}
          </div>
        </div>
      )}

      {showCreate&&<CreateClientModal onClose={()=>setShowCreate(false)} onCreated={()=>refresh()}/>}
      {selCompany&&<CompanyModal company={selCompany} onClose={()=>setSelCompany(null)} onUpdate={()=>{refresh();setSelCompany(null)}}/>}

      {/* Accountant Modal */}
      {showAccountantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAccountantModal(false)}/>
          <div className="relative rounded-2xl w-full max-w-md p-6" style={{background:'var(--bg-card)',border:'1px solid var(--border)'}}>
            <h2 className="text-lg font-bold mb-5" style={{color:'var(--text-1)',fontFamily:'Poppins,sans-serif',display:'flex',alignItems:'center',gap:8}}>
              <Crown size={18} style={{color:'#F59E0B'}}/> Krijo Kontabilist
            </h2>
            <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:10,padding:'10px 14px',marginBottom:20,fontSize:13,color:'#F59E0B'}}>
              Plani Kontabilist — €99/muaj · Menaxhon deri 20 kompani
            </div>
            <form onSubmit={createAccountant} className="space-y-4">
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'var(--text-1)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>Emri i plotë</label>
                <input value={accForm.full_name} onChange={e=>setAccForm(p=>({...p,full_name:e.target.value}))} placeholder="Ardian Krasniqi" required className="finex-input"/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'var(--text-3)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>Email</label>
                <input type="email" value={accForm.email} onChange={e=>setAccForm(p=>({...p,email:e.target.value}))} placeholder="ardian@kontabilist.com" required className="finex-input"/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'var(--text-3)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>Fjalëkalimi</label>
                <input type="text" value={accForm.password} onChange={e=>setAccForm(p=>({...p,password:e.target.value}))} placeholder="Min. 8 karaktere" required minLength={8} className="finex-input"/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'var(--text-3)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>Periudha</label>
                <select value={accForm.months} onChange={e=>setAccForm(p=>({...p,months:Number(e.target.value)}))} className="finex-input">
                  <option value={1}>1 muaj — €99</option>
                  <option value={3}>3 muaj — €297</option>
                  <option value={6}>6 muaj — €594</option>
                  <option value={12}>1 vit — €1,188</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'var(--text-3)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>Limiti i Klientëve</label>
                <select value={accForm.max_clients} onChange={e=>setAccForm(p=>({...p,max_clients:Number(e.target.value)}))} className="finex-input">
                  <option value={20}>Deri 20 klientë (Standard)</option>
                  <option value={50}>Deri 50 klientë (Pro)</option>
                  <option value={100}>Deri 100 klientë (Premium)</option>
                  <option value={-1}>Pa limit (Enterprise)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowAccountantModal(false)} className="finex-button-secondary flex-1 py-2.5 text-sm">Anulo</button>
                <button type="submit" disabled={accLoading} className="finex-button-primary flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold">
                  {accLoading ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{borderColor:'var(--border)',borderTopColor:'white'}}/> Duke krijuar...</> : 'Krijo Kontabilist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
