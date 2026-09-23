/* eslint-disable no-console */
// ============================================================================
// Fiscalix — Suita e testimit për certifikimin SEF (ATK)
//
//   npm run atk:test                 → verifikim lokal i të gjithë skenarëve
//   npm run atk:test -- --live       → + dërgim real në ATK TEST
//
// Për --live (në .env.local ose në shell):
//   ATK_TEST_KEY_PATH=./atk-test-key.pem     çelësi privat i pajisjes (nga onboarding)
//   ATK_TEST_NUI=81xxxxxxx                   subjekt NË TVSH
//   ATK_TEST_NUI_NON_VAT=81xxxxxxx           subjekt JO NË TVSH (opsional, me çelësin e vet)
//   ATK_TEST_KEY_PATH_NON_VAT=./nonvat.pem
//   ATK_TEST_POS_ID=1  ATK_TEST_BRANCH_ID=1  ATK_TEST_APP_ID=...  ATK_TEST_LOCATION=Pejë
//   ATK_TEST_COUPON_START=100000             CouponId i parë (unik për biznesin)
//
// Rezultati: atk-report.md + atk-report.json (për takimin me komisionin)
// ============================================================================

import { generateKeyPairSync } from 'crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import QRCode from 'qrcode'
import { buildReceiptRows, renderReceiptHtml, renderReceiptText, type ReceiptInput, type ReceiptTotals } from '../src/lib/atk/receipt'
import path from 'path'
import protobuf from 'protobufjs'
import { calculate, type CalcInput, type CalcItemInput, type CalcResult } from '../src/lib/atk/calc'
import { buildCoupon, type BuiltCoupon, type CouponMeta } from '../src/lib/atk/coupon'
import { publicKeyFromPrivate, verifySignature } from '../src/lib/atk/signer'
import { submitPosCoupon, measureClockOffset, atkUnixTime } from '../src/lib/atk/transport'
import { computeLink, verifyChain, type StoredLink } from '../src/lib/atk/hash-chain'
import { GENESIS_HASH, type CouponType } from '../src/lib/atk/constants'

const LIVE = process.argv.includes('--live')
const env = (k: string, d?: string) => process.env[k] ?? d
process.env.ATK_LOG_HMAC_SECRET ??= 'test-only-secret-at-least-32-characters-long!!'

// ── Proto zyrtar ────────────────────────────────────────────────
const root = protobuf.loadSync(path.join(__dirname, '../src/lib/atk/proto/models.proto'))
const PosT = root.lookupType('atk.PosCoupon')
const CitT = root.lookupType('atk.CitizenCoupon')
const decode = (T: protobuf.Type, b64: string) =>
  T.toObject(T.decode(Buffer.from(b64, 'base64')), { longs: String, enums: String, defaults: true }) as Record<string, any>

// ── Çelësat ─────────────────────────────────────────────────────
function loadKey(p?: string): string {
  if (p && existsSync(p)) return readFileSync(p, 'utf8')
  if (LIVE) throw new Error(`Çelësi nuk u gjet: ${p}`)
  return generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ type: 'sec1', format: 'pem' }).toString()
}

interface Subject { label: string; vat: boolean; meta: CouponMeta; key: string }
const baseMeta = {
  branchId: Number(env('ATK_TEST_BRANCH_ID', '1')),
  posId: Number(env('ATK_TEST_POS_ID', '1')),
  applicationId: Number(env('ATK_TEST_APP_ID', '1234')),
  location: env('ATK_TEST_LOCATION', 'Pejë')!,
  operatorId: 'Operator Test',
}
const subjects: Subject[] = [
  { label: 'Subjekt NË TVSH', vat: true, meta: { ...baseMeta, businessId: Number(env('ATK_TEST_NUI', '810000001')) }, key: loadKey(env('ATK_TEST_KEY_PATH')) },
]
if (!LIVE || env('ATK_TEST_NUI_NON_VAT')) {
  subjects.push({ label: 'Subjekt JO NË TVSH', vat: false,
    meta: { ...baseMeta, businessId: Number(env('ATK_TEST_NUI_NON_VAT', '810000002')) },
    key: loadKey(env('ATK_TEST_KEY_PATH_NON_VAT', env('ATK_TEST_KEY_PATH'))) })
}

