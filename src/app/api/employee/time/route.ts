import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createAdminClient()
  const { searchParams } = new URL(req.url)
  const employee_id = searchParams.get('employee_id')
  const limit = Number(searchParams.get('limit') || 30)

  const { data } = await supabase
    .from('time_entries').select('*')
    .eq('employee_id', employee_id).order('date', { ascending: false }).limit(limit)
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const supabase = await createAdminClient()
  const body = await req.json()
  const { action, employee_id, company_id, notes, entry_id } = body

  if (action === 'clock_in') {
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const { data, error } = await supabase.from('time_entries').insert({
      employee_id,
      company_id,
      clock_in: now.toISOString(),
      date,
      notes: notes || null
    }).select().single()
    if (error) {
      console.error('Clock in error:', error.message, error.code, error.details)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  }

  if (action === 'clock_out') {
    const now = new Date()
    const { data: entry } = await supabase.from('time_entries').select('clock_in').eq('id', entry_id).single()
    if (!entry) return NextResponse.json({ error: 'Hyrja nuk u gjet' }, { status: 404 })
    const mins = Math.round((now.getTime() - new Date(entry.clock_in).getTime()) / 60000)
    const { data, error } = await supabase.from('time_entries').update({
      clock_out: now.toISOString(),
      duration_minutes: mins
    }).eq('id', entry_id).select().single()
    if (error) {
      console.error('Clock out error:', error.message, error.code, error.details)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Action i panjohur' }, { status: 400 })
}
