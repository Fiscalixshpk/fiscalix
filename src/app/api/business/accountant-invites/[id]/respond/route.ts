import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('company_id, role').eq('id', user.id).single()

  if (profile?.role !== 'business_owner' || !profile.company_id) {
    return NextResponse.json({ error: 'Nuk keni të drejta' }, { status: 403 })
  }

  const { action } = await req.json() // 'accept' | 'reject'
  if (!['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Veprim i pavlefshëm' }, { status: 400 })
  }

  // Verify the invite belongs to this company
  const { data: invite } = await supabase
    .from('accountant_clients')
    .select('id, company_id, accountant_id, status')
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'Ftesa nuk u gjet' }, { status: 404 })
  if (invite.status !== 'pending') return NextResponse.json({ error: 'Ftesa nuk është më në pritje' }, { status: 400 })

  const newStatus = action === 'accept' ? 'active' : 'rejected'
  const { error } = await supabase
    .from('accountant_clients')
    .update({ status: newStatus, is_active: action === 'accept' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the accountant of the outcome
  try {
    await supabase.from('notifications').insert({
      user_id: invite.accountant_id,
      company_id: profile.company_id,
      title: action === 'accept' ? 'Ftesa u pranua' : 'Ftesa u refuzua',
      message: action === 'accept'
        ? 'Klienti pranoi bashkëpunimin. Tani ke qasje te llogaria e tij.'
        : 'Klienti refuzoi ftesën për bashkëpunim.',
      type: action === 'accept' ? 'success' : 'info',
    })
  } catch {}

  return NextResponse.json({ success: true, status: newStatus })
}
