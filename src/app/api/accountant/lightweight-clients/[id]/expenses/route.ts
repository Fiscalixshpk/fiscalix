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
    .from('lightweight_expenses')
    .select('*')
    .eq('lightweight_client_id', id)
    .order('expense_date', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expenses: data || [] })
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await verifyOwnership(supabase, id, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { vendor_name, amount, category, expense_date, notes } = await req.json()
  if (!amount || !expense_date) {
    return NextResponse.json({ error: 'amount dhe expense_date janë të detyrueshme' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('lightweight_expenses')
    .insert({
      lightweight_client_id: id,
      vendor_name: vendor_name || null,
      amount: Number(amount),
      category: category || 'Tjetër',
      expense_date,
      notes: notes || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[POST lightweight-clients/expenses]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ expense: data })
}
