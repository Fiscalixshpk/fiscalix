// GET /api/pos/atk-logs/export?from=YYYY-MM-DD&to=YYYY-MM-DD — eksport i log-ve për auditim (Neni 26.7), CSV
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const COLS = ['created_at', 'coupon_id', 'coupon_type', 'reference_no', 'verification_no', 'environment', 'status', 'attempts',
  'http_status', 'transaction_id', 'error', 'previous_hash', 'current_hash', 'integrity_check', 'last_attempt_at', 'accepted_at'] as const

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(req: NextRequest) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nuk jeni i autentikuar' }, { status: 401 })
  const { data: me } = await db.from('users').select('company_id').eq('id', user.id).single()
  if (!me?.company_id) return NextResponse.json({ error: 'Kompania nuk u gjet' }, { status: 403 })

  const q = new URL(req.url).searchParams
  const lines = [COLS.join(',')]
  for (let from = 0; ; from += 1000) {
    let query = db.from('atk_logs').select(COLS.join(', ')).eq('company_id', me.company_id).order('created_at').range(from, from + 999)
    if (q.get('from')) query = query.gte('created_at', q.get('from')!)
    if (q.get('to')) query = query.lt('created_at', new Date(new Date(q.get('to')!).getTime() + 86_400_000).toISOString())
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) lines.push(COLS.map(c => cell(r[c])).join(','))
    if (!data || data.length < 1000) break
  }
  return new NextResponse('\uFEFF' + lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="atk-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
