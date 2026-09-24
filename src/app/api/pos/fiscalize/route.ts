// POST /api/pos/fiscalize — shitje e re (kupon SALE)
//
// Body (të gjitha format e klientëve ekzistues pranohen):
//   companyId, operatorName?, operatorCode?, notes?
//   items[]: { productId?, name, price (€0.0001), customPrice?, unit?, quantity, taxRate|tax_rate,
//              discount? (% legacy) | itemDiscount? { kind: 'percent'|'amount', value } }
//   saleDiscount? { kind, value }  |  totalDiscount? (cent, legacy)
//   payments?[] { type, amount (cent) }  |  splitPayment? { cash, card }  |  paymentMethod + tendered?
//   couponId?, dailyNo?   → arka me bllok numrash (market, gati për offline). Pa to: numëruesi i serverit.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  CalcError, FiscalError, applyItemCategories, assertCouponInBlock, calculateSale, issueCoupon,
  loadFiscalContext, nextCouponId, nextDailyNo, parseDiscount, parsePayments, parseSaleItems,
} from '@/lib/atk/service'
import { fiscalDay } from '@/lib/atk/receipt'
import { finalizeSale, insertSale, saleResponse } from '@/lib/atk/sale-store'

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

    const saleItems = parseSaleItems(body.items)
    await applyItemCategories(db, companyId, saleItems)
    const calc = calculateSale({ items: saleItems, vatRegistered: ctx.vatRegistered, saleDiscount, payments: parsePayments(body) })

    const operator = String(body.operatorName || me?.full_name || 'Operator').slice(0, 64)
    const issuedAt = new Date(Date.now() + ctx.device.clockOffsetMs)
    const day = fiscalDay(issuedAt)

    let couponId: number
    let dailyNo: number
    if (Number.isSafeInteger(body.couponId) && body.couponId > 0) {
      couponId = body.couponId
      await assertCouponInBlock(db, ctx.device.id, couponId)
      const { data } = await db.rpc('atk_set_daily_no', { p_device_id: ctx.device.id, p_day: day, p_value: Math.max(1, Number(body.dailyNo) || 1) })
      dailyNo = Number(data) || Number(body.dailyNo) || 1
    } else {
      couponId = await nextCouponId(db, companyId)
      dailyNo = await nextDailyNo(db, ctx.device.id, day)
    }

    // 1. Shitja ruhet PARA dërgimit → asnjë kupon i nënshkruar pa gjurmë
    const saleId = await insertSale(db, ctx, {
      companyId, cashierId: user.id, couponId, dailyNo, calc, operator,
      operatorCode: body.operatorCode ? String(body.operatorCode).slice(0, 32) : null,
      notes: body.notes ?? null, issuedAt, issuedOffline: false,
    })

    // 2. Nënshkrim + hash chain + dërgim
    const r = await issueCoupon(db, ctx, { saleId, couponId, type: 'SALE', referenceNo: 0, calc, operator, time: Math.floor(issuedAt.getTime() / 1000) })
    await finalizeSale(db, saleId, calc, r, false)

    return NextResponse.json(saleResponse(saleId, couponId, dailyNo, issuedAt, calc, r))
  } catch (err) {
    if (err instanceof CalcError) return NextResponse.json({ success: false, error: err.message }, { status: 400 })
    if (err instanceof FiscalError) return NextResponse.json({ success: false, error: err.message }, { status: err.status })
    console.error('[fiscalize]', err)
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Gabim i brendshëm' }, { status: 500 })
  }
}
