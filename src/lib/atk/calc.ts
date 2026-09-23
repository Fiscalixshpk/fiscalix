// Motori i llogaritjes së kuponit fiskal.
//
// Njësitë:  unitPrice → €0.0001  |  totalet, tatimet, zbritjet, pagesat → cent
//
// Rregullat:
//  1. Bruto e rreshtit = unitPrice × quantity (sasia deri në 4 decimale)
//  2. Zbritja e artikullit (% ose vlerë) zbritet nga rreshti
//  3. Zbritja e shitjes (% ose vlerë) shpërndahet proporcionalisht në rreshta
//     (metoda "largest remainder" → shuma del saktë deri në cent)
//  4. CouponItem.Price dhe CouponItem.Total raportohen PAS zbritjes (kërkesë e ATK)
//  5. TaxGroup.TotalForTax = baza PA TVSH; TotalTax = TVSH; Total = Σ(bazë + TVSH)
//     TVSH = round(bruto × norma / (100 + norma)), gjysma lart.
//     Burimi: "Kërkesat Specifike Teknike dhe Funksionale" (ATK, Maj 2026), Shtojca B/C/F —
//     të gjithë shembujt zyrtarë dalin identikë (p.sh. 5.00 D → 0.37, 7.90 E → 1.21, 50.00 E → 7.63).
//  6. Artikujt identikë bashkohen në një rresht (Neni 25.18)

import {
  DEFAULT_ITEM_TYPE, NON_VAT_TAX_RATE, PRICE_SCALE, TAX_RATES, TOTAL_SCALE,
  type PaymentKind, type TaxRate,
} from './constants'

export type Discount =
  | { kind: 'percent'; value: number }   // 0–100
  | { kind: 'amount';  value: number }   // cent

export interface CalcItemInput {
  name: string
  unit: string
  unitPrice: number          // €0.0001, çmimi me TVSH, para zbritjes
  quantity: number
  taxRate: TaxRate
  discount?: Discount | null
  productId?: string | null
  /** Për kthime/anulime: totali fiks i rreshtit (cent), pa rillogaritje zbritjesh */
  presetTotal?: number
  sourceItemId?: string | null
  /** Kategoria e mallit/shërbimit (tabela "Kategoritë", p.sh. TT, AU, UR) → CouponItem.Type */
  itemType?: string | null
}

export interface CalcPaymentInput { type: PaymentKind; amount: number } // cent

export interface CalcInput {
  items: CalcItemInput[]
  vatRegistered: boolean
  saleDiscount?: Discount | null
  payments: CalcPaymentInput[]
}

export interface CalcLine {
  name: string
  unit: string
  quantity: number
  originalUnitPrice: number  // €0.0001, para zbritjes
  unitPrice: number          // €0.0001, pas zbritjes → CouponItem.Price
  grossTotal: number         // cent, para zbritjes
  itemDiscount: number       // cent, zbritja e artikullit (rreshti "Ulje" në kupon)
  itemDiscountSpec: Discount | null
  saleDiscountShare: number  // cent, pjesa e zbritjes së totalit që i takon rreshtit
  discount: number           // cent, itemDiscount + saleDiscountShare
  total: number              // cent, pas zbritjes → CouponItem.Total
  taxRate: TaxRate
  productId: string | null
  sourceItemId: string | null
  itemType: string
}

export interface CalcTaxGroup { taxRate: TaxRate; totalForTax: number; totalTax: number }

export interface CalcResult {
  lines: CalcLine[]
  grossTotal: number            // Σ bruto
  subtotal: number              // NËNTOTALI: pas zbritjeve të artikujve, para zbritjes së totalit
  saleDiscount: (Discount & { amount: number }) | null
  total: number
  taxGroups: CalcTaxGroup[]
  totalTax: number
  totalNoTax: number
  totalDiscount: number
  payments: CalcPaymentInput[]  // shuma = total (kusuri i hequr nga paratë e gatshme)
  tendered: number              // sa pagoi klienti
  change: number                // kusuri
}

