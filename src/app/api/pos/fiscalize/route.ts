// POST /api/pos/fiscalize — shitje e re (kupon SALE)
//
// Body (të gjitha format e klientëve ekzistues pranohen):
//   companyId, operatorName?, notes?
//   items[]: { productId?, name, price (€0.0001), customPrice?, unit?, quantity, taxRate|tax_rate,
//              discount? (% legacy) | itemDiscount? { kind: 'percent'|'amount', value } }
//   saleDiscount? { kind, value }  |  totalDiscount? (cent, legacy)
//   payments?[] { type, amount (cent) }  |  splitPayment? { cash, card }  |  paymentMethod + tendered?

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  CalcError, FiscalError, calculateSale, issueCoupon, loadFiscalContext, nextCouponId, nextDailyNo,
  parseDiscount, parsePayments, parseSaleItems,
} from '@/lib/atk/service'
import { fiscalDay } from '@/lib/atk/receipt'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'Nuk jeni i autentikuar' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ success: false, error: 'Body i pavlefshëm' }, { status: 400 }) }

  try {
    const { data: me } = await db.from('users').select('company_id, full_name').eq('id', user.id).single()
    const companyId: string = body.companyId || me?.company_id
    if (!companyId || (me?.company_id && me.company_id !== companyId)) {
      return NextResponse.json({ success: false, error: 'Kompani e pavlefshme' }, { status: 403 })
    }

    const ctx = await loadFiscalContext(db, companyId)
    const saleDiscount = parseDiscount(body.saleDiscount)
      ?? (Number(body.totalDiscount) > 0 ? { kind: 'amount' as const, value: Math.round(Number(body.totalDiscount)) } : null)

    // Kategoria ATK e artikujve (CouponItem.Type) merret nga produkti, jo nga klienti
    const saleItems = parseSaleItems(body.items)
    const productIds = [...new Set(saleItems.map(i => i.productId).filter((x): x is string => !!x))]
    if (productIds.length) {
      const { data: prods } = await db.from('pos_products').select('id, atk_category').in('id', productIds).eq('company_id', companyId)
      const cat = new Map((prods ?? []).map(p => [p.id as string, p.atk_category as string | null]))
      for (const i of saleItems) if (i.productId) i.itemType = cat.get(i.productId) ?? null
    }

    const calc = calculateSale({
      items: saleItems,
      vatRegistered: ctx.vatRegistered,
      saleDiscount,
      payments: parsePayments(body),
    })

    const operator = String(body.operatorName || me?.full_name || 'Operator').slice(0, 64)
    const issuedAt = new Date(Date.now() + ctx.device.clockOffsetMs)
    const couponId = await nextCouponId(db, companyId)
    const dailyNo = await nextDailyNo(db, ctx.device.id, fiscalDay(issuedAt))

    // 1. Shitja ruhet PARA dërgimit → asnjë kupon i nënshkruar pa gjurmë
    const { data: sale, error: saleErr } = await db.from('sales').insert({
      company_id: companyId,
      pos_device_id: ctx.device.id,
      cashier_id: user.id,
      coupon_id: couponId,
      daily_no: dailyNo,
      coupon_type: 'SALE',
      reference_no: 0,
      subtotal: calc.subtotal,
      sale_discount: calc.saleDiscount,
      total_amount: calc.total,
      total_tax: calc.totalTax,
      total_no_tax: calc.totalNoTax,
      total_discount: calc.totalDiscount,
      payment_method: calc.payments.length > 1 ? 'split' : (calc.payments[0]?.type ?? 'cash'),
      payments: calc.payments,
      tendered_amount: calc.tendered,
      change_amount: calc.change,
      tax_groups: calc.taxGroups,
      status: 'pending',
      receipt_number: `KF-${issuedAt.getFullYear()}-${couponId}`,
      location_city: ctx.location,
      operator_id: operator,
      cashier_name: operator,
      operator_code: body.operatorCode ? String(body.operatorCode).slice(0, 32) : null,
      notes: body.notes ?? null,
      issued_at: issuedAt.toISOString(),
    }).select('id').single()
    if (saleErr || !sale) throw new FiscalError(`Shitja nuk u ruajt: ${saleErr?.message}`, 500)

    const { error: itemsErr } = await db.from('sale_items').insert(calc.lines.map((l, idx) => ({
      sale_id: sale.id, company_id: companyId, name: l.name, unit: l.unit, quantity: l.quantity,
      price: l.unitPrice, original_unit_price: l.originalUnitPrice, discount: l.discount,
      gross_total: l.grossTotal, item_discount: l.itemDiscount,
      discount_kind: l.itemDiscountSpec?.kind ?? null, discount_value: l.itemDiscountSpec?.value ?? null,
      total: l.total, tax_rate: l.taxRate, item_type: l.itemType, product_id: l.productId, sort_order: idx,
    })))
    if (itemsErr) throw new FiscalError(`Artikujt nuk u ruajtën: ${itemsErr.message}`, 500)

    // 2. Nënshkrim + hash chain + dërgim
    const r = await issueCoupon(db, ctx, { saleId: sale.id, couponId, type: 'SALE', referenceNo: 0, calc, operator,
      time: Math.floor(issuedAt.getTime() / 1000) })

    await db.from('sales').update({
      issued_offline: r.status === 'offline',
      verification_no: r.coupon.verificationNo, qr_code_data: r.coupon.qrCode,
      previous_hash: r.chain.previousHash, hash_chain: r.chain.currentHash, integrity_check: r.chain.integrityCheck,
    }).eq('id', sale.id)

    if (r.status !== 'failed') {
      for (const l of calc.lines) {
        if (l.productId) await db.rpc('decrement_stock', { p_product_id: l.productId, p_quantity: l.quantity })
      }
    }

    return NextResponse.json({
      success: r.status !== 'failed',
      status: r.status,
      saleId: sale.id,
      couponId,
      dailyCouponNo: dailyNo,
      receiptNumber: `KF-${issuedAt.getFullYear()}-${couponId}`,
      receiptUrl: r.status === 'failed' ? null : `/api/pos/receipt/${sale.id}`,
      verificationNo: r.coupon.verificationNo,
      nuikf: r.coupon.verificationNo,
      transactionId: r.transactionId,
      qrCodeData: r.coupon.qrCode,
      error: r.error,
      lines: calc.lines,
      taxGroups: calc.taxGroups,
      payments: calc.payments,
      change: calc.change,
      totals: {
        total: calc.total, tax: calc.totalTax, noTax: calc.totalNoTax, discount: calc.totalDiscount,
        totalEUR: (calc.total / 100).toFixed(2), taxEUR: (calc.totalTax / 100).toFixed(2), noTaxEUR: (calc.totalNoTax / 100).toFixed(2),
      },
    })
  } catch (err) {
    if (err instanceof CalcError) return NextResponse.json({ success: false, error: err.message }, { status: 400 })
    if (err instanceof FiscalError) return NextResponse.json({ success: false, error: err.message }, { status: err.status })
    console.error('[fiscalize]', err)
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Gabim i brendshëm' }, { status: 500 })
  }
}
