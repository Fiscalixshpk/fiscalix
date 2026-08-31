import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getCID(supabase: any, userId: string) {
  const { data } = await supabase.from('users').select('company_id').eq('id', userId).single()
  return data?.company_id
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cid = await getCID(supabase, user.id)
  const { data } = await supabase.from('pos_categories').select('*').eq('company_id', cid).order('sort_order').order('name')
  return NextResponse.json({ categories: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cid = await getCID(supabase, user.id)
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Emri kërkohet' }, { status: 400 })
  const { data, error } = await supabase.from('pos_categories').insert({ company_id: cid, name: name.trim() }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cid = await getCID(supabase, user.id)
  const { id } = await req.json()
  await supabase.from('pos_categories').delete().eq('id', id).eq('company_id', cid)
  return NextResponse.json({ success: true })
}
