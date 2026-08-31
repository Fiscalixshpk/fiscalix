import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireAccountantAccess } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { user, profile } = auth

  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) return NextResponse.json({ error: 'company_id mungon' }, { status: 400 })

  // Only accountants and admins can GET document requests; business owners see their own via billing/pending
  if (profile.role === 'accountant') {
    const denied = await requireAccountantAccess(user.id, companyId)
    if (denied) return denied
  } else if (profile.role !== 'admin' && profile.company_id !== companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('document_requests')
    .select('*')
    .eq('company_id', companyId)
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/accountant/document-requests]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ requests: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { user, profile } = auth

  if (profile.role !== 'accountant' && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Vetëm kontabilistët mund të dërgojnë kërkesa dokumentesh' }, { status: 403 })
  }

  const { company_id, title, description, due_date } = await req.json()
  if (!company_id || !title?.trim()) {
    return NextResponse.json({ error: 'company_id dhe title janë të detyrueshme' }, { status: 400 })
  }

  if (profile.role === 'accountant') {
    const denied = await requireAccountantAccess(user.id, company_id)
    if (denied) return denied
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('document_requests')
    .insert({
      accountant_id: user.id,
      company_id,
      title: title.trim(),
      description: description || null,
      due_date: due_date || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/accountant/document-requests]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notify business owner
  try {
    const { data: owners } = await supabase.from('users').select('id').eq('company_id', company_id).eq('role', 'business_owner')
    if (owners?.length) {
      await supabase.from('notifications').insert(owners.map(u => ({
        user_id: u.id, company_id,
        title: 'Dokument i kërkuar',
        message: `Kontabilisti ka kërkuar: ${title.trim()}`,
        type: 'document_request',
      })))
    }
  } catch {}

  await logAudit({ user_id: user.id, company_id, action: 'document_request_created', entity_type: 'document_request', entity_id: data.id, description: title.trim() })

  return NextResponse.json({ request: data })
}
