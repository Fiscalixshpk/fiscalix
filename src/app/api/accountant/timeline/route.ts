import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireAccountantAccess, checkCompanyOwnership } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { user, profile } = auth
  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) return NextResponse.json({ error: 'company_id mungon' }, { status: 400 })

  // Authorization: kontabilisti duhet të ketë marrëdhënie aktive me këtë kompani
  // business_owner mund të shohë vetëm kompaninë e vet
  if (profile.role === 'accountant') {
    const denied = await requireAccountantAccess(user.id, companyId)
    if (denied) return denied
  } else {
    const denied = checkCompanyOwnership(profile, companyId)
    if (denied) return denied
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, action, entity_type, description, created_at, user:user_id(full_name, role)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[GET /api/accountant/timeline]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ activities: data || [] })
}
