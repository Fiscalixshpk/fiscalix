import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getCompanyId(supabase: any, userId: string) {
  const { data } = await supabase.from('users').select('company_id').eq('id', userId).single()
  return data?.company_id as string | null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const companyId = await getCompanyId(supabase, user.id)
    if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 403 })

    const { data: tables } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('company_id', companyId)
      .order('sort_order')

    const { data: orders } = await supabase
      .from('table_orders')
      .select('id, table_id, status, guests, opened_at, cashier_name, waiter_id')
      .eq('company_id', companyId)
      .in('status', ['open', 'paying'])

    const orderIds = (orders || []).map((o: any) => o.id)
    let items: any[] = []
    if (orderIds.length > 0) {
      const { data } = await supabase
        .from('table_order_items')
        .select('order_id, total')
        .in('order_id', orderIds)
      items = data || []
    }

    return NextResponse.json({ tables: tables || [], orders: orders || [], items })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const companyId = await getCompanyId(supabase, user.id)
    if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 403 })

    const body = await req.json()

    const { data: existing } = await supabase
      .from('restaurant_tables')
      .select('table_number')
      .eq('company_id', companyId)
      .order('table_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextNum = (existing?.table_number ?? 0) + 1

    // Grid position: 5 kolona, 140px hapësirë
    const col = (nextNum - 1) % 5
    const row = Math.floor((nextNum - 1) / 5)
    const px = body.pos_x ?? (80 + col * 150)
    const py = body.pos_y ?? (80 + row * 140)

    const { data, error } = await supabase.from('restaurant_tables').insert({
      company_id:   companyId,
      table_number: nextNum,
      label:        body.label   || `T${nextNum}`,
      seats:        body.seats   || 4,
      pos_x:        px,
      pos_y:        py,
      shape:        body.shape   || 'rect',
      section:      body.section || 'Salla',
      sort_order:   nextNum,
      is_active:    true,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ table: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const companyId = await getCompanyId(supabase, user.id)

    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabase.from('restaurant_tables')
      .update(updates).eq('id', id).eq('company_id', companyId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const qid = url.searchParams.get('id')
    let id = qid
    if (!id) {
      const body = await req.json()
      id = body.tableId || body.id
    }
    if (!id) return NextResponse.json({ error: 'tableId required' }, { status: 400 })

    const { data: orders } = await supabase.from('table_orders').select('id').eq('table_id', id)
    for (const o of orders || []) {
      await supabase.from('table_order_items').delete().eq('order_id', o.id)
    }
    await supabase.from('table_orders').delete().eq('table_id', id)
    const { error } = await supabase.from('restaurant_tables').delete().eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
// patch applied above
