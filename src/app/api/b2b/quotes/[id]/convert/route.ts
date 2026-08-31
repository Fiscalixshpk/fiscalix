import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: quote } = await supabase
      .from('quotes').select('*, items:quote_items(*)').eq('id', params.id).single()
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
    const invNum = 'F-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4)

    const { data: invoice, error } = await supabase.from('invoices').insert({
      company_id: userData?.company_id,
      invoice_number: invNum,
      client_name: quote.client_name,
      client_email: quote.client_email,
      status: 'draft',
      notes: quote.notes,
      total: quote.total,
    }).select().single()
    if (error) throw error

    if (quote.items?.length) {
      await supabase.from('invoice_items').insert(
        quote.items.map((it: any) => ({
          invoice_id: invoice.id, name: it.name,
          quantity: it.quantity, unit_price: it.unit_price,
          tax_rate: it.tax_rate, total: it.total,
        }))
      )
    }

    await supabase.from('quotes').update({ status: 'converted', converted_to_invoice_id: invoice.id }).eq('id', params.id)
    return NextResponse.json({ success: true, invoice_id: invoice.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
