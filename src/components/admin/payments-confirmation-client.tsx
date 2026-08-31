'use client'

import { useState } from 'react'
import { Check, Loader2, Clock, CreditCard, History, Building2, UserCog, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface PendingBiz { id: string; plan: string; price_monthly: number; created_at: string; company: { name: string; email: string } | null }
interface PendingAcc { id: string; plan: string; price_monthly: number; created_at: string; user: { full_name: string; email: string } | null }
interface PendingRenewal { id: string; amount: number; method: string; reference_number?: string | null; period_months: number; created_at: string; company: { name: string; email: string } | null; subscription_id: string }
interface ConfirmedPayment { id: string; amount: number; method: string; confirmed_at: string; company_name: string }

interface Props {
  pendingBizSubs: PendingBiz[]
  pendingAccSubs: PendingAcc[]
  pendingRenewals: PendingRenewal[]
  confirmedHistory: ConfirmedPayment[]
}

const PLAN_COLORS: Record<string, string> = {
  basic:'#3B82F6',
  starter:'#F59E0B', professional:'#9B5CF8',
  premium:'#9B5CF8', advanced:'#10B981'
}
const PLAN_LABELS: Record<string, string> = {
  basic:'Biznes', starter:'Starter', professional:'Professional',
  premium:'Premium', advanced:'Advanced'
}
const METHOD_LABELS: Record<string, string> = { bank_transfer: 'Transfer Bankar', cash: 'Kesh' }

export default function PaymentsConfirmationClient({ pendingBizSubs, pendingAccSubs, pendingRenewals, confirmedHistory }: Props) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const router = useRouter()

  const totalPending = pendingBizSubs.length + pendingAccSubs.length + pendingRenewals.length

  async function activateBusiness(id: string) {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}/activate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ months: 1 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Biznesi u aktivizua!')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally { setProcessingId(null) }
  }

  async function activateAccountant(id: string) {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/admin/accountant-subscriptions/${id}/activate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ months: 1 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Kontabilisti u aktivizua!')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally { setProcessingId(null) }
  }

  async function confirmRenewal(paymentId: string, subscriptionId: string) {
    setProcessingId(paymentId)
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: subscriptionId, months: 1 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Rinovimi u konfirmua!')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally { setProcessingId(null) }
  }

  return (
    <div className="space-y-6">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>Konfirmimi i Pagesave</h1>
          <p style={{ color:'var(--text-3)', fontSize:14 }}>
            {totalPending > 0 ? `${totalPending} pagesa në pritje për konfirmim` : 'Asnjë pagesë në pritje'}
          </p>
        </div>
        {totalPending > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:12, padding:'8px 16px' }}>
            <Clock size={15} style={{ color:'#F59E0B' }} />
            <span style={{ fontSize:13, fontWeight:700, color:'#F59E0B' }}>{totalPending} në pritje</span>
          </div>
        )}
      </div>

      {totalPending === 0 && (
        <div style={{ textAlign:'center', padding:60, background:'var(--bg-muted)', border:'1px solid var(--border)', borderRadius:16 }}>
          <CreditCard size={32} style={{ color:'var(--text-3)', margin:'0 auto 12px' }} />
          <p style={{ color:'var(--text-3)', fontSize:14 }}>Nuk ka pagesa në pritje për momentin</p>
        </div>
      )}

      {pendingBizSubs.length > 0 && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <Building2 size={15} style={{ color:'var(--text-1)' }} />
            <h3 style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Biznese të reja ({pendingBizSubs.length})</h3>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {pendingBizSubs.map(p => {
              const col = PLAN_COLORS[p.plan] || '#6B7280'
              return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:12, background:'var(--bg-muted)', border:'1px solid var(--border)' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13.5, fontWeight:700, color:'var(--text-1)' }}>{p.company?.name || 'Pa emër'}</p>
                    <p style={{ fontSize:11.5, color:'var(--text-3)' }}>{p.company?.email} · {formatDate(p.created_at)}</p>
                  </div>
                  <span style={{ fontSize:11, padding:'4px 10px', borderRadius:20, fontWeight:700, background:`${col}18`, color:col, textTransform:'capitalize', flexShrink:0 }}>
                    {PLAN_LABELS[p.plan] || p.plan} · €{p.price_monthly}
                  </span>
                  <button onClick={() => activateBusiness(p.id)} disabled={processingId === p.id}
                    style={{ padding:'8px 16px', borderRadius:10, border:'none', background:'var(--bg-muted)', color:'var(--text-1)', fontSize:12.5, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    {processingId === p.id ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
                    Aktivizo
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pendingAccSubs.length > 0 && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <UserCog size={15} style={{ color:'#9B5CF8' }} />
            <h3 style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Kontabilistë të rinj ({pendingAccSubs.length})</h3>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {pendingAccSubs.map(p => {
              const col = PLAN_COLORS[p.plan] || '#6B7280'
              return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:12, background:'var(--bg-muted)', border:'1px solid var(--border)' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13.5, fontWeight:700, color:'var(--text-1)' }}>{p.user?.full_name || 'Pa emër'}</p>
                    <p style={{ fontSize:11.5, color:'var(--text-3)' }}>{p.user?.email} · {formatDate(p.created_at)}</p>
                  </div>
                  <span style={{ fontSize:11, padding:'4px 10px', borderRadius:20, fontWeight:700, background:`${col}18`, color:col, textTransform:'capitalize', flexShrink:0 }}>
                    {PLAN_LABELS[p.plan] || p.plan} · €{p.price_monthly}
                  </span>
                  <button onClick={() => activateAccountant(p.id)} disabled={processingId === p.id}
                    style={{ padding:'8px 16px', borderRadius:10, border:'none', background:'var(--bg-muted)', color:'var(--text-1)', fontSize:12.5, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    {processingId === p.id ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
                    Aktivizo
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pendingRenewals.length > 0 && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <RefreshCw size={15} style={{ color:'#F59E0B' }} />
            <h3 style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Rinovime ({pendingRenewals.length})</h3>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {pendingRenewals.map(p => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:12, background:'var(--bg-muted)', border:'1px solid var(--border)' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13.5, fontWeight:700, color:'var(--text-1)' }}>{p.company?.name || 'Pa emër'}</p>
                  <p style={{ fontSize:11.5, color:'var(--text-3)' }}>
                    {METHOD_LABELS[p.method] || p.method} {p.reference_number ? `· Ref: ${p.reference_number}` : ''} · {formatDate(p.created_at)}
                  </p>
                </div>
                <span style={{ fontSize:13, fontWeight:800, color:'#F59E0B', flexShrink:0 }}>€{p.amount}</span>
                <button onClick={() => confirmRenewal(p.id, p.subscription_id)} disabled={processingId === p.id}
                  style={{ padding:'8px 16px', borderRadius:10, border:'none', background:'var(--bg-muted)', color:'var(--text-1)', fontSize:12.5, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                  {processingId === p.id ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
                  Konfirmo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <History size={15} style={{ color:'var(--text-3)' }} />
          <h3 style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Historiku i fundit</h3>
        </div>
        {confirmedHistory.length === 0 ? (
          <p style={{ fontSize:13, color:'var(--text-3)' }}>Asnjë pagesë e konfirmuar ende.</p>
        ) : (
          <div style={{ background:'var(--bg-muted)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            {confirmedHistory.map((p, i) => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', borderBottom: i < confirmedHistory.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <Check size={14} style={{ color:'var(--text-1)', flexShrink:0 }} />
                <span style={{ flex:1, fontSize:13, color:'var(--text-1)' }}>{p.company_name}</span>
                <span style={{ fontSize:12, color:'var(--text-3)' }}>{METHOD_LABELS[p.method] || p.method}</span>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>€{p.amount}</span>
                <span style={{ fontSize:11.5, color:'var(--text-3)', minWidth:90, textAlign:'right' }}>{formatDate(p.confirmed_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
