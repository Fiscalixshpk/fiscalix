import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('company_id')
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
  const quarter = parseInt(searchParams.get('quarter') || '1')
  if (!companyId) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

  // Verify access: accountant must be linked to this company
  const { data: userProfile } = await supabase.from('users').select('role, company_id').eq('id', user.id).single()
  if (userProfile?.role === 'accountant') {
    const { data: link } = await supabase.from('accountant_clients')
      .select('id').eq('accountant_id', user.id).eq('company_id', companyId).eq('is_active', true).maybeSingle()
    if (!link) return NextResponse.json({ error: 'Nuk keni qasje në këtë kompani' }, { status: 403 })
  } else if (userProfile?.role === 'business_owner' && userProfile.company_id !== companyId) {
    return NextResponse.json({ error: 'Nuk keni qasje' }, { status: 403 })
  }

  const qMap: Record<number,{start:string;end:string}> = {
    1:{start:`${year}-01-01`,end:`${year}-03-31`},
    2:{start:`${year}-04-01`,end:`${year}-06-30`},
    3:{start:`${year}-07-01`,end:`${year}-09-30`},
    4:{start:`${year}-10-01`,end:`${year}-12-31`},
  }
  const { start, end } = qMap[quarter] || qMap[1]

  const adminSupabase = await createAdminClient()
  const [invRes, expRes] = await Promise.all([
    adminSupabase.from('invoices').select('total_amount,status,issue_date').eq('company_id', companyId).gte('issue_date', start).lte('issue_date', end),
    adminSupabase.from('expenses').select('amount,expense_date').eq('company_id', companyId).gte('expense_date', start).lte('expense_date', end),
  ])

  const invoices = invRes.data || []
  const expenses = expRes.data || []
  const revenue = invoices.reduce((s,i) => s + Number(i.total_amount||0), 0)
  const totalExp = expenses.reduce((s,e) => s + Number(e.amount||0), 0)

  return NextResponse.json({
    revenue, expenses: totalExp, profit: revenue - totalExp,
    total_invoices: invoices.length,
    unpaid_invoices: invoices.filter(i => i.status !== 'paid').length,
  })
}
