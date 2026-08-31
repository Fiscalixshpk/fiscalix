import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, emailAccountantActivated } from '@/lib/email'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { months = 1 } = await req.json().catch(() => ({ months: 1 }))

  const periodStart = new Date()
  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + Number(months))
  const graceEnd = new Date(periodEnd.getTime() + 5 * 86400000)

  const { data, error } = await supabase
    .from('accountant_subscriptions')
    .update({
      status: 'active',
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      grace_period_end: graceEnd.toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Njofto dhe dërgo email te kontabilisti
  try {
    const { data: accountant } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', data.user_id)
      .maybeSingle()

    await supabase.from('notifications').insert({
      user_id: data.user_id,
      title: 'Llogaria u aktivizua',
      message: 'Pagesa juaj u konfirmua. Llogaria është tani aktive — mirë se vini!',
      type: 'success',
    })

    if (accountant?.email) {
      const { subject, html } = emailAccountantActivated(accountant.full_name || 'Kontabilist')
      await sendEmail({ to: accountant.email, subject, html })
    }
  } catch (err) {
    console.error('Notification/email error:', err)
  }

  return NextResponse.json({ success: true, subscription: data })
}
