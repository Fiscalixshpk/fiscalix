import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireAccountantAccess, checkCompanyOwnership } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'

async function checkAccess(userId: string, role: string, profile: { company_id: string | null; role: string }, companyId: string) {
  if (role === 'accountant') {
    return requireAccountantAccess(userId, companyId)
  }
  return checkCompanyOwnership(profile as never, companyId)
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { user, profile } = auth

  const companyId = req.nextUrl.searchParams.get('company_id')
  const unreadOnly = req.nextUrl.searchParams.get('unread_only') === '1'
  if (!companyId) return NextResponse.json({ error: 'company_id mungon' }, { status: 400 })

  const denied = await checkAccess(user.id, profile.role, profile, companyId)
  if (denied) return denied

  const supabase = await createClient()

  // Mënyra "vetëm kontrollo" — për badge-in e widget-it, NUK shenjon si lexuar
  if (unreadOnly) {
    const { data, error } = await supabase
      .from('client_messages')
      .select('id, sender_id')
      .eq('company_id', companyId)
      .eq('is_read', false)
      .neq('sender_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ messages: data || [] })
  }

  const { data, error } = await supabase
    .from('client_messages')
    .select('*, sender:sender_id(full_name, role)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[GET /api/accountant/messages]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mark as read for current user — vetëm kur useri vërtet hap bisedën, jo gjatë polling
  await supabase
    .from('client_messages')
    .update({ is_read: true })
    .eq('company_id', companyId)
    .neq('sender_id', user.id)
    .eq('is_read', false)

  return NextResponse.json({ messages: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { user, profile } = auth

  const { company_id, message, attachment_document_id } = await req.json()
  if (!company_id || !message?.trim()) {
    return NextResponse.json({ error: 'company_id dhe message janë të detyrueshme' }, { status: 400 })
  }

  const denied = await checkAccess(user.id, profile.role, profile, company_id)
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('client_messages')
    .insert({
      company_id,
      sender_id: user.id,
      message: message.trim(),
      attachment_document_id: attachment_document_id || null,
    })
    .select('*, sender:sender_id(full_name, role)')
    .single()

  if (error) {
    console.error('[POST /api/accountant/messages] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Shënim: mesazhet NUK krijojnë më notification te 🔔 — widget-i flotant
  // (badge i kuq mbi ikonën e chat-it) është mënyra e vetme e njoftimit tani.

  await logAudit({ user_id: user.id, company_id, action: 'document_uploaded', entity_type: 'message', entity_id: data.id, description: 'Mesazh i dërguar' })

  return NextResponse.json({ message: data })
}
