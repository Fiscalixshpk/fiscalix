// GET /api/pos/offline-kit?reserve=1 — gjithçka që i duhet arkës për të punuar pa internet.
// Thirret kur arka hapet (online) dhe kur mbaron blloku i numrave.
//   - çelësi i nënshkrimit (PKCS#8) → shfletuesi e importon si JO të eksportueshëm
//   - bllok numrash kuponi i rezervuar për këtë arkë (kronologji pa përplasje)
//   - numri ditor aktual, devijimi i orës, kategoritë ATK të produkteve
//   - të dhënat e kokës së kuponit (Neni 25.18)
import { NextRequest, NextResponse } from 'next/server'
import { createPrivateKey } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { FiscalError, loadFiscalContext } from '@/lib/atk/service'
import { fiscalDay } from '@/lib/atk/receipt'

export const dynamic = 'force-dynamic'
const BLOCK_SIZE = 200

export async function GET(req: NextRequest) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nuk jeni i autentikuar' }, { status: 401 })
  const { data: me } = await db.from('users').select('company_id').eq('id', user.id).single()
  if (!me?.company_id) return NextResponse.json({ error: 'Kompania nuk u gjet' }, { status: 403 })

  try {
    const ctx = await loadFiscalContext(db, me.company_id)
    const now = new Date(Date.now() + ctx.device.clockOffsetMs)

    let block: { start: number; end: number } | null = null
    if (new URL(req.url).searchParams.get('reserve') === '1') {
      const { data, error } = await db.rpc('atk_reserve_coupon_block', { p_company_id: me.company_id, p_device_id: ctx.device.id, p_count: BLOCK_SIZE })
      if (error) throw new FiscalError(`Blloku i numrave nuk u rezervua: ${error.message}`, 500)
      const row = Array.isArray(data) ? data[0] : data
      block = { start: Number(row.start_no), end: Number(row.end_no) }
    }

    const [{ data: daily }, { data: company }, { data: device }, { data: products }] = await Promise.all([
      db.rpc('atk_current_daily_no', { p_device_id: ctx.device.id, p_day: fiscalDay(now) }),
      db.from('companies').select('name, nui, tax_number, vat_number, vat_number_atk, is_vat_registered, logo_url, address, city, location_city, phone, receipt_footer').eq('id', me.company_id).single(),
      db.from('pos_devices').select('device_name, unit_number, unit_name, unit_address, unit_city, unit_phone').eq('id', ctx.device.id).single(),
      db.from('pos_products').select('id, atk_category').eq('company_id', me.company_id),
    ])

    const pkcs8 = createPrivateKey(ctx.device.privateKeyPem).export({ type: 'pkcs8', format: 'pem' }).toString()

    return NextResponse.json({
      version: 1,
      deviceId: ctx.device.id,
      environment: ctx.device.environment,
      clockOffsetMs: ctx.device.clockOffsetMs,
      vatRegistered: ctx.vatRegistered,
      meta: { businessId: ctx.nui, branchId: ctx.device.branchId, posId: ctx.device.posId, applicationId: ctx.device.applicationId, location: ctx.location },
      privateKeyPkcs8: pkcs8,
      block,
      dailyNo: { day: fiscalDay(now), value: Number(daily) || 0 },
      categories: Object.fromEntries((products ?? []).map(p => [p.id, p.atk_category || 'TT'])),
      receipt: {
        business: {
          name: company?.name ?? '',
          nui: String(ctx.nui),
          vatNumber: company?.vat_number_atk || company?.vat_number || null,
          vatRegistered: ctx.vatRegistered,
          logoUrl: company?.logo_url || null,
          freeText: company?.receipt_footer || null,
        },
        unit: {
          name: device?.unit_name || company?.name || '',
          address: device?.unit_address || company?.address || '—',
          city: device?.unit_city || company?.location_city || company?.city || 'Kosovë',
          phone: device?.unit_phone || company?.phone || null,
          number: device?.unit_number || String(ctx.device.branchId),
        },
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    const status = err instanceof FiscalError ? err.status : 500
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Gabim' }, { status })
  }
}
