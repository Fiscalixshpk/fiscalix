import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, emailDocumentRequest } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { companyId, documents, deadline, month } = await req.json()
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })

  // Get accountant info
  const { data: accountant } = await supabase
    .from('users').select('full_name, email, phone').eq('id', user.id).single()

  // Get company info
  const { data: company } = await supabase
    .from('companies').select('name, email').eq('id', companyId).single()

  if (!company?.email) {
    return NextResponse.json({ error: 'Klienti nuk ka email' }, { status: 400 })
  }

  const now = new Date()
  const monthLabel = month || now.toLocaleString('sq-AL', { month: 'long', year: 'numeric' })
  const deadlineLabel = deadline || `20 ${monthLabel}`
  const docList = documents || [
    'Faturat e shitjes',
    'Faturat e blerjes',
    'Ekstrakti bankar',
  ]

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fiscalix.com'

  const template = emailDocumentRequest({
    clientName: company.name,
    accountantName: accountant?.full_name || 'Kontabilisti juaj',
    accountantEmail: accountant?.email || user.email || '',
    accountantPhone: accountant?.phone || undefined,
    month: monthLabel,
    deadline: deadlineLabel,
    documents: docList,
    uploadUrl: `${APP_URL}/documents`,
  })

  const result = await sendEmail({
    to: company.email,
    subject: template.subject,
    html: template.html,
    replyTo: accountant?.email || user.email,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Shto njoftim in-app te biznesi
  try {
    // Gjej user_id të biznesit (business_owner i kësaj kompanie)
    const { data: bizUser } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', companyId)
      .eq('role', 'business_owner')
      .maybeSingle()

    if (bizUser?.id) {
      await supabase.from('notifications').insert({
        user_id: bizUser.id,
        title: '📋 Dokumentet e muajit',
        message: `${accountant?.full_name || 'Kontabilisti juaj'} kërkon dokumentet e ${monthLabel}. Afati: ${deadlineLabel}.`,
        type: 'document_request',
        company_id: companyId,
        is_read: false,
      })
    }
  } catch {}

  // Log the reminder
  try {
    await supabase.from('activity_logs').insert({
      user_id: user.id, company_id: companyId,
      action: 'send_document_reminder',
      entity_type: 'company', entity_id: companyId,
      metadata: { documents: docList, month: monthLabel }
    })
  } catch {}

  return NextResponse.json({ success: true })
}
