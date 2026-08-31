import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import PendingAccountantsPanel from '@/components/admin/pending-accountants-panel'
import PendingBusinessesPanel from '@/components/admin/pending-businesses-panel'

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*, companies(name, email)')
    .order('created_at', { ascending: false })

  // Pending business subscriptions (self-registered, awaiting payment confirmation)
  const pendingBizSubs = (subs || []).filter(s => s.status === 'pending')

  // Pending accountant subscriptions (self-registered, awaiting payment confirmation)
  const { data: pendingAccSubsRaw } = await supabase
    .from('accountant_subscriptions')
    .select('id, plan, price_monthly, status, created_at, user_id')
    .eq('status', 'pending_payment')
    .order('created_at', { ascending: false })

  const pendingAccSubs = await Promise.all(
    (pendingAccSubsRaw || []).map(async (p) => {
      const { data: u } = await supabase.from('users').select('full_name, email').eq('id', p.user_id).maybeSingle()
      return { ...p, user: u || null }
    })
  )

  const PLAN_PRICES: Record<string,number> = {
    basic:19,
    starter:99, professional:199,
    // legacy
    premium:39, advanced:79
  }
  const PLAN_LABELS: Record<string,string> = {
    basic:'Biznes €19',
    starter:'Starter €99', professional:'Professional €199',
    premium:'Premium', advanced:'Advanced'
  }
  const PLAN_COLORS: Record<string,string> = {
    basic:'#3B82F6',
    starter:'#F59E0B', professional:'#9B5CF8',
    premium:'#F59E0B', advanced:'#10B981'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>Abonimet</h1>
        <p style={{ color:'var(--text-3)', fontSize:14 }}>{subs?.length || 0} abonime total</p>
      </div>

      <PendingBusinessesPanel pending={pendingBizSubs as never} />
      <PendingAccountantsPanel pending={pendingAccSubs} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:8 }}>
        {['basic','starter','professional'].map(plan => {
          const count = subs?.filter(s=>s.plan===plan && s.status==='active').length || 0
          const col = PLAN_COLORS[plan]
          return (
            <div key={plan} style={{ background:'var(--bg-muted)', border:`1px solid ${col}25`, borderRadius:14, padding:'14px 16px', borderTop:`2px solid ${col}` }}>
              <p style={{ fontSize:11, color:col, fontWeight:800, textTransform:'uppercase', marginBottom:6 }}>{PLAN_LABELS[plan]}</p>
              <p style={{ fontFamily:'Poppins,sans-serif', fontSize:28, fontWeight:900, color:col }}>{count}</p>
              <p style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>€{(count*PLAN_PRICES[plan]).toFixed(0)}/muaj</p>
            </div>
          )
        })}
      </div>
      <div style={{ background:'var(--bg-muted)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['Kompania','Plani','Statusi','Fillon','Skadon','Vlera/muaj'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(subs || []).map((s, i) => {
              const comp = s.companies as {name?:string;email?:string}|null
              const col = PLAN_COLORS[s.plan] || '#6B7280'
              const daysLeft = s.current_period_end ? Math.ceil((new Date(s.current_period_end).getTime()-Date.now())/86400000) : null
              return (
                <tr key={s.id} style={{ borderBottom:'1px solid var(--border)', background:i%2===0?'transparent':'var(--border)' }}>
                  <td style={{ padding:'12px 16px' }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{comp?.name || '—'}</p>
                    <p style={{ fontSize:11, color:'var(--text-3)' }}>{comp?.email || ''}</p>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:700, background:`${col}18`, color:col, textTransform:'capitalize' }}>{s.plan}</span>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:700,
                      background:s.status==='active'?'rgba(16,185,129,0.15)':s.status==='expired'?'rgba(239,68,68,0.15)':'rgba(245,158,11,0.15)',
                      color:s.status==='active'?'#10B981':s.status==='expired'?'#EF4444':'#F59E0B'
                    }}>{s.status}</span>
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)' }}>{formatDate(s.current_period_start)}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color: daysLeft !== null && daysLeft <= 14 ? '#F59E0B' : 'var(--border)' }}>
                    {formatDate(s.current_period_end)}{daysLeft !== null && daysLeft <= 14 && daysLeft >= 0 ? ` (${daysLeft}d)` : ''}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:col }}>€{PLAN_PRICES[s.plan] || 0}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
