// GET /api/accountant/pos-sales?companyId=xxx&month=2026-08&dateFrom=2026-08-01&dateTo=2026-08-31
// Kthen kuponët fiskalë të klientit — vetëm nëse kontabilisti ka akses

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const month     = searchParams.get('month')
  const dateFrom  = searchParams.get('dateFrom')
  const dateTo    = searchParams.get('dateTo')

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })

  // Verifiko që kontabilisti ka akses te ky klient
  const { data: access } = await supabase
    .from('accountant_clients')
    .select('id')
    .eq('accountant_id', user.id)
    .eq('company_id', companyId)
    .maybeSingle()

  if (!access) return NextResponse.json({ error: 'Nuk ka akses' }, { status: 403 })

  // Ndërto range datash — dateFrom/dateTo ka prioritet mbi month
  let startDate: string, endDate: string
  if (dateFrom || dateTo) {
    startDate = dateFrom ? new Date(dateFrom + 'T00:00:00').toISOString() : new Date('2020-01-01').toISOString()
    endDate   = dateTo   ? new Date(dateTo   + 'T23:59:59').toISOString() : new Date('2099-12-31').toISOString()
  } else if (month) {
    const [y, m] = month.split('-').map(Number)
    startDate = new Date(y, m - 1, 1).toISOString()
    endDate   = new Date(y, m, 0, 23, 59, 59).toISOString()
  } else {
    const now = new Date()
    startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    endDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  }

  const { data: sales, error } = await supabase
    .from('sales')
    .select(`
      id, coupon_id, coupon_type, receipt_number,
      atk_transaction_id, total_amount, total_tax, total_no_tax,
      payment_method, status, issued_at,
      sale_items(name, price, quantity, total, tax_rate, unit)
    `)
    .eq('company_id', companyId)
    .gte('issued_at', startDate)
    .lte('issued_at', endDate)
    .order('issued_at', { ascending: false })
    .limit(1000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const fiscalized  = (sales || []).filter(s => s.status === 'fiscalized')
  const totalAmount = fiscalized.reduce((s, r) => s + (r.total_amount || 0), 0)
  const totalTax    = fiscalized.reduce((s, r) => s + (r.total_tax    || 0), 0)

  return NextResponse.json({
    sales: sales || [],
    stats: {
      total:       fiscalized.length,
      totalAmount,
      totalTax,
      offline:     (sales || []).filter(s => s.status === 'offline').length,
      failed:      (sales || []).filter(s => s.status === 'failed').length,
    },
  })
}
