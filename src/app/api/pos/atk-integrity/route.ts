// GET /api/pos/atk-integrity — verifikon hash chain-in e çdo pajisjeje të kompanisë + statusin e orës
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyChain, type StoredLink } from '@/lib/atk/hash-chain'
import { measureClockOffset, MAX_CLOCK_DRIFT_MS } from '@/lib/atk/transport'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nuk jeni i autentikuar' }, { status: 401 })
  const { data: me } = await db.from('users').select('company_id').eq('id', user.id).single()
  if (!me?.company_id) return NextResponse.json({ error: 'Kompania nuk u gjet' }, { status: 403 })

  const { data: devices } = await db.from('pos_devices').select('id, device_name, pos_id, environment, clock_offset_ms, clock_synced_at').eq('company_id', me.company_id)

  const result = []
  for (const d of devices ?? []) {
    const links: StoredLink[] = []
    for (let from = 0; ; from += 1000) {
      const { data } = await db.from('atk_logs')
        .select('id, coupon_id, coupon_time, previous_hash, payload_base64, signature, current_hash, integrity_check')
        .eq('pos_device_id', d.id).order('chain_seq', { ascending: true }).range(from, from + 999)
      if (!data?.length) break
      links.push(...data.map(r => ({ id: r.id, couponId: Number(r.coupon_id), time: Number(r.coupon_time), previousHash: r.previous_hash,
        payloadBase64: r.payload_base64, signature: r.signature, currentHash: r.current_hash, integrityCheck: r.integrity_check })))
      if (data.length < 1000) break
    }
    const { count: pending } = await db.from('atk_logs').select('id', { count: 'exact', head: true })
      .eq('pos_device_id', d.id).in('status', ['pending', 'offline'])
    const clock = await measureClockOffset(d.environment === 'PROD' ? 'PROD' : 'TEST')
    if (clock) await db.from('pos_devices').update({ clock_offset_ms: Math.round(clock.offsetMs), clock_synced_at: new Date().toISOString() }).eq('id', d.id)

    result.push({
      device: { id: d.id, name: d.device_name, posId: d.pos_id, environment: d.environment },
      chain: verifyChain(links),
      pendingOffline: pending ?? 0,
      clock: clock
        ? { offsetMs: Math.round(clock.offsetMs), withinTolerance: Math.abs(clock.offsetMs) <= MAX_CLOCK_DRIFT_MS, measuredAt: new Date().toISOString() }
        : { offsetMs: d.clock_offset_ms, withinTolerance: null, measuredAt: d.clock_synced_at, note: 'ATK s\'u arrit — përdoret devijimi i fundit i njohur' },
    })
  }
  return NextResponse.json({ devices: result })
}
