// /api/pos/verify-device — kontroll gatishmërie i pajisjes POS, PA dërguar kupon fiskal.
// (Versioni i vjetër dërgonte kupon real me CouponId 99999 → dublikatë dhe kupon i rremë në PROD.)
//
// Kontrollon: çelësi ECDSA P-256 lexohet, certifikata i përket çelësit, ATK arrihet, ora sinkronizohet.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { X509Certificate } from 'crypto'
import { decryptPrivateKey } from '@/lib/atk/keys'
import { loadPrivateKey, publicKeyFromPrivate } from '@/lib/atk/signer'
import { measureClockOffset, MAX_CLOCK_DRIFT_MS } from '@/lib/atk/transport'

export const dynamic = 'force-dynamic'

async function check(companyIdParam: string | null, environment: string | null) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'Nuk jeni i autentikuar' }, { status: 401 })
  const { data: me } = await db.from('users').select('company_id').eq('id', user.id).single()
  const companyId = companyIdParam || me?.company_id
  if (!companyId || companyId !== me?.company_id) return NextResponse.json({ success: false, error: 'Kompani e pavlefshme' }, { status: 403 })

  let q = db.from('pos_devices').select('id, pos_id, branch_id, application_id, environment, status, private_key_enc, certificate_pem')
    .eq('company_id', companyId).in('status', ['onboarded', 'active']).order('created_at').limit(1)
  if (environment) q = q.eq('environment', environment)
  const { data: device } = await q.maybeSingle()
  if (!device) return NextResponse.json({ success: false, error: 'Pajisja nuk u gjet' }, { status: 404 })

  const checks: { name: string; ok: boolean; detail?: string }[] = []
  let pem = ''
  try { pem = decryptPrivateKey(device.private_key_enc ?? ''); loadPrivateKey(pem); checks.push({ name: 'Çelësi privat ECDSA P-256', ok: true }) }
  catch (e) { checks.push({ name: 'Çelësi privat ECDSA P-256', ok: false, detail: (e as Error).message }) }

  if (device.certificate_pem && pem) {
    try {
      const cert = new X509Certificate(device.certificate_pem)
      const matches = cert.publicKey.export({ type: 'spki', format: 'pem' }).toString() === publicKeyFromPrivate(pem)
      const valid = new Date(cert.validTo) > new Date()
      checks.push({ name: 'Certifikata i përket çelësit', ok: matches })
      checks.push({ name: 'Certifikata e vlefshme', ok: valid, detail: `skadon ${cert.validTo}` })
    } catch (e) { checks.push({ name: 'Certifikata', ok: false, detail: (e as Error).message }) }
  } else {
    checks.push({ name: 'Certifikata', ok: false, detail: 'Mungon — përsërit onboarding-un' })
  }

  checks.push({ name: 'ApplicationId', ok: !!device.application_id })

  const env = device.environment === 'PROD' ? 'PROD' : 'TEST'
  const clock = await measureClockOffset(env)
  checks.push({ name: `ATK ${env} arrihet`, ok: !!clock })
  if (clock) {
    checks.push({ name: 'Ora e sinkronizuar me ATK', ok: Math.abs(clock.offsetMs) <= MAX_CLOCK_DRIFT_MS, detail: `devijim ${Math.round(clock.offsetMs)}ms` })
    await db.from('pos_devices').update({ clock_offset_ms: Math.round(clock.offsetMs), clock_synced_at: new Date().toISOString() }).eq('id', device.id)
  }

  const failed = checks.filter(c => !c.ok)
  return NextResponse.json({
    success: failed.length === 0,
    error: failed.length ? failed.map(f => `${f.name}${f.detail ? ` (${f.detail})` : ''}`).join('; ') : undefined,
    checks,
    device: { id: device.id, posId: device.pos_id, branchId: device.branch_id, environment: env },
  })
}

export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams
  return check(p.get('companyId'), p.get('environment'))
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return check(body.companyId ?? null, body.environment ?? null)
}
