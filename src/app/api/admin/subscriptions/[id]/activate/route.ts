import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, emailAccountActivated } from '@/lib/email'

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
    .from('subscriptions')
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

  // Njofto dhe dërgo email te pronarët e biznesit
  try {
    const { data: owners } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('company_id', data.company_id)
      .eq('role', 'business_owner')

    if (owners && owners.length > 0) {
      // Njoftim brenda app-it
      await supabase.from('notifications').insert(
        owners.map(o => ({
          user_id: o.id,
          company_id: data.company_id,
          title: 'Llogaria u aktivizua',
          message: 'Pagesa juaj u konfirmua. Llogaria është tani aktive — mirë se vini!',
          type: 'success',
        }))
      )

      // Email real për secilin pronar
      for (const owner of owners) {
        if (owner.email) {
          const { subject, html } = emailAccountActivated(owner.full_name || 'Përdorues')
          await sendEmail({ to: owner.email, subject, html })
        }
      }
    }
  } catch (err) {
    console.error('Notification/email error:', err)
  }

  return NextResponse.json({ success: true, subscription: data })
}
