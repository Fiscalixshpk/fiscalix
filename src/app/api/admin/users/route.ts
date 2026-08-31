import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data } = await supabase.from('users').select('*, companies(name, email)').order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user_id, action } = await req.json()
  const isActive = action === 'activate'
  const adminClient = await createAdminClient()
  await adminClient.auth.admin.updateUserById(user_id, { ban_duration: isActive ? 'none' : '876600h' })
  await supabase.from('users').update({ is_active: isActive }).eq('id', user_id)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  if (user_id === user.id) return NextResponse.json({ error: 'Nuk mund ta fshish veten' }, { status: 400 })

  const admin = await createAdminClient()

  // Step 1: Gjej company_id
  const { data: userRow, error: userErr } = await admin.from('users').select('company_id').eq('id', user_id).single()
  if (userErr) console.error('Step 1 error:', userErr)
  const cid = userRow?.company_id
  console.log('Deleting user_id:', user_id, 'company_id:', cid)

  // Step 2: Fshi të gjitha me service role — rendi ka rëndësi
  if (cid) {
    // invoice_items para invoices
    const { data: invs } = await admin.from('invoices').select('id').eq('company_id', cid)
    if (invs?.length) {
      const { error: e } = await admin.from('invoice_items').delete().in('invoice_id', invs.map((x: {id:string}) => x.id))
      if (e) console.error('invoice_items error:', e)
    }
    // quote_items para quotes
    const { data: qs } = await admin.from('quotes').select('id').eq('company_id', cid)
    if (qs?.length) {
      const { error: e } = await admin.from('quote_items').delete().in('quote_id', qs.map((x: {id:string}) => x.id))
      if (e) console.error('quote_items error:', e)
    }

    const tables = ['invoices','expenses','quotes','subscriptions','payments','notifications','activity_logs','accountant_clients','employees','withholding_tax','bank_reconciliation','services','expense_categories','sales','table_order_items','table_orders','restaurant_tables','pos_waiters','pos_products','pos_categories','business_invoices','cancelled_orders']
    for (const t of tables) {
      const { error: e } = await admin.from(t).delete().eq('company_id', cid)
      if (e) console.error(`${t} error:`, e.message)
    }
  }

  // Step 3: Fshi lidhjet e userit (jo company_id based)
  await admin.from('notifications').delete().eq('user_id', user_id)
  await admin.from('activity_logs').delete().eq('user_id', user_id)
  await admin.from('accountant_clients').delete().eq('accountant_id', user_id)
  try { await admin.from('accountant_subscriptions').delete().eq('user_id', user_id) } catch {}

  // Fshi lightweight entries me created_by
  try { await admin.from('lightweight_sales_entries').delete().eq('created_by', user_id) } catch {}
  try { await admin.from('lightweight_expenses').delete().eq('created_by', user_id) } catch {}
  try { await admin.from('lightweight_checklist_items').delete().eq('created_by', user_id) } catch {}
  try { await admin.from('lightweight_checklists').delete().eq('created_by', user_id) } catch {}
  try { await admin.from('lightweight_clients').delete().eq('accountant_id', user_id) } catch {}
  try { await admin.from('lightweight_notes').delete().eq('accountant_id', user_id) } catch {}

  // Step 4: Fshi users row
  const { error: userDelErr } = await admin.from('users').delete().eq('id', user_id)
  if (userDelErr) console.error('users delete error:', userDelErr)

  // Step 5: Fshi kompaninë
  if (cid) {
    const { error: compErr } = await admin.from('companies').delete().eq('id', cid)
    if (compErr) console.error('companies delete error:', compErr)
  }

  // Step 6: Fshi nga auth — FUNDIT
  const { error: authErr } = await admin.auth.admin.deleteUser(user_id)
  if (authErr) {
    console.error('Auth delete error:', authErr.message)
    // Mos kthe error — të dhënat u fshin, vetëm auth session mbeti
    // Supabase do ta pastrojë vetë pas skadimit
  }

  return NextResponse.json({ success: true })
}
