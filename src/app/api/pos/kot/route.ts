import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

async function getCID(s: Awaited<ReturnType<typeof createClient>>, uid: string) {
  const { data } = await s.from('users').select('company_id').eq('id', uid).single()
  return data?.company_id as string | null
}

// GET — KOT tickets aktive (për kitchen display ose reprint)
export async function GET(req: NextRequest) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cid = await getCID(s, user.id)
  const { data } = await s.from('kot_tickets').select('*').eq('company_id', cid)
    .in('status', ['pending','printed']).order('printed_at', { ascending: false }).limit(20)
  return NextResponse.json({ tickets: data || [] })
}

// POST — krijo KOT ticket të ri
export async function POST(req: NextRequest) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cid = await getCID(s, user.id)
  if (!cid) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const body = await req.json()
  const { orderId, tableLabel, waiterName, items } = body
  if (!orderId || !items?.length) return NextResponse.json({ error: 'orderId dhe items required' }, { status: 400 })

  const { data, error } = await s.from('kot_tickets').insert({
    company_id:  cid,
    order_id:    orderId,
    table_label: tableLabel,
    waiter_name: waiterName || null,
    items:       items,
    status:      'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ticket: data })
}

// PUT — ndrysho status (printed / done)
export async function PUT(req: NextRequest) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cid = await getCID(s, user.id)
  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'id dhe status required' }, { status: 400 })
  await s.from('kot_tickets').update({ status }).eq('id', id).eq('company_id', cid)
  return NextResponse.json({ success: true })
}
