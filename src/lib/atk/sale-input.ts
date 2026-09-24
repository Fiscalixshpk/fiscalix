// Normalizimi i shitjes nga klientët (izomorfik: server + arka offline).
import { calculate, CalcError, type CalcInput, type CalcItemInput, type CalcPaymentInput, type CalcResult, type Discount } from './calc'
import { isPaymentKind, isTaxRate, type PaymentKind } from './constants'


/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseDiscount(raw: any, legacyPercent?: unknown): Discount | null {
  if (raw && typeof raw === 'object' && (raw.kind === 'percent' || raw.kind === 'amount')) {
    const value = Number(raw.value)
    return Number.isFinite(value) && value > 0 ? { kind: raw.kind, value } : null
  }
  const p = Number(legacyPercent)
  return Number.isFinite(p) && p > 0 ? { kind: 'percent', value: p } : null
}

export function parseSaleItems(items: any[]): CalcItemInput[] {
  if (!Array.isArray(items) || !items.length) throw new CalcError('Shporta është bosh')
  return items.map((i, idx) => {
    const taxRate = i.taxRate ?? i.tax_rate ?? 'E'
    if (!isTaxRate(taxRate)) throw new CalcError(`Norma e TVSH-së e pavlefshme te artikulli ${idx + 1}`)
    const unitPrice = Math.round(Number(i.customPrice ?? i.price))
    return {
      name: String(i.name ?? ''),
      unit: String(i.unit ?? 'cope'),
      unitPrice,
      quantity: Number(i.quantity),
      taxRate,
      discount: parseDiscount(i.itemDiscount ?? (i.discountType ? { kind: i.discountType, value: i.discountValue } : null), i.discount),
      productId: typeof i.productId === 'string' && /^[0-9a-f-]{36}$/i.test(i.productId) ? i.productId : null,
    }
  })
}

const LEGACY_METHOD: Record<string, PaymentKind> = { cash: 'cash', card: 'card', voucher: 'voucher', insurance: 'other', other: 'other', cheque: 'cheque' }

/** payments[] | splitPayment{cash,card} | paymentMethod (+ tendered) */
export function parsePayments(body: any): CalcPaymentInput[] | { method: PaymentKind; tendered?: number } {
  if (Array.isArray(body.payments) && body.payments.length) {
    return body.payments.map((p: any) => {
      if (!isPaymentKind(p.type)) throw new CalcError(`Mënyrë pagese e panjohur: ${p.type}`)
      return { type: p.type, amount: Math.round(Number(p.amount)) }
    })
  }
  if (body.splitPayment && (body.splitPayment.cash || body.splitPayment.card)) {
    return [
      { type: 'cash' as const, amount: Math.round(Number(body.splitPayment.cash) || 0) },
      { type: 'card' as const, amount: Math.round(Number(body.splitPayment.card) || 0) },
    ]
  }
  const method = LEGACY_METHOD[body.paymentMethod] ?? 'cash'
  const tendered = Number(body.tendered)
  return { method, tendered: Number.isFinite(tendered) && tendered > 0 ? Math.round(tendered) : undefined }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Llogarit; nëse klienti dha vetëm mënyrën e pagesës, shuma = totali (ose tendered për cash) */
export function calculateSale(args: {
  items: CalcItemInput[]; vatRegistered: boolean; saleDiscount: Discount | null
  payments: ReturnType<typeof parsePayments>
}): CalcResult {
  const base: Omit<CalcInput, 'payments'> = { items: args.items, vatRegistered: args.vatRegistered, saleDiscount: args.saleDiscount }
  if (Array.isArray(args.payments)) return calculate({ ...base, payments: args.payments })
  const probe = calculate({ ...base, payments: [{ type: 'cash', amount: Number.MAX_SAFE_INTEGER }] })
  const { method, tendered } = args.payments
  const amount = method === 'cash' && tendered ? tendered : probe.total
  return calculate({ ...base, payments: [{ type: method, amount }] })
}

