import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireAuth, requireAccountantAccess, checkCompanyOwnership } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { user, profile } = auth

  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) return NextResponse.json({ error: 'company_id mungon' }, { status: 400 })

  if (profile.role === 'accountant') {
    const denied = await requireAccountantAccess(user.id, companyId)
    if (denied) return denied
  } else {
    const denied = checkCompanyOwnership(profile, companyId)
    if (denied) return denied
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shared_documents')
    .select('*, uploader:uploaded_by(full_name, role)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/accountant/documents]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate signed URLs (private bucket)
  const admin = await createAdminClient()
  const docsWithUrls = await Promise.all(
    (data || []).map(async (doc) => {
      const { data: signedData } = await admin.storage
        .from('shared-documents')
        .createSignedUrl(doc.file_path, 3600)
      return { ...doc, url: signedData?.signedUrl || null }
    })
  )

  return NextResponse.json({ documents: docsWithUrls })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { user, profile } = auth

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const companyId = formData.get('company_id') as string
  const category = (formData.get('category') as string) || 'other'
  const requestId = (formData.get('request_id') as string) || null

  if (!file || !companyId) {
    return NextResponse.json({ error: 'file dhe company_id janë të detyrueshme' }, { status: 400 })
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: 'Skedari nuk duhet ta kalojë 15MB' }, { status: 400 })
  }

  // Verify access to this company
  if (profile.role === 'accountant') {
    const denied = await requireAccountantAccess(user.id, companyId)
    if (denied) return denied
  } else {
    const denied = checkCompanyOwnership(profile, companyId)
    if (denied) return denied
  }

  const admin = await createAdminClient()
  const ext = file.name.split('.').pop()
  const path = `${companyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error: uploadError } = await admin.storage
    .from('shared-documents')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[POST /api/accountant/documents] Upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: doc, error: dbError } = await supabase
    .from('shared_documents')
    .insert({
      company_id: companyId,
      uploaded_by: user.id,
      request_id: requestId,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      file_type: file.type,
      category,
    })
    .select()
    .single()

  if (dbError) {
    console.error('[POST /api/accountant/documents] DB error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // If this fulfills a document request, mark it fulfilled
  if (requestId) {
    await supabase.from('document_requests').update({
      status: 'fulfilled',
      fulfilled_document_id: doc.id,
      fulfilled_at: new Date().toISOString(),
    }).eq('id', requestId)
  }

  await logAudit({
    user_id: user.id,
    company_id: companyId,
    action: 'document_uploaded',
    entity_type: 'document',
    entity_id: doc.id,
    description: file.name,
    metadata: { size: file.size, type: file.type, request_id: requestId },
  })

  return NextResponse.json({ document: doc })
}
