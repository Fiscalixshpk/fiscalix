'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { TrendingUp, ShoppingBag, Package, ArrowRight, Receipt, FileText } from 'lucide-react'

interface Props {
  companyName:   string
  allSales?:     any[]
  totalToday:    number
  totalMonth:    number
  txCountToday:  number
  txCountMonth:  number
  trendingDishes: { name: string; orders: number; color: string }[]
  cashTotal:     number
  cardTotal:     number
  expensesToday: number
}

const MONTHS = ['Jan','Shk','Mar','Pri','Maj','Qer','Kor','Gus','Sht','Tet','Nën','Dhj']
const PERIODS = ['Dje','Sot','Javë','Muaj','Vit'] as const

export default function BakeryDashboard({
  companyName, allSales = [], totalToday, totalMonth,
  txCountToday, txCountMonth, trendingDishes,
  cashTotal, cardTotal, expensesToday
}: Props) {
  const [period, setPeriod] = useState<typeof PERIODS[number]>('Sot')

  const fmtEUR = (n: number) => `€${n.toFixed(2)}`

  const filteredSales = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const yd = new Date(now); yd.setDate(yd.getDate()-1)
    const yestStr = yd.toISOString().split('T')[0]
    const get = (iso: string) => iso.split('T')[0]
    if (period==='Dje') return allSales.filter(s=>get(s.issued_at)===yestStr)
    if (period==='Sot') return allSales.filter(s=>get(s.issued_at)===todayStr)
    if (period==='Javë') { const f=new Date(now); f.setDate(f.getDate()-7); const fs=f.toISOString().split('T')[0]; return allSales.filter(s=>get(s.issued_at)>=fs) }
    if (period==='Muaj') { const fs=todayStr.slice(0,7)+'-01'; return allSales.filter(s=>get(s.issued_at)>=fs) }
    if (period==='Vit')  { const fs=todayStr.slice(0,4)+'-01-01'; return allSales.filter(s=>get(s.issued_at)>=fs) }
    return allSales
  }, [allSales, period])

  const periodTotal = filteredSales.reduce((s,r)=>s+Number(r.total_amount||0)/100,0)
  const periodTx    = filteredSales.length
  const periodCash  = filteredSales.filter(s=>s.payment_method==='cash').reduce((s,r)=>s+Number(r.total_amount||0)/100,0)
  const periodCard  = filteredSales.filter(s=>s.payment_method==='card').reduce((s,r)=>s+Number(r.total_amount||0)/100,0)

  const displayTotal = period==='Sot' ? totalToday : periodTotal
  const displayTx    = period==='Sot' ? txCountToday : periodTx
  const displayCash  = period==='Sot' ? cashTotal : periodCash
  const displayCard  = period==='Sot' ? cardTotal : periodCard

  // Monthly chart
  const monthlyData = useMemo(() => {
    const now = new Date()
    return Array.from({length:6},(_,i)=>{
      const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1)
      const m = d.getMonth(); const y = d.getFullYear()
      const total = allSales.filter(s=>{
        const sd=new Date(s.issued_at); return sd.getMonth()===m&&sd.getFullYear()===y
      }).reduce((sum,r)=>sum+Number(r.total_amount||0)/100,0)
      return { label: MONTHS[m], total }
    })
  }, [allSales])

  const maxBar = Math.max(...monthlyData.map(d=>d.total), 1)

  const C = {
    bg:'#F8F7FF', card:'#ffffff', border:'#EEE9FF',
    purple:'#7C3AED', purpleL:'#A78BFA', purpleBg:'#F3F0FF',
    text1:'#111827', text2:'#4B5563', text3:'#9CA3AF',
    green:'#10B981', amber:'#F59E0B',
  }

  return (
    <div style={{padding:'24px',background:C.bg,minHeight:'100%',fontFamily:'Inter,sans-serif'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:900,color:C.text1,letterSpacing:'-0.03em'}}>Dashboard</h1>
          <p style={{fontSize:13,color:C.text3,marginTop:2}}>{companyName}</p>
        </div>
        {/* Period selector */}
        <div style={{display:'flex',gap:3,padding:4,background:'white',borderRadius:12,border:`1px solid ${C.border}`,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          {PERIODS.map(p=>(
            <button key={p} onClick={()=>setPeriod(p)} style={{
              padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',
              fontSize:12,fontWeight:700,transition:'all 0.12s',
              background:period===p?C.purple:'transparent',
              color:period===p?'white':C.text3,
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          { label:'Shitjet', value:fmtEUR(displayTotal), sub:`${displayTx} shitje · ${period}`, color:C.purple, bg:C.purpleBg },
          { label:'Cash', value:fmtEUR(displayCash), sub:'Pagesa cash', color:C.green, bg:'#ECFDF5' },
          { label:'Kartë', value:fmtEUR(displayCard), sub:'Pagesa kartë', color:'#3B82F6', bg:'#EFF6FF' },
          { label:'Shpenzimet Sot', value:fmtEUR(expensesToday), sub:'Shpenzime ditore', color:C.amber, bg:'#FFFBEB' },
        ].map(s=>(
          <div key={s.label} style={{background:s.bg,borderRadius:14,padding:'18px 20px',border:`1px solid ${s.color}20`}}>
            <p style={{fontSize:11,fontWeight:700,color:s.color,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>{s.label}</p>
            <p style={{fontSize:24,fontWeight:900,color:s.color,letterSpacing:'-0.03em'}}>{s.value}</p>
            <p style={{fontSize:11,color:C.text2,marginTop:4}}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart + Trending */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:20}}>

        {/* Bar chart */}
        <div style={{background:C.card,borderRadius:16,padding:20,border:`1px solid ${C.border}`,boxShadow:'0 1px 6px rgba(0,0,0,0.04)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <p style={{fontSize:15,fontWeight:800,color:C.text1}}>Shitjet — 6 Muajt</p>
            <Link href="/pos/reports" style={{fontSize:12,color:C.purple,fontWeight:600,textDecoration:'none',display:'flex',alignItems:'center',gap:4}}>
              Shiko Raportin <ArrowRight size={12}/>
            </Link>
          </div>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120}}>
            {monthlyData.map((d,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <p style={{fontSize:10,color:C.text3,fontWeight:600}}>{fmtEUR(d.total)}</p>
                <div style={{width:'100%',borderRadius:6,background:i===5?C.purple:C.purpleL+'40',height:`${Math.max(4,(d.total/maxBar)*80)}px`,transition:'height 0.3s'}}/>
                <p style={{fontSize:10,color:C.text3}}>{d.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trending products */}
        <div style={{background:C.card,borderRadius:16,padding:20,border:`1px solid ${C.border}`,boxShadow:'0 1px 6px rgba(0,0,0,0.04)'}}>
          <p style={{fontSize:15,fontWeight:800,color:C.text1,marginBottom:16}}>Produktet Kryesore</p>
          {trendingDishes.length===0 ? (
            <p style={{fontSize:13,color:C.text3,textAlign:'center',padding:'20px 0'}}>Asnjë shitje akoma</p>
          ) : trendingDishes.map((d,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <div style={{width:32,height:32,borderRadius:8,background:d.color+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Package size={14} style={{color:d.color}}/>
              </div>
              <div style={{flex:1}}>
                <p style={{fontSize:13,fontWeight:700,color:C.text1}}>{d.name}</p>
                <div style={{width:'100%',height:4,borderRadius:4,background:'#F3F4F6',marginTop:4}}>
                  <div style={{width:`${Math.min(100,(d.orders/trendingDishes[0].orders)*100)}%`,height:'100%',borderRadius:4,background:d.color}}/>
                </div>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:d.color}}>{d.orders}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
        {[
          { href:'/pos', label:'Hap POS', desc:'Shto shitje të re', icon:'pos', color:C.purple },
          { href:'/pos/products', label:'Menaxho Produktet', desc:'Shto/ndrysho produkte', icon:'products', color:'#F59E0B' },
          { href:'/expenses', label:'Shpenzime', desc:'Regjistro shpenzim', icon:'expenses', color:'#10B981' },
        ].map(a=>(
          <Link key={a.href} href={a.href} style={{
            background:C.card,borderRadius:14,padding:'16px 18px',
            border:`1px solid ${C.border}`,textDecoration:'none',
            display:'flex',alignItems:'center',gap:12,
            boxShadow:'0 1px 6px rgba(0,0,0,0.04)',
            transition:'box-shadow 0.15s',
          }}
            onMouseEnter={e=>(e.currentTarget.style.boxShadow='0 4px 14px rgba(124,58,237,0.12)')}
            onMouseLeave={e=>(e.currentTarget.style.boxShadow='0 1px 6px rgba(0,0,0,0.04)')}>
            {a.icon === 'pos' && <ShoppingBag size={20} style={{color:a.color, flexShrink:0}}/>}
            {a.icon === 'products' && <Package size={20} style={{color:a.color, flexShrink:0}}/>}
            {a.icon === 'expenses' && <Receipt size={20} style={{color:a.color, flexShrink:0}}/>}
            <div>
              <p style={{fontSize:13,fontWeight:700,color:a.color}}>{a.label}</p>
              <p style={{fontSize:11,color:C.text3,marginTop:1}}>{a.desc}</p>
            </div>
            <ArrowRight size={14} style={{marginLeft:'auto',color:C.text3}}/>
          </Link>
        ))}
      </div>

    </div>
  )
}
