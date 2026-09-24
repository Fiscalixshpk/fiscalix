'use client'
// Motori offline i arkës (Neni 26.12, 28.6).
//
// Kur arka është online, shkarkon "kit-in": çelësin e nënshkrimit (i importuar si JO i eksportueshëm),
// një bllok numrash kuponi vetëm për këtë arkë, numrin ditor dhe kokën e kuponit.
// Çdo shitje merr numrin nga blloku i arkës — online ose offline — kështu radha nuk prishet kurrë.
// Pa internet: llogaritja, protobuf-i, nënshkrimi dhe QR-ja bëhen këtu; kuponi printohet me "OFFLINE"
// dhe ruhet në IndexedDB. Kur kthehet interneti, dërgohen me radhë te /api/pos/offline-sync.

import { calculateSale, parseDiscount, parsePayments, parseSaleItems } from '../sale-input'
import { buildCouponModels } from '../coupon-core'
import { importSigningKey, signBase64 } from '../browser-signer'
import { buildReceiptRows, fiscalDay, renderReceiptHtml, type ReceiptInput } from '../receipt'
import type { CalcResult } from '../calc'

// ── IndexedDB ─────────────────────────────────────────────────────
const DB_NAME = 'fiscalix-offline'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'couponId' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(store: 'kv' | 'queue', mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const r = fn(t.objectStore(store))
    t.oncomplete = () => { resolve(r ? (r as IDBRequest<T>).result : undefined); db.close() }
    t.onerror = () => { reject(t.error); db.close() }
  })
}
const kvGet = <T>(key: string) => tx<T>('kv', 'readonly', s => s.get(key) as IDBRequest<T>)
const kvSet = (key: string, value: unknown) => tx('kv', 'readwrite', s => { s.put(value, key) })

// ── Kit-i ─────────────────────────────────────────────────────────
export interface OfflineKit {
  version: number
  deviceId: string
  environment: 'TEST' | 'PROD'
  clockOffsetMs: number
  vatRegistered: boolean
  meta: { businessId: number; branchId: number; posId: number; applicationId: number; location: string }
  block: { start: number; end: number } | null
  dailyNo: { day: string; value: number }
  categories: Record<string, string>
  receipt: { business: ReceiptInput['business']; unit: ReceiptInput['unit'] }
}
interface Sequence { deviceId: string; ranges: { start: number; end: number }[]; next: number }
interface Daily { day: string; value: number }

export interface QueuedCoupon {
  couponId: number
  dailyNo: number
  time: number
  verificationNo: string
  operator: string
  posPayload: string
  posSignature: string
  qrCode: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sale: any
  createdAt: number
  lastError?: string
}

const LOW_WATER = 30

function remaining(seq: Sequence | undefined): number {
  if (!seq) return 0
  let n = 0
  for (const r of seq.ranges) n += Math.max(0, r.end - Math.max(r.start, seq.next) + 1)
  return n
}

