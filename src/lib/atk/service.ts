// Orkestrimi i fiskalizimit: ndërtim → nënshkrim → hash chain → log → dërgim → ruajtje.
// Përdoret nga /api/pos/fiscalize, /api/pos/cancel, /api/pos/sync-offline dhe cron.

import type { SupabaseClient } from '@supabase/supabase-js'
import { CalcError, type CalcItemInput, type CalcResult } from './calc'
import { buildCoupon, type BuiltCoupon } from './coupon'
import { GENESIS_HASH, OFFLINE_DEADLINE_HOURS, type AtkEnvironment, type CouponType } from './constants'
import { computeLink } from './hash-chain'
import { decryptPrivateKey } from './keys'
import { atkUnixTime, submitPosCoupon, type SubmitResult } from './transport'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>

export { CalcError }

// ── Konteksti: kompania + pajisja ─────────────────────────────────

export interface FiscalContext {
  companyId: string
  nui: number
  vatRegistered: boolean
  location: string
  device: {
    id: string; posId: number; branchId: number; applicationId: number
    environment: AtkEnvironment; clockOffsetMs: number; privateKeyPem: string; certificatePem: string | null
  }
}

/**
 * Mjedisi efektiv i ATK: PROD vetëm kur serveri e lejon (ATK_ENVIRONMENT=PROD pas certifikimit).
 * Deri atëherë çdo kupon shkon te TEST, edhe nëse pajisja është shënuar gabimisht PROD.
 */
export function effectiveEnvironment(deviceEnv: string | null | undefined): AtkEnvironment {
  return process.env.ATK_ENVIRONMENT === 'PROD' && deviceEnv === 'PROD' ? 'PROD' : 'TEST'
}

export class FiscalError extends Error {
  constructor(message: string, public readonly status = 422) { super(message); this.name = 'FiscalError' }
}

export async function loadFiscalContext(db: DB, companyId: string): Promise<FiscalContext> {
  const { data: company } = await db.from('companies')
    .select('id, nui, tax_number, location_city, pos_enabled, is_vat_registered, branch_id')
    .eq('id', companyId).single()
  if (!company) throw new FiscalError('Kompania nuk u gjet', 404)
  if (!company.pos_enabled) throw new FiscalError('POS nuk është aktivizuar për këtë kompani', 403)

  // Llogaritë e krijuara nga admin paneli e ruajnë NUI-n te tax_number
  const nui = Number(String(company.nui || company.tax_number || '').replace(/\D/g, ''))
  if (!nui) throw new FiscalError('NUI mungon — shtoje te Cilësimet → Kompania')

  const { data: device } = await db.from('pos_devices')
    .select('id, pos_id, branch_id, application_id, environment, status, private_key_enc, certificate_pem, clock_offset_ms')
    .eq('company_id', companyId).in('status', ['active', 'onboarded'])
    .not('private_key_enc', 'is', null)
    .order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (!device) throw new FiscalError('Nuk ka pajisje POS të regjistruar në ATK (onboarding)')
  if (!device.application_id) throw new FiscalError('ApplicationId i pajisjes mungon')

  return {
    companyId, nui,
    vatRegistered: company.is_vat_registered !== false,
    location: company.location_city || 'Kosovë',
    device: {
      id: device.id,
      posId: Number(device.pos_id),
      branchId: Number(device.branch_id ?? company.branch_id ?? 1),
      applicationId: Number(device.application_id),
      environment: effectiveEnvironment(device.environment),
      clockOffsetMs: Number(device.clock_offset_ms ?? 0),
      privateKeyPem: decryptPrivateKey(device.private_key_enc),
      certificatePem: device.certificate_pem ?? null,
    },
  }
}

export { parseDiscount, parseSaleItems, parsePayments, calculateSale } from './sale-input'

// ── Numri i kuponit (atomik, pa përsëritje) ──────────────────────

export async function nextCouponId(db: DB, companyId: string): Promise<number> {
  const { data, error } = await db.rpc('atk_next_coupon_id', { p_company_id: companyId })
  if (error || !data) throw new FiscalError(`Numri i kuponit nuk u gjenerua: ${error?.message ?? 'bosh'}`, 500)
  return Number(data)
}

