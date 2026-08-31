import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()

  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('company_id', profile?.company_id)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  try {

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()

  const body = await req.json()
  const { name, icon, color } = body

  if (!name) return NextResponse.json({ error: 'Emri është i detyrueshëm' }, { status: 400 })

  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ name_sq: name, name_en: name, icon: icon || '📁', color: color || '#6B7280', company_id: profile?.company_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })

  } catch (err) {
    console.error('API error:', err)
    const msg = err instanceof Error ? err.message : 'Gabim i brendshëm'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}