import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { email, full_name, password, months = 1, max_clients = 20 } = await req.json()
    if (!email || !full_name) return NextResponse.json({ error: 'Email dhe emri janë të detyrueshëm' }, { status: 400 })
    if (!password || password.length < 8) return NextResponse.json({ error: 'Fjalëkalimi duhet të jetë min. 8 karaktere' }, { status: 400 })

    const adminClient = await createAdminClient()

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email, password: password,
      email_confirm: true,
    })
    if (authError) throw authError

    // Get or create a company for accountant
    const { data: company } = await supabase.from('companies').insert({
      name: full_name + " - Kontabilist",
      email,
      is_active: true,
    }).select().single()

    // Create user with accountant role
    await supabase.from('users').insert({
      id: authData.user.id,
      full_name,
      email,
      role: 'accountant',
      company_id: company?.id,
      is_active: true,
    })

    // Create accountant subscription
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + months)
    
    await supabase.from('accountant_subscriptions').insert({
      user_id: authData.user.id,
      plan: 'accountant',
      status: 'active',
      price_monthly: 99,
      max_clients: max_clients === -1 ? -1 : Number(max_clients) || 20,
      current_period_start: new Date().toISOString(),
      current_period_end: endDate.toISOString(),
      grace_period_end: new Date(endDate.getTime() + 5 * 86400000).toISOString(),
    })

    return NextResponse.json({ success: true, userId: authData.user.id })
  } catch (err) {
    console.error('Create accountant error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Gabim' }, { status: 500 })
  }
}
