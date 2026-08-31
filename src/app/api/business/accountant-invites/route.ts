import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()

  if (!profile?.company_id) return NextResponse.json({ invites: [] })

  const { data: invites, error } = await supabase
    .from('accountant_clients')
    .select('id, status, added_at, accountant_id')
    .eq('company_id', profile.company_id)
    .order('added_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach accountant names manually (avoids relying on FK constraint names)
  const withNames = await Promise.all(
    (invites || []).map(async (inv) => {
      const { data: accUser } = await supabase
        .from('users').select('full_name, email').eq('id', inv.accountant_id).maybeSingle()
      return { ...inv, accountant: accUser || null }
    })
  )

  return NextResponse.json({ invites: withNames })
}
