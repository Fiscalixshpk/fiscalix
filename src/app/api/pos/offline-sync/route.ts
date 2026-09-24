// POST /api/pos/offline-sync — kuponët e lëshuar pa internet, të nënshkruar në arkë.
//
// Për secilin kupon serveri:
//   1. rillogarit shitjen nga artikujt dhe e rindërton protobuf-in → duhet të jetë IDENTIK me atë të nënshkruar
//   2. verifikon nënshkrimin me certifikatën e arkës
//   3. kontrollon që numri i kuponit i përket bllokut të kësaj arke
//   4. e ruan shitjen (issued_offline), e fut në hash chain dhe e dërgon te ATK — me radhë
// Idempotent: nëse kuponi është ruajtur tashmë (p.sh. përgjigjja humbi), kthehet si "i sinkronizuar".
import { NextResponse } from 'next/server'
import { X509Certificate } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import {
  CalcError, FiscalError, applyItemCategories, assertCouponInBlock, calculateSale, couponMeta,
  loadFiscalContext, parseDiscount, parsePayments, parseSaleItems, submitBuiltCoupon,
} from '@/lib/atk/service'
import { buildCouponModels } from '@/lib/atk/coupon-core'
import { verifySignature, publicKeyFromPrivate } from '@/lib/atk/signer'
import { fiscalDay } from '@/lib/atk/receipt'
import { finalizeSale, insertSale } from '@/lib/atk/sale-store'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface OfflineCoupon {
  couponId: number
  dailyNo: number
  time: number               // Unix, ora e arkës (me devijimin e ATK)
  verificationNo: string
  operator: string
  posPayload: string
  posSignature: string
  qrCode: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sale: any                  // i njëjti body si /api/pos/fiscalize (items, saleDiscount, payments…)
}

export async function POST(req: Request) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nuk jeni i autentikuar' }, { status: 401 })
  const { data: me } = await db.from('users').select('company_id').eq('id', user.id).single()
  if (!me?.company_id) return NextResponse.json({ error: 'Kompania nuk u gjet' }, { status: 403 })

  const body = await req.json().catch(() => null) as { coupons?: OfflineCoupon[] } | null
  const coupons = (body?.coupons ?? []).slice().sort((a, b) => a.couponId - b.couponId)
  if (!coupons.length) return NextResponse.json({ results: [] })

  let ctx
  try { ctx = await loadFiscalContext(db, me.company_id) }
  catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Gabim' }, { status: 422 }) }

  const publicKey = ctx.device.certificatePem
    ? new X509Certificate(ctx.device.certificatePem).publicKey.export({ type: 'spki', format: 'pem' }).toString()
    : publicKeyFromPrivate(ctx.device.privateKeyPem)

  const results: { couponId: number; ok: boolean; status: string; saleId?: string; error?: string }[] = []

  for (const c of coupons) {
    try {
      const { data: existing } = await db.from('sales').select('id, status').eq('company_id', me.company_id).eq('coupon_id', c.couponId).maybeSingle()
      if (existing) { results.push({ couponId: c.couponId, ok: true, status: 'duplicate', saleId: existing.id }); continue }

      await assertCouponInBlock(db, ctx.device.id, c.couponId)

      const now = Math.floor(Date.now() / 1000)
      if (!Number.isSafeInteger(c.time) || c.time > now + 300) throw new FiscalError('Ora e kuponit offline është në të ardhmen')

      const items = parseSaleItems(c.sale?.items)
      await applyItemCategories(db, me.company_id, items)
      const calc = calculateSale({
        items, vatRegistered: ctx.vatRegistered,
        saleDiscount: parseDiscount(c.sale?.saleDiscount), payments: parsePayments(c.sale ?? {}),
      })
      const operator = String(c.operator || 'Operator').slice(0, 64)
      const models = buildCouponModels({ meta: couponMeta(ctx, operator), calc, couponId: c.couponId, type: 'SALE', referenceNo: 0, time: c.time, verificationNo: c.verificationNo })

      const [citizenB64, citizenSig] = String(c.qrCode).split('|')
      if (models.posPayload !== c.posPayload) throw new FiscalError('Kuponi offline nuk përputhet me artikujt (payload i ndryshuar)')
      if (models.citizenPayload !== citizenB64) throw new FiscalError('QR e kuponit offline nuk përputhet')
      if (!verifySignature(c.posPayload, c.posSignature, publicKey) || !verifySignature(citizenB64, citizenSig, publicKey)) {
        throw new FiscalError('Nënshkrimi i kuponit offline është i pavlefshëm')
      }

      const issuedAt = new Date(c.time * 1000)
      await db.rpc('atk_set_daily_no', { p_device_id: ctx.device.id, p_day: fiscalDay(issuedAt), p_value: Math.max(1, Number(c.dailyNo) || 1) })

      const saleId = await insertSale(db, ctx, {
        companyId: me.company_id, cashierId: user.id, couponId: c.couponId, dailyNo: Number(c.dailyNo) || 1,
        calc, operator, notes: c.sale?.notes ?? null, issuedAt, issuedOffline: true,
      })
      const r = await submitBuiltCoupon(db, ctx, saleId, { ...models, posSignature: c.posSignature, qrCode: c.qrCode })
      await finalizeSale(db, saleId, calc, r, true)

      results.push({ couponId: c.couponId, ok: r.status !== 'failed', status: r.status, saleId, error: r.error ?? undefined })
    } catch (err) {
      const msg = err instanceof CalcError || err instanceof FiscalError || err instanceof Error ? err.message : 'Gabim'
      results.push({ couponId: c.couponId, ok: false, status: 'error', error: msg })
    }
  }
  return NextResponse.json({ results })
}