/** Numri ditor i kuponit për pajisje ("KUPON FISKAL DITOR NR."), rifillon çdo ditë (ora e Kosovës) */
export async function nextDailyNo(db: DB, deviceId: string, day: string): Promise<number> {
  const { data, error } = await db.rpc('atk_next_daily_no', { p_device_id: deviceId, p_day: day })
  if (error || !data) throw new FiscalError(`Numri ditor nuk u gjenerua: ${error?.message ?? 'bosh'}`, 500)
  return Number(data)
}

// ── Kuponi: ndërto + zinxhir + dërgo ──────────────────────────────

export interface IssueResult {
  coupon: BuiltCoupon
  logId: string
  status: 'fiscalized' | 'offline' | 'failed'
  transactionId: string | null
  error: string | null
  chain: { previousHash: string; currentHash: string; integrityCheck: string }
}

export async function issueCoupon(db: DB, ctx: FiscalContext, args: {
  saleId: string; couponId: number; type: CouponType; referenceNo: number
  calc: CalcResult; operator: string; time?: number
}): Promise<IssueResult> {
  const time = args.time ?? atkUnixTime(ctx.device.clockOffsetMs)
  const coupon = buildCoupon({
    meta: couponMeta(ctx, args.operator),
    calc: args.calc, couponId: args.couponId, type: args.type, referenceNo: args.referenceNo,
    time, privateKeyPem: ctx.device.privateKeyPem,
  })
  return submitBuiltCoupon(db, ctx, args.saleId, coupon)
}

export function couponMeta(ctx: FiscalContext, operator: string) {
  return {
    businessId: ctx.nui, branchId: ctx.device.branchId, posId: ctx.device.posId,
    applicationId: ctx.device.applicationId, location: ctx.location, operatorId: operator || 'Operator',
  }
}

/** Kupon tashmë i nënshkruar (në server ose nga arka offline) → zinxhir + log + dërgim te ATK */
export async function submitBuiltCoupon(db: DB, ctx: FiscalContext, saleId: string, coupon: BuiltCoupon): Promise<IssueResult> {
  const { logId, chain } = await appendToChain(db, ctx, saleId, coupon)
  const result = await submitPosCoupon(ctx.device.environment, coupon.posPayload, coupon.posSignature)
  const status = await recordSubmission(db, ctx.device.id, logId, saleId, result, 1)
  return { coupon, logId, status, transactionId: result.transactionId, error: result.error, chain }
}

/** Numri i kuponit i dhënë nga arka duhet të jetë në një bllok të rezervuar për të */
export async function assertCouponInBlock(db: DB, deviceId: string, couponId: number) {
  const { data } = await db.from('atk_coupon_blocks').select('id')
    .eq('pos_device_id', deviceId).lte('start_no', couponId).gte('end_no', couponId).limit(1).maybeSingle()
  if (!data) throw new FiscalError(`Numri i kuponit ${couponId} nuk i përket kësaj arke`, 409)
}

/** Kategoria ATK (CouponItem.Type) merret nga produkti në databazë, jo nga klienti */
export async function applyItemCategories(db: DB, companyId: string, items: CalcItemInput[]) {
  const ids = [...new Set(items.map(i => i.productId).filter((x): x is string => !!x))]
  if (!ids.length) return
  const { data } = await db.from('pos_products').select('id, atk_category').in('id', ids).eq('company_id', companyId)
  const cat = new Map((data ?? []).map(p => [p.id as string, p.atk_category as string | null]))
  for (const i of items) if (i.productId) i.itemType = cat.get(i.productId) ?? null
}

