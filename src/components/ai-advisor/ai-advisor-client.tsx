'use client'

import { useMemo, useState } from 'react'
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  DollarSign, Clock, Users, BarChart3, Lightbulb, Target,
  ArrowUp, ArrowDown, Calendar, Zap
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer
} from 'recharts'

const MONTHS = ['Jan','Shk','Mar','Pri','Maj','Qer','Kor','Gus','Sht','Tet','Nën','Dhj']

const TT = {
  contentStyle: { background: 'var(--bg-card)', border: '1px solid rgba(123,44,245,0.3)', borderRadius: 10, color: 'var(--text-1)' },
  labelStyle: { color: '#9CA3AF' },
  itemStyle: { color: 'var(--text-1)' }
}

interface Invoice {
  id: string; invoice_number: string; client_name: string
  issue_date: string; due_date: string; total_amount: number
  status: string; tax_amount: number; subtotal: number
}
interface Expense {
  id: string; vendor_name: string; amount: number
  expense_date: string
  expense_categories?: { name_sq?: string; name?: string }
}
interface Props {
  invoices: Invoice[]; expenses: Expense[]
  company: { name: string } | null
  recurring: { amount: number; client_name: string }[]
  userName: string
}

function fmt(n: number) {
  return '€' + n.toLocaleString('sq-AL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AIAdvisorClient({ invoices, expenses, company, recurring, userName }: Props) {
  const [tab, setTab] = useState<'overview'|'cashflow'|'clients'|'insights'>('overview')
  const now = new Date()
  const cm = now.getMonth()
  const cy = now.getFullYear()
  const COLORS = ['#7B2CF5','#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6']

  const a = useMemo(() => {
    const monthly: {rev:number;exp:number;label:string}[] = []
    for (let i=5;i>=0;i--) {
      const d = new Date(cy, cm-i, 1)
      monthly.push({rev:0, exp:0, label:MONTHS[d.getMonth()]})
    }
    invoices.forEach(inv => {
      const d = new Date(inv.issue_date)
      const idx = 5-(cm - d.getMonth() + 12*(cy-d.getFullYear()))
      if (idx>=0&&idx<=5) monthly[idx].rev += Number((inv.total_amount ?? inv.total)||0)
    })
    expenses.forEach(exp => {
      const d = new Date(exp.expense_date)
      const idx = 5-(cm - d.getMonth() + 12*(cy-d.getFullYear()))
      if (idx>=0&&idx<=5) monthly[idx].exp += Number(exp.amount||0)
    })

    const totalRev = invoices.reduce((s,i)=>s+Number((i.total_amount ?? i.total)||0),0)
    const totalExp = expenses.reduce((s,e)=>s+Number(e.amount||0),0)
    const profit = totalRev-totalExp
    const margin = totalRev>0?(profit/totalRev*100):0
    const revChange = monthly[4]?.rev>0?((monthly[5].rev-monthly[4].rev)/monthly[4].rev*100):0
    const expChange = monthly[4]?.exp>0?((monthly[5].exp-monthly[4].exp)/monthly[4].exp*100):0

    const paid = invoices.filter(i=>i.status==='paid')
    const pending = invoices.filter(i=>i.status==='pending')
    const overdue = invoices.filter(i=>i.status==='overdue')
    const pendingAmt = pending.reduce((s,i)=>s+Number((i.total_amount ?? i.total)||0),0)
    const overdueAmt = overdue.reduce((s,i)=>s+Number((i.total_amount ?? i.total)||0),0)
    const overdueWithDays = overdue.map(inv=>({...inv, daysOverdue:Math.ceil((now.getTime()-new Date(inv.due_date).getTime())/86400000)})).sort((a,b)=>b.daysOverdue-a.daysOverdue)

    const clientMap: Record<string,number> = {}
    invoices.forEach(inv=>{clientMap[inv.client_name]=(clientMap[inv.client_name]||0)+Number((inv.total_amount ?? inv.total)||0)})
    const topClients = Object.entries(clientMap).sort((a,b)=>b[1]-a[1]).slice(0,6)
    const concentrationRisk = totalRev>0?((topClients[0]?.[1]||0)/totalRev*100):0

    const catMap: Record<string,number> = {}
    expenses.forEach(exp=>{
      const cat = (exp.expense_categories as {name_sq?:string;name?:string}|undefined)?.name_sq || (exp.expense_categories as {name_sq?:string;name?:string}|undefined)?.name || 'Tjera'
      catMap[cat]=(catMap[cat]||0)+Number(exp.amount||0)
    })
    const expByCategory = Object.entries(catMap).sort((a,b)=>b[1]-a[1])

    const avgRev = monthly.slice(-3).reduce((s,m)=>s+m.rev,0)/3
    const avgExp = monthly.slice(-3).reduce((s,m)=>s+m.exp,0)/3
    const recTotal = recurring.reduce((s,r)=>s+Number(r.amount||0),0)
    const forecast = [1,2,3].map(i=>{
      const d = new Date(cy, cm+i, 1)
      const rev = Math.round(avgRev*0.95+recTotal)
      const exp = Math.round(avgExp*1.02)
      return {label:MONTHS[d.getMonth()], rev, exp, profit:rev-exp}
    })

    const insights: {type:'warning'|'success'|'info'|'danger';title:string;desc:string;value?:string}[] = []
    if (overdueAmt>0) insights.push({type:'danger',title:'Fatura të vonuara',desc:`Ke ${overdue.length} fatura të vonuara. Kontakto klientët menjëherë.`,value:fmt(overdueAmt)})
    if (concentrationRisk>50) insights.push({type:'warning',title:'Rrezik koncentrimi',desc:`${topClients[0]?.[0]} gjeneron ${concentrationRisk.toFixed(0)}% të të ardhurave. Diversifiko klientët.`})
    if (margin<20&&totalRev>0) insights.push({type:'warning',title:'Marzhi i ulët',desc:`Marzhi ${margin.toFixed(1)}% është nën 20%. Shqyrto shpenzimet.`})
    if (revChange>15) insights.push({type:'success',title:'Rritje e shkëlqyer!',desc:`Të ardhurat u rritën ${revChange.toFixed(0)}% muajin e kaluar.`,value:`+${revChange.toFixed(0)}%`})
    if (pendingAmt>totalRev*0.3&&pendingAmt>0) insights.push({type:'info',title:'Fatura në pritje',desc:`${fmt(pendingAmt)} ende të paarkëtuara. Dërgo kujtesa.`,value:fmt(pendingAmt)})
    if (margin>40) insights.push({type:'success',title:'Marzhi i shkëlqyer',desc:`Marzhi ${margin.toFixed(1)}% — biznesi është financiarisht shumë i shëndetshëm.`,value:`${margin.toFixed(1)}%`})
    if (recurring.length>0) insights.push({type:'success',title:'Të ardhura fikse',desc:`${recurring.length} kontrata garantojnë ${fmt(recTotal)}/muaj.`,value:fmt(recTotal)})

    const taxTvsh = invoices.reduce((s,i)=>s+Number(i.tax_amount||0),0)
    const taxFitimi = profit>0?profit*0.1:0

    return {monthly,totalRev,totalExp,profit,margin,revChange,expChange,paid,pending,overdue,pendingAmt,overdueAmt,overdueWithDays,topClients,concentrationRisk,expByCategory,forecast,insights,taxTvsh,taxFitimi,recTotal}
  }, [invoices, expenses, recurring])

  const TABS = [
    {id:'overview',label:'Pasqyra',icon:BarChart3},
    {id:'cashflow',label:'Cashflow',icon:TrendingUp},
    {id:'clients',label:'Klientët',icon:Users},
    {id:'insights',label:'Këshilla',icon:Lightbulb},
  ]

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontFamily:'Poppins,sans-serif',fontSize:24,fontWeight:700,color:'var(--text-1)',marginBottom:4,display:'flex',alignItems:'center',gap:10}}>
            <Zap size={22} style={{color:'var(--purple-light)'}}/>AI Kontabilist
          </h1>
          <p style={{color:'var(--text-3)',fontSize:14}}>{company?.name} • Analiza automatike • {MONTHS[cm]} {cy}</p>
        </div>
        {a.insights.filter(i=>i.type==='danger'||i.type==='warning').length>0&&(
          <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:10,padding:'8px 14px',fontSize:13,color:'var(--text-1)',fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
            <AlertTriangle size={15}/>{a.insights.filter(i=>i.type==='danger'||i.type==='warning').length} sinjalizime
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {[
          {label:'Të ardhura YTD',value:fmt(a.totalRev),change:a.revChange,icon:DollarSign,color:'#7B2CF5'},
          {label:'Shpenzime YTD',value:fmt(a.totalExp),change:a.expChange,icon:TrendingDown,color:'#EF4444'},
          {label:'Fitimi Neto',value:fmt(a.profit),sub:`Marzhi ${a.margin.toFixed(1)}%`,icon:TrendingUp,color:'#10B981'},
          {label:'Fatura vonuara',value:fmt(a.overdueAmt),sub:`${a.overdue.length} vonuar · ${a.pending.length} pritje`,icon:Clock,color:'#F59E0B'},
        ].map((k,i)=>{
          const Icon=k.icon
          return (
            <div key={i} className="kpi-card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div style={{width:36,height:36,borderRadius:9,background:`${k.color}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Icon size={17} style={{color:k.color}}/>
                </div>
                {k.change!==undefined&&(
                  <span style={{fontSize:11,fontWeight:700,color:k.change>=0?'#10B981':'#EF4444',display:'flex',alignItems:'center',gap:2}}>
                    {k.change>=0?<ArrowUp size={10}/>:<ArrowDown size={10}/>}{Math.abs(k.change).toFixed(1)}%
                  </span>
                )}
              </div>
              <p style={{fontSize:20,fontWeight:800,fontFamily:'Poppins,sans-serif',color:'var(--text-1)',marginBottom:3}}>{k.value}</p>
              <p style={{fontSize:12,color:'var(--text-3)'}}>{k.sub||k.label}</p>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,borderBottom:'1px solid var(--border)'}}>
        {TABS.map(t=>{
          const Icon=t.icon
          return (
            <button key={t.id} onClick={()=>setTab(t.id as typeof tab)}
              style={{display:'flex',alignItems:'center',gap:7,padding:'10px 16px',borderRadius:'10px 10px 0 0',fontSize:13,fontWeight:600,cursor:'pointer',border:'none',background:tab===t.id?'var(--bg-card)':'transparent',color:tab===t.id?'var(--purple-light)':'var(--text-3)',borderBottom:tab===t.id?'2px solid var(--purple)':'2px solid transparent',fontFamily:'Poppins,sans-serif'}}>
              <Icon size={15}/>{t.label}
            </button>
          )
        })}
      </div>

      {/* Overview */}
      {tab==='overview'&&(
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20}}>
            <h3 style={{fontFamily:'Poppins,sans-serif',fontSize:14,fontWeight:700,color:'var(--text-1)',marginBottom:16}}>Performanca 6 Muaj</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={a.monthly}>
                <defs>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7B2CF5" stopOpacity={0.3}/><stop offset="95%" stopColor="#7B2CF5" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{fontSize:11,fill:'#6B7280'}}/>
                <YAxis tick={{fontSize:11,fill:'#6B7280'}} tickFormatter={v=>`€${v}`}/>
                <Tooltip {...TT} formatter={(v:number)=>fmt(v)}/>
                <Area type="monotone" dataKey="rev" name="Të ardhura" stroke="#7B2CF5" fill="url(#gR)" strokeWidth={2}/>
                <Area type="monotone" dataKey="exp" name="Shpenzime" stroke="#EF4444" fill="url(#gE)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20}}>
            <h3 style={{fontFamily:'Poppins,sans-serif',fontSize:14,fontWeight:700,color:'var(--text-1)',marginBottom:14}}>Shpenzime / Kategori</h3>
            {a.expByCategory.slice(0,5).map(([cat,amt],i)=>(
              <div key={cat} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontSize:12,color:'var(--text-2)'}}>{cat}</span>
                  <span style={{fontSize:12,fontWeight:600,color:'var(--text-1)'}}>{fmt(amt)}</span>
                </div>
                <div style={{height:5,background:'var(--bg-muted)',borderRadius:4}}>
                  <div style={{height:'100%',background:COLORS[i%COLORS.length],width:`${(amt/(a.expByCategory[0]?.[1]||1))*100}%`,borderRadius:4}}/>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20}}>
            <h3 style={{fontFamily:'Poppins,sans-serif',fontSize:14,fontWeight:700,color:'var(--text-1)',marginBottom:14}}>Statusi Faturave</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
              {[{l:'Paguara',c:a.paid.length,col:'#10B981',bg:'rgba(16,185,129,0.1)'},{l:'Pritje',c:a.pending.length,col:'#F59E0B',bg:'rgba(245,158,11,0.1)'},{l:'Vonuara',c:a.overdue.length,col:'#EF4444',bg:'rgba(239,68,68,0.1)'}].map(s=>(
                <div key={s.l} style={{textAlign:'center',padding:'10px 6px',borderRadius:10,background:s.bg}}>
                  <p style={{fontSize:22,fontWeight:800,color:s.col,fontFamily:'Poppins,sans-serif'}}>{s.c}</p>
                  <p style={{fontSize:11,color:'var(--text-1)'}}>{s.l}</p>
                </div>
              ))}
            </div>
            {a.overdueWithDays.slice(0,3).map(inv=>(
              <div key={inv.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderTop:'1px solid var(--border)'}}>
                <div><p style={{fontSize:13,fontWeight:600,color:'var(--text-1)'}}>{inv.client_name}</p><p style={{fontSize:11,color:'var(--text-1)'}}>{inv.daysOverdue} ditë vonesë</p></div>
                <span style={{fontSize:13,fontWeight:700,color:'var(--text-1)'}}>{fmt(Number((inv.total_amount ?? inv.total)))}</span>
              </div>
            ))}
          </div>
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20}}>
            <h3 style={{fontFamily:'Poppins,sans-serif',fontSize:14,fontWeight:700,color:'var(--text-1)',marginBottom:14,display:'flex',alignItems:'center',gap:7}}>
              <Calendar size={15} style={{color:'var(--purple-light)'}}/>Detyrimet Tatimore
            </h3>
            {[{l:'TVSH (18%)',v:a.taxTvsh,c:'#7B2CF5',n:'Dorëzo te ATK'},{l:'Tatim Fitimi (10%)',v:a.taxFitimi,c:'#3B82F6',n:'Tremujor'},{l:'Totali tatimor',v:a.taxTvsh+a.taxFitimi,c:'#EF4444',n:'Viti 2026'}].map(t=>(
              <div key={t.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
                <div><p style={{fontSize:13,color:'var(--text-2)',fontWeight:500}}>{t.l}</p><p style={{fontSize:11,color:'var(--text-3)'}}>{t.n}</p></div>
                <span style={{fontSize:15,fontWeight:700,color:t.c,fontFamily:'Poppins,sans-serif'}}>{fmt(t.v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cashflow */}
      {tab==='cashflow'&&(
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20}}>
            <h3 style={{fontFamily:'Poppins,sans-serif',fontSize:15,fontWeight:700,color:'var(--text-1)',marginBottom:4}}>Parashikimi Cashflow — 3 muajt e ardhshëm</h3>
            <p style={{fontSize:13,color:'var(--text-3)',marginBottom:18}}>Bazuar në mesataren 3-mujore + kontratat fikse ({fmt(a.recTotal)}/muaj)</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
              {a.forecast.map((f,i)=>(
                <div key={i} style={{background:'var(--bg-muted)',border:`1px solid ${f.profit>=0?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}`,borderRadius:12,padding:16}}>
                  <p style={{fontSize:14,fontWeight:700,color:'var(--text-2)',marginBottom:10,fontFamily:'Poppins,sans-serif'}}>{f.label}</p>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:12,color:'var(--text-3)'}}>Të ardhura</span><span style={{fontSize:12,fontWeight:600,color:'var(--text-1)'}}>{fmt(f.rev)}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:12,color:'var(--text-3)'}}>Shpenzime</span><span style={{fontSize:12,fontWeight:600,color:'var(--text-1)'}}>{fmt(f.exp)}</span></div>
                    <div style={{height:1,background:'var(--border)',margin:'3px 0'}}/>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:12,fontWeight:700,color:'var(--text-1)'}}>Fitimi</span><span style={{fontSize:14,fontWeight:800,color:f.profit>=0?'#10B981':'#EF4444',fontFamily:'Poppins,sans-serif'}}>{fmt(f.profit)}</span></div>
                  </div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[...a.monthly.slice(-3).map(m=>({...m,t:'Historike'})),...a.forecast.map(f=>({label:f.label,rev:f.rev,exp:f.exp}))]}>
                <XAxis dataKey="label" tick={{fontSize:11,fill:'#6B7280'}}/>
                <YAxis tick={{fontSize:11,fill:'#6B7280'}} tickFormatter={v=>`€${v}`}/>
                <Tooltip {...TT} formatter={(v:number)=>fmt(v)}/>
                <Bar dataKey="rev" name="Të ardhura" fill="#7B2CF5" radius={[4,4,0,0]}/>
                <Bar dataKey="exp" name="Shpenzime" fill="#EF4444" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Clients */}
      {tab==='clients'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20}}>
            <h3 style={{fontFamily:'Poppins,sans-serif',fontSize:14,fontWeight:700,color:'var(--text-1)',marginBottom:16}}>Top Klientët</h3>
            {a.topClients.length===0?<p style={{color:'var(--text-3)',fontSize:13}}>Nuk ka të dhëna</p>:a.topClients.map(([name,amt],i)=>(
              <div key={name} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:`${COLORS[i%COLORS.length]}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:COLORS[i%COLORS.length],flexShrink:0}}>{i+1}</div>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,fontWeight:600,color:'var(--text-1)',marginBottom:3}}>{name}</p>
                  <div style={{height:4,background:'var(--bg-muted)',borderRadius:3}}><div style={{height:'100%',background:COLORS[i%COLORS.length],width:`${(amt/(a.topClients[0]?.[1]||1))*100}%`,borderRadius:3}}/></div>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:'var(--text-1)'}}>{fmt(amt)}</span>
              </div>
            ))}
          </div>
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20}}>
            <h3 style={{fontFamily:'Poppins,sans-serif',fontSize:14,fontWeight:700,color:'var(--text-1)',marginBottom:14}}>Analiza</h3>
            {[
              {l:'Klientë unikë',v:String(a.topClients.length)},
              {l:'Klienti kryesor',v:a.topClients[0]?.[0]||'—'},
              {l:'Koncentrimi kryesor',v:`${a.concentrationRisk.toFixed(0)}%`,warn:a.concentrationRisk>50},
              {l:'Mesatarja/klient',v:a.topClients.length>0?fmt(a.totalRev/a.topClients.length):'€0'},
              {l:'Kontrata fikse',v:String(a.forecast.length>0?a.forecast.length:0)},
            ].map(row=>(
              <div key={row.l} style={{display:'flex',justifyContent:'space-between',padding:'9px 12px',background:row.warn?'rgba(239,68,68,0.08)':'var(--bg-muted)',borderRadius:8,marginBottom:8}}>
                <span style={{fontSize:13,color:'var(--text-2)'}}>{row.l}</span>
                <span style={{fontSize:13,fontWeight:700,color:row.warn?'#EF4444':'var(--text-1)'}}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {tab==='insights'&&(
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {a.insights.length===0?(
              <div style={{gridColumn:'1/-1',textAlign:'center',padding:'48px 24px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16}}>
                <CheckCircle2 size={36} style={{color:'var(--text-1)',margin:'0 auto 12px',display:'block'}}/>
                <p style={{fontSize:15,fontWeight:600,color:'var(--text-1)'}}>Gjithçka duket mirë!</p>
                <p style={{fontSize:13,color:'var(--text-3)',marginTop:4}}>Nuk ka sinjalizime aktive.</p>
              </div>
            ):a.insights.map((ins,i)=>{
              const cols: Record<string,{bg:string;border:string;color:string}> = {
                danger:{bg:'rgba(239,68,68,0.08)',border:'rgba(239,68,68,0.25)',color:'#EF4444'},
                warning:{bg:'rgba(245,158,11,0.08)',border:'rgba(245,158,11,0.25)',color:'#F59E0B'},
                success:{bg:'rgba(16,185,129,0.08)',border:'rgba(16,185,129,0.25)',color:'#10B981'},
                info:{bg:'rgba(59,130,246,0.08)',border:'rgba(59,130,246,0.25)',color:'#3B82F6'},
              }
              const s=cols[ins.type]
              const Icon = ins.type==='success'?CheckCircle2:ins.type==='info'?Lightbulb:AlertTriangle
              return (
                <div key={i} style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:14,padding:18}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                    <div style={{width:34,height:34,borderRadius:9,background:`${s.color}20`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Icon size={17} style={{color:s.color}}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                        <p style={{fontSize:14,fontWeight:700,color:'var(--text-1)',fontFamily:'Poppins,sans-serif'}}>{ins.title}</p>
                        {ins.value&&<span style={{fontSize:13,fontWeight:800,color:s.color}}>{ins.value}</span>}
                      </div>
                      <p style={{fontSize:13,color:'var(--text-2)',lineHeight:1.6}}>{ins.desc}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20}}>
            <h3 style={{fontFamily:'Poppins,sans-serif',fontSize:14,fontWeight:700,color:'var(--text-1)',marginBottom:14,display:'flex',alignItems:'center',gap:7}}>
              <Target size={16} style={{color:'var(--purple-light)'}}/>Rekomandime Strategjike
            </h3>
            {[
              a.overdue.length>0&&`Dërgo email/telefono ${a.overdue.length} klientët me fatura vonuara — ${fmt(a.overdueAmt)} të bllokuara.`,
              a.concentrationRisk>50&&`Klienti kryesor ${a.topClients[0]?.[0]} = ${a.concentrationRisk.toFixed(0)}% e të ardhurave. Gjej 2-3 klientë të rinj.`,
              a.margin<30&&a.totalRev>0&&`Marzhi ${a.margin.toFixed(1)}% — optimizo kategorinë "${a.expByCategory[0]?.[0]||''}" (${fmt(a.expByCategory[0]?.[1]||0)}).`,
              a.recTotal===0&&`Nuk ke kontrata fikse — propozoji klientëve retainer mujor për të ardhura stabile.`,
              a.pending.length>3&&`${a.pending.length} fatura në pritje — vendos terma pagese 15 ditë jo 30 ditë.`,
              `Kontributo tatimin tremujor te ATK para datës 15 — ${fmt(a.taxFitimi)}.`,
            ].filter(Boolean).map((rec,i)=>(
              <div key={i} style={{display:'flex',gap:10,padding:'10px 14px',background:'var(--bg-muted)',borderRadius:10,marginBottom:8}}>
                <span style={{color:'var(--purple-light)',flexShrink:0,fontWeight:700}}>{i+1}.</span>
                <p style={{fontSize:13,color:'var(--text-2)',lineHeight:1.6}}>{rec as string}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