// ── Artikujt e testit (çmim në €0.0001) ────────────────────────
const I = (name: string, eur: number, qty: number, rate: CalcItemInput['taxRate'], unit = 'cope', discount?: CalcItemInput['discount']): CalcItemInput =>
  ({ name, unitPrice: Math.round(eur * 10_000), quantity: qty, taxRate: rate, unit, discount })

interface Scenario {
  id: string; title: string
  type: CouponType
  refOf?: string                         // id e skenarit origjinal
  returnQty?: Record<number, number>     // index rreshti → sasia e kthyer (kthim i pjesshëm)
  input?: Omit<CalcInput, 'vatRegistered'>
}

const scenarios: Scenario[] = [
  { id: 'S1', type: 'SALE', title: '5 artikuj, norma A/C/D/E, 2 decimale, para të gatshme',
    input: { payments: [{ type: 'cash', amount: 2000 }], items: [
      I('Ujë Rugove 0.5L', 0.50, 2, 'E'), I('Bukë', 0.60, 3, 'D'), I('Qumësht 1L', 1.15, 1, 'D'),
      I('Libër shkollor', 7.90, 1, 'A'), I('Ilaç (0%)', 3.25, 1, 'C')] } },
  { id: 'S2', type: 'SALE', title: '4 decimale në çmim dhe sasi, zbritje artikulli % dhe vlerë, kartelë',
    input: { payments: [{ type: 'card', amount: 1_000_000 }], items: [
      I('Djathë (kg)', 8.4567, 0.7345, 'D', 'kg', { kind: 'percent', value: 10 }),
      I('Mish viçi (kg)', 11.2399, 1.2505, 'D', 'kg'),
      I('Kafe espresso', 1.2345, 2, 'E', 'cope', { kind: 'amount', value: 50 }),
      I('Karburant (L)', 1.4379, 23.4567, 'E', 'L'),
      I('Detergjent', 3.99, 1, 'E', 'cope', { kind: 'percent', value: 25 })] } },
  { id: 'S3', type: 'SALE', title: 'Zbritje në total 10%, pagesë e kombinuar cash + kartelë',
    input: { saleDiscount: { kind: 'percent', value: 10 }, payments: [{ type: 'cash', amount: 1000 }, { type: 'card', amount: 100_000 }], items: [
      I('Pizza Margherita', 6.50, 2, 'E'), I('Coca-Cola 0.33', 1.20, 3, 'E'), I('Sallatë', 3.40, 1, 'D'),
      I('Ujë', 0.80, 2, 'E'), I('Ëmbëlsirë', 2.75, 1, 'D')] } },
  // S3: kartela mbulon mbetjen; skripti e korrigjon shumën poshtë (shih fixPayments)
  { id: 'S4', type: 'SALE', title: 'Zbritje në total me vlerë €2.00 + zbritje artikulli, cash me kusur',
    input: { saleDiscount: { kind: 'amount', value: 200 }, payments: [{ type: 'cash', amount: 5000 }], items: [
      I('Këmishë', 19.99, 1, 'E', 'cope', { kind: 'percent', value: 15 }), I('Çorape', 2.49, 3, 'E'),
      I('Libër', 12.00, 1, 'A'), I('Pije energjike', 1.35, 2, 'E', 'cope', { kind: 'amount', value: 20 }), I('Bukë', 0.55, 2, 'D')] } },
  { id: 'S5', type: 'SALE', title: 'Tri mënyra pagese (cash + kartelë + voucher), 4 decimale',
    input: { payments: [{ type: 'voucher', amount: 500 }, { type: 'card', amount: 1000 }, { type: 'cash', amount: 5000 }], items: [
      I('Mollë (kg)', 1.1234, 2.3456, 'D', 'kg'), I('Banane (kg)', 1.4999, 1.0001, 'D', 'kg'),
      I('Vaj ulliri', 8.7654, 1, 'E'), I('Sheqer (kg)', 0.9876, 5, 'D', 'kg', { kind: 'percent', value: 5 }), I('Gazetë', 0.50, 1, 'A')] } },
  { id: 'S6', type: 'RETURN', refOf: 'S1', title: 'Kthim i plotë i S1' },
  { id: 'S7', type: 'RETURN', refOf: 'S3', title: 'Kthim i pjesshëm i S3 (1 pizza, 2 coca-cola)', returnQty: { 0: 1, 1: 2 } },
  { id: 'S8', type: 'RETURN', refOf: 'S2', title: 'Kthim i pjesshëm me sasi decimale (0.3 kg djathë)', returnQty: { 0: 0.3 } },
  { id: 'S9', type: 'CANCEL', refOf: 'S5', title: 'Anulim i S5' },
]

