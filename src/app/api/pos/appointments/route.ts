// GET    ?date=2026-08-01    — terminet e ditës
// POST   — shto termin
// PUT    — ndrysho status / checkout
// DELETE — fshi termin

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

async function getCID(supabase: Awaited<ReturnType<typeof createClient>>, uid: string) {
  const { data } = await supabase.from('users').select('company_id').eq('id', uid).single()
  return data?.company_id as string | null
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cid = await getCID(supabase, user.id)

  const date = new URL(req.url).searchParams.get('date') || new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('appointments')
    .select('*, services(name, duration_minutes, price)')
    .eq('company_id', cid)
    .eq('appointment_date', date)
    .order('appointment_time')

  return NextResponse.json({ appointments: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cid = await getCID(supabase, user.id)
  if (!cid) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase.from('appointments').insert({
    company_id:       cid,
    client_name:      body.client_name,
    client_phone:     body.client_phone || null,
    service_id:       body.service_id   || null,
    service_name:     body.service_name,
    service_price:    body.service_price,
    appointment_date: body.appointment_date,
    appointment_time: body.appointment_time,
    duration_minutes: body.duration_minutes || 30,
    operator_name:    body.operator_name   || null,
    notes:            body.notes           || null,
    status:           'confirmed',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ appointment: data })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cid = await getCID(supabase, user.id)

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('appointments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).eq('company_id', cid)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cid = await getCID(supabase, user.id)

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await supabase.from('appointments').delete().eq('id', id).eq('company_id', cid)
  return NextResponse.json({ success: true })
}
