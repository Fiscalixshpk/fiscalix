'use client'
// ── usePrintReceipt — Hook i centralizuar për printim ATK ─────
// Integron: market-pos, pos-client, service-pos, health-module, table-client

import { printReceipt } from '@/components/pos/receipt-printer'
import type { ReceiptData } from '@/components/pos/receipt-printer'

export interface PrintableCompany {
  id?: string
  name: string
  nui?: string
  vat_number?: string
  address?: string
  location_city?: string
  phone?: string
  logo_url?: string
}

export interface PrintableItem {
  name: string
  price: number        // €0.0001 units (ATK)
  quantity: number
  unit?: string
  taxRate?: string
  tax_rate?: string
  discount?: number
}

export interface PrintableFiscalResponse {
  success?: boolean
  saleId?: string
  receiptNumber?: string
  transactionId?: number
  qrCodeData?: string
  qrCode?: string       // legacy field
  status?: string
  iic?: string          // legacy — IIC = NUIKF
  fic?: string          // legacy — FIC = transactionId
  totals?: {
    totalEUR?: string
    taxEUR?: string
    noTaxEUR?: string
  }
  total?: number        // legacy cents
  tax?: number          // legacy cents
  nuikf?: string
  sefId?: string
  dailyCouponNo?: number
}

// ── Konverto çdo format API response → ReceiptData ATK ─────────
export function buildATKReceipt(
  fiscal: PrintableFiscalResponse,
  items: PrintableItem[],
  company: PrintableCompany,
  opts: {
    paymentMethod: string
    operatorName?: string
    totalDiscount?: number
    splitPayment?: { cash: number; card: number }
    couponType?: 'SALE' | 'CANCEL' | 'RETURN'
    cancelReason?: string
    referenceReceiptNo?: string
  }
): ReceiptData {
  // Normalizojmë totalet nga çdo format
  let totalCents: number
  let taxCents: number
  let noTaxCents: number

  if (fiscal.totals?.totalEUR) {
    totalCents  = Math.round(parseFloat(fiscal.totals.totalEUR) * 100)
    taxCents    = Math.round(parseFloat(fiscal.totals.taxEUR || '0') * 100)
    noTaxCents  = Math.round(parseFloat(fiscal.totals.noTaxEUR || '0') * 100)
  } else if (fiscal.total !== undefined) {
    // Legacy format: total në cents direkt
    totalCents  = fiscal.total
    taxCents    = fiscal.tax || 0
    noTaxCents  = totalCents - taxCents
  } else {
    // Llogarit nga items
    totalCents  = items.reduce((s, i) => s + Math.round((i.price / 100) * i.quantity) - (i.discount || 0), 0)
    taxCents    = Math.round(totalCents * 0.18 / 1.18)
    noTaxCents  = totalCents - taxCents
  }

  const discount = opts.totalDiscount || 0
  const unit = (i: PrintableItem) => i.unit || 'cope'

  return {
    company: {
      name:       company.name,
      nui:        company.nui || '—',
      vatNumber:  company.vat_number,
      address:    company.address || '',
      city:       company.location_city || 'Kosovë',
      phone:      company.phone,
      logo_url:   company.logo_url,
    },
    operator: opts.operatorName || 'Operator',
    items: items.map(i => ({
      name:     i.name,
      quantity: i.quantity,
      price:    i.price,
      unit:     unit(i),
      taxRate:  i.taxRate || i.tax_rate || 'E',
      discount: i.discount,
    })),
    totals: {
      subtotal: totalCents + discount,
      discount,
      total:    totalCents,
      tax:      taxCents,
      noTax:    noTaxCents,
    },
    paymentMethod: opts.paymentMethod as ReceiptData['paymentMethod'],
    splitPayment:  opts.splitPayment,
    couponType:    opts.couponType || 'SALE',
    status:        (fiscal.status as ReceiptData['status']) || 'fiscalized',
    receiptNumber: fiscal.receiptNumber || fiscal.fic || undefined,
    dailyCouponNo: fiscal.dailyCouponNo,
    // NUIKF — sipas ATK: max 16 karaktere
    nuikf: fiscal.nuikf || fiscal.iic?.slice(0, 16) || undefined,
    sefId: fiscal.sefId,
    // QR Code — pranon qrCodeData ose qrCode (legacy)
    qrCodeData: fiscal.qrCodeData || fiscal.qrCode || undefined,
    issuedAt: new Date(),
    isOffline: fiscal.status === 'offline',
    cancelReason:       opts.cancelReason,
    referenceReceiptNo: opts.referenceReceiptNo,
  }
}

// ── Hook kryesor ───────────────────────────────────────────────
export function usePrintReceipt(company: PrintableCompany) {
  function print(
    fiscal: PrintableFiscalResponse,
    items: PrintableItem[],
    opts: {
      paymentMethod?: string
      operatorName?: string
      totalDiscount?: number
      splitPayment?: { cash: number; card: number }
      couponType?: 'SALE' | 'CANCEL' | 'RETURN'
      cancelReason?: string
      referenceReceiptNo?: string
    } = {}
  ) {
    const receipt = buildATKReceipt(fiscal, items, company, {
      paymentMethod: opts.paymentMethod || 'cash',
      ...opts,
    })
    printReceipt(receipt)
  }

  return { print }
}
