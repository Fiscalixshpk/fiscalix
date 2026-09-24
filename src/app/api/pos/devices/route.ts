// GET    /api/pos/devices          — lista e pajisjeve
// POST   /api/pos/devices          — shto pajisje të re
// PUT    /api/pos/devices          — edito emrin/kashierin
// DELETE /api/pos/devices?id=xxx   — fshi pajisjen

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

async function getCompany(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, userId: string) {
  const { data } = await (await supabase).from('users').select('company_id').eq('id', userId).single()
  return data?.company_id
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: ud } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const { data } = await supabase.from('pos_devices').select('*').eq('company_id', ud?.company_id).neq('status', 'suspended').order('pos_id')
  return NextResponse.json({ devices: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: ud } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  if (!ud?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const body = await req.json()
  const { device_name, cashier_name, branch_id } = body

  // pos_id zgjidhet nga serveri mbi TË GJITHA arkat e kompanisë (edhe të pezulluarat),
  // që të mos përplaset me unique (company_id, pos_id, branch_id).
  const { data: all } = await supabase.from('pos_devices').select('pos_id').eq('company_id', ud.company_id)
  let posId = Math.max(0, ...(all ?? []).map(d => Number(d.pos_id) || 0)) + 1

  for (let attempt = 0; attempt < 5; attempt++, posId++) {
    const { data, error } = await supabase.from('pos_devices').insert({
      company_id:   ud.company_id,
      pos_id:       posId,
      branch_id:    branch_id ?? 1,
      device_name:  device_name ?? `Arka ${posId}`,
      cashier_name: cashier_name || null,
      // PROD lejohet vetëm pas certifikimit (ATK_ENVIRONMENT=PROD)
      environment:  process.env.ATK_ENVIRONMENT === 'PROD' && body.environment === 'PROD' ? 'PROD' : 'TEST',
      status:       'active',
      created_at:   new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }).select().single()
    if (!error) return NextResponse.json({ device: data })
    if (error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ error: 'Nuk u gjet numër i lirë për arkën, provo sërish' }, { status: 409 })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: ud } = await supabase.from('users').select('company_id').eq('id', user.id).single()

  const body = await req.json()
  const { id, device_name, cashier_name, environment } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (device_name  !== undefined) updates.device_name  = device_name
  if (cashier_name !== undefined) updates.cashier_name = cashier_name
  if (environment  !== undefined) updates.environment  = process.env.ATK_ENVIRONMENT === 'PROD' && environment === 'PROD' ? 'PROD' : 'TEST'

  const { error } = await supabase.from('pos_devices').update(updates)
    .eq('id', id).eq('company_id', ud?.company_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: ud } = await supabase.from('users').select('company_id').eq('id', user.id).single()

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Supabase nuk lejon delete — përdor suspended
  const { error } = await supabase.from('pos_devices')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', id).eq('company_id', ud?.company_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
