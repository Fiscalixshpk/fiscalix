// POST /api/pos/cancel — anulim (CANCEL) ose kthim i plotë/i pjesshëm (RETURN)
//
// Body: { originalSaleId, type: 'CANCEL' | 'RETURN', reason?: string, items?: [{ id: sale_item_id, quantity }] }
//   - reason është i detyrueshëm për CANCEL (Neni 25.11: "arsyeja e anulimit")
//   - CANCEL: anulon të gjithë kuponin; lejohet vetëm nëse s'ka kthime paraprake
//   - RETURN pa items → kthim i plotë i sasisë së mbetur; me items → kthim i pjesshëm
// Çmimet dhe totalet merren GJITHMONË nga databaza (jo nga klienti).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculate, type CalcItemInput, type CalcPaymentInput } from '@/lib/atk/calc'
import { isPaymentKind, isTaxRate } from '@/lib/atk/constants'
import { CalcError, FiscalError, issueCoupon, loadFiscalContext, nextCouponId, nextDailyNo } from '@/lib/atk/service'
import { fiscalDay } from '@/lib/atk/receipt'

export const dynamic = 'force-dynamic'

interface SaleItemRow { id: string; name: string; unit: string; quantity: number; price: number; total: number; tax_rate: string; item_type: string | null; product_id: string | null }

