'use client'

import { useState } from 'react'
import { Lock, CreditCard, Building2, Banknote, ArrowRight, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const PLANS = [
  {
    id: 'basic' as const,
    name: 'Biznes',
    price: 19,
    features: [
      'Dashboard financiar',
      'Fatura & Shpenzime',
      'PDF Export & QR Invoices',
      'Eksport Excel (CSV)',
      'Fatura të Përsëritura (Retainer)',
      'Kalkulatori i Pagave & Pensionit',
      'Raporte financiare',
      'Bashkëpunim me kontabilistin',
    ],
    popular: true,
  },
]

export default function ExpiredPage() {
  const supabase = createClient()
  const [selectedPlan, setSelectedPlan] = useState<'basic'>('basic')
  const [method, setMethod] = useState<'bank_transfer' | 'cash'>('bank_transfer')
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const selectedPlanData = PLANS.find(p => p.id === selectedPlan)!
  const price = billingCycle === 'yearly' ? selectedPlanData.price * 10 : selectedPlanData.price // 2 months free yearly

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      if (!userData?.company_id) throw new Error('No company')

      // Get or create subscription
      const { data: sub } = await supabase.from('subscriptions')
        .select('id')
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let subscriptionId = sub?.id

      if (!subscriptionId) {
        const { data: newSub } = await supabase.from('subscriptions').insert({
          company_id: userData.company_id,
          plan: selectedPlan,
          status: 'pending',
          price_monthly: selectedPlanData.price,
          ai_scans_limit: 0,
        }).select().single()
        subscriptionId = newSub?.id
      } else {
        await supabase.from('subscriptions').update({
          plan: selectedPlan,
          status: 'pending',
          ai_scans_limit: 0,
        }).eq('id', subscriptionId)
      }

      // Submit payment
      await supabase.from('payments').insert({
        subscription_id: subscriptionId,
        company_id: userData.company_id,
        amount: price,
        method,
        status: 'pending',
        reference_number: reference || null,
        period_months: billingCycle === 'yearly' ? 12 : 1,
        submitted_by: user.id,
      })

      setSubmitted(true)
      toast.success('Pagesa u dërgua për konfirmim!')
    } catch (err) {
      toast.error('Gabim. Provo përsëri.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Pagesa u dërgua!</h2>
          <p className="text-muted-foreground text-sm">
            Ekipi ynë do ta konfirmojë pagesën tuaj brenda <strong>24 orëve</strong>.
            Sistemi do të zhbllokohet menjëherë pas konfirmimit.
          </p>
          <div className="mt-6 p-4 bg-muted/50 rounded-xl text-sm text-left">
            <p className="font-medium mb-2">Detajet e pagesës:</p>
            <p className="text-muted-foreground">Pako: <span className="text-foreground font-medium capitalize">{selectedPlan}</span></p>
            <p className="text-muted-foreground">Shuma: <span className="text-foreground font-medium">{price} EUR</span></p>
            <p className="text-muted-foreground">Periudha: <span className="text-foreground font-medium">{billingCycle === 'yearly' ? '12 muaj' : '1 muaj'}</span></p>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Pyetje? Na kontaktoni: <strong>support@finex.com</strong>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mesh overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2 rounded-xl text-sm font-medium mb-4 border border-red-500/20">
            <Lock size={14} /> Abonimenti juaj ka skaduar
          </div>
          <h1 className="text-3xl font-bold mb-2">Rinovoni Fiscalix</h1>
          <p className="text-muted-foreground">Zgjidhni pakon dhe dërgoni pagesën — sistemi riaktivohet brenda 24 orëve</p>
        </div>

        {/* Billing cycle */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <button onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            Mujore
          </button>
          <button onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            Vjetore <span className="text-xs bg-amber-500 text-[var(--text-1)] px-1.5 py-0.5 rounded-lg">-17%</span>
          </button>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {PLANS.map(plan => {
            const p = billingCycle === 'yearly' ? plan.price * 10 : plan.price
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`glass-card text-left transition-all hover:scale-[1.01] ${
                  selectedPlan === plan.id ? 'border-2 border-amber-500/50' : ''
                } ${plan.popular ? 'relative' : ''}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-amber-500 text-[var(--text-1)] px-3 py-1 rounded-full font-medium">
                    Më popullorja
                  </span>
                )}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  {selectedPlan === plan.id && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                      <Check size={12} className="text-[var(--text-1)]" />
                    </div>
                  )}
                </div>
                <p className="text-3xl font-bold mb-1">
                  <span className="gold-text">€{p}</span>
                  <span className="text-muted-foreground text-base font-normal">/{billingCycle === 'yearly' ? 'vit' : 'muaj'}</span>
                </p>
                <ul className="space-y-2 mt-4">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={13} className="text-emerald-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        {/* Payment form */}
        <div className="glass-card max-w-lg mx-auto">
          <h3 className="font-semibold mb-4">Dërgoni pagesën</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Payment method */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setMethod('bank_transfer')}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm ${
                  method === 'bank_transfer' ? 'border-amber-500/50 bg-amber-500/5 text-amber-500' : 'border-border hover:bg-accent'
                }`}>
                <Building2 size={16} /> Transfer Bankar
              </button>
              <button type="button" onClick={() => setMethod('cash')}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm ${
                  method === 'cash' ? 'border-amber-500/50 bg-amber-500/5 text-amber-500' : 'border-border hover:bg-accent'
                }`}>
                <Banknote size={16} /> Kesh
              </button>
            </div>

            {method === 'bank_transfer' && (
              <div className="p-4 bg-muted/50 rounded-xl text-sm space-y-1">
                <p className="font-medium">Detajet e llogarisë bankare:</p>
                <p className="text-muted-foreground">Banka: <strong className="text-foreground">ProCredit Bank Kosovo</strong></p>
                <p className="text-muted-foreground">IBAN: <strong className="font-mono text-foreground">XK051234567890123456</strong></p>
                <p className="text-muted-foreground">Përfituesi: <strong className="text-foreground">Fiscalix SHPK</strong></p>
                <p className="text-muted-foreground">Shuma: <strong className="text-amber-500">{price} EUR</strong></p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">
                {method === 'bank_transfer' ? 'Referenca bankare (opsionale)' : 'Shënim (opsionale)'}
              </label>
              <input value={reference} onChange={e => setReference(e.target.value)}
                placeholder={method === 'bank_transfer' ? 'Nr. transaksionit...' : 'Emri i paguesit...'}
                className="finex-input" />
            </div>

            <div className="flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <div>
                <p className="font-semibold">Total: <span className="gold-text text-xl">€{price}</span></p>
                <p className="text-xs text-muted-foreground">Pako {selectedPlan} · {billingCycle === 'yearly' ? '12 muaj' : '1 muaj'}</p>
              </div>
              <button type="submit" disabled={submitting} className="btn-gold flex items-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <>Dërgo <ArrowRight size={15} /></>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
