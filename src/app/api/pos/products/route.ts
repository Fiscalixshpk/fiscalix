import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  if (!companyId) return NextResponse.json([])

  const { data } = await supabase
    .from('products')
    .select('name, price')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('name')
    .limit(50)

  return NextResponse.json(data || [])
}
