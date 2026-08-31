'use client'

import { useState, useEffect } from 'react'
import { Lock, Building2, Banknote, Check, Loader2, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const PLAN_LABELS: Record<string, { name: string; price: number }> = {
  starter:        { name: 'Accountant Starter',   price: 19 },
  professional:   { name: 'Accountant Pro',        price: 39 },
  basic:          { name: 'Business',              price: 15 },
  business:       { name: 'Business',              price: 15 },
  premium:        { name: 'Accountant Pro',        price: 39 },
  advanced:       { name: 'Accountant Unlimited',  price: 79 },
  unlimited:      { name: 'Accountant Unlimited',  price: 79 },
  accountant:     { name: 'Accountant Starter',    price: 19 },
  enterprise:     { name: 'Enterprise',            price: 79 },
  free:           { name: 'Free',                  price: 0  },
}

export default function BillingPendingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'accountant' | 'business_owner' | null>(null)
  const [sub, setSub] = useState<{ plan: string; status: string; price_monthly: number } | null>(null)
  const [reference, setReference] = useState('')
  const [method, setMethod] = useState<'bank_transfer' | 'cash'>('bank_transfer')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('users').select('role, company_id').eq('id', user.id).maybeSingle()
      const userRole = profile?.role === 'accountant' ? 'accountant' : 'business_owner'
      setRole(userRole)

      if (userRole === 'accountant') {
        const { data: subData } = await supabase
          .from('accountant_subscriptions')
          .select('plan, status, price_monthly')
          .eq('user_id', user.id)
          .maybeSingle()
        if (subData?.status === 'active') { router.push('/accountant'); return }
        setSub(subData)
      } else {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('plan, status, price_monthly')
          .eq('company_id', profile?.company_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (subData?.status === 'active') { router.push('/dashboard'); return }
        setSub(subData)
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function submitPaymentNotice(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase.from('users').select('full_name, email').eq('id', user.id).maybeSingle()

      // Notify all admins about the pending payment (payments table requires a business subscription_id, not applicable here)
      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin')
      if (admins && admins.length > 0) {
        const notifs = admins.map(a => ({
          user_id: a.id,
          title: 'Pagesë kontabilisti në pritje',
          message: `${profile?.full_name || profile?.email || 'Një kontabilist'} njoftoi pagesë (${method === 'bank_transfer' ? 'Transfer Bankar' : 'Kesh'}${reference ? `, ref: ${reference}` : ''}).`,
          type: 'info',
        }))
        await supabase.from('notifications').insert(notifs)
      }

      setSubmitted(true)
      toast.success('Njoftimi i pagesës u dërgua!')
    } catch (err) {
      toast.error('Gabim. Provo përsëri.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-card)' }}>
      <Loader2 size={28} className="animate-spin" style={{ color:'#9B5CF8' }}/>
    </div>
  }

  const planInfo = PLAN_LABELS[sub?.plan || 'starter'] ?? PLAN_LABELS['starter']

  if (submitted) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'var(--bg-card)' }}>
        <div style={{ maxWidth:440, width:'100%', textAlign:'center', background:'var(--bg-muted)', border:'1px solid var(--border-color,#e2dcff)', borderRadius:20, padding:32 }}>
          <div style={{ width:64, height:64, borderRadius:16, background:'rgba(16,185,129,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Check size={28} style={{ color:'#10B981' }}/>
          </div>
          <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:19, fontWeight:700, color:'white', marginBottom:8 }}>Njoftimi u dërgua!</h2>
          <p style={{ fontSize:13, color:'#9CA3AF', lineHeight:1.6 }}>
            Fiscalix SHPK do ta konfirmojë pagesën tuaj brenda <strong style={{ color:'white' }}>24 orëve</strong>.
            Llogaria do të aktivizohet automatikisht pas konfirmimit.
          </p>
          <button onClick={handleLogout}
            style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center', width:'100%', marginTop:20, background:'transparent', border:'1px solid var(--border-color,#e2dcff)', color:'#9CA3AF', padding:'10px 16px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>
            <LogOut size={14}/> Dil dhe kthehu më vonë
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', padding:'40px 16px', background:'var(--bg-card)' }}>
      <div style={{ maxWidth:480, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
          <button onClick={handleLogout}
            style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', border:'1px solid var(--border-color,#e2dcff)', color:'#9CA3AF', padding:'7px 14px', borderRadius:10, fontSize:12.5, fontWeight:600, cursor:'pointer' }}>
            <LogOut size={13}/> Dil
          </button>
        </div>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(245,158,11,0.1)', color:'#F59E0B', padding:'8px 16px', borderRadius:12, fontSize:13, fontWeight:600, marginBottom:16, border:'1px solid rgba(245,158,11,0.25)' }}>
            <Lock size={14}/> Llogaria juaj është në pritje të pagesës
          </div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'white', marginBottom:6 }}>Aktivizo Llogarinë</h1>
          <p style={{ fontSize:13, color:'#9CA3AF' }}>Kryej pagesën dhe njoftona — aktivizimi bëhet brenda 24 orëve</p>
        </div>

        <div style={{ background:'var(--bg-muted)', border:'1px solid var(--border-color,#e2dcff)', borderRadius:18, padding:24, marginBottom:20 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Paketa e zgjedhur</p>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontFamily:'Poppins,sans-serif', fontSize:18, fontWeight:700, color:'var(--text-1)' }}>{planInfo.name}</p>
            <p style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:800, color:'#9B5CF8' }}>€{planInfo.price}<span style={{ fontSize:12, color:'#6B7280', fontWeight:500 }}>/muaj</span></p>
          </div>
        </div>

        <div style={{ background:'var(--bg-muted)', border:'1px solid var(--border-color,#e2dcff)', borderRadius:18, padding:24, marginBottom:20 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>Detajet e Pagesës — Fiscalix SHPK</p>
          <div style={{ fontSize:13, color:'#9CA3AF', lineHeight:1.8 }}>
            <p>WhatsApp / Tel: <span style={{ color:'var(--text-1)', fontWeight:600 }}>+383 49 123 456</span></p>
            <p>Mënyra: Transfer Bankar ose Kesh</p>
          </div>
          <a href="https://wa.me/38349123456" target="_blank" rel="noopener noreferrer"
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:14, padding:'11px 0', borderRadius:12,
              background:'#25D366', color:'var(--text-1)', fontWeight:700, fontSize:13, textDecoration:'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Kontakto në WhatsApp
          </a>
        </div>

        <form onSubmit={submitPaymentNotice} style={{ background:'var(--bg-muted)', border:'1px solid var(--border-color,#e2dcff)', borderRadius:18, padding:24 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>Njofto Pagesën</p>

          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <button type="button" onClick={() => setMethod('bank_transfer')}
              style={{ flex:1, padding:'10px', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', gap:6, cursor:'pointer',
                border: method==='bank_transfer' ? '1.5px solid #9B5CF8' : '1px solid var(--border)',
                background: method==='bank_transfer' ? 'rgba(123,44,245,0.1)' : 'transparent',
                color: method==='bank_transfer' ? 'white' : '#6B7280', fontSize:13, fontWeight:600 }}>
              <Building2 size={14}/> Transfer Bankar
            </button>
            <button type="button" onClick={() => setMethod('cash')}
              style={{ flex:1, padding:'10px', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', gap:6, cursor:'pointer',
                border: method==='cash' ? '1.5px solid #9B5CF8' : '1px solid var(--border)',
                background: method==='cash' ? 'rgba(123,44,245,0.1)' : 'transparent',
                color: method==='cash' ? 'white' : '#6B7280', fontSize:13, fontWeight:600 }}>
              <Banknote size={14}/> Kesh
            </button>
          </div>

          <label style={{ fontSize:11, fontWeight:600, color:'#6B7280', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>
            Referenca e transferit (opsionale)
          </label>
          <input value={reference} onChange={e => setReference(e.target.value)}
            placeholder="Nr. transaksionit ose shënim" className="finex-input" style={{ marginBottom:16 }} />

          <button type="submit" disabled={submitting}
            className="finex-button-primary w-full py-3 flex items-center justify-center gap-2 font-semibold" style={{ fontSize:14 }}>
            {submitting ? <Loader2 size={16} className="animate-spin"/> : 'Njofto Pagesën'}
          </button>
        </form>
      </div>
    </div>
  )
}
