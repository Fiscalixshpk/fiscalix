import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = req.nextUrl.searchParams.get('company_id')
  const year = req.nextUrl.searchParams.get('year')
  const month = req.nextUrl.searchParams.get('month')
  let q = supabase.from('withholding_tax').select('*').eq('company_id', companyId!)
  if (year) q = q.eq('year', parseInt(year))
  if (month) q = q.eq('month', parseInt(month))
  const { data } = await q.order('payment_date')
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const amount = Number(body.amount || 0)
  const taxRate = Number(body.tax_rate || 9)
  const taxAmount = +(amount * taxRate / 100).toFixed(2)
  const date = new Date(body.payment_date)
  const { data, error } = await supabase.from('withholding_tax').insert({
    ...body, tax_amount: taxAmount,
    year: date.getFullYear(), month: date.getMonth() + 1
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await supabase.from('withholding_tax').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
