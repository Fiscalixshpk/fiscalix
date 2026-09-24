// Ngarkon kuponin nga databaza dhe e kthen në ReceiptInput (vetëm server).
import type { SupabaseClient } from '@supabase/supabase-js'
import { isPaymentKind, isTaxRate, type CouponType, type TaxRate } from './constants'
import type { Discount } from './calc'
import type { ReceiptInput, ReceiptLine, ReceiptTotals } from './receipt'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>

export class ReceiptError extends Error {
  constructor(message: string, public readonly status = 404) { super(message); this.name = 'ReceiptError' }
}

const SALE_COLS = 'id, company_id, pos_device_id, coupon_id, coupon_type, reference_no, daily_no, status, issued_at, issued_offline, verification_no, qr_code_data, total_amount, total_no_tax, subtotal, sale_discount, tax_groups, payments, tendered_amount, change_amount, cashier_name, operator_code, cancel_reason, printed_at'
const ITEM_COLS = 'name, unit, quantity, price, original_unit_price, gross_total, item_discount, discount_kind, discount_value, total, tax_rate, sort_order'

/* eslint-disable @typescript-eslint/no-explicit-any */
function toLines(items: any[]): ReceiptLine[] {
  return [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(i => {
    const unitPrice = Number(i.original_unit_price ?? i.price)
    const itemDiscount = Number(i.item_discount ?? 0)
    const gross = i.gross_total != null ? Number(i.gross_total) : Number(i.total) + itemDiscount
    const spec: Discount | null = i.discount_kind === 'percent' || i.discount_kind === 'amount'
      ? { kind: i.discount_kind, value: Number(i.discount_value) } : null
    return {
      name: i.name, unit: i.unit ?? 'cope', quantity: Number(i.quantity), unitPrice,
      grossTotal: gross, itemDiscount, itemDiscountSpec: spec,
      taxRate: (isTaxRate(i.tax_rate) ? i.tax_rate : 'E') as TaxRate,
    }
  })
}

function toTotals(sale: any, items: any[]): ReceiptTotals {
  const lines = toLines(items)
  const sd = sale.sale_discount
  return {
    lines,
    subtotal: Number(sale.subtotal ?? lines.reduce((s, l) => s + l.grossTotal - l.itemDiscount, 0)),
    saleDiscount: sd && (sd.kind === 'percent' || sd.kind === 'amount') ? { kind: sd.kind, value: Number(sd.value), amount: Number(sd.amount) } : null,
    total: Number(sale.total_amount),
    taxGroups: (Array.isArray(sale.tax_groups) ? sale.tax_groups : []).filter((g: any) => isTaxRate(g?.taxRate)),
    totalNoTax: Number(sale.total_no_tax),
    payments: (Array.isArray(sale.payments) ? sale.payments : []).filter((p: any) => isPaymentKind(p?.type)),
    tendered: sale.tendered_amount != null ? Number(sale.tendered_amount) : null,
    change: Number(sale.change_amount ?? 0),
  }
}

export async function loadReceiptInput(db: DB, saleId: string, opts: { companyId: string; forceCopy?: boolean; markPrinted?: boolean }): Promise<ReceiptInput> {
  const { data: sale } = await db.from('sales').select(SALE_COLS).eq('id', saleId).eq('company_id', opts.companyId).maybeSingle()
  if (!sale) throw new ReceiptError('Kuponi nuk u gjet')
  if (sale.status === 'failed') throw new ReceiptError('Kuponi u refuzua nga ATK — nuk mund të printohet si kupon fiskal', 409)
  if (!sale.qr_code_data || !sale.verification_no) throw new ReceiptError('Kuponi s\'është nënshkruar ende', 409)

  const [{ data: items }, { data: company }, { data: device }] = await Promise.all([
    db.from('sale_items').select(ITEM_COLS).eq('sale_id', sale.id),
    db.from('companies').select('name, nui, tax_number, vat_number, vat_number_atk, is_vat_registered, logo_url, address, city, location_city, phone, receipt_footer').eq('id', sale.company_id).single(),
    db.from('pos_devices').select('pos_id, branch_id, environment, device_name, unit_number, unit_name, unit_address, unit_city, unit_phone').eq('id', sale.pos_device_id).maybeSingle(),
  ])
  if (!company) throw new ReceiptError('Kompania nuk u gjet')

  let reference: ReceiptInput['reference']
  let remainingTotal: number | undefined
  if (sale.coupon_type !== 'SALE' && sale.reference_no) {
    const { data: orig } = await db.from('sales').select(SALE_COLS).eq('company_id', sale.company_id).eq('coupon_id', sale.reference_no).eq('coupon_type', 'SALE').maybeSingle()
    if (orig) {
      const { data: origItems } = await db.from('sale_items').select(ITEM_COLS).eq('sale_id', orig.id)
      reference = { ...toTotals(orig, origItems ?? []), dailyNo: Number(orig.daily_no ?? 0), issuedAt: orig.issued_at, couponId: Number(orig.coupon_id) }
      if (sale.coupon_type === 'RETURN') {
        const { data: returns } = await db.from('sales').select('total_amount, issued_at')
          .eq('company_id', sale.company_id).eq('reference_no', sale.reference_no).eq('coupon_type', 'RETURN')
          .neq('status', 'failed').lte('issued_at', sale.issued_at)
        remainingTotal = Number(orig.total_amount) - (returns ?? []).reduce((s, r) => s + Number(r.total_amount), 0)
      }
    }
  }

  const isCopy = opts.forceCopy === true || !!sale.printed_at
  if (opts.markPrinted && !sale.printed_at) {
    await db.from('sales').update({ printed_at: new Date().toISOString() }).eq('id', sale.id).is('printed_at', null)
  }

  const vatRegistered = company.is_vat_registered !== false
  return {
    ...toTotals(sale, items ?? []),
    business: {
      name: company.name,
      nui: String(company.nui || company.tax_number || '').replace(/\D/g, ''),
      vatNumber: company.vat_number_atk || company.vat_number || null,
      vatRegistered,
      logoUrl: company.logo_url || null,
      freeText: company.receipt_footer || null,
    },
    unit: {
      name: device?.unit_name || company.name,
      address: device?.unit_address || company.address || '—',
      city: device?.unit_city || company.location_city || company.city || 'Kosovë',
      phone: device?.unit_phone || company.phone || null,
      // Numri i njësisë = BranchId i regjistrimit te ATK, kur s'është vendosur ndryshe
      number: device?.unit_number || String(device?.branch_id ?? 1),
    },
    posId: Number(device?.pos_id ?? 1),
    environment: device?.environment === 'PROD' ? 'PROD' : 'TEST',
    operator: { name: sale.cashier_name || 'Operator', code: sale.operator_code || null },
    type: sale.coupon_type as CouponType,
    couponId: Number(sale.coupon_id),
    dailyNo: Number(sale.daily_no ?? 0),
    issuedAt: sale.issued_at,
    verificationNo: sale.verification_no,
    qrCode: sale.qr_code_data,
    issuedOffline: sale.issued_offline === true,
    isCopy,
    reference,
    cancelReason: sale.cancel_reason,
    remainingTotal,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