// ── Pagesat: plotëso shumat reale pasi dihet totali ────────────
function fixPayments(input: Omit<CalcInput, 'vatRegistered'>, vat: boolean): CalcInput {
  const probe = calculate({ ...input, vatRegistered: vat, payments: [{ type: 'cash', amount: 10_000_000 }] })
  let remaining = probe.total
  const payments = input.payments.map((p, idx) => {
    const last = idx === input.payments.length - 1
    if (p.type === 'cash' && last) return { ...p, amount: Math.max(p.amount, remaining) } // cash lejon kusur
    const amount = last ? remaining : Math.min(p.amount, remaining)
    remaining -= amount
    return { ...p, amount }
  })
  return { ...input, vatRegistered: vat, payments }
}

// ── Kthim/anulim nga kuponi origjinal ──────────────────────────
function reverseInput(orig: CalcResult, vat: boolean, qty?: Record<number, number>): CalcInput {
  const items: CalcItemInput[] = orig.lines
    .map((l, i) => ({ l, q: qty ? qty[i] : l.quantity }))
    .filter(x => x.q && x.q > 0)
    .map(({ l, q }) => ({
      name: l.name, unit: l.unit, quantity: q!, taxRate: l.taxRate, unitPrice: l.unitPrice,
      presetTotal: q === l.quantity ? l.total : Math.round((l.total * q!) / l.quantity),
    }))
  const probe = calculate({ items, vatRegistered: vat, payments: [{ type: 'cash', amount: 1e9 }] })
  // Kthimi bëhet me të njëjtat mënyra pagese (proporcionalisht); anulimi i plotë i kopjon
  const shares = orig.payments.map(p => ({ type: p.type, amount: Math.floor((p.amount * probe.total) / orig.total) }))
  shares[0].amount += probe.total - shares.reduce((s, p) => s + p.amount, 0)
  return { items, vatRegistered: vat, payments: shares }
}

