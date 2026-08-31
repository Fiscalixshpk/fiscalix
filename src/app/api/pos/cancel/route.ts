// POST /api/pos/cancel
// Krijon kupon CANCEL ose RETURN me referencë te originali

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { fiscalize }                 from '@/lib/atk/fiscalizer'

export async function POST(req: NextRequest) {
  try {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { originalSaleId, originalCouponId, type, items } = await req.json()
  if (!originalSaleId || !type) return NextResponse.json({ error: 'Mungojnë të dhënat' }, { status: 400 })

  const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const { data: company } = await supabase
    .from('companies').select('nui, location_city').eq('id', userData.company_id).single()

  const { data: device } = await supabase
    .from('pos_devices').select('*').eq('company_id', userData.company_id)
    .in('status', ['active','onboarded']).order('pos_id').limit(1).single()

  if (!device) return NextResponse.json({ error: 'Pa pajisje POS' }, { status: 404 })

  if (!device.private_key_enc) return NextResponse.json({ error: 'Private key mungon' }, { status: 422 })
  const privateKeyPem = device.private_key_enc

  // Coupon ID i ri
  const { data: nextId } = await supabase.rpc('next_coupon_id', { p_company_id: userData.company_id })
  const couponId = nextId ?? Date.now()

  // Merr items gjithmonë nga databaza
  const { data: dbItems } = await supabase
    .from('sale_items')
    .select('*')
    .eq('sale_id', originalSaleId)
  const saleItems = (dbItems && dbItems.length > 0) ? dbItems : (items || [])

  // Totals nga items origjinal
  const TAX: Record<string,number> = { A:0, C:0, D:0.08, E:0.18 }
  const totalItems = (saleItems || []).map((item: { name: string; price: number; unit: string; quantity: number; tax_rate: string; total: number }) => ({
    ...item,
    productId: 'cancel',
    emoji: '↩',
    taxRate: item.tax_rate,
  }))

  let totalCents = 0, taxCents = 0
  for (const item of totalItems) {
    const rate = TAX[item.taxRate ?? item.tax_rate] ?? 0.18
    totalCents += item.total
    taxCents   += Math.round(item.total * rate / (1 + rate))
  }

  const issuedAt = new Date()
  const result   = await fiscalize({
    businessNui:   Number(company?.nui?.replace(/\D/g,'')) || 812445890,
    locationCity:  company?.location_city ?? 'Kosovë',
    posId:         device.pos_id,
    branchId:      device.branch_id ?? 1,
    applicationId: device.application_id ?? 0,
    privateKeyPem,
    environment:   device.environment as 'TEST' | 'PROD',
    couponId,
    couponType:    type,
    referenceNo:   originalCouponId,
    operatorName:  'Operator',
    paymentMethod: 'cash',
    items:         totalItems,
    totals: { subtotal: totalCents, tax: taxCents, noTax: totalCents - taxCents, discount: 0, total: totalCents },
    issuedAt,
  })

  // Save cancel/return sale
  const { data: sale } = await supabase.from('sales').insert({
    company_id:         userData.company_id,
    pos_device_id:      device.id,
    cashier_id:         user.id,
    coupon_id:          couponId,
    coupon_type:        type,
    reference_no:       originalCouponId,
    total_amount:       totalCents,
    total_tax:          taxCents,
    total_no_tax:       totalCents - taxCents,
    total_discount:     0,
    payment_method:     'cash',
    status:             result.status,
    atk_transaction_id: result.transactionId,
    qr_code_data:       result.qrCodeData,
    receipt_number:     result.receiptNumber,
    issued_at:          issuedAt.toISOString(),
  }).select('id').single()

  return NextResponse.json({
    success:       result.success || result.status === 'offline',
    saleId:        sale?.id,
    receiptNumber: result.receiptNumber,
    transactionId: result.transactionId,
    status:        result.status,
  })
  } catch(err:any) {
    console.error('Cancel error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Gabim' }, { status: 500 })
  }
}
