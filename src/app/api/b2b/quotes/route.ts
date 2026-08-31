import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { items, ...quoteData } = body

    const { data: quote, error } = await supabase
      .from('quotes').insert(quoteData).select().single()
    if (error) throw error

    if (items?.length) {
      await supabase.from('quote_items').insert(
        items.map((it: any, i: number) => ({ ...it, quote_id: quote.id, sort_order: i }))
      )
    }

    return NextResponse.json({ success: true, quote })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
