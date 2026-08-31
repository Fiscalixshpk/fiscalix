import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'admin' ? user : null
}

// GET all companies with full details
export async function GET() {
  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      subscriptions(*),
      users(id, full_name, email, role, is_active, created_at)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — Admin creates a client manually (company + owner account + subscription)
export async function POST(req: NextRequest) {
  try {

  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const {
    company_name, company_email, company_phone, company_city, company_vat,
    owner_name, owner_email, owner_password,
    plan, period_months,
  } = await req.json()

  if (!company_name || !owner_email || !owner_password || !plan) {
    return NextResponse.json({ error: 'Fushat e detyrueshme mungojnë' }, { status: 400 })
  }

  const adminClient = await createAdminClient()

  // 1. Create auth user
  const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
    email: owner_email,
    password: owner_password,
    email_confirm: true,
  })
  if (authErr || !authUser.user) {
    return NextResponse.json({ error: authErr?.message || 'Gabim gjatë krijimit të llogarisë' }, { status: 400 })
  }

  // 2. Create company
  const { data: company, error: compErr } = await supabase
    .from('companies')
    .insert({
      name: company_name,
      email: company_email || owner_email,
      phone: company_phone,
      city: company_city,
      vat_number: company_vat,
      is_active: true,
    })
    .select()
    .single()

  if (compErr || !company) {
    await adminClient.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: compErr?.message || 'Gabim gjatë krijimit të kompanisë' }, { status: 400 })
  }

  // 3. Create user profile
  await supabase.from('users').insert({
    id: authUser.user.id,
    company_id: company.id,
    full_name: owner_name,
    email: owner_email,
    role: 'business_owner',
    is_active: true,
  })

  // 4. Calculate subscription end date
  const planLimits: Record<string, number> = { basic: 1, pro: 3, business: -1, accountant: 0 }
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + (period_months || 1))
  const graceDate = new Date(endDate.getTime() + 5 * 86400000)

  // 5. Create subscription
  const { data: sub } = await supabase.from('subscriptions').insert({
    company_id: company.id,
    plan,
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: endDate.toISOString(),
    grace_period_end: graceDate.toISOString(),
    activated_at: new Date().toISOString(),
  }).select().single()

  // 6. Log action
  await supabase.from('activity_logs').insert({
    user_id: admin.id,
    action: 'user_created',
    entity_type: 'company',
    entity_id: company.id,
    metadata: { plan, period_months, owner_email },
  })

  return NextResponse.json({ success: true, company, subscription: sub, user: authUser.user })
  } catch (err) {
    console.error('Create company error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
