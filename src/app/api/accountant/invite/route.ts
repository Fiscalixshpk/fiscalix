import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('role, full_name').eq('id', user.id).single()

    if (!['accountant', 'admin'].includes(profile?.role || '')) {
      return NextResponse.json({ error: 'Nuk keni të drejta' }, { status: 403 })
    }

    const { email } = await req.json()
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email mungon' }, { status: 400 })
    }
    const normalizedEmail = email.trim().toLowerCase()

    // Find the business by email (must be a business_owner with a company)
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, company_id, full_name, role')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (!targetUser) {
      return NextResponse.json({ error: 'Nuk u gjet asnjë llogari me këtë email' }, { status: 404 })
    }
    if (targetUser.role !== 'business_owner' || !targetUser.company_id) {
      return NextResponse.json({ error: 'Ky email nuk i përket një llogarie biznesi' }, { status: 400 })
    }

    const companyId = targetUser.company_id

    // Check plan limit
    const { data: accSub } = await supabase
      .from('accountant_subscriptions')
      .select('max_clients')
      .eq('user_id', user.id)
      .maybeSingle()
    const maxClients = accSub?.max_clients || 20
    const isUnlimited = maxClients === -1
    const { count } = await supabase
      .from('accountant_clients')
      .select('id', { count: 'exact', head: true })
      .eq('accountant_id', user.id)
      .eq('is_active', true)
    if (!isUnlimited && (count || 0) >= maxClients) {
      return NextResponse.json({ error: `Ke arritur limitin e ${maxClients} klientëve.` }, { status: 400 })
    }

    // Check if a relationship already exists
    const { data: existing } = await supabase
      .from('accountant_clients')
      .select('id, status, is_active')
      .eq('accountant_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'pending') {
        return NextResponse.json({ error: 'Ftesa është dërguar tashmë dhe është në pritje' }, { status: 400 })
      }
      if (existing.status === 'active' && existing.is_active) {
        return NextResponse.json({ error: 'Ky klient bashkëpunon tashmë me ty' }, { status: 400 })
      }
      // Re-send invite (was rejected or deactivated)
      const { error: updErr } = await supabase
        .from('accountant_clients')
        .update({ status: 'pending', is_active: false })
        .eq('id', existing.id)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    } else {
      const { error: insErr } = await supabase
        .from('accountant_clients')
        .insert({ accountant_id: user.id, company_id: companyId, status: 'pending', is_active: false })
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    // Notify the business owner
    try {
      await supabase.from('notifications').insert({
        user_id: targetUser.id,
        company_id: companyId,
        title: 'Ftesë për bashkëpunim',
        message: `${profile?.full_name || 'Një kontabilist'} dëshiron të bashkëpunojë me ty si kontabilist.`,
        type: 'accountant_invite',
        action_url: '/accountant-invites',
      })
    } catch {}

    return NextResponse.json({ success: true, message: `Ftesa u dërgua te ${targetUser.full_name || normalizedEmail}` })
  } catch (err) {
    console.error('POST accountant invite error:', err)
    const msg = err instanceof Error ? err.message : 'Gabim serveri'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
