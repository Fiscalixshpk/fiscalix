import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { supplier_name, supplier_email, payment_terms, expected_date, notes, items, total_amount, company_id } = body

  // Generate order number
  const year = new Date().getFullYear()
  const { count } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('company_id', company_id)
  const orderNumber = `PO-${year}-${String((count || 0) + 1).padStart(4, '0')}`

  const { data: order, error } = await supabase.from('purchase_orders').insert({
    company_id,
    order_number: orderNumber,
    supplier_name,
    supplier_email: supplier_email || null,
    payment_terms: payment_terms || 'Net 30',
    expected_date: expected_date || null,
    notes: notes || null,
    items,
    total_amount,
    currency: 'EUR',
    status: 'draft',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ order })
}
