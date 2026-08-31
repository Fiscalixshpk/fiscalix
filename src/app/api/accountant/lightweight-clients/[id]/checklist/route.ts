import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

async function verifyOwnership(supabase: Awaited<ReturnType<typeof createClient>>, clientId: string, accountantId: string) {
  const { data } = await supabase
    .from('lightweight_clients')
    .select('id')
    .eq('id', clientId)
    .eq('accountant_id', accountantId)
    .maybeSingle()
  return !!data
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await verifyOwnership(supabase, id, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const month = parseInt(req.nextUrl.searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(req.nextUrl.searchParams.get('year') || String(new Date().getFullYear()))

  let { data: checklist } = await supabase
    .from('lightweight_checklists')
    .select('*, lightweight_checklist_items(*)')
    .eq('lightweight_client_id', id)
    .eq('period_month', month)
    .eq('period_year', year)
    .maybeSingle()

  if (!checklist) {
    const { data: newChecklist, error: createErr } = await supabase
      .from('lightweight_checklists')
      .insert({ lightweight_client_id: id, period_month: month, period_year: year })
      .select()
      .single()

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })

    // Default items specifik për markete/restorante (ndryshe nga checklist normal)
    const defaultItems = [
      { label: 'Hyrje shitje nga kuponi fiskal', sort_order: 1 },
      { label: 'Rakordo me arkën fiskale', sort_order: 2 },
      { label: 'Fut faturat e furnitorëve', sort_order: 3 },
      { label: 'Verifiko kontributet pensionale', sort_order: 4 },
      { label: 'Deklaro TVSH/TAK (nëse afati është këtë muaj)', sort_order: 5 },
    ]
    await supabase.from('lightweight_checklist_items').insert(
      defaultItems.map(item => ({ checklist_id: newChecklist.id, ...item }))
    )

    const { data: full } = await supabase
      .from('lightweight_checklists')
      .select('*, lightweight_checklist_items(*)')
      .eq('id', newChecklist.id)
      .single()
    checklist = full
  }

  return NextResponse.json({ checklist })
}
