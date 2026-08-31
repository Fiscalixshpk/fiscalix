import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status, fulfilled_document_id } = await req.json()
  const update: Record<string, unknown> = {}
  if (status) update.status = status
  if (fulfilled_document_id) update.fulfilled_document_id = fulfilled_document_id
  if (status === 'fulfilled') update.fulfilled_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('document_requests')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ request: data })
}
