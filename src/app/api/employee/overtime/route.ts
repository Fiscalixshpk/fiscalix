import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createAdminClient()
  const { searchParams } = new URL(req.url)
  const employee_id = searchParams.get('employee_id')
  const company_id  = searchParams.get('company_id')
  if (company_id) {
    const { data } = await supabase.from('overtime_requests').select('*, employees(full_name)')
      .eq('company_id', company_id).order('created_at', { ascending: false })
    return NextResponse.json(data || [])
  }
  const { data } = await supabase.from('overtime_requests').select('*')
    .eq('employee_id', employee_id).order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const supabase = await createAdminClient()
  const body = await req.json()
  const { data, error } = await supabase.from('overtime_requests').insert({
    employee_id: body.employee_id, company_id: body.company_id,
    date: body.date, hours: body.hours, reason: body.reason, status: 'pending'
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const supabase = await createAdminClient()
  const { id, status } = await req.json()
  const { data, error } = await supabase.from('overtime_requests').update({ status }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