export async function POST(req: NextRequest) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'Nuk jeni i autentikuar' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ success: false, error: 'Body i pavlefshëm' }, { status: 400 }) }
  const type = body.type === 'CANCEL' ? 'CANCEL' : body.type === 'RETURN' ? 'RETURN' : null
  if (!body.originalSaleId || !type) return NextResponse.json({ success: false, error: 'Mungon originalSaleId ose type' }, { status: 400 })
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 120) : ''
  if (type === 'CANCEL' && reason.length < 3) {
    return NextResponse.json({ success: false, error: 'Shëno arsyen e anulimit (Neni 25.11)' }, { status: 400 })
  }

  try {
    const { data: me } = await db.from('users').select('company_id, full_name').eq('id', user.id).single()
    if (!me?.company_id) throw new FiscalError('Kompania nuk u gjet', 403)

    const { data: original } = await db.from('sales')
      .select('id, company_id, coupon_id, coupon_type, status, total_amount, payments, payment_method')
      .eq('id', body.originalSaleId).eq('company_id', me.company_id).single()
    if (!original) throw new FiscalError('Shitja origjinale nuk u gjet', 404)
    if (original.coupon_type !== 'SALE') throw new FiscalError('Vetëm kuponët SALE mund të anulohen ose kthehen')
    if (!['fiscalized', 'offline'].includes(original.status)) throw new FiscalError(`Kuponi është në status "${original.status}" dhe s'mund të ${type === 'CANCEL' ? 'anulohet' : 'kthehet'}`)

    const [{ data: items }, { data: prior }] = await Promise.all([
      db.from('sale_items').select('id, name, unit, quantity, price, total, tax_rate, item_type, product_id').eq('sale_id', original.id).order('sort_order'),
      db.from('sales').select('id, coupon_type, sale_items(source_item_id, quantity)')
        .eq('company_id', me.company_id).eq('reference_no', original.coupon_id).in('coupon_type', ['CANCEL', 'RETURN']).neq('status', 'failed'),
    ])
    if (!items?.length) throw new FiscalError('Kuponi origjinal s\'ka artikuj')

    // Sasitë e kthyera më parë
    const returned = new Map<string, number>()
    for (const s of prior ?? []) {
      if (s.coupon_type === 'CANCEL') throw new FiscalError('Ky kupon është anuluar tashmë')
      for (const it of (s.sale_items ?? []) as { source_item_id: string; quantity: number }[]) {
        returned.set(it.source_item_id, (returned.get(it.source_item_id) ?? 0) + Number(it.quantity))
      }
    }
    if (type === 'CANCEL' && returned.size) throw new FiscalError('Kuponi ka kthime — përdor kthimin për sasinë e mbetur')

    const requested = new Map<string, number>()
    if (type === 'RETURN' && Array.isArray(body.items) && body.items.length) {
      for (const it of body.items) if (it?.id && Number(it.quantity) > 0) requested.set(String(it.id), Number(it.quantity))
    }

    const lines: CalcItemInput[] = []
    for (const it of items as SaleItemRow[]) {
      const qty = Number(it.quantity)
      const left = +(qty - (returned.get(it.id) ?? 0)).toFixed(4)
      const q = requested.size ? (requested.get(it.id) ?? 0) : left
      if (!q) continue
      if (q > left + 1e-9) throw new FiscalError(`"${it.name}": mund të kthehen maksimum ${left} ${it.unit}`)
      if (!isTaxRate(it.tax_rate)) throw new FiscalError(`Norma e pavlefshme te "${it.name}"`)
      lines.push({
        name: it.name, unit: it.unit, quantity: q, taxRate: it.tax_rate, unitPrice: Number(it.price),
        presetTotal: q === qty ? Number(it.total) : Math.round((Number(it.total) * q) / qty),
        productId: it.product_id, sourceItemId: it.id, itemType: it.item_type,
      })
    }
    if (!lines.length) throw new FiscalError('Asgjë për t\'u kthyer')

    const ctx = await loadFiscalContext(db, me.company_id)
    const probe = calculate({ items: lines, vatRegistered: ctx.vatRegistered, payments: [{ type: 'cash', amount: Number.MAX_SAFE_INTEGER }] })
    const calc = calculate({ items: lines, vatRegistered: ctx.vatRegistered, payments: refundPayments(original, probe.total) })

    const issuedAt = new Date(Date.now() + ctx.device.clockOffsetMs)
    const couponId = await nextCouponId(db, me.company_id)
    const dailyNo = await nextDailyNo(db, ctx.device.id, fiscalDay(issuedAt))
    const operator = String(me.full_name || 'Operator').slice(0, 64)

    const { data: sale, error: saleErr } = await db.from('sales').insert({
      company_id: me.company_id, pos_device_id: ctx.device.id, cashier_id: user.id,
      coupon_id: couponId, daily_no: dailyNo, coupon_type: type, reference_no: original.coupon_id,
      cancel_reason: type === 'CANCEL' ? reason : null, subtotal: calc.subtotal,
      total_amount: calc.total, total_tax: calc.totalTax, total_no_tax: calc.totalNoTax, total_discount: 0,
      payment_method: calc.payments.length > 1 ? 'split' : calc.payments[0]?.type ?? 'cash',
      payments: calc.payments, tax_groups: calc.taxGroups, status: 'pending',
      receipt_number: `${type === 'CANCEL' ? 'AN' : 'KT'}-${issuedAt.getFullYear()}-${couponId}`,
      location_city: ctx.location, operator_id: operator, cashier_name: operator, issued_at: issuedAt.toISOString(),
    }).select('id').single()
    if (saleErr || !sale) throw new FiscalError(`Kuponi nuk u ruajt: ${saleErr?.message}`, 500)

    await db.from('sale_items').insert(calc.lines.map((l, idx) => ({
      sale_id: sale.id, company_id: me.company_id, name: l.name, unit: l.unit, quantity: l.quantity,
      price: l.unitPrice, original_unit_price: l.unitPrice, discount: 0, gross_total: l.total, item_discount: 0, total: l.total,
      tax_rate: l.taxRate, item_type: l.itemType, product_id: l.productId, source_item_id: l.sourceItemId, sort_order: idx,
    })))

    const r = await issueCoupon(db, ctx, { saleId: sale.id, couponId, type, referenceNo: Number(original.coupon_id), calc, operator,
      time: Math.floor(issuedAt.getTime() / 1000) })

    await db.from('sales').update({
      issued_offline: r.status === 'offline',
      verification_no: r.coupon.verificationNo, qr_code_data: r.coupon.qrCode,
      previous_hash: r.chain.previousHash, hash_chain: r.chain.currentHash, integrity_check: r.chain.integrityCheck,
    }).eq('id', sale.id)

    if (r.status !== 'failed') {
      if (type === 'CANCEL') await db.from('sales').update({ status: 'cancelled' }).eq('id', original.id)
      for (const l of calc.lines) {
        if (l.productId) await db.rpc('decrement_stock', { p_product_id: l.productId, p_quantity: -l.quantity })
      }
    }

    return NextResponse.json({
      success: r.status !== 'failed', status: r.status, saleId: sale.id, couponId, dailyCouponNo: dailyNo,
      receiptUrl: r.status === 'failed' ? null : `/api/pos/receipt/${sale.id}`,
      referenceNo: Number(original.coupon_id),
      receiptNumber: `${type === 'CANCEL' ? 'AN' : 'KT'}-${issuedAt.getFullYear()}-${couponId}`,
      transactionId: r.transactionId, qrCodeData: r.coupon.qrCode, error: r.error,
      lines: calc.lines, taxGroups: calc.taxGroups, payments: calc.payments,
      totals: { total: calc.total, tax: calc.totalTax, noTax: calc.totalNoTax },
    })
  } catch (err) {
    if (err instanceof CalcError) return NextResponse.json({ success: false, error: err.message }, { status: 400 })
    if (err instanceof FiscalError) return NextResponse.json({ success: false, error: err.message }, { status: err.status })
    console.error('[cancel]', err)
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Gabim' }, { status: 500 })
  }
}

/** Rimbursimi ndjek mënyrat e pagesës së shitjes origjinale, proporcionalisht */
function refundPayments(original: { payments: unknown; payment_method: string; total_amount: number }, total: number): CalcPaymentInput[] {
  const orig = (Array.isArray(original.payments) ? original.payments : [])
    .filter((p): p is CalcPaymentInput => !!p && isPaymentKind((p as CalcPaymentInput).type) && (p as CalcPaymentInput).amount > 0)
  if (!orig.length) return [{ type: isPaymentKind(original.payment_method) ? original.payment_method : 'cash', amount: total }]
  const origTotal = orig.reduce((s, p) => s + p.amount, 0)
  const shares = orig.map(p => ({ type: p.type, amount: Math.floor((p.amount * total) / origTotal) }))
  shares[0].amount += total - shares.reduce((s, p) => s + p.amount, 0)
  return shares
}
