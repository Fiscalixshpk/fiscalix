// POST   — hap porosi për tavolinë
// PUT    — shto item / ndrysho status (paying/closed)
// GET    — merr porosinë e hapur të tavolinës me itemet

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

async function getCompanyId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('users').select('company_id').eq('id', userId).single()
  return data?.company_id as string | null
}

// GET /api/pos/table-orders?tableId=xxx
export async function GET(req: NextRequest) {
  const supabase  = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = await getCompanyId(supabase, user.id)

  const tableId = new URL(req.url).searchParams.get('tableId')
  if (!tableId) return NextResponse.json({ error: 'tableId required' }, { status: 400 })

  const { data: order } = await supabase
    .from('table_orders')
    .select('*, table_order_items(*)')
    .eq('company_id', companyId)
    .eq('table_id', tableId)
    .in('status', ['open', 'paying'])
    .maybeSingle()

  return NextResponse.json({ order: order || null })
}

// POST — hap porosi të re ose kthe ekzistuesen
export async function POST(req: NextRequest) {
  const supabase  = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = await getCompanyId(supabase, user.id)
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const { tableId, cashierName, guests, action, orderId, item, status } = await req.json()

  // Shto item te porosia ekzistuese
  if (action === 'add_item' && orderId && item) {
    // Shiko nëse produkti ekziston tashmë
    const { data: existing } = await supabase
      .from('table_order_items')
      .select('id, quantity, price')
      .eq('order_id', orderId)
      .eq('product_id', item.productId)
      .maybeSingle()

    if (existing) {
      // Rrit sasinë
      const newQty = existing.quantity + (item.quantity || 1)
      await supabase.from('table_order_items').update({
        quantity: newQty,
        total:    existing.price * newQty,
      }).eq('id', existing.id)
    } else {
      // Shto të ri
      const { error } = await supabase.from('table_order_items').insert({
        order_id:   orderId,
        company_id: companyId,
        product_id: item.productId || null,
        name:       item.name,
        price:      item.price,
        unit:       item.unit || 'cope',
        quantity:   item.quantity || 1,
        total:      item.price * (item.quantity || 1),
        tax_rate:   item.taxRate || 'E',
        notes:      item.notes || null,
        status:     'pending',
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  // Ndrysho statusin e itemit
  if (action === 'remove_item' && orderId && item?.id) {
    await supabase.from('table_order_items').delete().eq('id', item.id).eq('order_id', orderId)
    return NextResponse.json({ success: true })
  }

  // Ndrysho statusin e porosisë
  if (action === 'set_status' && orderId && status) {
    await supabase.from('table_orders').update({ status, ...(status === 'closed' ? { closed_at: new Date().toISOString() } : {}) }).eq('id', orderId)
    return NextResponse.json({ success: true })
  }

  // Hap porosi të re
  if (!tableId) return NextResponse.json({ error: 'tableId required' }, { status: 400 })

  // Kontrollojmë nëse ka tashmë porosi të hapur
  const { data: existing } = await supabase
    .from('table_orders')
    .select('id')
    .eq('company_id', companyId)
    .eq('table_id', tableId)
    .in('status', ['open', 'paying'])
    .maybeSingle()

  if (existing) return NextResponse.json({ orderId: existing.id, alreadyOpen: true })

  const { data: newOrder, error } = await supabase.from('table_orders').insert({
    company_id:   companyId,
    table_id:     tableId,
    cashier_name: cashierName || null,
    guests:       guests || 1,
    status:       'open',
    opened_at:    new Date().toISOString(),
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orderId: newOrder.id })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { orderId } = await request.json()
  if (!orderId) return Response.json({ error: 'orderId required' }, { status: 400 })

  // Merr të dhënat para fshirjes
  const { data: order } = await supabase
    .from('table_orders')
    .select('*, table_order_items(*), tables(label)')
    .eq('id', orderId)
    .single()

  // Regjistro te cancelled_orders nëse ka items
  if (order && order.table_order_items?.length > 0) {
    const cid = await getCompanyId(supabase, user?.id || '')
    const totalCents = order.table_order_items.reduce((s: number, i: any) => s + (i.total || 0), 0)
    await supabase.from('cancelled_orders').insert({
      company_id:  cid,
      table_label: (order.tables as any)?.label || order.table_id,
      waiter_name: order.cashier_name || '',
      items:       order.table_order_items,
      total_cents: totalCents,
      cancelled_by: user?.id || '',
    })
  }

  // Fshi items dhe order
  await supabase.from('table_order_items').delete().eq('order_id', orderId)
  await supabase.from('table_orders').delete().eq('id', orderId)

  return Response.json({ success: true })
}
