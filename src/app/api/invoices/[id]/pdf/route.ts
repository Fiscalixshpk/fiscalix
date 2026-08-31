import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('role, company_id').eq('id', user.id).single()

  // Fetch invoice
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('id', id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Access check
  if (profile?.role === 'accountant') {
    const { data: rel } = await supabase
      .from('accountant_clients').select('id')
      .eq('accountant_id', user.id).eq('company_id', invoice.company_id).maybeSingle()
    if (!rel) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else if (invoice.company_id !== profile?.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Redirect to invoice page for download (client-side PDF generation)
  return NextResponse.redirect(new URL(`/invoices/${id}`, _req.url))
}
