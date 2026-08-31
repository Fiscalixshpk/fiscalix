import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

async function verifyOwnership(supabase: Awaited<ReturnType<typeof createClient>>, clientId: string, accountantId: string) {
  const { data } = await supabase
    .from('lightweight_clients')
    .select('id')
    .eq('id', clientId)
    .eq('accountant_id', accountantId)
    .maybeSingle()
  return !!data
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await verifyOwnership(supabase, id, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('lightweight_sales_entries')
    .select('*')
    .eq('lightweight_client_id', id)
    .order('entry_date', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data || [] })
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await verifyOwnership(supabase, id, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { entry_date, gross_amount, vat_amount, source_note } = await req.json()
  if (!entry_date || gross_amount === undefined) {
    return NextResponse.json({ error: 'entry_date dhe gross_amount janë të detyrueshme' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('lightweight_sales_entries')
    .insert({
      lightweight_client_id: id,
      entry_date,
      gross_amount: Number(gross_amount),
      vat_amount: Number(vat_amount || 0),
      source_note: source_note || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[POST lightweight-clients/sales]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ entry: data })
}
