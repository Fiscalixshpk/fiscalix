// GET /api/pos/register-stats?date=2026-08-01
// Statistikat per arkë — shitjet, totali, cash/kartë

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ud } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  if (!ud?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const date = new URL(req.url).searchParams.get('date') || new Date().toISOString().split('T')[0]
  const start = `${date}T00:00:00.000Z`
  const end   = `${date}T23:59:59.999Z`

  // Devices
  const { data: devices } = await supabase
    .from('pos_devices')
    .select('id, pos_id, device_name, cashier_name')
    .eq('company_id', ud.company_id)
    .in('status', ['active', 'onboarded'])
    .order('pos_id')

  // Sales per register
  const { data: sales } = await supabase
    .from('sales')
    .select('register_no, total_amount, payment_method, status')
    .eq('company_id', ud.company_id)
    .eq('status', 'fiscalized')
    .gte('issued_at', start)
    .lte('issued_at', end)

  // Aggregate per register
  const stats: Record<number, { count: number; total: number; cash: number; card: number }> = {}

  for (const sale of (sales || [])) {
    const reg = sale.register_no || 1
    if (!stats[reg]) stats[reg] = { count: 0, total: 0, cash: 0, card: 0 }
    stats[reg].count++
    stats[reg].total += sale.total_amount || 0
    if (sale.payment_method === 'cash') stats[reg].cash += sale.total_amount || 0
    else stats[reg].card += sale.total_amount || 0
  }

  const result = (devices || []).map(d => ({
    device_id:    d.id,
    pos_id:       d.pos_id,
    device_name:  d.device_name,
    cashier_name: d.cashier_name,
    count:        stats[d.pos_id]?.count  || 0,
    total:        stats[d.pos_id]?.total  || 0,
    cash:         stats[d.pos_id]?.cash   || 0,
    card:         stats[d.pos_id]?.card   || 0,
  }))

  const grandTotal = result.reduce((s, r) => s + r.total, 0)
  const grandCount = result.reduce((s, r) => s + r.count, 0)

  return NextResponse.json({ registers: result, grandTotal, grandCount, date })
}
