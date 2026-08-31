import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { quote_id } = await req.json()

  const { data: quote } = await supabase
    .from('quotes').select('*, items:quote_items(*)').eq('id', quote_id).single()
  if (!quote) return NextResponse.json({ error: 'Oferta nuk u gjet' }, { status: 404 })

  // Auto-generate invoice number
  const { count } = await supabase.from('invoices').select('*', { count:'exact', head:true }).eq('company_id', quote.company_id)
  const invoiceNumber = `INV-${String((count||0)+1).padStart(4,'0')}`

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30)

  const { data: invoice, error } = await supabase.from('invoices').insert({
    company_id: quote.company_id,
    invoice_number: invoiceNumber,
    client_name: quote.client_name,
    client_email: quote.client_email,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: dueDate.toISOString().split('T')[0],
    status: 'pending',
    subtotal: quote.subtotal,
    tax_rate: quote.vat_rate,
    tax_amount: quote.vat_amount,
    total: quote.total_amount,
    total_amount: quote.total_amount,
    notes: quote.notes,
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Copy items
  if (quote.items && quote.items.length > 0) {
    await supabase.from('invoice_items').insert(
      quote.items.map((item: { description: string; quantity: number; unit_price: number; total: number }, i: number) => ({
        invoice_id: invoice.id, description: item.description,
        quantity: item.quantity, unit_price: item.unit_price, total: item.total, sort_order: i
      }))
    )
  }

  // Update quote status
  await supabase.from('quotes').update({ status: 'converted', converted_to_invoice_id: invoice.id }).eq('id', quote_id)

  return NextResponse.json({ invoice_id: invoice.id, invoice_number: invoiceNumber })
}
