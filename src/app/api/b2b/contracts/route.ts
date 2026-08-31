import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { company_id } = body

  const year = new Date().getFullYear()
  const { count } = await supabase.from('b2b_contracts').select('*', { count: 'exact', head: true }).eq('company_id', company_id)
  const contractNumber = `K-${year}-${String((count || 0) + 1).padStart(4, '0')}`

  const { data: contract, error } = await supabase.from('b2b_contracts').insert({
    ...body, contract_number: contractNumber, status: 'draft', currency: 'EUR',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contract })
}
