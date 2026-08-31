import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createAdminClient()
  const { searchParams } = new URL(req.url)
  const company_id = searchParams.get('company_id')
  const year  = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))

  if (!company_id || !year || !month)
    return NextResponse.json([])

  const { data } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('company_id', company_id)
    .eq('year', year)
    .eq('month', month)

  return NextResponse.json(data || [])
}
