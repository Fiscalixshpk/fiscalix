import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single()

    if (!['accountant', 'admin'].includes(profile?.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: clients, error } = await supabase
      .from('accountant_clients')
      .select(`
        *,
        company:companies(
          id, name, email, phone, city, is_active,
          subscriptions(plan, status, current_period_end)
        )
      `)
      .eq('accountant_id', user.id)
      .eq('is_active', true)
      .order('added_at', { ascending: false })

    if (error) {
      console.error('GET clients error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(clients || [])
  } catch (err) {
    console.error('GET accountant clients error:', err)
    return NextResponse.json({ error: 'Gabim serveri' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('role, company_id').eq('id', user.id).single()

    if (!['accountant', 'admin'].includes(profile?.role || '')) {
      return NextResponse.json({ error: 'Nuk keni të drejta' }, { status: 403 })
    }

    const body = await req.json()
    const { company_id } = body

    if (!company_id) {
      return NextResponse.json({ error: 'company_id mungon' }, { status: 400 })
    }

    // Check limit based on subscription tier
    const { data: accSub } = await supabase
      .from('accountant_subscriptions')
      .select('max_clients, plan')
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
      return NextResponse.json({ 
        error: `Ke arritur limitin e ${maxClients} klientëve. Upgrade planin për më shumë.` 
      }, { status: 400 })
    }

    // Check company exists
    const { data: company, error: compErr } = await supabase
      .from('companies').select('id, name').eq('id', company_id).single()

    if (compErr || !company) {
      return NextResponse.json({ error: 'Kompania nuk u gjet' }, { status: 404 })
    }

    // Check if already added
    const { data: existing } = await supabase
      .from('accountant_clients')
      .select('id, is_active')
      .eq('accountant_id', user.id)
      .eq('company_id', company_id)
      .maybeSingle()

    if (existing) {
      if (existing.is_active) {
        return NextResponse.json({ error: 'Ky klient është shtuar tashmë' }, { status: 400 })
      }
      // Reactivate
      const { data, error } = await supabase
        .from('accountant_clients')
        .update({ is_active: true })
        .eq('id', existing.id)
        .select().single()
      if (error) throw error
      return NextResponse.json(data, { status: 200 })
    }

    // Insert new
    const { data, error } = await supabase
      .from('accountant_clients')
      .insert({
        accountant_id: user.id,
        company_id,
        is_active: true,
        notes: body.notes || null,
      })
      .select().single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('POST accountant clients error:', err)
    const msg = err instanceof Error ? err.message : 'Gabim serveri'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { company_id } = await req.json()

    await supabase
      .from('accountant_clients')
      .update({ is_active: false, status: 'removed' })
      .eq('accountant_id', user.id)
      .eq('company_id', company_id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE error:', err)
    return NextResponse.json({ error: 'Gabim serveri' }, { status: 500 })
  }
}
