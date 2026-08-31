// ============================================================
// app/api/pos/sync-offline/route.ts
// POST /api/pos/sync-offline
// ============================================================
// Ekzekutohet:
//  - Automatikisht kur POS kthehet online (nga client)
//  - Si cron job çdo 15 minuta (Vercel Cron / Supabase Edge)
// UA 01/2026 Neni 44: deadline 48 orë
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { NextResponse }             from 'next/server'
import { submitToATK }              from '@/lib/atk/fiscalizer'

export async function POST() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Merr company_id të userit
  const { data: user } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', session.user.id)
    .single()

  if (!user?.company_id) {
    return NextResponse.json({ error: 'No company' }, { status: 403 })
  }

  // Nxjerr kuponë offline pa sinkronizuar, brenda afatit
  const { data: queued } = await supabase
    .from('pos_offline_queue')
    .select(`
      id, sale_id, payload_json, attempts, deadline_at,
      pos_devices!inner(environment)
    `)
    .eq('company_id', user.company_id)
    .is('synced_at', null)
    .lt('attempts', 5)
    .order('created_at', { ascending: true })
    .limit(20)

  if (!queued?.length) {
    return NextResponse.json({ synced: 0, message: 'No pending receipts' })
  }

  let syncedCount  = 0
  let failedCount  = 0
  const results: { id: string; status: string; transactionId?: number }[] = []

  for (const item of queued) {
    const { posCoupon, privateKeyPem } = item.payload_json as {
      posCoupon:     object
      privateKeyPem: string
    }

    const environment = (item.pos_devices as { environment: 'TEST' | 'PROD' }).environment ?? 'TEST'

    const atkResult = await submitToATK(
      posCoupon as any,
      privateKeyPem,
      environment
    )

    if (atkResult.success) {
      // Update sale
      await supabase
        .from('sales')
        .update({
          status:             'fiscalized',
          atk_transaction_id: atkResult.transactionId,
          fiscalized_at:      new Date().toISOString(),
        })
        .eq('id', item.sale_id)

      // Mark synced
      await supabase
        .from('pos_offline_queue')
        .update({ synced_at: new Date().toISOString() })
        .eq('id', item.id)

      syncedCount++
      results.push({ id: item.id, status: 'synced', transactionId: atkResult.transactionId })

    } else {
      // Increment attempts
      await supabase
        .from('pos_offline_queue')
        .update({
          attempts:   item.attempts + 1,
          last_error: atkResult.error,
        })
        .eq('id', item.id)

      // Nëse ka kaluar deadline — shëno failed
      if (new Date() > new Date(item.deadline_at)) {
        await supabase
          .from('sales')
          .update({ status: 'failed', atk_error: 'Deadline expired (48h)' })
          .eq('id', item.sale_id)
      }

      failedCount++
      results.push({ id: item.id, status: 'failed' })
    }
  }

  return NextResponse.json({
    synced:  syncedCount,
    failed:  failedCount,
    results,
  })
}
