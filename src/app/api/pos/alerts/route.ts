// GET /api/pos/alerts
// Kthen alertet aktive: stok i ulët, offline queue, failed sales
// Thirret nga dashboard i biznesit çdo 5 min

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ alerts: [] })

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id) return NextResponse.json({ alerts: [] })

  const companyId = userData.company_id
  const alerts: { type: string; level: 'warning' | 'error'; message: string }[] = []

  // 1. Kuponë offline pa sinkronizuar
  const { count: offlineCount } = await supabase
    .from('pos_offline_queue').select('id', { count: 'exact', head: true })
    .eq('company_id', companyId).is('synced_at', null).lt('attempts', 5)

  if ((offlineCount ?? 0) > 0) {
    const deadline48h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: urgentCount } = await supabase
      .from('pos_offline_queue').select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).is('synced_at', null).lte('created_at', deadline48h)

    alerts.push({
      type: 'offline_queue',
      level: (urgentCount ?? 0) > 0 ? 'error' : 'warning',
      message: (urgentCount ?? 0) > 0
        ? `${urgentCount} kuponë offline URGJENTË — afati 48h po kalon!`
        : `${offlineCount} kuponë offline — do të dërgohen automatikisht`,
    })
  }

  // 2. Shitje të dështuara
  const { count: failedCount } = await supabase
    .from('sales').select('id', { count: 'exact', head: true })
    .eq('company_id', companyId).eq('status', 'failed')
    .gte('issued_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if ((failedCount ?? 0) > 0) {
    alerts.push({
      type: 'failed_sales',
      level: 'error',
      message: `${failedCount} shitje të dështuara sot — kontrollo fiskalizimin`,
    })
  }

  // 3. Stok i ulët (< 5)
  const { data: lowStock } = await supabase
    .from('pos_products').select('name, stock')
    .eq('company_id', companyId).eq('is_active', true)
    .not('stock', 'is', null).lt('stock', 5).gt('stock', 0)

  if ((lowStock?.length ?? 0) > 0) {
    const names = lowStock!.slice(0, 3).map(p => `${p.name} (${p.stock})`).join(', ')
    alerts.push({
      type: 'low_stock',
      level: 'warning',
      message: `Stok i ulët: ${names}${(lowStock!.length > 3) ? ` +${lowStock!.length - 3} të tjerë` : ''}`,
    })
  }

  // 4. Produkte me stok 0
  const { count: zeroStock } = await supabase
    .from('pos_products').select('id', { count: 'exact', head: true })
    .eq('company_id', companyId).eq('is_active', true).eq('stock', 0)

  if ((zeroStock ?? 0) > 0) {
    alerts.push({
      type: 'zero_stock',
      level: 'error',
      message: `${zeroStock} produkte me stok 0 — janë joaktivë automatikisht`,
    })
  }

  return NextResponse.json({ alerts })
}
