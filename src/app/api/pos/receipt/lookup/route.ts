// POST /api/pos/receipt/lookup — gjen shitjen nga QR-ja e kuponit (unike për çdo kupon).
// Lejon që çdo ekran i arkës të printojë kuponin zyrtar nga serveri, edhe kur s'e ka saleId.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nuk jeni i autentikuar' }, { status: 401 })
  const { data: me } = await db.from('users').select('company_id').eq('id', user.id).single()
  if (!me?.company_id) return NextResponse.json({ error: 'Kompania nuk u gjet' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { qr?: string }
  if (!body.qr || typeof body.qr !== 'string') return NextResponse.json({ error: 'Mungon QR' }, { status: 400 })

  const { data } = await db.from('sales').select('id')
    .eq('company_id', me.company_id).eq('qr_code_data', body.qr)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!data) return NextResponse.json({ error: 'Kuponi nuk u gjet' }, { status: 404 })
  return NextResponse.json({ saleId: data.id })
}
