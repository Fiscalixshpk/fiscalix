import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') return null
  return user
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const adminUser = await checkAdmin(supabase)
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action, plan, months, ai_scans_limit } = await req.json()

  if (action === 'change_plan') {
    await supabase.from('subscriptions').update({
      plan,
      ai_scans_limit: 0,
      ai_scans_used: 0,
    }).eq('id', id)

    await supabase.from('activity_logs').insert({
      user_id: adminUser.id, action: 'admin.subscription.change_plan',
      entity_type: 'subscription', entity_id: id, metadata: { plan }
    })
    return NextResponse.json({ success: true })
  }

  if (action === 'extend') {
    const { data: sub } = await supabase.from('subscriptions').select('current_period_end').eq('id', id).single()
    const base = sub?.current_period_end ? new Date(sub.current_period_end) : new Date()
    if (base < new Date()) base.setTime(Date.now())
    base.setMonth(base.getMonth() + (months || 1))
    const grace = new Date(base.getTime() + 5 * 86400000)

    await supabase.from('subscriptions').update({
      status: 'active', current_period_end: base.toISOString(), grace_period_end: grace.toISOString()
    }).eq('id', id)

    await supabase.from('activity_logs').insert({
      user_id: adminUser.id, action: 'admin.subscription.extend',
      entity_type: 'subscription', entity_id: id, metadata: { months }
    })
    return NextResponse.json({ success: true, new_end: base.toISOString() })
  }

  if (action === 'reset_ai') {
    await supabase.from('subscriptions').update({ ai_scans_used: 0, ai_scans_limit: ai_scans_limit ?? 150 }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  if (action === 'deactivate') {
    await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  if (action === 'activate') {
    const end = new Date(); end.setMonth(end.getMonth() + 1)
    await supabase.from('subscriptions').update({ status: 'active', current_period_end: end.toISOString() }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
