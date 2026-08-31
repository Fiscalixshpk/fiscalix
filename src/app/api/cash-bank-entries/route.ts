import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireAccountantAccess, checkCompanyOwnership } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { user, profile } = auth

  const companyId = req.nextUrl.searchParams.get('company_id')
  const entryType = req.nextUrl.searchParams.get('entry_type') // 'cash' | 'bank'
  if (!companyId) return NextResponse.json({ error: 'company_id mungon' }, { status: 400 })

  if (profile.role === 'accountant') {
    const denied = await requireAccountantAccess(user.id, companyId)
    if (denied) return denied
  } else {
    const denied = checkCompanyOwnership(profile, companyId)
    if (denied) return denied
  }

  const supabase = await createClient()
  let query = supabase
    .from('cash_bank_entries')
    .select('*')
    .eq('company_id', companyId)
    .order('entry_date', { ascending: false })
    .limit(200)

  if (entryType) query = query.eq('entry_type', entryType)

  const { data, error } = await query

  if (error) {
    console.error('[GET /api/cash-bank-entries]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Lookup manual i emrave të llogarive (jo embed) — më e sigurt
  const { data: accounts } = await supabase.from('chart_of_accounts').select('code, name_sq')
  const accountNameByCode = new Map((accounts || []).map(a => [a.code, a.name_sq]))
  const entriesWithNames = (data || []).map(e => ({
    ...e,
    chart_of_accounts: { name_sq: accountNameByCode.get(e.account_code) || e.account_code },
  }))

  return NextResponse.json({ entries: entriesWithNames })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { user, profile } = auth

  const { company_id, account_code, entry_type, bank_name, entry_date, description, direction, amount } = await req.json()

  if (!company_id || !account_code || !entry_type || !entry_date || !description || !direction || amount === undefined) {
    return NextResponse.json({ error: 'Të gjitha fushat janë të detyrueshme' }, { status: 400 })
  }
  if (!['cash', 'bank'].includes(entry_type)) return NextResponse.json({ error: 'entry_type i pavlefshëm' }, { status: 400 })
  if (!['in', 'out'].includes(direction)) return NextResponse.json({ error: 'direction i pavlefshëm' }, { status: 400 })

  if (profile.role === 'accountant') {
    const denied = await requireAccountantAccess(user.id, company_id)
    if (denied) return denied
  } else {
    const denied = checkCompanyOwnership(profile, company_id)
    if (denied) return denied
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cash_bank_entries')
    .insert({
      company_id, account_code, entry_type,
      bank_name: entry_type === 'bank' ? (bank_name || null) : null,
      entry_date, description, direction,
      amount: Number(amount),
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[POST /api/cash-bank-entries]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: account } = await supabase.from('chart_of_accounts').select('name_sq').eq('code', account_code).maybeSingle()
  const entryWithName = { ...data, chart_of_accounts: { name_sq: account?.name_sq || account_code } }

  await logAudit({
    user_id: user.id, company_id,
    action: entry_type === 'cash' ? 'create_expense' : 'create_expense', // riperdor action ekzistuese për audit log type
    entity_type: 'cash_bank_entry', entity_id: data.id,
    description: `${entry_type === 'cash' ? 'Arka' : 'Banka'}: ${description} (${direction === 'in' ? '+' : '-'}€${amount})`,
  })

  return NextResponse.json({ entry: entryWithName })
}