async function appendToChain(db: DB, ctx: FiscalContext, saleId: string, c: BuiltCoupon) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: last } = await db.from('atk_logs')
      .select('chain_seq, current_hash').eq('pos_device_id', ctx.device.id)
      .order('chain_seq', { ascending: false }).limit(1).maybeSingle()

    const previousHash = last?.current_hash ?? GENESIS_HASH
    const chain = computeLink({ couponId: c.couponId, time: c.time, previousHash, payloadBase64: c.posPayload, signature: c.posSignature })

    const { data, error } = await db.from('atk_logs').insert({
      company_id: ctx.companyId, pos_device_id: ctx.device.id, sale_id: saleId,
      chain_seq: (last?.chain_seq ?? 0) + 1,
      coupon_id: c.couponId, coupon_type: c.type, reference_no: c.referenceNo, coupon_time: c.time,
      verification_no: c.verificationNo, environment: ctx.device.environment,
      payload_base64: c.posPayload, signature: c.posSignature, qr_code: c.qrCode,
      previous_hash: chain.previousHash, current_hash: chain.currentHash, integrity_check: chain.integrityCheck,
      clock_offset_ms: Math.round(ctx.device.clockOffsetMs),
      status: 'pending',
      deadline_at: new Date(c.time * 1000 + OFFLINE_DEADLINE_HOURS * 3_600_000).toISOString(),
    }).select('id').single()

    if (!error && data) return { logId: data.id as string, chain }
    if (error?.code !== '23505') throw new FiscalError(`Log-u ATK nuk u ruajt: ${error?.message}`, 500)
    // 23505 → një kupon tjetër u fut njëkohësisht në zinxhir; rilexo dhe provo prapë
  }
  throw new FiscalError('Hash chain: konflikt i përsëritur, provo sërish', 503)
}

/** Ruaj përgjigjen e ATK në log + shitje. Kthen statusin e shitjes. */
export async function recordSubmission(db: DB, deviceId: string, logId: string, saleId: string | null, r: SubmitResult, attempts: number) {
  const now = new Date().toISOString()
  const logStatus = r.outcome === 'accepted' ? 'accepted' : r.outcome === 'rejected' ? 'rejected' : 'offline'
  const saleStatus = r.outcome === 'accepted' ? 'fiscalized' : r.outcome === 'rejected' ? 'failed' : 'offline'

  await db.from('atk_logs').update({
    status: logStatus, attempts, http_status: r.httpStatus, response_body: r.responseBody,
    transaction_id: r.transactionId, error: r.error, last_attempt_at: now, duration_ms: r.durationMs,
    accepted_at: r.outcome === 'accepted' ? now : null,
  }).eq('id', logId)

  if (saleId) {
    await db.from('sales').update({
      status: saleStatus,
      atk_transaction_id: r.transactionId,
      atk_error: r.outcome === 'accepted' ? null : r.error,
      fiscalized_at: r.outcome === 'accepted' ? now : null,
    }).eq('id', saleId)
  }

  // Sinkronizim pasiv i orës nga çdo përgjigje e ATK
  if (r.serverTime) {
    const offset = r.serverTime + 500 - (Date.now() - r.durationMs / 2)
    await db.from('pos_devices').update({ clock_offset_ms: Math.round(offset), clock_synced_at: now }).eq('id', deviceId)
  }
  return saleStatus as 'fiscalized' | 'offline' | 'failed'
}

// ── Radha offline: ridërgo kuponët e nënshkruar, në rendin e zinxhirit ──

export interface SyncSummary { attempted: number; accepted: number; rejected: number; stillOffline: number; late: number }

export async function syncPending(db: DB, filter: { companyId?: string; limit?: number } = {}): Promise<SyncSummary> {
  let q = db.from('atk_logs')
    .select('id, pos_device_id, sale_id, environment, payload_base64, signature, attempts, deadline_at')
    .in('status', ['pending', 'offline'])
    .order('pos_device_id').order('chain_seq', { ascending: true })
    .limit(filter.limit ?? 100)
  if (filter.companyId) q = q.eq('company_id', filter.companyId)
  const { data: rows, error } = await q
  if (error) throw new FiscalError(error.message, 500)

  const summary: SyncSummary = { attempted: 0, accepted: 0, rejected: 0, stillOffline: 0, late: 0 }
  const blockedDevices = new Set<string>()

  for (const row of rows ?? []) {
    if (blockedDevices.has(row.pos_device_id)) { summary.stillOffline++; continue }
    summary.attempted++
    if (new Date(row.deadline_at) < new Date()) summary.late++

    const r = await submitPosCoupon(effectiveEnvironment(row.environment), row.payload_base64, row.signature)
    await recordSubmission(db, row.pos_device_id, row.id, row.sale_id, r, (row.attempts ?? 0) + 1)

    if (r.outcome === 'accepted') summary.accepted++
    else if (r.outcome === 'rejected') summary.rejected++
    else { summary.stillOffline++; blockedDevices.add(row.pos_device_id) } // ruaj rendin: mos kalo përpara
  }
  return summary
}
