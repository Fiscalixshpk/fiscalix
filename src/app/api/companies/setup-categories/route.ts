import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CATEGORY_EXPENSE_PRESETS, DEFAULT_EXPENSE_CATEGORIES, type BusinessCategoryId } from '@/lib/business-categories'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { company_id, business_category } = await req.json()

  const presets = CATEGORY_EXPENSE_PRESETS[business_category as BusinessCategoryId] || DEFAULT_EXPENSE_CATEGORIES

  const categories = presets.map((cat, i) => ({
    company_id,
    name: cat.name,
    name_sq: cat.name,
    icon: cat.icon,
    color: cat.color,
    is_global: false,
    sort_order: i,
  }))

  const { error } = await supabase.from('expense_categories').insert(categories)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, count: categories.length })
}
