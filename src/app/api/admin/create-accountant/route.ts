import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { full_name, email, password, max_clients, notes } = await req.json()
  if (!full_name || !email || !password)
    return NextResponse.json({ error: 'full_name, email, password kërkohen' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 1. Krijo userin te Auth
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name, role: 'accountant' },
  })
  if (authErr || !authData.user)
    return NextResponse.json({ error: authErr?.message || 'Gabim Auth' }, { status: 500 })

  const userId = authData.user.id

  try {
    // 2. Krijo userin te tabela users
    const { error: userErr } = await admin.from('users').insert({
      id:         userId,
      email,
      full_name,
      role:       'accountant',
      company_id: null,
      is_active:  true,
    })
    if (userErr) throw new Error(userErr.message)

    // 3. Krijo abonimin kontabilist
    const periodEnd = new Date()
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    await admin.from('subscriptions').insert({
      user_id:              userId,
      plan:                 'accountant',
      status:               'active',
      max_clients:          max_clients || 20,
      current_period_start: new Date().toISOString(),
      current_period_end:   periodEnd.toISOString(),
    })

    // 4. Shëno (opsional)
    if (notes) {
      await admin.from('admin_notes').insert({
        user_id:    userId,
        note:       notes,
        created_by: user.id,
      })
    }

    return NextResponse.json({ success: true, userId })
  } catch (err) {
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Gabim' }, { status: 500 })
  }
}