/** Shkarko/rifresko kit-in. Rezervon bllok të ri kur numrat janë pak. */
export async function refreshKit(): Promise<OfflineKit | null> {
  const seq = await kvGet<Sequence>('seq')
  const currentKit = await kvGet<OfflineKit>('kit')
  const needBlock = !seq || remaining(seq) < LOW_WATER || (currentKit && seq.deviceId !== currentKit.deviceId)
  const res = await fetch(`/api/pos/offline-kit${needBlock ? '?reserve=1' : ''}`, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json() as OfflineKit & { privateKeyPkcs8: string }

  const key = await importSigningKey(data.privateKeyPkcs8)
  const { privateKeyPkcs8: _drop, ...kit } = data
  void _drop
  await kvSet('signingKey', key)          // CryptoKey jo i eksportueshëm — ruhet si objekt, jo si tekst
  await kvSet('kit', kit)

  // Numrat e kuponit: vazhdo bllokun ekzistues, shto të riun në fund
  let s: Sequence = seq && seq.deviceId === kit.deviceId ? seq : { deviceId: kit.deviceId, ranges: [], next: 0 }
  if (kit.block) {
    s.ranges = [...s.ranges.filter(r => r.end >= s.next), kit.block]
    if (!s.next || s.next > s.ranges[0].end) s.next = s.ranges[0].start
  }
  if (!s.ranges.length) s = { deviceId: kit.deviceId, ranges: [], next: 0 }
  await kvSet('seq', s)

  // Numri ditor: kurrë mbrapa
  const d = await kvGet<Daily>('daily')
  const value = d && d.day === kit.dailyNo.day ? Math.max(d.value, kit.dailyNo.value) : kit.dailyNo.value
  await kvSet('daily', { day: kit.dailyNo.day, value })
  return kit
}

export async function getKit() { return kvGet<OfflineKit>('kit') }
export async function hasKit() { return !!(await kvGet<OfflineKit>('kit')) && !!(await kvGet<CryptoKey>('signingKey')) }

/** Merr numrin e radhës të kuponit dhe numrin ditor (i njëjti burim për online dhe offline) */
async function takeNumbers(time: Date): Promise<{ couponId: number; dailyNo: number }> {
  const s = await kvGet<Sequence>('seq')
  if (!s || !s.ranges.length) throw new Error('Arka s\'ka numra kuponi — lidhu me internet një herë që të shkarkohen')
  while (s.ranges.length && s.next > s.ranges[0].end) {
    s.ranges.shift()
    if (s.ranges.length) s.next = s.ranges[0].start
  }
  if (!s.ranges.length) throw new Error('Mbaruan numrat e kuponit offline — lidhu me internet')
  const couponId = s.next
  s.next += 1
  await kvSet('seq', s)

  const day = fiscalDay(time)
  const d = await kvGet<Daily>('daily')
  const dailyNo = (d && d.day === day ? d.value : 0) + 1
  await kvSet('daily', { day, value: dailyNo })
  return { couponId, dailyNo }
}

/** Për shitjen online: numrat nga blloku i arkës (null nëse arka s'ka kit → serveri jep numrat) */
export async function numbersForOnlineSale(): Promise<{ couponId: number; dailyNo: number } | null> {
  if (!(await hasKit())) return null
  const kit = (await getKit())!
  return takeNumbers(new Date(Date.now() + kit.clockOffsetMs))
}

/** Pas përgjigjes online: sinkronizo numrin ditor me serverin */
export async function acknowledgeOnlineSale(dailyNo: number | undefined) {
  if (!dailyNo) return
  const kit = await getKit()
  const day = fiscalDay(new Date(Date.now() + (kit?.clockOffsetMs ?? 0)))
  const d = await kvGet<Daily>('daily')
  await kvSet('daily', { day, value: Math.max(dailyNo, d && d.day === day ? d.value : 0) })
}

// ── Shitja offline ─────────────────────────────────────────────────
export interface OfflineSaleResult {
  couponId: number
  dailyNo: number
  verificationNo: string
  qrCode: string
  calc: CalcResult
  receipt: ReceiptInput
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createOfflineSale(sale: any, operator: string, operatorCode?: string | null): Promise<OfflineSaleResult> {
  const kit = await getKit()
  const key = await kvGet<CryptoKey>('signingKey')
  if (!kit || !key) throw new Error('Arka nuk është përgatitur për offline — hape një herë me internet')

  const items = parseSaleItems(sale.items)
  for (const i of items) if (i.productId) i.itemType = kit.categories[i.productId] ?? 'TT'
  const calc = calculateSale({
    items, vatRegistered: kit.vatRegistered,
    saleDiscount: parseDiscount(sale.saleDiscount), payments: parsePayments(sale),
  })

  const issuedAt = new Date(Date.now() + kit.clockOffsetMs)
  const time = Math.floor(issuedAt.getTime() / 1000)
  const { couponId, dailyNo } = await takeNumbers(issuedAt)
  const op = (operator || 'Operator').slice(0, 64)

  const m = buildCouponModels({ meta: { ...kit.meta, operatorId: op }, calc, couponId, type: 'SALE', referenceNo: 0, time })
  const posSignature = await signBase64(key, m.posPayload)
  const qrCode = `${m.citizenPayload}|${await signBase64(key, m.citizenPayload)}`

  const record: QueuedCoupon = {
    couponId, dailyNo, time, verificationNo: m.verificationNo, operator: op,
    posPayload: m.posPayload, posSignature, qrCode, sale, createdAt: Date.now(),
  }
  await tx('queue', 'readwrite', s => { s.put(record) })

  const receipt: ReceiptInput = {
    lines: calc.lines.map(l => ({ name: l.name, unit: l.unit, quantity: l.quantity, unitPrice: l.originalUnitPrice,
      grossTotal: l.grossTotal, itemDiscount: l.itemDiscount, itemDiscountSpec: l.itemDiscountSpec, taxRate: l.taxRate })),
    subtotal: calc.subtotal, saleDiscount: calc.saleDiscount, total: calc.total, taxGroups: calc.taxGroups,
    totalNoTax: calc.totalNoTax, payments: calc.payments, tendered: calc.tendered, change: calc.change,
    business: kit.receipt.business, unit: kit.receipt.unit, posId: kit.meta.posId, environment: kit.environment,
    operator: { name: op, code: operatorCode ?? null }, type: 'SALE', couponId, dailyNo, issuedAt,
    verificationNo: m.verificationNo, qrCode, issuedOffline: true,
  }
  return { couponId, dailyNo, verificationNo: m.verificationNo, qrCode, calc, receipt }
}

/** Printon kuponin offline direkt nga arka (pa server) */
export async function printOfflineReceipt(receipt: ReceiptInput, paperMm: 58 | 80) {
  const QRCode = (await import('qrcode')).default
  const qrDataUrl = await QRCode.toDataURL(receipt.qrCode, { errorCorrectionLevel: 'M', margin: 1, scale: 6 })
  const html = renderReceiptHtml(buildReceiptRows(receipt), { qrDataUrl, paperMm, autoPrint: true, title: `Kupon ${receipt.couponId}` })
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  if (!doc) { frame.remove(); return }
  doc.open(); doc.write(html); doc.close()
  setTimeout(() => frame.remove(), 60_000)
}

// ── Radha dhe sinkronizimi ─────────────────────────────────────────
export async function pendingCoupons(): Promise<QueuedCoupon[]> {
  return (await tx<QueuedCoupon[]>('queue', 'readonly', s => s.getAll() as IDBRequest<QueuedCoupon[]>)) ?? []
}

let syncing: Promise<{ sent: number; failed: number; remaining: number }> | null = null

/** Dërgon kuponët offline me radhë. I sigurt për thirrje të shumëfishta. */
export function syncPending() {
  if (syncing) return syncing
  syncing = (async () => {
    let sent = 0, failed = 0
    try {
      const queue = (await pendingCoupons()).sort((a, b) => a.couponId - b.couponId)
      for (let i = 0; i < queue.length; i += 20) {
        const batch = queue.slice(i, i + 20)
        const res = await fetch('/api/pos/offline-sync', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coupons: batch.map(({ createdAt: _c, lastError: _e, ...c }) => { void _c; void _e; return c }) }),
        })
        if (!res.ok) break
        const { results } = await res.json() as { results: { couponId: number; ok: boolean; status: string; error?: string }[] }
        for (const r of results) {
          if (r.ok || r.status === 'duplicate' || r.status === 'offline') {
            await tx('queue', 'readwrite', s => { s.delete(r.couponId) }); sent++
          } else {
            failed++
            const rec = batch.find(b => b.couponId === r.couponId)
            if (rec) await tx('queue', 'readwrite', s => { s.put({ ...rec, lastError: r.error ?? r.status }) })
          }
        }
      }
    } catch { /* ende pa internet — provohet sërish */ }
    const left = (await pendingCoupons()).length
    return { sent, failed, remaining: left }
  })().finally(() => { syncing = null })
  return syncing
}

/** Gabim rrjeti (pa internet / serveri s'arrihet) — jo gabim i vlefshmërisë */
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError'))
}
