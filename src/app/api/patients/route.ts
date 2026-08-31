import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const companyId = req.nextUrl.searchParams.get('company_id') || profile?.company_id
  const search = req.nextUrl.searchParams.get('search') || ''
  
  let query = supabase.from('patients').select('*').eq('company_id', companyId!)
  if (search) query = query.ilike('full_name', `%${search}%`)
  
  const { data } = await query.order('full_name').limit(20)
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const body = await req.json()
  
  const { data, error } = await supabase.from('patients').insert({
    company_id: body.company_id || profile?.company_id,
    full_name: body.full_name,
    gender: body.gender || null,
    birth_year: body.birth_year || null,
    phone: body.phone || null,
    notes: body.notes || null,
  }).select().single()
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...body } = await req.json()
  const { data, error } = await supabase.from('patients').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
