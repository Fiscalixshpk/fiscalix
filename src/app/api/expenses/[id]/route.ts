import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api-auth'
import { expenseAudit } from '@/lib/audit'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { user, profile } = auth
  if (!profile.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const body = await req.json()

  // Whitelist — parandalon injektim të company_id ose fushave të ndjeshme nga body
  const allowed: Record<string, unknown> = {}
  const ALLOWED_FIELDS = ['vendor_name', 'amount', 'expense_date', 'category_id', 'description', 'notes', 'payment_method', 'receipt_url']
  for (const key of ALLOWED_FIELDS) {
    if (key in body) allowed[key] = body[key]
  }
  allowed.updated_at = new Date().toISOString()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .update(allowed)
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/expenses/[id]]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await expenseAudit('update_expense', user.id, profile.company_id, id, body.amount)

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { user, profile } = auth
  if (!profile.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const supabase = await createClient()

  // Fetch first to get amount for audit log
  const { data: expense } = await supabase
    .from('expenses')
    .select('id, amount')
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .maybeSingle()

  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('company_id', profile.company_id)

  if (error) {
    console.error('[DELETE /api/expenses/[id]]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await expenseAudit('delete_expense', user.id, profile.company_id, id, expense.amount)

  return NextResponse.json({ success: true })
}
