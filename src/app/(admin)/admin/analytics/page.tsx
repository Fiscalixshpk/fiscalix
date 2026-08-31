import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [
    { count: totalUsers },
    { count: totalCompanies },
    { count: totalInvoices },
    { data: subs },
  ] = await Promise.all([
    supabase.from('users').select('*', { count:'exact', head:true }),
    supabase.from('companies').select('*', { count:'exact', head:true }).eq('is_active', true),
    supabase.from('invoices').select('*', { count:'exact', head:true }),
    supabase.from('subscriptions').select('plan, status').eq('status','active'),
  ])

  const PRICES: Record<string,number> = { basic:19, premium:39, advanced:79, enterprise:299, accountant:99 }
  const mrr = (subs || []).reduce((sum, s) => sum + (PRICES[s.plan] || 0), 0)
  const planCounts = (subs || []).reduce((acc, s) => { acc[s.plan] = (acc[s.plan]||0)+1; return acc }, {} as Record<string,number>)

  const stats = [
    { label:'MRR (Monthly Recurring Revenue)', value: formatCurrency(mrr), color:'#10B981', sub: `${subs?.length || 0} abonime aktive` },
    { label:'ARR (Annual Recurring Revenue)', value: formatCurrency(mrr*12), color:'#9B5CF8', sub:'projeksion vjetor' },
    { label:'Klientë Total', value: String(totalCompanies || 0), color:'#3B82F6', sub:`${totalUsers || 0} përdorues` },
    { label:'Fatura të Procesuara', value: String(totalInvoices || 0), color:'#F59E0B', sub:'gjithsej' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>Analitika</h1>
        <p style={{ color:'var(--text-3)', fontSize:14 }}>Pasqyra financiare e platformës</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background:'var(--bg-muted)', border:'1px solid var(--border)', borderRadius:16, padding:20, borderTop:`2px solid ${s.color}` }}>
            <p style={{ fontSize:11, color:'var(--text-3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>{s.label}</p>
            <p style={{ fontFamily:'Poppins,sans-serif', fontSize:30, fontWeight:900, color:s.color, lineHeight:1, marginBottom:6 }}>{s.value}</p>
            <p style={{ fontSize:12, color:'var(--text-3)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ background:'var(--bg-muted)', border:'1px solid var(--border)', borderRadius:16, padding:24 }}>
        <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:15, fontWeight:700, color:'var(--text-1)', marginBottom:18 }}>Shpërndarja e Planeve</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {Object.entries(PRICES).map(([plan, price]) => {
            const count = planCounts[plan] || 0
            const total = subs?.length || 1
            const pct = Math.round((count/total)*100)
            const colors: Record<string,string> = { basic:'#3B82F6', premium:'#9B5CF8', advanced:'#10B981', enterprise:'#F59E0B', accountant:'#EF4444' }
            const col = colors[plan] || '#6B7280'
            return (
              <div key={plan} style={{ display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ width:80, fontSize:12, fontWeight:700, color:col, textTransform:'capitalize', textAlign:'right', flexShrink:0 }}>{plan}</span>
                <div style={{ flex:1, height:8, background:'var(--bg-muted)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:4, transition:'width 0.5s ease' }}/>
                </div>
                <span style={{ width:40, fontSize:12, color:'var(--text-2)', textAlign:'right', flexShrink:0 }}>{count}</span>
                <span style={{ width:60, fontSize:12, color:col, fontWeight:700, flexShrink:0 }}>€{(count*price).toFixed(0)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
