// ============================================================
// FISCALIX POS — TypeScript Types
// /types/pos.ts  (shto këtë fajll në projektin Next.js)
// Matches SQL schema 1:1
// ============================================================


// ── DATABASE TYPES (Supabase rows) ──────────────────────────

export type BusinessType =
  | 'market' | 'restaurant' | 'salon' | 'medical'
  | 'construction' | 'legal' | 'transport' | 'education'
  | 'agency' | 'service' | 'hotel' | 'pharmacy' | 'bakery'

export type TaxRate = 'A' | 'C' | 'D' | 'E'
// A = 0% exempt | C = 0% | D = 8% | E = 18%

export type CouponType = 'SALE' | 'CANCEL' | 'RETURN'

export type SaleStatus = 'pending' | 'fiscalized' | 'offline' | 'failed' | 'cancelled'

export type PaymentMethod = 'cash' | 'card' | 'split' | 'insurance' | 'voucher' | 'other'

export type DeviceEnvironment = 'TEST' | 'PROD'

export type DeviceStatus = 'pending' | 'onboarded' | 'active' | 'suspended'


// ── ROW TYPES ───────────────────────────────────────────────

export interface PosDevice {
  id:               string
  company_id:       string
  pos_id:           number
  branch_id:        number
  application_id:   number | null
  device_name:      string
  cashier_name:     string | null
  private_key_enc:  string | null   // never expose to client
  certificate_pem:  string | null
  environment:      DeviceEnvironment
  status:           DeviceStatus
  last_sync_at:     string | null
  created_at:       string
  updated_at:       string
}

