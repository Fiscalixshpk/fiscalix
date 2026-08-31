import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'
import { fiscalize }     from '@/lib/atk/fiscalizer'
import type { FiscalizePayload } from '@/types/pos'

export async function POST(req: Request) {
  try {
  const supabase   = await createClient()
  const isMockEnv  = false // Mock mode i çaktivizuar

  // ── AUTH ─────────────────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── PARSE BODY ───────────────────────────────────────────
  let payload: FiscalizePayload
  try { payload = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const { items, paymentMethod, companyId, posDeviceId, operatorName, notes, registerNo } = payload

  if (!items?.length || !companyId) {
    return NextResponse.json({ error: 'items dhe companyId janë të detyrueshme' }, { status: 400 })
  }

  // ── COMPANY ──────────────────────────────────────────────
  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('id, name, nui, branch_id, location_city, business_type, pos_enabled')
    .eq('id', companyId)
    .single()

  if (companyErr || !company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  if (!company.pos_enabled)   return NextResponse.json({ error: 'POS not enabled'    }, { status: 403 })

  // ── DEVICE ───────────────────────────────────────────────
  // Merr pajisjen me private key — prefero posId 6860
  const { data: device } = await supabase
    .from('pos_devices')
    .select('id, pos_id, branch_id, application_id, private_key_enc, certificate_pem, environment, status, verification_code')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .not('private_key_enc', 'is', null)
    .order('pos_id', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Mock vetëm kur nuk ka pajisje reale me çelës
  const isMockMode = isMockEnv && (!device || !device.private_key_enc)

  if (!isMockMode) {
    if (!company.nui) return NextResponse.json({ error: 'NUI mungon — shto NUI te Cilësimet → Kompania' }, { status: 422 })
    if (!device)      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    if (!['active','onboarded'].includes(device.status)) return NextResponse.json({ error: `Device: ${device.status}` }, { status: 403 })
    if (!device.private_key_enc) return NextResponse.json({ error: 'Device pa çelës ATK' }, { status: 422 })
  }

  const privateKeyPem = isMockMode ? 'MOCK_KEY' : decryptPrivateKey(device!.private_key_enc!)

  // ── COUPON ID ────────────────────────────────────────────
  const { data: couponIdResult } = await supabase.rpc('next_coupon_id', { p_company_id: companyId })
  const couponId: number = couponIdResult ?? Math.floor(Date.now() / 1000)

  // ── ITEMS ─────────────────────────────────────────────────
  const TAX_RATES: Record<string, number> = { A: 0, C: 0, D: 0.08, E: 0.18 }

  const atkItems = items.map((item: {
    productId?: string; name: string; emoji?: string
    price: number; unit: string; quantity: number
    taxRate?: string; tax_rate?: string; total: number; customPrice?: number
  }) => {
    const finalPrice = item.customPrice ?? item.price
    return {
      productId: item.productId ?? '',
      name:      item.name,
      emoji:     item.emoji ?? '📦',
      price:     finalPrice,                                  // €0.0001 units
      unit:      item.unit,
      quantity:  item.quantity,
      taxRate:   item.taxRate ?? item.tax_rate ?? 'E',
      total:     Math.round(finalPrice / 100 * item.quantity), // cents
    }
  })

  let totalCents = 0, taxCents = 0
  for (const item of atkItems) {
    const rate  = TAX_RATES[item.taxRate] ?? 0.18
    // item.total është cents (500 = €5.00) sipas dokumentacionit ATK
    totalCents += item.total
    taxCents   += Math.round(item.total * rate / (1 + rate))
  }
  const totals = { subtotal: totalCents, tax: taxCents, noTax: totalCents - taxCents, discount: 0, total: totalCents }

  // ── FISCALIZE ────────────────────────────────────────────
  const issuedAt = new Date()

  console.log('Device:', { id: device?.id, pos_id: device?.pos_id, app_id: device?.application_id, has_key: !!device?.private_key_enc })

  const result = await fiscalize({
    businessNui:    Number(company.nui?.replace(/\D/g,'')) || 812445890,
    locationCity:   company.location_city ?? 'Kosovë',
    posId:          device?.pos_id         ?? 1,
    branchId:       device?.branch_id      ?? (company.branch_id ?? 1),
    applicationId:  device?.application_id ?? 857345132322,
    privateKeyPem,
    certificatePem: device?.certificate_pem ?? undefined,
    environment:    (device?.environment as 'TEST' | 'PROD') ?? 'TEST',
    couponId,
    couponType:     'SALE',
    referenceNo:    0,
    operatorName:   operatorName ?? 'Operator',
    paymentMethod,
    items:          atkItems,
    totals,
    issuedAt,
    forceMock:      isMockMode && !device,
    verificationNo: (device as any)?.verification_code || undefined,
  })

  // ── SAVE SALE ─────────────────────────────────────────────
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .insert({
      company_id:         companyId,
      pos_device_id:      posDeviceId !== 'mock-device' ? posDeviceId : null,
      cashier_id:         session.user.id,
      coupon_id:          couponId,
      coupon_type:        'SALE',
      reference_no:       0,
      total_amount:       totals.total,
      total_tax:          totals.tax,
      total_no_tax:       totals.noTax,
      total_discount:     totals.discount,
      payment_method:     paymentMethod,
      status:             result.status,
      atk_transaction_id: result.transactionId ? String(result.transactionId) : null,
      qr_code_data:       result.qrCodeData,
      receipt_number:     result.receiptNumber,
      atk_error:          result.error ?? null,
      location_city:      company.location_city,
      operator_id:        operatorName,
      cashier_name:       operatorName,
      notes:              notes ?? null,
      issued_at:          issuedAt.toISOString(),
      fiscalized_at:      result.status === 'fiscalized' ? issuedAt.toISOString() : null,
    })
    .select('id')
    .single()

  if (saleErr || !sale) {
    console.error('Sale insert error:', JSON.stringify(saleErr))
    return NextResponse.json({ error: `Failed to save sale: ${saleErr?.message || 'unknown'}`, code: saleErr?.code }, { status: 500 })
  }

  // ── SAVE ITEMS ────────────────────────────────────────────
  const { error: itemsErr } = await supabase.from('sale_items').insert(
    atkItems.map((item, idx) => ({
      sale_id:    sale.id,
      company_id: companyId,
      name:       item.name,
      price:      item.price,
      unit:       item.unit,
      quantity:   item.quantity,
      total:      item.total,
      tax_rate:   item.taxRate,
      item_type:  'TT',
      product_id: (item.productId && item.productId !== 'service' && item.productId !== 'cancel') ? item.productId : null,
      sort_order: idx,
    }))
  )
  if (itemsErr) console.error('Sale items error:', JSON.stringify(itemsErr))

  // ── STOCK ────────────────────────────────────────────────
  for (const item of atkItems) {
    if (item.productId) {
      await supabase.rpc('decrement_stock', { p_product_id: item.productId, p_quantity: item.quantity })
    }
  }

  // ── OFFLINE QUEUE ─────────────────────────────────────────
  if (result.status === 'offline') {
    const deadline = new Date(issuedAt.getTime() + 48 * 60 * 60 * 1000)
    await supabase.from('pos_offline_queue').insert({
      company_id:    companyId,
      sale_id:       sale.id,
      pos_device_id: posDeviceId !== 'mock-device' ? posDeviceId : null,
      payload_json:  { posCoupon: result.posCoupon, citizenCoupon: result.citizenCoupon, privateKeyPem },
      deadline_at:   deadline.toISOString(),
    })
  }

  return NextResponse.json({
    success:       result.success || result.status === 'offline',
    saleId:        sale.id,
    receiptNumber: result.receiptNumber,
    transactionId: result.transactionId,
    qrCodeData:    result.qrCodeData,
    status:        result.status,
    error:         result.error,
    totals: {
      totalEUR: (totals.total / 100).toFixed(2),
      taxEUR:   (totals.tax   / 100).toFixed(2),
      noTaxEUR: (totals.noTax / 100).toFixed(2),
    },
  })
  } catch (err: any) {
    console.error('Fiscalize error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Gabim i brendshëm' }, { status: 500 })
  }
}

function decryptPrivateKey(encryptedKey: string): string {
  if (encryptedKey.includes('-----BEGIN')) return encryptedKey
  throw new Error('Private key decryption not configured')
}
