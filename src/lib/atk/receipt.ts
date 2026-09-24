// Kuponi fiskal i printuar — sipas "Kërkesat Specifike Teknike dhe Funksionale" (ATK, Maj 2026):
//   Neni 25.18 (përmbajtja e detyrueshme), Neni 26.12 & 28.6 ("OFFLINE"), Neni 28.3–4 (QR),
//   Shtojca për SEF (logoja RKS MF), Shtojca "F" (kuponi i rregullt, ulje në artikull,
//   ulje në total, kthim, anulim).
//
// Ky modul është izomorfik (server + browser): ndërton një model rreshtash, pastaj
// renderohet si HTML (printer termik 58/80mm, print preview) ose tekst (ESC/POS).

import { TAX_RATES, type CouponType, type PaymentKind, type TaxRate } from './constants'
import type { Discount } from './calc'
import { RKS_MF_LOGO_DATA_URL } from './assets/rks-mf-logo'

// ── Hyrja ─────────────────────────────────────────────────────────

export interface ReceiptLine {
  name: string
  unit: string
  quantity: number
  unitPrice: number            // €0.0001, çmimi para zbritjes
  grossTotal: number           // cent
  itemDiscount: number         // cent
  itemDiscountSpec: Discount | null
  taxRate: TaxRate
}

export interface ReceiptTaxGroup { taxRate: TaxRate; totalForTax: number; totalTax: number }
export interface ReceiptPayment { type: PaymentKind; amount: number }

export interface ReceiptTotals {
  lines: ReceiptLine[]
  subtotal: number             // pas zbritjeve të artikujve
  saleDiscount: (Discount & { amount: number }) | null
  total: number
  taxGroups: ReceiptTaxGroup[]
  totalNoTax: number
  payments: ReceiptPayment[]
  tendered?: number | null
  change?: number | null
}

export interface ReceiptInput extends ReceiptTotals {
  business: {
    name: string
    nui: string
    vatNumber?: string | null
    vatRegistered: boolean
    logoUrl?: string | null
    freeText?: string | null
  }
  unit: { name: string; address: string; city: string; phone?: string | null; number: string }
  posId: number
  environment: 'TEST' | 'PROD'
  operator: { name: string; code?: string | null }
  type: CouponType
  couponId: number
  dailyNo: number
  issuedAt: string | Date
  verificationNo: string       // NUIKF
  qrCode: string
  issuedOffline: boolean
  isCopy?: boolean
  /** CANCEL / RETURN: kuponi origjinal */
  reference?: ReceiptTotals & { dailyNo: number; issuedAt: string | Date; couponId: number }
  cancelReason?: string | null
  /** RETURN: totali i mbetur i kuponit origjinal pas të gjitha kthimeve */
  remainingTotal?: number
}

// ── Modeli i rreshtave ─────────────────────────────────────────────

export type Row =
  | { t: 'logo-business'; url: string }
  | { t: 'text'; text: string; align?: 'left' | 'center' | 'right'; size?: 'sm' | 'md' | 'lg' | 'xl'; bold?: boolean; italic?: boolean }
  | { t: 'kv'; left: string; right: string; size?: 'sm' | 'md' | 'lg' | 'xl'; bold?: boolean; italic?: boolean }
  | { t: 'cols'; a: string; b: string; c: string; header?: boolean; italic?: boolean }
  | { t: 'rule'; style: 'hash' | 'solid' | 'dashed' }
  | { t: 'gap' }
  | { t: 'qr' }
  | { t: 'logo-fiscal' }

const PAYMENT_LABEL: Record<PaymentKind, string> = {
  cash: 'KESH', card: 'POS', voucher: 'VAUÇER', cheque: 'ÇEK', crypto: 'KRIPTO', other: 'TJETËR',
}
const TITLE: Record<CouponType, string> = {
  SALE: 'KUPON FISKAL', RETURN: 'KUPON FISKAL KTHIMI', CANCEL: 'KUPON FISKAL I ANULUAR',
}

// ── Formatimi ──────────────────────────────────────────────────────

const TZ = 'Europe/Belgrade' // ora zyrtare e Kosovës (CET/CEST)

export const eur = (cents: number) => (cents / 100).toFixed(2)
const eurSigned = (cents: number) => (cents < 0 ? '-' : '') + eur(Math.abs(cents))