export interface PosProduct {
  id:         string
  company_id: string
  name:       string
  price:      number   // €0.0001 units: €1.50 = 15000
  category:   string | null
  emoji:      string
  tax_rate:   TaxRate
  unit:       string
  stock:      number | null  // null = unlimited
  barcode:    string | null
  is_active:  boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Sale {
  id:                 string
  company_id:         string
  pos_device_id:      string | null
  cashier_id:         string | null
  coupon_id:          number
  coupon_type:        CouponType
  reference_no:       number         // 0 = normal sale
  total_amount:       number         // CENT: €14.00 = 1400
  total_tax:          number
  total_no_tax:       number
  total_discount:     number
  payment_method:     PaymentMethod
  status:             SaleStatus
  atk_transaction_id: number | null
  qr_code_data:       string | null
  receipt_number:     string | null
  atk_error:          string | null
  source:             string
  location_city:      string | null
  operator_id:        string | null
  notes:              string | null
  issued_at:          string
  fiscalized_at:      string | null
  created_at:         string
}

export interface SaleItem {
  id:         string
  sale_id:    string
  company_id: string
  name:       string
  price:      number   // €0.0001: €1.50 = 15000
  unit:       string
  quantity:   number
  total:      number   // €0.0001: qty × price
  tax_rate:   TaxRate
  item_type:  string
  product_id: string | null
  sort_order: number
}

export interface PosOfflineQueue {
  id:             string
  company_id:     string
  sale_id:        string
  pos_device_id:  string | null
  payload_json:   FiscalizePayload
  attempts:       number
  last_error:     string | null
  deadline_at:    string
  synced_at:      string | null
  created_at:     string
}


// ── CART TYPES (UI state, jo DB) ────────────────────────────

export interface CartItem {
  productId:  string
  name:       string
  emoji:      string
  price:      number    // €0.0001
  unit:       string
  quantity:   number
  taxRate:    TaxRate
  total:      number    // price × quantity
}

export interface CartTotals {
  subtotal:     number   // cent
  tax:          number   // cent
  noTax:        number   // cent
  discount:     number   // cent
  total:        number   // cent
}


// ── ATK API TYPES (Protobuf-compatible) ─────────────────────

export interface ATKTaxGroup {
  taxRate:      TaxRate
  totalForTax:  number   // €0.0001 — total i artikujve për këtë normë
  totalTax:     number   // €0.0001 — TVSH-ja e llogaritur
}

export interface ATKCitizenCoupon {
  businessId:  number    // NUI i biznesit (numër)
  posId:       number
  branchId:    number
  couponId:    number
  type:        1 | 2 | 3  // SALE=1, CANCEL=2, RETURN=3
  time:        number    // Unix timestamp
  total:       number    // CENT: €14.00 = 1400
  taxGroups:   ATKTaxGroup[]
  totalTax:    number    // CENT
  totalNoTax:  number    // CENT
}

export interface ATKCouponItem {
  name:     string
  price:    number    // €0.0001
  unit:     string
  quantity: number
  total:    number    // €0.0001
  taxRate:  TaxRate
  type:     string    // 'TT'
}

export interface ATKPayment {
  type:    1 | 2 | 3 | 4 | 5 | 6
  // Cash=1 | CreditCard=2 | Voucher=3 | Cheque=4 | Crypto=5 | Other=6
  amount:  number    // CENT
}

export interface ATKPosCoupon {
  businessId:     number
  couponId:       number
  branchId:       number
  location:       string
  operatorId:     string
  posId:          number
  applicationId:  number
  referenceNo:    number    // 0 = SALE
  verificationNo: string    // max 16 chars
  type:           1 | 2 | 3
  time:           number    // Unix timestamp
  items:          ATKCouponItem[]
  payments:       ATKPayment[]
  total:          number    // CENT
  taxGroups:      ATKTaxGroup[]
  totalTax:       number    // CENT
  totalNoTax:     number    // CENT
  totalDiscount:  number    // CENT
}


// ── API REQUEST/RESPONSE ─────────────────────────────────────

export interface FiscalizePayload {
  items:         CartItem[]
  paymentMethod: PaymentMethod
  companyId:     string
  posDeviceId:   string
  operatorName:  string
  couponId:      number
  notes?:        string
  registerNo?:   number
  tableId?:      string
  orderId?:      string
  appointmentId?: string
}

export interface FiscalizeResponse {
  success:        boolean
  saleId:         string
  receiptNumber:  string
  transactionId:  number | null   // null = offline, pending
  qrCodeData:     string
  status:         SaleStatus
  error?:         string
}

export interface ATKFiscalizeResponse {
  transaction_id: number
  message:        string
}

export interface ATKErrorResponse {
  error: string
}


// ── PRICE CONVERSION UTILITIES ──────────────────────────────
// ATK ka dy sisteme:
//   Item price/total: €0.0001 (4 decimale) → €1.50 = 15000
//   Coupon total:     €0.01   (cent)        → €1.50 = 150

export const toATKItemPrice  = (eur: number): number => Math.round(eur * 10000)
// €1.50 → 15000

export const toATKCentTotal  = (eur: number): number => Math.round(eur * 100)
// €1.50 → 150

export const fromATKItemPrice = (atk: number): number => atk / 10000
// 15000 → €1.50

export const fromATKCentTotal = (atk: number): number => atk / 100
// 150 → €1.50

export const formatEUR = (cent: number): string =>
  (cent / 100).toFixed(2) + ' €'
// 1400 → "14.00 €"


// ── TAX CALCULATION ──────────────────────────────────────────

export const TAX_RATES: Record<TaxRate, number> = {
  A: 0,
  C: 0,
  D: 0.08,
  E: 0.18,
}

export function calculateTaxGroups(
  items: CartItem[]
): ATKTaxGroup[] {
  const groups: Record<TaxRate, { totalForTax: number; totalTax: number }> = {
    A: { totalForTax: 0, totalTax: 0 },
    C: { totalForTax: 0, totalTax: 0 },
    D: { totalForTax: 0, totalTax: 0 },
    E: { totalForTax: 0, totalTax: 0 },
  }

  for (const item of items) {
    const rate = TAX_RATES[item.taxRate]
    // item.total është në €0.0001 — konvertojmë për llogaritje
    const totalEUR  = item.total / 10000
    const noTaxEUR  = totalEUR / (1 + rate)
    const taxEUR    = totalEUR - noTaxEUR

    // Ruajmë në €0.0001 për ATKTaxGroup
    groups[item.taxRate].totalForTax += Math.round(noTaxEUR  * 10000)
    groups[item.taxRate].totalTax    += Math.round(taxEUR    * 10000)
  }

  // Kthejë vetëm grupet që kanë artikuj
  return (Object.keys(groups) as TaxRate[])
    .filter(rate => groups[rate].totalForTax > 0)
    .map(rate => ({
      taxRate:     rate,
      totalForTax: groups[rate].totalForTax,
      totalTax:    groups[rate].totalTax,
    }))
}

export function calculateCartTotals(items: CartItem[]): CartTotals {
  // item.total është në €0.0001
  const subtotalItems = items.reduce((s, i) => s + i.total, 0)
  const subtotalEUR   = subtotalItems / 10000

  let taxEUR = 0
  for (const item of items) {
    const rate     = TAX_RATES[item.taxRate]
    const itemEUR  = item.total / 10000
    taxEUR        += itemEUR - itemEUR / (1 + rate)
  }

  const noTaxEUR = subtotalEUR - taxEUR

  return {
    subtotal: Math.round(subtotalEUR * 100),  // CENT
    tax:      Math.round(taxEUR     * 100),   // CENT
    noTax:    Math.round(noTaxEUR   * 100),   // CENT
    discount: 0,
    total:    Math.round(subtotalEUR* 100),   // CENT
  }
}


// ── VERIFICATION NUMBER ─────────────────────────────────────

export function generateVerificationNo(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result  = ''
  for (let i = 0; i < 16; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}
// ATK kërkon: max 16 karaktere, unik per kupon
