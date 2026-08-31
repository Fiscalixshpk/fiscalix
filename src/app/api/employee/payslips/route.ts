import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createAdminClient()
  const { searchParams } = new URL(req.url)
  const company_id  = searchParams.get('company_id')
  const employee_id = searchParams.get('employee_id')

  const query = supabase.from('payroll_records').select('*').order('year', { ascending: false }).order('month', { ascending: false })
  if (company_id)  query.eq('company_id', company_id)
  if (employee_id) query.eq('employee_id', employee_id)

  const { data } = await query.limit(24)
  return NextResponse.json(data || [])
}