/** Çmimi për njësi: 2 decimale, ose deri në 4 kur ka precizion më të madh (p.sh. 2.5012) */
export function unitPriceText(p: number): string {
  const v = p / 10_000
  return p % 100 === 0 ? v.toFixed(2) : v.toFixed(4).replace(/0+$/, '')
}
export function quantityText(q: number): string {
  return Number.isInteger(q) ? String(q) : q.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}

export function formatDateTime(d: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(d))
  const g = (k: string) => parts.find(p => p.type === k)?.value ?? ''
  return `${g('day')}/${g('month')}/${g('year')} ${g('hour')}:${g('minute')}`
}

/** Kosova: dita fiskale për numrin ditor të kuponit */
export function fiscalDay(d: string | Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d))
}

/** Neni 25.18: [Numri i Njësisë]-[NUI]-[PosId], p.sh. 5130484-812345678-11 */
export const sefIdentifier = (unitNumber: string, nui: string, posId: number) =>
  `${unitNumber}-${nui}-${String(posId).padStart(2, '0')}`

const pad = (n: number, width: number) => String(n).padStart(width, '0')
const UNIT_HIDDEN = new Set(['cope', 'copë', 'cp', 'ea', 'njësi'])
const qtyXPrice = (l: ReceiptLine) =>
  `${quantityText(l.quantity)}${UNIT_HIDDEN.has(l.unit.toLowerCase()) ? '' : ' ' + l.unit.toUpperCase()} X ${unitPriceText(l.unitPrice)}`
const discountLabel = (d: Discount | null) =>
  d?.kind === 'percent' ? `Ulje ${Number(d.value.toFixed(2))}%` : 'Ulje'

// ── Ndërtimi ───────────────────────────────────────────────────────

function itemRows(lines: ReceiptLine[], sign: 1 | -1 = 1): Row[] {
  const rows: Row[] = []
  for (const l of lines) {
    rows.push({ t: 'cols', a: l.name.toUpperCase(), b: qtyXPrice(l), c: `${eurSigned(sign * l.grossTotal)} ${l.taxRate}` })
    if (l.itemDiscount > 0) {
      rows.push({ t: 'cols', a: discountLabel(l.itemDiscountSpec), b: '', c: eurSigned(-sign * l.itemDiscount), italic: true })
    }
  }
  return rows
}

function totalsRows(t: ReceiptTotals, vatRegistered: boolean, label = 'TOTALI PËR PAGESË'): Row[] {
  const rows: Row[] = []
  if (t.saleDiscount && t.saleDiscount.amount > 0) {
    rows.push({ t: 'rule', style: 'solid' })
    rows.push({ t: 'kv', left: 'NËNTOTALI', right: eur(t.subtotal), bold: true })
    rows.push({ t: 'kv', left: t.saleDiscount.kind === 'percent' ? `ULJE ${Number(t.saleDiscount.value.toFixed(2))}%` : 'ULJE', right: `-${eur(t.saleDiscount.amount)}`, italic: true })
  }
  rows.push({ t: 'rule', style: 'solid' })
  rows.push({ t: 'kv', left: label, right: `${eur(t.total)}€`, size: 'xl', bold: true })

  // Mënyra e pagesës (Neni 25.18: shuma e paguar në mënyra të ndryshme)
  if (t.payments.length <= 1) {
    rows.push({ t: 'kv', left: 'MËNYRA E PAGESËS', right: PAYMENT_LABEL[t.payments[0]?.type ?? 'cash'], size: 'sm' })
  } else {
    rows.push({ t: 'kv', left: 'MËNYRA E PAGESËS', right: '', size: 'sm' })
    for (const p of t.payments) rows.push({ t: 'kv', left: `  ${PAYMENT_LABEL[p.type]}`, right: `${eur(p.amount)}€`, size: 'sm' })
  }
  if (t.change && t.change > 0 && t.tendered) {
    rows.push({ t: 'kv', left: 'PARAJA E DHËNË', right: `${eur(t.tendered)}€`, size: 'sm' })
    rows.push({ t: 'kv', left: 'KUSURI', right: `${eur(t.change)}€`, size: 'sm' })
  }

  // TVSH sipas normave (Neni 13.11: lejohet të mos printohen vlerat zero)
  if (vatRegistered) {
    for (const g of t.taxGroups) {
      const pct = TAX_RATES[g.taxRate]
      if (pct > 0) rows.push({ t: 'kv', left: `TVSH ${g.taxRate} ${pct}%`, right: `${eur(g.totalTax)}€`, size: 'sm' })
    }
  }
  rows.push({ t: 'kv', left: 'TOTALI PA TVSH', right: `${eur(t.totalNoTax)}€`, size: 'sm' })
  return rows
}

