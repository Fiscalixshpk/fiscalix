import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

async function getCID(s: Awaited<ReturnType<typeof createClient>>, uid: string) {
  const { data } = await s.from('users').select('company_id').eq('id', uid).single()
  return data?.company_id as string | null
}

export async function GET() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cid = await getCID(s, user.id)
  const { data } = await s.from('pos_waiters').select('*').eq('company_id', cid).eq('is_active', true).order('name')
  return NextResponse.json({ waiters: data || [] })
}

export async function POST(req: NextRequest) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cid = await getCID(s, user.id)
  if (!cid) return NextResponse.json({ error: 'No company' }, { status: 403 })
  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'Emri është i detyrueshëm' }, { status: 400 })
  const { data, error } = await s.from('pos_waiters').insert({
    company_id: cid, name: body.name.trim(), pin: body.pin || '0000',
    color: body.color || '#9B5CF8', is_active: true,
    rfid_tag: body.rfid_tag || null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ waiter: data })
}

export async function DELETE(req: NextRequest) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cid = await getCID(s, user.id)
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await s.from('pos_waiters').update({ is_active: false }).eq('id', id).eq('company_id', cid)
  return NextResponse.json({ success: true })
}

export async function PUT(req: NextRequest) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cid = await getCID(s, user.id)
  if (!cid) return NextResponse.json({ error: 'No company' }, { status: 403 })
  const body = await req.json()
  const { id, rfid_tag, name, color } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updates: Record<string, unknown> = {}
  if (rfid_tag !== undefined) updates.rfid_tag = rfid_tag || null
  if (name)  updates.name  = name.trim()
  if (color) updates.color = color
  const { error } = await s.from('pos_waiters').update(updates).eq('id', id).eq('company_id', cid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
