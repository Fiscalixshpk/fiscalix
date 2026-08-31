import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createAdminClient()
  const { slug, email, password } = await req.json()
  if (!slug || !email || !password)
    return NextResponse.json({ error: 'Të dhënat mungojnë' }, { status: 400 })

  const { data: company } = await supabase
    .from('companies').select('id,name').eq('slug', slug).single()
  if (!company)
    return NextResponse.json({ error: 'Kompania nuk u gjet' }, { status: 404 })

  const { data: employee } = await supabase
    .from('employees')
    .select('id,full_name,email,password_hash,position,department,gross_salary,portal_enabled,start_date')
    .eq('company_id', company.id)
    .eq('email', email.toLowerCase().trim())
    .eq('is_active', true)
    .single()

  if (!employee || !employee.portal_enabled)
    return NextResponse.json({ error: 'Email ose fjalëkalim i gabuar' }, { status: 401 })

  // Simple password check (plain for now — upgrade to bcrypt after npm install)
  if (employee.password_hash !== password)
    return NextResponse.json({ error: 'Email ose fjalëkalim i gabuar' }, { status: 401 })

  const { password_hash, ...safe } = employee
  return NextResponse.json({ employee: safe, company: { id: company.id, name: company.name, slug } })
}
