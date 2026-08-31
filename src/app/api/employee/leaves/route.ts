import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createAdminClient()
  const { searchParams } = new URL(req.url)
  const employee_id = searchParams.get('employee_id')
  const company_id  = searchParams.get('company_id')

  // If company_id — return all requests for company (manager view)
  if (company_id) {
    const { data } = await supabase.from('leave_requests').select('*, employees(full_name,position)')
      .eq('company_id', company_id).order('created_at', { ascending: false })
    return NextResponse.json(data || [])
  }

  const { data } = await supabase.from('leave_requests').select('*')
    .eq('employee_id', employee_id).order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const supabase = await createAdminClient()
  const body = await req.json()
  const { employee_id, company_id, type, start_date, end_date, days, reason } = body

  if (!employee_id || !company_id || !type || !start_date || !end_date) {
    return NextResponse.json({ error: 'Fushat e detyrueshme mungojnë' }, { status: 400 })
  }

  const { data, error } = await supabase.from('leave_requests').insert({
    employee_id, company_id, type, start_date, end_date,
    days: days || 1, reason: reason || null, status: 'pending'
  }).select().single()

  if (error) {
    console.error('Leave request error:', error.message, error.code)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const supabase = await createAdminClient()
  const { id, status, notes } = await req.json()
  const { data, error } = await supabase.from('leave_requests').update({
    status, notes: notes || null, reviewed_at: new Date().toISOString()
  }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