export function buildReceiptRows(r: ReceiptInput): Row[] {
  const rows: Row[] = []
  const copy = r.isCopy === true

  // ── Koka
  if (copy) rows.push({ t: 'text', text: 'KOPJE E KUPONIT', align: 'center', size: 'xl', bold: true })
  if (r.business.logoUrl) rows.push({ t: 'logo-business', url: r.business.logoUrl })
  else rows.push({ t: 'text', text: r.business.name.toUpperCase(), align: 'center', size: 'lg', bold: true })
  rows.push({ t: 'text', text: `TATIMPAGUESI: ${r.business.name}`, align: 'center', size: 'sm' })
  rows.push({ t: 'text', text: `EMRI I NJËSISË: ${r.unit.name}`, align: 'center', size: 'sm' })
  rows.push({ t: 'text', text: `ADRESA E NJËSISË: ${r.unit.address}`, align: 'center', size: 'sm' })
  rows.push({ t: 'text', text: `VENDI: ${r.unit.city}`, align: 'center', size: 'sm' })
  if (r.unit.phone) rows.push({ t: 'text', text: `TELEFONI: ${r.unit.phone}`, align: 'center', size: 'sm' })
  rows.push({ t: 'text', text: `NF-NUI: ${r.business.nui}`, align: 'center', size: 'sm', bold: true })
  if (r.business.vatRegistered && r.business.vatNumber) {
    rows.push({ t: 'text', text: `NUMRI I TVSH-SË: ${r.business.vatNumber}`, align: 'center', size: 'sm', bold: true })
  }
  rows.push({ t: 'rule', style: 'hash' })
  rows.push({ t: 'text', text: `EMRI I PUNËTORIT: ${r.operator.name.toUpperCase()}${r.operator.code ? ` (${r.operator.code})` : ''}`, align: 'right', size: 'sm' })

  // ── Titulli + shenjat
  rows.push({ t: 'text', text: TITLE[r.type], align: 'center', size: 'lg', bold: true })
  if (r.issuedOffline) rows.push({ t: 'text', text: '*** OFFLINE ***', align: 'center', size: 'lg', bold: true })
  if (r.environment === 'TEST') rows.push({ t: 'text', text: 'TEST — PA VLERË FISKALE', align: 'center', size: 'sm', bold: true })

  const ref = r.reference
  if (ref && r.type !== 'SALE') {
    rows.push({ t: 'text', text: `KUPON FISKAL NR. ${pad(ref.dailyNo, 4)}  DATË: ${formatDateTime(ref.issuedAt)}`, align: 'center', size: 'sm' })
  }
  if (r.type === 'CANCEL' && r.cancelReason) {
    rows.push({ t: 'text', text: `ARSYEJA E ANULIMIT: ${r.cancelReason.toUpperCase()}`, align: 'center', size: 'sm', italic: true })
  }

  rows.push({ t: 'cols', a: 'ARTIKULLI', b: 'SASIA X ÇMIMI', c: 'SHUMA', header: true })

  // ── Trupi
  if (r.type === 'RETURN' && ref) {
    // Shtojca F "Kupon fiskal kthimi": kuponi origjinal, pastaj artikujt e kthyer me minus
    rows.push(...itemRows(ref.lines))
    rows.push(...totalsRows(ref, r.business.vatRegistered))
    rows.push({ t: 'rule', style: 'hash' })
    rows.push({ t: 'text', text: 'KTHIMI I ARTIKUJVE', align: 'center', bold: true })
    rows.push({ t: 'rule', style: 'hash' })
    rows.push(...itemRows(r.lines, -1))
    rows.push({ t: 'kv', left: 'TOTALI I KTHIMIT', right: `-${eur(r.total)}€`, bold: true })
    if (r.payments.length > 1) {
      for (const p of r.payments) rows.push({ t: 'kv', left: `  ${PAYMENT_LABEL[p.type]}`, right: `-${eur(p.amount)}€`, size: 'sm' })
    } else {
      rows.push({ t: 'kv', left: 'MËNYRA E KTHIMIT', right: PAYMENT_LABEL[r.payments[0]?.type ?? 'cash'], size: 'sm' })
    }
    rows.push({ t: 'rule', style: 'solid' })
    rows.push({ t: 'kv', left: 'TOTALI I MBETUR', right: `${eur(r.remainingTotal ?? ref.total - r.total)}€`, size: 'xl', bold: true })
  } else if (r.type === 'CANCEL' && ref) {
    // Shtojca F "Kupon fiskal i anuluar": artikujt dhe totalet e kuponit origjinal
    rows.push(...itemRows(ref.lines))
    rows.push(...totalsRows(ref, r.business.vatRegistered))
  } else {
    rows.push(...itemRows(r.lines))
    rows.push(...totalsRows(r, r.business.vatRegistered))
  }

  // ── Fundi
  rows.push({ t: 'rule', style: 'dashed' })
  rows.push({ t: 'text', text: `${r.type === 'RETURN' ? 'ARTIKUJ TË KTHYER' : 'ARTIKUJ'} - ${r.lines.length}`, align: 'right', size: 'sm' })
  rows.push({ t: 'text', text: pad(r.couponId, 10), align: 'left', size: 'sm' })
  rows.push({ t: 'kv', left: 'DATA DHE ORA', right: formatDateTime(r.issuedAt), size: 'sm' })
  rows.push({ t: 'kv', left: 'NR. IDENTIFIKUES I SEF', right: sefIdentifier(r.unit.number, r.business.nui, r.posId), size: 'sm' })
  rows.push({ t: 'text', text: `NUIKF: ${r.verificationNo}`, align: 'left', size: 'sm', bold: true })
  rows.push({ t: 'gap' })
  rows.push({ t: 'text', text: `KUPON FISKAL DITOR NR. ${pad(r.dailyNo, 4)}`, align: 'center', size: 'md' })
  rows.push({ t: 'qr' })
  rows.push({ t: 'logo-fiscal' })
  rows.push({ t: 'text', text: 'e-kupon', align: 'center', size: 'md', italic: true, bold: true })
  if (r.issuedOffline) rows.push({ t: 'text', text: 'OFFLINE', align: 'center', size: 'md', bold: true })
  if (r.business.freeText) rows.push({ t: 'text', text: r.business.freeText, align: 'center', size: 'sm' })
  if (copy) rows.push({ t: 'text', text: 'KOPJE E KUPONIT — KUPON JO FISKAL', align: 'center', size: 'md', bold: true })
  return rows
}

