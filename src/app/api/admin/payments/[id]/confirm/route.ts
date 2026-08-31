import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { subscription_id, months = 1 } = await req.json().catch(() => ({ months: 1 }))
  if (!subscription_id) return NextResponse.json({ error: 'subscription_id mungon' }, { status: 400 })

  const periodStart = new Date()
  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + Number(months))
  const graceEnd = new Date(periodEnd.getTime() + 5 * 86400000)

  // Extend the subscription
  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      grace_period_end: graceEnd.toISOString(),
    })
    .eq('id', subscription_id)
    .select()
    .single()

  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 })

  // Mark the payment as confirmed
  const { error: payError } = await supabase
    .from('payments')
    .update({ status: 'confirmed', confirmed_by: user.id, confirmed_at: new Date().toISOString() })
    .eq('id', id)

  if (payError) return NextResponse.json({ error: payError.message }, { status: 500 })

  // Notify the business owner(s)
  try {
    const { data: owners } = await supabase.from('users').select('id').eq('company_id', sub.company_id).eq('role', 'business_owner')
    if (owners?.length) {
      await supabase.from('notifications').insert(owners.map(o => ({
        user_id: o.id, company_id: sub.company_id,
        title: 'Pagesa u konfirmua',
        message: 'Abonimi juaj u rinovua me sukses. Faleminderit!',
        type: 'success',
      })))
    }
  } catch {}

  return NextResponse.json({ success: true, subscription: sub })
}