export class CalcError extends Error {
  constructor(message: string) { super(message); this.name = 'CalcError' }
}

const round = (n: number) => Math.round(n + Number.EPSILON * Math.sign(n))
const PRICE_TO_CENT = PRICE_SCALE / TOTAL_SCALE // 100

function assertQuantity(q: number, name: string) {
  if (!Number.isFinite(q) || q <= 0) throw new CalcError(`Sasi e pavlefshme për "${name}"`)
  if (round(q * 10_000) / 10_000 !== q) throw new CalcError(`Sasia e "${name}" lejon maksimum 4 decimale`)
}

function discountFrom(base: number, d: Discount | null | undefined, label: string): number {
  if (!d || !d.value) return 0
  if (d.value < 0) throw new CalcError(`Zbritja për ${label} s'mund të jetë negative`)
  if (d.kind === 'percent') {
    if (d.value > 100) throw new CalcError(`Zbritja në % për ${label} duhet të jetë 0–100`)
    return round(base * d.value / 100)
  }
  if (d.value > base) throw new CalcError(`Zbritja për ${label} e tejkalon vlerën`)
  return round(d.value)
}

/** Shpërndan `amount` proporcionalisht sipas `weights`, shuma e rezultatit = amount saktë */
function distribute(amount: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (!amount || !sum) return weights.map(() => 0)
  const raw = weights.map(w => (amount * w) / sum)
  const floors = raw.map(Math.floor)
  let rest = amount - floors.reduce((a, b) => a + b, 0)
  raw.map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => { if (rest > 0) { floors[i]++; rest-- } })
  return floors
}

export function taxSplit(gross: number, rate: TaxRate): { base: number; tax: number } {
  const pct = TAX_RATES[rate]
  if (!pct) return { base: gross, tax: 0 }
  const d = 100 + pct
  const tax = Math.floor((2 * gross * pct + d) / (2 * d)) // round half-up, aritmetikë e plotë
  return { base: gross - tax, tax }
}

/** Neni 25.18: i njëjti artikull shfaqet në një rresht të vetëm */
function mergeIdentical(items: CalcItemInput[]): CalcItemInput[] {
  const out: CalcItemInput[] = []
  const index = new Map<string, number>()
  for (const item of items) {
    if (item.presetTotal !== undefined || item.sourceItemId) { out.push(item); continue }
    const d = item.discount && item.discount.value ? item.discount : null
    const key = [item.productId ?? '', item.name.trim().toLowerCase(), item.unit, item.unitPrice, item.taxRate, item.itemType ?? '', d?.kind ?? '', d?.kind === 'percent' ? d.value : ''].join('|')
    const at = index.get(key)
    if (at === undefined) { index.set(key, out.length); out.push({ ...item, discount: d }); continue }
    const prev = out[at]
    const quantity = Math.round((prev.quantity + item.quantity) * 10_000) / 10_000
    const discount = d?.kind === 'amount' ? { kind: 'amount' as const, value: (prev.discount?.value ?? 0) + d.value } : prev.discount
    out[at] = { ...prev, quantity, discount }
  }
  return out
}

