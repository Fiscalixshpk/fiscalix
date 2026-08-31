import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = req.nextUrl.searchParams.get('company_id')!
  const year = req.nextUrl.searchParams.get('year') || new Date().getFullYear().toString()
  const month = req.nextUrl.searchParams.get('month') || (new Date().getMonth()+1).toString()

  const startDate = `${year}-${String(parseInt(month)).padStart(2,'0')}-01`
  const endDate = `${year}-${String(parseInt(month)).padStart(2,'0')}-31`

  // Get bank entries for period
  const { data: bankEntries } = await supabase
    .from('cash_bank_entries')
    .select('*')
    .eq('company_id', companyId)
    .eq('account_type', 'bank')
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .order('entry_date')

  // Get existing reconciliations
  const { data: reconciled } = await supabase
    .from('bank_reconciliation')
    .select('*')
    .eq('company_id', companyId)

  const reconciledEntryIds = new Set((reconciled||[]).map(r => r.bank_entry_id))

  // Get invoices for period (paid)
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, client_name, bill_to_name, total_amount, total, issue_date, due_date, status')
    .eq('company_id', companyId)
    .gte('issue_date', startDate)
    .lte('issue_date', endDate)

  // Auto-match logic: match by amount ±1€
  const matches: { entryId: string; invoiceId: string; confidence: number; amount: number }[] = []
  const entries = bankEntries || []
  const invs = invoices || []

  entries.filter(e => e.entry_type === 'hyrje').forEach(entry => {
    if (reconciledEntryIds.has(entry.id)) return
    const entryAmt = Number(entry.amount || 0)
    const match = invs.find(inv => {
      const invAmt = Number(inv.total_amount || inv.total || 0)
      return Math.abs(invAmt - entryAmt) <= 1 && inv.status !== 'paid'
    })
    if (match) {
      matches.push({ entryId: entry.id, invoiceId: match.id, confidence: 95, amount: entryAmt })
    }
  })

  return NextResponse.json({
    bankEntries: entries,
    invoices: invs,
    reconciled: reconciled || [],
    autoMatches: matches,
    stats: {
      total: entries.length,
      reconciled: reconciledEntryIds.size,
      unreconciled: entries.length - reconciledEntryIds.size,
      autoMatchFound: matches.length,
    }
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { company_id, bank_entry_id, invoice_id, expense_id, status, notes } = await req.json()

  // If matching with invoice, mark it as paid
  if (invoice_id) {
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoice_id)
  }

  const { data, error } = await supabase.from('bank_reconciliation').insert({
    company_id, bank_entry_id, invoice_id, expense_id,
    status: status || 'matched', notes, matched_by: user.id
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, invoice_id } = await req.json()
  await supabase.from('bank_reconciliation').delete().eq('id', id)
  if (invoice_id) {
    await supabase.from('invoices').update({ status: 'pending' }).eq('id', invoice_id)
  }
  return NextResponse.json({ success: true })
}
