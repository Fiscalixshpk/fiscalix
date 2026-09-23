// Komunikimi me ATK + sinkronizimi i orës.

import { ATK_BASE_URL, type AtkEnvironment } from './constants'

export type SubmitOutcome = 'accepted' | 'rejected' | 'unreachable'

export interface SubmitResult {
  outcome: SubmitOutcome
  transactionId: string | null   // uint64 → string (tejkalon Number.MAX_SAFE_INTEGER)
  httpStatus: number | null
  responseBody: string | null
  error: string | null
  serverTime: number | null      // ms, nga header-i Date i ATK
  durationMs: number
}

const TIMEOUT_MS = 15_000

function extractTransactionId(body: string): string | null {
  const m = body.match(/"transaction_id"\s*:\s*"?(\d+)"?/)
  return m ? m[1] : null
}

function extractError(body: string, status: number): string {
  try {
    const j = JSON.parse(body) as { error?: string; message?: string }
    return j.error ?? j.message ?? `HTTP ${status}`
  } catch {
    return body.slice(0, 300) || `HTTP ${status}`
  }
}

function parseDate(res: Response): number | null {
  const d = res.headers.get('date')
  const t = d ? Date.parse(d) : NaN
  return Number.isFinite(t) ? t : null
}

/** POST /pos/coupon — kthen 'unreachable' vetëm për probleme rrjeti/disponueshmërie (→ radha offline) */
export async function submitPosCoupon(env: AtkEnvironment, details: string, signature: string): Promise<SubmitResult> {
  const started = Date.now()
  try {
    const res = await fetch(`${ATK_BASE_URL[env]}/pos/coupon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ details, signature }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })
    const body = await res.text()
    const base = { httpStatus: res.status, responseBody: body.slice(0, 4000), serverTime: parseDate(res), durationMs: Date.now() - started }

    if (res.ok) {
      const transactionId = extractTransactionId(body)
      return transactionId
        ? { ...base, outcome: 'accepted', transactionId, error: null }
        : { ...base, outcome: 'rejected', transactionId: null, error: 'ATK ktheu 200 pa transaction_id' }
    }

    // 502/503/504 ose 5xx pa JSON → shërbimi s'është në dispozicion → provo më vonë
    const isJson = body.trim().startsWith('{')
    if ([502, 503, 504].includes(res.status) || (res.status >= 500 && !isJson)) {
      return { ...base, outcome: 'unreachable', transactionId: null, error: extractError(body, res.status) }
    }
    return { ...base, outcome: 'rejected', transactionId: null, error: extractError(body, res.status) }
  } catch (err) {
    // TypeError: fetch failed (DNS, ECONNREFUSED, pa internet) | TimeoutError | AbortError
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    return { outcome: 'unreachable', transactionId: null, httpStatus: null, responseBody: null, error: msg, serverTime: null, durationMs: Date.now() - started }
  }
}

export interface ClockSync { offsetMs: number; roundTripMs: number; serverTime: number }

/**
 * Mat diferencën e orës lokale me serverin e ATK (header Date, precizion 1s).
 * offset > 0 → ora lokale është mbrapa.
 */
export async function measureClockOffset(env: AtkEnvironment): Promise<ClockSync | null> {
  try {
    const t0 = Date.now()
    const res = await fetch(`${ATK_BASE_URL[env]}/`, { method: 'HEAD', signal: AbortSignal.timeout(5_000), cache: 'no-store' })
    const t1 = Date.now()
    const serverTime = parseDate(res)
    if (serverTime === null) return null
    // Date është i rrumbullakosur poshtë në sekondë → +500ms për pritjen mesatare
    return { offsetMs: serverTime + 500 - (t0 + t1) / 2, roundTripMs: t1 - t0, serverTime }
  } catch {
    return null
  }
}

/** Ora e ATK-së e vlerësuar, në sekonda Unix (fusha Time e kuponit) */
export const atkUnixTime = (offsetMs: number, now = Date.now()) => Math.floor((now + offsetMs) / 1000)

/** Tolerance e pranueshme e devijimit të orës para se të paralajmërohet operatori */
export const MAX_CLOCK_DRIFT_MS = 60_000