// ── Kontrollet ──────────────────────────────────────────────────
type Check = { name: string; ok: boolean; detail?: string }
function checks(c: BuiltCoupon, calc: CalcResult, pub: string): Check[] {
  const pos = decode(PosT, c.posPayload)
  const [citB64, citSig] = c.qrCode.split('|')
  const cit = decode(CitT, citB64)
  const n = (v: unknown) => Number(v)
  const sum = (a: any[], f: (x: any) => number) => a.reduce((s, x) => s + f(x), 0)
  const out: Check[] = []
  const add = (name: string, ok: boolean, detail?: string) => out.push({ name, ok, detail: ok ? undefined : detail })

  add('Protobuf dekodohet me models.proto zyrtar', true)
  add('Type / CouponId / ReferenceNo', pos.Type === { SALE: 'Sale', CANCEL: 'Cancel', RETURN: 'Return' }[c.type]
    && n(pos.CouponId) === c.couponId && n(pos.ReferenceNo) === c.referenceNo, JSON.stringify({ t: pos.Type, id: pos.CouponId, ref: pos.ReferenceNo }))
  add('Artikujt: numri dhe sasia (float) ruhen', pos.Items.length === calc.lines.length
    && pos.Items.every((it: any, i: number) => Math.abs(it.Quantity - calc.lines[i].quantity) < 1e-4), JSON.stringify(pos.Items.map((i: any) => i.Quantity)))
  add('Price dhe Total e artikullit janë PAS zbritjes', pos.Items.every((it: any, i: number) =>
    n(it.Price) === calc.lines[i].unitPrice && n(it.Total) === calc.lines[i].total))
  add('Σ Items.Total = Total', sum(pos.Items, i => n(i.Total)) === n(pos.Total), `${sum(pos.Items, i => n(i.Total))} ≠ ${pos.Total}`)
  add('Σ TaxGroups (bazë + TVSH) = Total', sum(pos.TaxGroups, g => n(g.TotalForTax) + n(g.TotalTax)) === n(pos.Total))
  add('TotalTax / TotalNoTax = Σ grupeve', n(pos.TotalTax) === sum(pos.TaxGroups, g => n(g.TotalTax))
    && n(pos.TotalNoTax) === sum(pos.TaxGroups, g => n(g.TotalForTax)))
  add('Σ Payments = Total', sum(pos.Payments, p => n(p.Amount)) === n(pos.Total), `${sum(pos.Payments, p => n(p.Amount))} ≠ ${pos.Total}`)
  add('TotalDiscount = Σ zbritjeve', n(pos.TotalDiscount) === calc.totalDiscount)
  add('CitizenCoupon = PosCoupon (id, kohë, totale, grupe)',
    ['BusinessId', 'CouponId', 'BranchId', 'PosId', 'VerificationNo', 'Type', 'Time', 'Total', 'TotalTax', 'TotalNoTax']
      .every(k => String(cit[k]) === String(pos[k])) && JSON.stringify(cit.TaxGroups) === JSON.stringify(pos.TaxGroups))
  add('VerificationNo 16 karaktere', String(pos.VerificationNo).length === 16)
  add('Nënshkrimi i PosCoupon verifikohet (ECDSA P-256)', verifySignature(c.posPayload, c.posSignature, pub))
  add('Nënshkrimi i QR (CitizenCoupon) verifikohet', verifySignature(citB64, citSig, pub))
  return out
}

// ── Testet e referencës: shembujt zyrtarë nga "Kërkesat Specifike Teknike" (ATK, Maj 2026) ──
function goldenTests(): Check[] {
  const P = [{ type: 'cash' as const, amount: 10_000_000 }]
  const cases: { name: string; input: Omit<CalcInput, 'payments' | 'vatRegistered'>; total: number; tax: Record<string, number> }[] = [
    { name: 'Shtojca F — kupon i rregullt (2 × 2.5012, 3 × 1.5068)', total: 1292, tax: { D: 37, E: 121 },
      input: { items: [I('Qumësht', 2.5012, 2, 'D'), I('Coca Cola', 1.5068, 3, 'E'), I('Energy Drink', 1.70, 2, 'E')] } },
    { name: 'Shtojca F — ulje 10% në artikull', total: 1240, tax: { D: 33, E: 121 },
      input: { items: [I('Qumësht', 2.5, 2, 'D', 'cope', { kind: 'percent', value: 10 }), I('Coca Cola', 1.5, 3, 'E'), I('Energy Drink', 1.7, 2, 'E')] } },
    { name: 'Shtojca F — ulje 10% në total', total: 1161, tax: { D: 33, E: 108 },
      input: { saleDiscount: { kind: 'percent', value: 10 }, items: [I('Qumësht', 2.5, 2, 'D'), I('Coca Cola', 1.5, 3, 'E'), I('Energy Drink', 1.7, 2, 'E')] } },
    { name: 'Shtojca B — ulje 20% në artikull', total: 530, tax: { D: 6, E: 69 },
      input: { items: [I('Qumësht', 0.5, 2, 'D', 'cope', { kind: 'percent', value: 20 }), I('Ice Tea', 1.5, 3, 'E')] } },
    { name: 'Shtojca B — ulje €2.00 në artikull', total: 1800, tax: { D: 78, E: 114 },
      input: { items: [I('Qumësht', 2.5, 5, 'D', 'cope', { kind: 'amount', value: 200 }), I('Coca Cola', 1.5, 5, 'E')] } },
    { name: 'Shtojca C/G — karburant 40 L × 1.25', total: 5000, tax: { E: 763 },
      input: { items: [I('Benzina 95', 1.25, 40, 'E', 'L')] } },
    { name: 'Neni 25.18 — artikujt identikë bashkohen në një rresht', total: 750, tax: { E: 114 },
      input: { items: [I('Coca Cola', 1.5, 2, 'E'), I('Coca Cola', 1.5, 3, 'E')] } },
  ]
  return cases.map(c => {
    const r = calculate({ ...c.input, vatRegistered: true, payments: P })
    const tax = Object.fromEntries(r.taxGroups.filter(g => g.totalTax > 0).map(g => [g.taxRate, g.totalTax]))
    const merged = c.name.startsWith('Neni 25.18') ? r.lines.length === 1 : true
    const ok = merged && r.total === c.total && JSON.stringify(tax) === JSON.stringify(c.tax)
    return { name: c.name, ok, detail: ok ? undefined : `total ${r.total} (pritet ${c.total}), TVSH ${JSON.stringify(tax)} (pritet ${JSON.stringify(c.tax)})` }
  })
}

