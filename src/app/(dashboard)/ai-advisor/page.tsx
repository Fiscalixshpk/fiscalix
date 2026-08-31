import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AIAdvisorClient from '@/components/ai-advisor/ai-advisor-client'

export const metadata: Metadata = { title: 'AI Kontabilist — Fiscalix' }

export default async function AIAdvisorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('company_id, full_name').eq('id', user.id).single()

  const { data: sub } = await supabase
    .from('subscriptions').select('plan').eq('company_id', profile?.company_id).maybeSingle()

  const plan = sub?.plan || 'basic'
  const hasAccess = ['advanced', 'enterprise'].includes(plan)

  if (!hasAccess) {
    return (
      <div className="page-enter flex items-center justify-center min-h-[60vh]">
        <div style={{ maxWidth: 480, textAlign: 'center', padding: '48px 32px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>AI Kontabilist</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>Disponueshëm vetëm për planet <strong style={{ color: 'var(--text-2)' }}>Advanced</strong> dhe Enterprise.</p>
          <a href="/settings" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#5A1FD6,#9B5CF8)', color: 'white', padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14, fontFamily: 'Poppins,sans-serif', textDecoration: 'none' }}>Upgrade →</a>
        </div>
      </div>
    )
  }

  const now = new Date()
  const [invRes, expRes, compRes, recRes] = await Promise.all([
    supabase.from('invoices').select('*').eq('company_id', profile?.company_id || '').order('issue_date', { ascending: false }).limit(500),
    supabase.from('expenses').select('*, expense_categories(name_sq,name)').eq('company_id', profile?.company_id || '').order('expense_date', { ascending: false }).limit(500),
    supabase.from('companies').select('*').eq('id', profile?.company_id || '').single(),
    supabase.from('recurring_invoices').select('*').eq('company_id', profile?.company_id || '').eq('status', 'active'),
  ])

  return (
    <AIAdvisorClient
      invoices={invRes.data || []}
      expenses={expRes.data || []}
      company={compRes.data}
      recurring={recRes.data || []}
      userName={profile?.full_name || 'User'}
    />
  )
}
