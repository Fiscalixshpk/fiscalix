import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PayrollClient from './payroll-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Payroll — Fiscalix' }

export default async function PayrollPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!profile?.company_id) redirect('/login')

  const { data: company } = await supabase
    .from('companies').select('*').eq('id', profile.company_id).single()

  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', profile.company_id)
    .eq('is_active', true)
    .order('full_name')

  const now = new Date()
  const { data: payrollRecords } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('company_id', profile.company_id)
    .eq('year', now.getFullYear())
    .order('month', { ascending: false })

  return (
    <PayrollClient
      company={company}
      employees={employees || []}
      payrollRecords={payrollRecords || []}
      companyId={profile.company_id}
    />
  )
}
