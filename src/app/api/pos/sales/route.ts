// src/app/api/pos/sales/route.ts
// GET — historia e shitjeve POS
// Kthehet si libri i shitjeve fiskal

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!userData) return NextResponse.json({ error: 'No user' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('company_id') || userData.company_id
  const dateFrom  = searchParams.get('from')
  const dateTo    = searchParams.get('to')
  const limit     = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const status    = searchParams.get('status') // fiscalized|offline|all

  // Kontabilisti mund të shohë klientët e vet
  if (userData.role === 'accountant' && companyId !== userData.company_id) {
    const { data: clientRel } = await supabase
      .from('accountant_clients')
      .select('id')
      .eq('accountant_id', user.id)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle()

    if (!clientRel) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  let query = supabase
    .from('sales')
    .select(`
      id, coupon_id, coupon_type, receipt_number, atk_transaction_id,
      total_amount, total_tax, total_no_tax, payment_method,
      status, operator_id, issued_at, fiscalized_at,
      sale_items (id, name, price, unit, quantity, total, tax_rate)
    `)
    .eq('company_id', companyId)
    .order('issued_at', { ascending: false })
    .limit(limit)

  if (dateFrom) query = query.gte('issued_at', dateFrom)
  if (dateTo)   query = query.lte('issued_at', dateTo)
  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Summary
  const sales     = data || []
  const totalEUR  = sales.reduce((s, r) => s + r.total_amount / 100, 0)
  const taxEUR    = sales.reduce((s, r) => s + r.total_tax   / 100, 0)
  const noTaxEUR  = sales.reduce((s, r) => s + r.total_no_tax / 100, 0)

  return NextResponse.json({
    sales,
    summary: {
      count:    sales.length,
      totalEUR: parseFloat(totalEUR.toFixed(2)),
      taxEUR:   parseFloat(taxEUR.toFixed(2)),
      noTaxEUR: parseFloat(noTaxEUR.toFixed(2)),
    },
  })
}
