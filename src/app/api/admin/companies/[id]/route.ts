import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'admin' ? user : null
}

async function deleteCompanyData(adminClient: Awaited<ReturnType<typeof createAdminClient>>, companyId: string) {
  const { data: invs } = await adminClient.from('invoices').select('id').eq('company_id', companyId)
  if (invs && invs.length > 0) {
    await adminClient.from('invoice_items').delete().in('invoice_id', invs.map((i: {id: string}) => i.id))
  }
  const { data: qs } = await adminClient.from('quotes').select('id').eq('company_id', companyId)
  if (qs && qs.length > 0) {
    await adminClient.from('quote_items').delete().in('quote_id', qs.map((q: {id: string}) => q.id))
  }
  await adminClient.from('invoices').delete().eq('company_id', companyId)
  await adminClient.from('expenses').delete().eq('company_id', companyId)
  await adminClient.from('quotes').delete().eq('company_id', companyId)
  await adminClient.from('subscriptions').delete().eq('company_id', companyId)
  await adminClient.from('payments').delete().eq('company_id', companyId)
  await adminClient.from('notifications').delete().eq('company_id', companyId)
  await adminClient.from('activity_logs').delete().eq('company_id', companyId)
  await adminClient.from('accountant_clients').delete().eq('company_id', companyId)
  await adminClient.from('employees').delete().eq('company_id', companyId)
  await adminClient.from('withholding_tax').delete().eq('company_id', companyId)
  await adminClient.from('bank_reconciliation').delete().eq('company_id', companyId)
  await adminClient.from('services').delete().eq('company_id', companyId)
  await adminClient.from('expense_categories').delete().eq('company_id', companyId)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { data } = await supabase.from('companies').select('*, users(*), subscriptions(*)').eq('id', id).single()
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const { action } = body

  const adminClient = await createAdminClient()

  if (action === 'delete_company') {
    try {
      const { data: users } = await adminClient.from('users').select('id').eq('company_id', id)
      
      await deleteCompanyData(adminClient, id)
      
      if (users && users.length > 0) {
        await adminClient.from('users').delete().eq('company_id', id)
        for (const u of users) {
          try { await adminClient.auth.admin.deleteUser(u.id) } catch {}
        }
      }

      const { error } = await adminClient.from('companies').delete().eq('id', id)
      if (error) throw new Error(error.message)

      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('Delete company error:', err)
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  if (action === 'toggle_active') {
    const { is_active } = body
    await supabase.from('companies').update({ is_active }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const adminClient = await createAdminClient()

  try {
    const { data: users } = await adminClient.from('users').select('id').eq('company_id', id)
    
    await deleteCompanyData(adminClient, id)
    
    if (users && users.length > 0) {
      await adminClient.from('users').delete().eq('company_id', id)
      for (const u of users) {
        try { await adminClient.auth.admin.deleteUser(u.id) } catch {}
      }
    }

    await adminClient.from('companies').delete().eq('id', id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE company error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