// ── Render: HTML (printer termik 58–100mm, Neni 26.13) ────────────

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export function renderReceiptHtml(rows: Row[], opts: { qrDataUrl: string; paperMm?: 58 | 80; autoPrint?: boolean; title?: string }): string {
  const paper = opts.paperMm ?? 80
  const body = rows.map(row => {
    switch (row.t) {
      case 'logo-business': return `<div class="c"><img class="blogo" src="${esc(row.url)}" alt=""></div>`
      case 'text': return `<div class="${[row.align === 'center' ? 'c' : row.align === 'right' ? 'r' : '', row.size ?? 'md', row.bold ? 'b' : '', row.italic ? 'i' : ''].join(' ')}">${esc(row.text)}</div>`
      case 'kv': return `<div class="kv ${row.size ?? 'md'} ${row.bold ? 'b' : ''} ${row.italic ? 'i' : ''}"><span>${esc(row.left)}</span><span>${esc(row.right)}</span></div>`
      case 'cols': return `<div class="cols ${row.header ? 'h' : ''} ${row.italic ? 'i' : ''}"><span>${esc(row.a)}</span><span>${esc(row.b)}</span><span>${esc(row.c)}</span></div>`
      case 'rule': return row.style === 'hash' ? `<div class="rule hash">${'#'.repeat(120)}</div>` : `<div class="rule ${row.style}"></div>`
      case 'gap': return '<div class="gap"></div>'
      case 'qr': return `<div class="c"><img class="qr" src="${opts.qrDataUrl}" alt="QR"></div>`
      case 'logo-fiscal': return `<div class="c"><img class="flogo" src="${RKS_MF_LOGO_DATA_URL}" alt="RKS MF"></div>`
    }
  }).join('\n')

  return `<!doctype html><html lang="sq"><head><meta charset="utf-8"><title>${esc(opts.title ?? 'Kupon fiskal')}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
@page { size: ${paper}mm auto; margin: 0 }
* { box-sizing: border-box; margin: 0; padding: 0 }
html, body { background: #fff; color: #000 }
body { width: ${paper}mm; padding: 3mm ${paper === 58 ? 2 : 4}mm 6mm; font: 400 ${paper === 58 ? 10 : 11.5}px/1.35 "Helvetica Neue", Arial, sans-serif; font-variant-numeric: tabular-nums; -webkit-print-color-adjust: exact; print-color-adjust: exact }
.c { text-align: center } .r { text-align: right } .b { font-weight: 700 } .i { font-style: italic }
.sm { font-size: .92em } .md { font-size: 1em } .lg { font-size: 1.35em; margin: 2px 0 } .xl { font-size: 1.6em }
.kv { display: flex; justify-content: space-between; gap: 6px } .kv span:last-child { text-align: right; white-space: nowrap }
.cols { display: grid; grid-template-columns: 1fr auto minmax(16mm, auto); gap: 4px; align-items: baseline }
.cols span:nth-child(2) { text-align: right; white-space: nowrap } .cols span:nth-child(3) { text-align: right; white-space: nowrap }
.cols.h { font-size: .85em; border-bottom: 1px solid #000; margin-top: 4px; padding-bottom: 1px }
.rule { margin: 3px 0 } .rule.solid { border-top: 1.5px solid #000 } .rule.dashed { border-top: 1px dashed #000 }
.rule.hash { font-size: 8px; line-height: 1; letter-spacing: -.5px; white-space: nowrap; overflow: hidden }
.gap { height: 6px }
.qr { width: ${paper === 58 ? 30 : 34}mm; height: auto; margin: 3px 0; image-rendering: pixelated }
.flogo { width: 15.5mm; height: auto; margin-top: 2px } /* ≈ 15.5 × 10 mm */
.blogo { max-width: 60%; max-height: 18mm; margin-bottom: 2px }
@media screen { html { background: #e5e7eb } body { margin: 16px auto; box-shadow: 0 1px 3px rgba(0,0,0,.2) } }
</style></head><body>
${body}
${opts.autoPrint ? '<script>window.addEventListener("load",()=>{setTimeout(()=>{window.print()},150)})</script>' : ''}
</body></html>`
}