export function calculate(input: CalcInput): CalcResult {
  if (!input.items.length) throw new CalcError('Kuponi duhet të ketë së paku një artikull')

  // 1–2: rreshtat (të bashkuar) me zbritjen e artikullit
  const stage = mergeIdentical(input.items).map(item => {
    const name = item.name?.trim()
    if (!name) throw new CalcError('Artikulli pa emër')
    assertQuantity(item.quantity, name)
    if (!Number.isInteger(item.unitPrice) || item.unitPrice < 0) {
      throw new CalcError(`Çmimi i "${name}" duhet të jetë në njësi €0.0001 (numër i plotë ≥ 0)`)
    }
    const taxRate: TaxRate = input.vatRegistered ? item.taxRate : NON_VAT_TAX_RATE

    const gross = item.presetTotal !== undefined
      ? item.presetTotal
      : round((item.unitPrice * item.quantity) / PRICE_TO_CENT)
    const afterItem = item.presetTotal !== undefined
      ? item.presetTotal
      : gross - discountFrom(gross, item.discount, `"${name}"`)

    const itemDiscountSpec = item.presetTotal === undefined && item.discount?.value ? item.discount : null
    return { item, name, taxRate, gross, afterItem, itemDiscountSpec }
  })

  // 3: zbritja e shitjes, e shpërndarë
  const subtotal = stage.reduce((s, l) => s + l.afterItem, 0)
  const saleDiscount = discountFrom(subtotal, input.saleDiscount, 'shitjen')
  const shares = distribute(saleDiscount, stage.map(l => l.afterItem))

  const lines: CalcLine[] = stage.map((l, i) => {
    const total = l.afterItem - shares[i]
    return {
      name: l.name,
      unit: l.item.unit?.trim() || 'cope',
      quantity: l.item.quantity,
      originalUnitPrice: l.item.unitPrice,
      unitPrice: round((total * PRICE_TO_CENT) / l.item.quantity),
      grossTotal: l.gross,
      itemDiscount: l.gross - l.afterItem,
      itemDiscountSpec: l.itemDiscountSpec,
      saleDiscountShare: shares[i],
      discount: l.gross - total,
      total,
      taxRate: l.taxRate,
      productId: l.item.productId ?? null,
      sourceItemId: l.item.sourceItemId ?? null,
      itemType: (l.item.itemType || DEFAULT_ITEM_TYPE).toUpperCase().slice(0, 8),
    }
  })

  // 5: grupet e tatimit
  const byRate = new Map<TaxRate, number>()
  for (const l of lines) byRate.set(l.taxRate, (byRate.get(l.taxRate) ?? 0) + l.total)
  const taxGroups: CalcTaxGroup[] = (Object.keys(TAX_RATES) as TaxRate[])
    .filter(r => byRate.has(r))
    .map(r => {
      const { base, tax } = taxSplit(byRate.get(r)!, r)
      return { taxRate: r, totalForTax: base, totalTax: tax }
    })

  const total = lines.reduce((s, l) => s + l.total, 0)
  const totalTax = taxGroups.reduce((s, g) => s + g.totalTax, 0)
  const totalNoTax = taxGroups.reduce((s, g) => s + g.totalForTax, 0)
  const totalDiscount = lines.reduce((s, l) => s + l.discount, 0)

  return {
    lines, total, taxGroups, totalTax, totalNoTax, totalDiscount,
    grossTotal: lines.reduce((s, l) => s + l.grossTotal, 0),
    subtotal,
    saleDiscount: saleDiscount && input.saleDiscount ? { ...input.saleDiscount, amount: saleDiscount } : null,
    ...settlePayments(input.payments, total),
  }
}

/** Valido pagesat. Vetëm paratë e gatshme lejojnë tepricë (kusur). */
function settlePayments(payments: CalcPaymentInput[], total: number) {
  if (!payments.length) throw new CalcError('Mungon mënyra e pagesës')
  const merged = new Map<PaymentKind, number>()
  for (const p of payments) {
    if (!Number.isInteger(p.amount) || p.amount < 0) throw new CalcError('Shuma e pagesës e pavlefshme')
    if (p.amount) merged.set(p.type, (merged.get(p.type) ?? 0) + p.amount)
  }
  const tendered = [...merged.values()].reduce((a, b) => a + b, 0)
  if (total === 0) return { payments: [], tendered, change: tendered }
  if (tendered < total) throw new CalcError(`Pagesa (${fmt(tendered)}) është më e vogël se totali (${fmt(total)})`)

  const nonCash = tendered - (merged.get('cash') ?? 0)
  if (nonCash > total) throw new CalcError('Pagesa me kartelë/tjetër s\'mund ta tejkalojë totalin')

  const change = tendered - total
  if (change) merged.set('cash', merged.get('cash')! - change)

  return {
    payments: [...merged].filter(([, a]) => a > 0).map(([type, amount]) => ({ type, amount })),
    tendered,
    change,
  }
}

const fmt = (cents: number) => `€${(cents / 100).toFixed(2)}`
