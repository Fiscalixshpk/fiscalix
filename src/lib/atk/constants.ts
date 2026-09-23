// Konstantet e fiskalizimit ATK — burimi: github.com/fiskalizimi (models.proto + readme)

export const ATK_BASE_URL = {
  TEST: 'https://fiskalizimi-test.atk-ks.org',
  PROD: 'https://fiskalizimi.atk-ks.org',
} as const

export type AtkEnvironment = keyof typeof ATK_BASE_URL

/** Çmimet e artikujve: €0.0001 (€1.00 = 10000) */
export const PRICE_SCALE = 10_000
/** Totalet, tatimet, pagesat: cent (€1.00 = 100) */
export const TOTAL_SCALE = 100

/** A = i liruar 0%, C = 0%, D = 8%, E = 18% */
export const TAX_RATES = { A: 0, C: 0, D: 8, E: 18 } as const
export type TaxRate = keyof typeof TAX_RATES
export const isTaxRate = (v: unknown): v is TaxRate => typeof v === 'string' && v in TAX_RATES

/**
 * Subjektet jo-TVSH nuk ngarkojnë TVSH. Të gjithë artikujt raportohen me këtë normë.
 * ⚠ KONFIRMO ME ATK në takim: "A" (i liruar) apo "C" (0%).
 */
export const NON_VAT_TAX_RATE: TaxRate = 'A'

export const COUPON_TYPE = { SALE: 1, CANCEL: 2, RETURN: 3 } as const
export type CouponType = keyof typeof COUPON_TYPE

export const PAYMENT_TYPE = {
  cash: 1, card: 2, voucher: 3, cheque: 4, crypto: 5, other: 6,
} as const
export type PaymentKind = keyof typeof PAYMENT_TYPE
export const isPaymentKind = (v: unknown): v is PaymentKind => typeof v === 'string' && v in PAYMENT_TYPE

/** Lloji i artikullit (CouponItem.Type) — "TT" sipas shembullit zyrtar */
export const DEFAULT_ITEM_TYPE = 'TT'

/** Hash i fillimit të zinxhirit për çdo pajisje */
export const GENESIS_HASH = '0'.repeat(64)

/** Afati ligjor për dërgimin e kuponëve offline (UA 01/2026) */
export const OFFLINE_DEADLINE_HOURS = 48
