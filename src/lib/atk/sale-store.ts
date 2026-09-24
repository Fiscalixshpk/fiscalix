// Ruajtja e shitjes në databazë — e përbashkët për online (/fiscalize) dhe offline (/offline-sync).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CalcResult } from './calc'
import { FiscalError, type FiscalContext, type IssueResult } from './service'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>

export interface NewSale {
  companyId: string
  cashierId: string
  couponId: number
  dailyNo: number
  calc: CalcResult
  operator: string
  operatorCode?: string | null
  notes?: string | null
  issuedAt: Date
  issuedOffline: boolean
}

export const receiptNumber = (issuedAt: Date, couponId: number) => `KF-${issuedAt.getFullYear()}-${couponId}`

export async function insertSale(db: DB, ctx: FiscalContext, s: NewSale): Promise<string> {
  const { data: sale, error } = await db.from('sales').insert({
    company_id: s.companyId,
    pos_device_id: ctx.device.id,
    cashier_id: s.cashierId,
    coupon_id: s.couponId,
    daily_no: s.dailyNo,
    coupon_type: 'SALE',
    reference_no: 0,
    subtotal: s.calc.subtotal,
    sale_discount: s.calc.saleDiscount,
    total_amount: s.calc.total,
    total_tax: s.calc.totalTax,
    total_no_tax: s.calc.totalNoTax,
    total_discount: s.calc.totalDiscount,
    payment_method: s.calc.payments.length > 1 ? 'split' : (s.calc.payments[0]?.type ?? 'cash'),
    payments: s.calc.payments,
    tendered_amount: s.calc.tendered,
    change_amount: s.calc.change,
    tax_groups: s.calc.taxGroups,
    status: 'pending',
    issued_offline: s.issuedOffline,
    receipt_number: receiptNumber(s.issuedAt, s.couponId),
    location_city: ctx.location,
    operator_id: s.operator,
    cashier_name: s.operator,
    operator_code: s.operatorCode ?? null,
    notes: s.notes ?? null,
    issued_at: s.issuedAt.toISOString(),
  }).select('id').single()
  if (error || !sale) throw new FiscalError(`Shitja nuk u ruajt: ${error?.message}`, error?.code === '23505' ? 409 : 500)

  const { error: itemsErr } = await db.from('sale_items').insert(s.calc.lines.map((l, idx) => ({
    sale_id: sale.id, company_id: s.companyId, name: l.name, unit: l.unit, quantity: l.quantity,
    price: l.unitPrice, original_unit_price: l.originalUnitPrice, discount: l.discount,
    gross_total: l.grossTotal, item_discount: l.itemDiscount,
    discount_kind: l.itemDiscountSpec?.kind ?? null, discount_value: l.itemDiscountSpec?.value ?? null,
    total: l.total, tax_rate: l.taxRate, item_type: l.itemType, product_id: l.productId, sort_order: idx,
  })))
  if (itemsErr) throw new FiscalError(`Artikujt nuk u ruajtën: ${itemsErr.message}`, 500)
  return sale.id as string
}

export async function finalizeSale(db: DB, saleId: string, calc: CalcResult, r: IssueResult, issuedOffline: boolean) {
  await db.from('sales').update({
    issued_offline: issuedOffline || r.status === 'offline',
    verification_no: r.coupon.verificationNo, qr_code_data: r.coupon.qrCode,
    previous_hash: r.chain.previousHash, hash_chain: r.chain.currentHash, integrity_check: r.chain.integrityCheck,
  }).eq('id', saleId)

  if (r.status !== 'failed') {
    for (const l of calc.lines) {
      if (l.productId) await db.rpc('decrement_stock', { p_product_id: l.productId, p_quantity: l.quantity })
    }
  }
}

export function saleResponse(saleId: string, couponId: number, dailyNo: number, issuedAt: Date, calc: CalcResult, r: IssueResult) {
  return {
    success: r.status !== 'failed',
    status: r.status,
    saleId,
    couponId,
    dailyCouponNo: dailyNo,
    receiptNumber: receiptNumber(issuedAt, couponId),
    receiptUrl: r.status === 'failed' ? null : `/api/pos/receipt/${saleId}`,
    verificationNo: r.coupon.verificationNo,
    nuikf: r.coupon.verificationNo,
    transactionId: r.transactionId,
    qrCodeData: r.coupon.qrCode,
    qrCode: r.coupon.qrCode,
    error: r.error,
    lines: calc.lines,
    taxGroups: calc.taxGroups,
    payments: calc.payments,
    change: calc.change,
    totals: {
      total: calc.total, tax: calc.totalTax, noTax: calc.totalNoTax, discount: calc.totalDiscount,
      totalEUR: (calc.total / 100).toFixed(2), taxEUR: (calc.totalTax / 100).toFixed(2), noTaxEUR: (calc.totalNoTax / 100).toFixed(2),
    },
  }
}
