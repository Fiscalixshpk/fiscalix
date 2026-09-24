import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Verifiko admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { business_name, business_type, nipt, nui, city, address, phone, website, full_name, email, password, plan, pos_enabled, is_vat_registered, notes } = body

  if (!business_name || !business_type || !email || !password || !full_name)
    return NextResponse.json({ error: 'Mungojnë fushat e detyrueshme' }, { status: 400 })

  // Supabase Admin client për krijimin e userit
  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 1. Krijo userin te Auth
  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name, role: 'business_owner' },
  })
  if (authErr || !authData.user) return NextResponse.json({ error: authErr?.message || 'Gabim gjatë krijimit të userit' }, { status: 500 })

  const userId = authData.user.id

  try {
    // Generate unique slug from business name
    const baseSlug = business_name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40)

    // Check uniqueness and add suffix if needed
    let slug = baseSlug
    let attempt = 0
    while (true) {
      const { data: existing } = await adminClient.from('companies').select('id').eq('slug', slug).maybeSingle()
      if (!existing) break
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    // 2. Krijo kompaninë
    const { data: company, error: companyErr } = await adminClient.from('companies').insert({
      name:          business_name,
      email,
      phone:         phone || null,
      city:          city  || null,
      address:       address || null,
      website:       website || null,
      // NUI ruhet te nui (fiskalizimi e lexon nga aty); numri i TVSH-së vetëm kur ka
      nui:           nui || null,
      tax_number:    nui || null,
      vat_number:    nipt || null,
      business_type: business_type,
      pos_enabled:        pos_enabled ?? true,
      is_vat_registered:  is_vat_registered ?? false,
      is_active:     true,
      slug,
    }).select().single()

    if (companyErr || !company) throw new Error(companyErr?.message || 'Gabim kompania')

    // 3. Krijo userin te tabela users
    const { error: userErr } = await adminClient.from('users').insert({
      id:         userId,
      email,
      full_name,
      role:       'business_owner',
      company_id: company.id,
      is_active:  true,
    })
    if (userErr) throw new Error(userErr.message)

    // 4. Krijo abonimin
    const periodEnd = new Date()
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)

    const { error: subErr } = await adminClient.from('subscriptions').insert({
      company_id:          company.id,
      plan:                plan || 'basic',
      status:              'active',
      current_period_start: new Date().toISOString(),
      current_period_end:   periodEnd.toISOString(),
    })
    if (subErr) throw new Error(subErr.message)

    // 5. Shëno si i krijuar nga admin
    if (notes) {
      await adminClient.from('admin_notes').insert({
        company_id: company.id,
        note:       notes,
        created_by: user.id,
      }).single()
    }

    return NextResponse.json({ success: true, companyId: company.id, userId })

  } catch (err) {
    // Rollback — fshi userin nëse diçka dështoi
    await adminClient.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Gabim' }, { status: 500 })
  }
}