// ── Kuponi i printuar për çdo skenar ─────────────────────────────
function receiptTotals(c: CalcResult): ReceiptTotals {
  return {
    lines: c.lines.map(l => ({ name: l.name, unit: l.unit, quantity: l.quantity, unitPrice: l.originalUnitPrice,
      grossTotal: l.grossTotal, itemDiscount: l.itemDiscount, itemDiscountSpec: l.itemDiscountSpec, taxRate: l.taxRate })),
    subtotal: c.subtotal, saleDiscount: c.saleDiscount, total: c.total, taxGroups: c.taxGroups,
    totalNoTax: c.totalNoTax, payments: c.payments, tendered: c.tendered, change: c.change,
  }
}

// ── Ekzekutimi ──────────────────────────────────────────────────
async function main() {
  const report: any[] = []
  let failures = 0
  let couponId = Number(env('ATK_TEST_COUPON_START', String(Math.floor(Date.now() / 1000))))

  const golden = goldenTests()
  for (const g of golden) {
    console.log(`${g.ok ? '✅' : '❌'} ${g.name}${g.detail ? ' — ' + g.detail : ''}`)
    if (!g.ok) failures++
  }
  mkdirSync('atk-receipts', { recursive: true })

  let clockOffset = 0
  if (LIVE) {
    const sync = await measureClockOffset('TEST')
    clockOffset = sync?.offsetMs ?? 0
    console.log(`🕐 Ora ATK: ${sync ? `devijim ${Math.round(clockOffset)}ms, RTT ${sync.roundTripMs}ms` : 'nuk u mat (serveri s\'ktheu Date)'}`)
  }

  for (const subject of subjects) {
    console.log(`\n━━ ${subject.label} (NUI ${subject.meta.businessId}) ━━`)
    const pub = publicKeyFromPrivate(subject.key)
    const done = new Map<string, { calc: CalcResult; coupon: BuiltCoupon }>()
    const chain: StoredLink[] = []
    let prev = GENESIS_HASH

    for (const sc of scenarios) {
      let calc: CalcResult
      let referenceNo = 0
      try {
        if (sc.type === 'SALE') calc = calculate(fixPayments(sc.input!, subject.vat))
        else {
          const orig = done.get(sc.refOf!)
          if (!orig) throw new Error(`Mungon kuponi origjinal ${sc.refOf}`)
          calc = calculate(reverseInput(orig.calc, subject.vat, sc.returnQty))
          referenceNo = orig.coupon.couponId
        }
      } catch (e) {
        failures++; console.log(`❌ ${sc.id} ${sc.title}: ${(e as Error).message}`); continue
      }

      const coupon = buildCoupon({ meta: subject.meta, calc, couponId: ++couponId, type: sc.type, referenceNo,
        time: atkUnixTime(clockOffset), privateKeyPem: subject.key })
      const link = computeLink({ couponId: coupon.couponId, time: coupon.time, previousHash: prev, payloadBase64: coupon.posPayload, signature: coupon.posSignature })
      chain.push({ id: sc.id, couponId: coupon.couponId, time: coupon.time, previousHash: prev, payloadBase64: coupon.posPayload, signature: coupon.posSignature, ...link })
      prev = link.currentHash

      const results = checks(coupon, calc, pub)
      let atk: Awaited<ReturnType<typeof submitPosCoupon>> | null = null
      if (LIVE) {
        atk = await submitPosCoupon('TEST', coupon.posPayload, coupon.posSignature)
        results.push({ name: 'ATK TEST e pranoi kuponin', ok: atk.outcome === 'accepted', detail: `${atk.httpStatus ?? '-'} ${atk.error ?? ''}` })
      }
      const bad = results.filter(r => !r.ok)
      failures += bad.length
      done.set(sc.id, { calc, coupon })

      // Kuponi i printuar (HTML 80mm + tekst 48 kolona)
      const orig = sc.refOf ? done.get(sc.refOf) : undefined
      const dailyNo = [...done.keys()].length
      const rin: ReceiptInput = {
        ...receiptTotals(calc),
        business: { name: 'Fiscalix Test SH.P.K.', nui: String(subject.meta.businessId), vatNumber: subject.vat ? '330000000' : null, vatRegistered: subject.vat, freeText: 'Faleminderit!' },
        unit: { name: 'Njësia 1', address: 'Rr. Mbretëresha Teutë 12', city: subject.meta.location, phone: '+383 44 000 000', number: '5130484' },
        posId: subject.meta.posId, environment: 'TEST', operator: { name: subject.meta.operatorId, code: '01' },
        type: sc.type, couponId: coupon.couponId, dailyNo, issuedAt: new Date(coupon.time * 1000),
        verificationNo: coupon.verificationNo, qrCode: coupon.qrCode, issuedOffline: false,
        reference: orig ? { ...receiptTotals(orig.calc), dailyNo: [...done.keys()].indexOf(sc.refOf!) + 1, issuedAt: new Date(orig.coupon.time * 1000), couponId: orig.coupon.couponId } : undefined,
        cancelReason: sc.type === 'CANCEL' ? 'Gabim gjatë shtypjes' : null,
      }
      const rows = buildReceiptRows(rin)
      const html = renderReceiptHtml(rows, { qrDataUrl: await QRCode.toDataURL(coupon.qrCode, { errorCorrectionLevel: 'M', margin: 1, scale: 6 }), paperMm: 80 })
      const file = `atk-receipts/${subject.vat ? 'tvsh' : 'jo-tvsh'}-${sc.id}-${sc.type.toLowerCase()}`
      writeFileSync(`${file}.html`, html)
      writeFileSync(`${file}.txt`, renderReceiptText(rows, 48))
      const txt = renderReceiptText(rows, 48)
      const must = ['NF-NUI', 'EMRI I PUNËTORIT', 'TOTALI PA TVSH', 'NR. IDENTIFIKUES I SEF', 'NUIKF', 'KUPON FISKAL DITOR NR.', 'e-kupon', 'DATA DHE ORA']
      const missing = must.filter(m => !txt.includes(m))
      if (sc.type === 'CANCEL' && !txt.includes('ARSYEJA E ANULIMIT')) missing.push('ARSYEJA E ANULIMIT')
      if (sc.type === 'RETURN' && !txt.includes('TOTALI I MBETUR')) missing.push('TOTALI I MBETUR')
      if (subject.vat && !txt.includes('NUMRI I TVSH-SË')) missing.push('NUMRI I TVSH-SË')
      if (missing.length) { failures++; console.log(`     ↳ Kuponi i printuar: mungon ${missing.join(', ')}`) }

      console.log(`${bad.length ? '❌' : '✅'} ${sc.id} ${sc.type.padEnd(6)} #${coupon.couponId}${referenceNo ? ` ref #${referenceNo}` : ''} — ${sc.title}`)
      console.log(`     Total €${(calc.total / 100).toFixed(2)} | TVSH €${(calc.totalTax / 100).toFixed(2)} | Zbritje €${(calc.totalDiscount / 100).toFixed(2)} | ` +
        calc.taxGroups.map(g => `${g.taxRate}:${g.totalForTax}+${g.totalTax}`).join(' ') + ` | ` +
        calc.payments.map(p => `${p.type} ${p.amount}`).join(' + ') + (calc.change ? ` (kusur ${calc.change})` : '') +
        (atk?.transactionId ? ` | ATK tx ${atk.transactionId}` : ''))
      bad.forEach(b => console.log(`     ↳ ${b.name}: ${b.detail ?? ''}`))

      report.push({ subject: subject.label, scenario: sc.id, title: sc.title, type: sc.type, couponId: coupon.couponId, referenceNo,
        verificationNo: coupon.verificationNo, total: calc.total, totalTax: calc.totalTax, totalNoTax: calc.totalNoTax,
        totalDiscount: calc.totalDiscount, taxGroups: calc.taxGroups, payments: calc.payments, change: calc.change,
        items: calc.lines, checks: results, atk, qrCode: coupon.qrCode, payload: coupon.posPayload, signature: coupon.posSignature,
        previousHash: link.previousHash, currentHash: link.currentHash, integrityCheck: link.integrityCheck })
    }

    // Integriteti i zinxhirit + test manipulimi
    const v = verifyChain(chain)
    const tampered = chain.map((l, i) => i === 2 ? { ...l, payloadBase64: l.payloadBase64.replace(/.$/, c => (c === 'A' ? 'B' : 'A')) } : l)
    const t = verifyChain(tampered)
    const removed = verifyChain(chain.filter((_, i) => i !== 1))
    const chainOk = v.valid && !t.valid && !removed.valid
    if (!chainOk) failures++
    console.log(`${chainOk ? '✅' : '❌'} Hash chain: ${v.checked} lidhje valide; ndryshimi i payload-it u kap (${t.brokenAt?.reason}); fshirja u kap (${removed.brokenAt?.reason})`)
  }

  writeFileSync('atk-report.json', JSON.stringify({ generatedAt: new Date().toISOString(), live: LIVE, golden, failures, report }, null, 2))
  writeFileSync('atk-report.md', renderMarkdown(report, golden))
  console.log(`\n${failures ? `❌ ${failures} kontrolle dështuan` : '✅ Të gjitha kontrollet kaluan'} — raporti: atk-report.md, atk-report.json`)
  process.exit(failures ? 1 : 0)
}

function renderMarkdown(rows: any[], golden: Check[]): string {
  const eur = (c: number) => `€${(c / 100).toFixed(2)}`
  const lines = [`# Fiscalix — Raporti i testimit SEF`, ``, `Gjeneruar: ${new Date().toLocaleString('sq-AL')} · Modaliteti: ${LIVE ? 'ATK TEST (live)' : 'Verifikim lokal'}`, ``,
    `Shembujt zyrtarë (Kërkesat Specifike Teknike, Maj 2026): ${golden.every(g => g.ok) ? '✅ të gjithë identikë' : '❌ ' + golden.filter(g => !g.ok).map(g => g.name).join(', ')}`, ``]
  for (const r of rows) {
    lines.push(`## ${r.subject} · ${r.scenario} · ${r.type} #${r.couponId}${r.referenceNo ? ` (ref #${r.referenceNo})` : ''}`, ``, r.title, ``,
      `| Artikulli | Sasia | Çmimi pas zbritjes | Zbritja | Totali | Norma |`, `|---|---:|---:|---:|---:|:---:|`,
      ...r.items.map((i: any) => `| ${i.name} | ${i.quantity} ${i.unit} | €${(i.unitPrice / 10000).toFixed(4)} | ${eur(i.discount)} | ${eur(i.total)} | ${i.taxRate} |`),
      ``, `Totali **${eur(r.total)}** · pa TVSH ${eur(r.totalNoTax)} · TVSH ${eur(r.totalTax)} · zbritje ${eur(r.totalDiscount)}`,
      `Pagesa: ${r.payments.map((p: any) => `${p.type} ${eur(p.amount)}`).join(' + ')}${r.change ? ` · kusur ${eur(r.change)}` : ''}`,
      r.atk ? `ATK: ${r.atk.outcome} ${r.atk.transactionId ? `· transaction ${r.atk.transactionId}` : ''} ${r.atk.error ?? ''}` : '',
      `Hash: \`${r.currentHash.slice(0, 16)}…\` ← \`${r.previousHash.slice(0, 16)}…\``,
      ``, `Kontrollet: ${r.checks.every((c: Check) => c.ok) ? '✅ të gjitha' : r.checks.filter((c: Check) => !c.ok).map((c: Check) => '❌ ' + c.name).join(', ')}`, ``)
  }
  return lines.join('\n')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
