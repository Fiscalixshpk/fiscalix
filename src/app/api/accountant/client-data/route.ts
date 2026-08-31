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

    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    const type = searchParams.get('type') // invoices | expenses

    if (!companyId) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

    // Verify accountant manages this company
    if (profile?.role === 'accountant') {
      const { data: rel } = await supabase
        .from('accountant_clients')
        .select('id').eq('accountant_id', user.id).eq('company_id', companyId).eq('is_active', true)
        .maybeSingle()

      if (!rel) return NextResponse.json({ error: 'Nuk keni qasje në këtë kompani' }, { status: 403 })
    }

    if (type === 'invoices') {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, client_name, issue_date, due_date, total_amount, status')
        .eq('company_id', companyId)
        .order('issue_date', { ascending: false })
        .limit(100)
      return NextResponse.json(data || [])
    }

    if (type === 'expenses') {
      const { data } = await supabase
        .from('expenses')
        .select('id, vendor_name, amount, expense_date, expense_categories(name_sq, name)')
        .eq('company_id', companyId)
        .order('expense_date', { ascending: false })
        .limit(100)
      return NextResponse.json(data || [])
    }

    return NextResponse.json({ error: 'type must be invoices or expenses' }, { status: 400 })
  } catch (err) {
    console.error('client-data error:', err)
    return NextResponse.json({ error: 'Gabim serveri' }, { status: 500 })
  }
}
