import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const companyId = req.nextUrl.searchParams.get('company_id') || profile?.company_id
  const { data } = await supabase.from('quotes').select('*, items:quote_items(*)').eq('company_id', companyId!).order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const body = await req.json()
  const companyId = body.company_id || profile?.company_id

  // Auto-generate quote number
  const { count } = await supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('company_id', companyId!)
  const quoteNumber = `OFF-${String((count || 0) + 1).padStart(4, '0')}`

  const { data: quote, error } = await supabase.from('quotes').insert({
    company_id: companyId, quote_number: quoteNumber,
    client_name: body.client_name, client_email: body.client_email,
    client_address: body.client_address, issue_date: body.issue_date || new Date().toISOString().split('T')[0],
    valid_until: body.valid_until, status: 'draft',
    subtotal: body.subtotal || 0, vat_rate: body.vat_rate || 18,
    vat_amount: body.vat_amount || 0, total_amount: body.total_amount || 0,
    notes: body.notes, terms: body.terms, created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insert items
  if (body.items && body.items.length > 0) {
    await supabase.from('quote_items').insert(
      body.items.map((item: { description: string; quantity: number; unit_price: number; total: number }, i: number) => ({
        quote_id: quote.id, description: item.description,
        quantity: item.quantity, unit_price: item.unit_price, total: item.total, sort_order: i
      }))
    )
  }

  return NextResponse.json(quote)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...body } = await req.json()
  const { data, error } = await supabase.from('quotes').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await supabase.from('quote_items').delete().eq('quote_id', id)
  await supabase.from('quotes').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
