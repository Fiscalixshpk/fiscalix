import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createAdminClient()
  const { searchParams } = new URL(req.url)
  const company_id = searchParams.get('company_id')

  if (!company_id) return NextResponse.json([])

  const { data } = await supabase
    .from('time_entries')
    .select('*')
    .eq('company_id', company_id)
    .order('date', { ascending: false })
    .order('clock_in', { ascending: false })
    .limit(200)

  return NextResponse.json(data || [])
}
