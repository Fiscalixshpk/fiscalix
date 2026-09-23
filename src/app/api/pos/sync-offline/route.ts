// POST /api/pos/sync-offline — ridërgon kuponët offline të kompanisë (thirret kur POS kthehet online)
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FiscalError, syncPending } from '@/lib/atk/service'

export const dynamic = 'force-dynamic'

export async function POST() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nuk jeni i autentikuar' }, { status: 401 })

  const { data: me } = await db.from('users').select('company_id').eq('id', user.id).single()
  if (!me?.company_id) return NextResponse.json({ error: 'Kompania nuk u gjet' }, { status: 403 })

  try {
    return NextResponse.json(await syncPending(db, { companyId: me.company_id, limit: 50 }))
  } catch (err) {
    const status = err instanceof FiscalError ? err.status : 500
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Gabim' }, { status })
  }
}