// ── Render: tekst (ESC/POS, 32 kolona për 58mm, 48 për 80mm) ─────

export function renderReceiptText(rows: Row[], cols = 48): string {
  const fit = (l: string, r: string) => {
    const space = Math.max(1, cols - l.length - r.length)
    return (l + ' '.repeat(space) + r).slice(0, Math.max(cols, l.length + 1 + r.length))
  }
  const center = (s: string) => ' '.repeat(Math.max(0, Math.floor((cols - s.length) / 2))) + s
  const out: string[] = []
  for (const row of rows) {
    switch (row.t) {
      case 'text': out.push(row.align === 'center' ? center(row.text) : row.align === 'right' ? row.text.padStart(cols) : row.text); break
      case 'kv': out.push(fit(row.left, row.right)); break
      case 'cols': {
        const right = `${row.b ? row.b + '  ' : ''}${row.c}`
        if (row.a.length + right.length + 1 <= cols) out.push(fit(row.a, right))
        else { out.push(row.a); out.push(right.padStart(cols)) }
        break
      }
      case 'rule': out.push((row.style === 'hash' ? '#' : row.style === 'dashed' ? '-' : '=').repeat(cols)); break
      case 'gap': out.push(''); break
      case 'qr': out.push(center('[QR]')); break
      case 'logo-fiscal': out.push(center('RKS MF')); break
      case 'logo-business': break
    }
  }
  return out.join('\n')
}
