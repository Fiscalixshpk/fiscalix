import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = req.nextUrl.searchParams.get('company_id')
  const month = parseInt(req.nextUrl.searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(req.nextUrl.searchParams.get('year') || String(new Date().getFullYear()))
  if (!companyId) return NextResponse.json({ error: 'company_id mungon' }, { status: 400 })

  // Find existing checklist for this month
  let { data: checklist } = await supabase
    .from('closing_checklists')
    .select('*, closing_checklist_items(*)')
    .eq('accountant_id', user.id)
    .eq('company_id', companyId)
    .eq('period_month', month)
    .eq('period_year', year)
    .maybeSingle()

  // If none exists, create one from the template
  if (!checklist) {
    const { data: newChecklist, error: createErr } = await supabase
      .from('closing_checklists')
      .insert({ accountant_id: user.id, company_id: companyId, period_month: month, period_year: year })
      .select()
      .single()

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })

    const { data: templates } = await supabase
      .from('closing_checklist_templates')
      .select('label, sort_order')
      .is('accountant_id', null)
      .order('sort_order')

    if (templates && templates.length > 0) {
      const items = templates.map(t => ({
        checklist_id: newChecklist.id,
        label: t.label,
        sort_order: t.sort_order,
      }))
      await supabase.from('closing_checklist_items').insert(items)
    }

    const { data: full } = await supabase
      .from('closing_checklists')
      .select('*, closing_checklist_items(*)')
      .eq('id', newChecklist.id)
      .single()

    checklist = full
  }

  return NextResponse.json({ checklist })
}

export async function POST(req: NextRequest) {
  // Add a custom checklist item
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { checklist_id, label } = await req.json()
  if (!checklist_id || !label?.trim()) {
    return NextResponse.json({ error: 'checklist_id dhe label janë të detyrueshme' }, { status: 400 })
  }

  const { data: existingItems } = await supabase
    .from('closing_checklist_items')
    .select('sort_order')
    .eq('checklist_id', checklist_id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existingItems?.[0]?.sort_order || 0) + 1

  const { data, error } = await supabase
    .from('closing_checklist_items')
    .insert({ checklist_id, label: label.trim(), sort_order: nextOrder })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
