import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('lightweight_clients')
    .select('*')
    .eq('accountant_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/accountant/lightweight-clients]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ clients: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['accountant', 'admin'].includes(profile?.role || '')) {
    return NextResponse.json({ error: 'Vetëm kontabilistët mund të krijojnë klientë të thjeshtuar' }, { status: 403 })
  }

  const { business_name, business_type, vat_number, is_vat_registered, phone, address, notes } = await req.json()
  if (!business_name?.trim()) {
    return NextResponse.json({ error: 'Emri i biznesit është i detyrueshëm' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('lightweight_clients')
    .insert({
      accountant_id: user.id,
      business_name: business_name.trim(),
      business_type: business_type || 'market',
      vat_number: vat_number || null,
      is_vat_registered: !!is_vat_registered,
      phone: phone || null,
      address: address || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/accountant/lightweight-clients]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ client: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Fshi të dhënat e lidhura
  try { await supabase.from('lightweight_sales_entries').delete().eq('lightweight_client_id', id) } catch {}
  try { await supabase.from('lightweight_expenses').delete().eq('lightweight_client_id', id) } catch {}
  try {
    const { data: checklists } = await supabase.from('lightweight_checklists').select('id').eq('lightweight_client_id', id)
    if (checklists && checklists.length > 0) {
      await supabase.from('lightweight_checklist_items').delete().in('checklist_id', checklists.map(c => c.id))
    }
    await supabase.from('lightweight_checklists').delete().eq('lightweight_client_id', id)
  } catch {}

  const { error } = await supabase
    .from('lightweight_clients')
    .delete()
    .eq('id', id)
    .eq('accountant_id', user.id)

  if (error) {
    console.error('Lightweight client delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
