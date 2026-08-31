import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { kind, name, plan, price } = await req.json()
    if (!kind || !name) return NextResponse.json({ error: 'kind dhe name janë të detyrueshme' }, { status: 400 })

    const admin = await createAdminClient()

    const { data: admins, error: adminsError } = await admin.from('users').select('id').eq('role', 'admin')
    if (adminsError) {
      console.error('[notify-admin-registration] Failed to fetch admins:', adminsError)
      return NextResponse.json({ error: adminsError.message }, { status: 500 })
    }
    if (!admins?.length) {
      console.warn('[notify-admin-registration] No admin users found in database')
      return NextResponse.json({ success: false, warning: 'No admins found' })
    }

    const title = kind === 'business' ? 'Biznes i ri — pagesë në pritje' : 'Kontabilist i ri — pagesë në pritje'
    const message = `${name} u regjistrua (paketa ${plan}, €${price}/muaj). Kontrollo Admin Panel → Pagesat.`

    const { error: insertError } = await admin.from('notifications').insert(
      admins.map(a => ({
        user_id: a.id,
        title,
        message,
        type: 'info',
        action_url: '/admin/payments',
      }))
    )

    if (insertError) {
      console.error('[notify-admin-registration] Failed to insert notifications:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, notified: admins.length })
  } catch (err) {
    console.error('[notify-admin-registration] Unexpected error:', err)
    return NextResponse.json({ error: 'Gabim serveri' }, { status: 500 })
  }
}
