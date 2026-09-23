// GET /api/pos/receipt/:saleId — kuponi fiskal zyrtar (Neni 25.18, Shtojca F)
//   ?format=html (default) | json | text
//   ?paper=58 | 80   (letër termike, Neni 26.13)
//   ?print=1         hap dialogun e printimit (printimi i parë = origjinal, pastaj KOPJE)
//   ?copy=1          detyron "KOPJE E KUPONIT"
//   ?preview=1       "Print Preview" (Neni 25.18) — nuk e shënon si të printuar
import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import { buildReceiptRows, renderReceiptHtml, renderReceiptText } from '@/lib/atk/receipt'
import { loadReceiptInput, ReceiptError } from '@/lib/atk/receipt-data'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await params
  const q = new URL(req.url).searchParams
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nuk jeni i autentikuar' }, { status: 401 })
  const { data: me } = await db.from('users').select('company_id').eq('id', user.id).single()
  if (!me?.company_id) return NextResponse.json({ error: 'Kompania nuk u gjet' }, { status: 403 })

  try {
    const preview = q.get('preview') === '1'
    const input = await loadReceiptInput(db, saleId, {
      companyId: me.company_id, forceCopy: q.get('copy') === '1', markPrinted: q.get('print') === '1' && !preview,
    })
    const rows = buildReceiptRows(input)
    const format = q.get('format') ?? 'html'

    if (format === 'json') return NextResponse.json({ receipt: input, rows })
    if (format === 'text') {
      const cols = q.get('paper') === '58' ? 32 : 48
      return new NextResponse(renderReceiptText(rows, cols), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
    }

    // QR: niveli M, pa logo brenda (Neni 8.14), min 12×12mm në letër
    const qrDataUrl = await QRCode.toDataURL(input.qrCode, { errorCorrectionLevel: 'M', margin: 1, scale: 6 })
    const html = renderReceiptHtml(rows, {
      qrDataUrl, paperMm: q.get('paper') === '58' ? 58 : 80, autoPrint: q.get('print') === '1' && !preview,
      title: `Kupon ${input.couponId}`,
    })
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (err instanceof ReceiptError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[receipt]', err)
    return NextResponse.json({ error: 'Kuponi nuk u gjenerua' }, { status: 500 })
  }
}
