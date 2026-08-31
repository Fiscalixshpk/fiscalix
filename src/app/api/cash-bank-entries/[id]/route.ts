import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireAccountantAccess, checkCompanyOwnership } from '@/lib/api-auth'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { user, profile } = auth

  const supabase = await createClient()
  const { data: entry } = await supabase.from('cash_bank_entries').select('company_id').eq('id', id).maybeSingle()
  if (!entry) return NextResponse.json({ error: 'Hyrja nuk u gjet' }, { status: 404 })

  if (profile.role === 'accountant') {
    const denied = await requireAccountantAccess(user.id, entry.company_id)
    if (denied) return denied
  } else {
    const denied = checkCompanyOwnership(profile, entry.company_id)
    if (denied) return denied
  }

  const { error } = await supabase.from('cash_bank_entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
