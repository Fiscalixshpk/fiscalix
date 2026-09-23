// GET /api/cron/atk-sync — Vercel Cron: ridërgim automatik i kuponëve offline për të gjitha kompanitë
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { syncPending } from '@/lib/atk/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const db = await createAdminClient()
  const summary = await syncPending(db, { limit: 200 })
  return NextResponse.json({ ok: true, ...summary, at: new Date().toISOString() })
}
