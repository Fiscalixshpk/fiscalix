import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboardClient from '@/components/admin/admin-dashboard-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin Panel — Fiscalix' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (userData?.role !== 'admin') redirect('/dashboard')

  const [
    { data: companies },
    { data: subscriptions },
    { data: recentPayments },
    { count: totalUsers },
  ] = await Promise.all([
    supabase.from('companies')
      .select('*, subscriptions(*), users(id, full_name, email, role, is_active, created_at)')
      .order('created_at', { ascending: false }),
    supabase.from('subscriptions')
      .select('*, company:companies(name)')
      .order('created_at', { ascending: false }),
    supabase.from('payments')
      .select('*, company:companies(name)')
      .order('submitted_at', { ascending: false })
      .limit(50),
    supabase.from('users').select('*', { count: 'exact', head: true }),
  ])

  const confirmed = recentPayments?.filter(p => p.status === 'confirmed') || []
  const totalRevenue = confirmed.reduce((s, p) => s + p.amount, 0)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const monthlyRevenue = confirmed
    .filter(p => p.confirmed_at && new Date(p.confirmed_at) >= monthStart)
    .reduce((s, p) => s + p.amount, 0)

  const planDist = subscriptions?.reduce((acc: Record<string, number>, s) => {
    acc[s.plan] = (acc[s.plan] || 0) + 1; return acc
  }, { basic: 0, starter: 0, professional: 0 }) || {}

  return (
    <AdminDashboardClient
      companies={companies || []}
      subscriptions={subscriptions || []}
      recentPayments={recentPayments || []}
      stats={{
        totalCompanies: companies?.length || 0,
        totalUsers: totalUsers || 0,
        totalRevenue,
        monthlyRevenue,
        activeSubscriptions: subscriptions?.filter(s => s.status === 'active').length || 0,
        expiredSubscriptions: subscriptions?.filter(s => s.status === 'expired').length || 0,
        planDistribution: planDist,
        aiScansThisMonth: 0,
        totalAITokens: 0,
      }}
    />
  )
}
