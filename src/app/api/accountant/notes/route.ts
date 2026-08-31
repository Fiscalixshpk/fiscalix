import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) return NextResponse.json({ error: 'company_id mungon' }, { status: 400 })

  const { data, error } = await supabase
    .from('accountant_notes')
    .select('*')
    .eq('accountant_id', user.id)
    .eq('company_id', companyId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notes: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { company_id, content } = await req.json()
  if (!company_id || !content?.trim()) {
    return NextResponse.json({ error: 'company_id dhe content janë të detyrueshme' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('accountant_notes')
    .insert({ accountant_id: user.id, company_id, content: content.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}
