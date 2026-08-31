// POST /api/pos/import
// Importon produktet bulk nga CSV/Excel parse

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

interface ImportProduct {
  name:     string
  priceEUR: number
  category: string
  barcode:  string
  tax_rate: string
  unit:     string
  stock:    number | null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const { products }: { products: ImportProduct[] } = await req.json()
  if (!products?.length) return NextResponse.json({ error: 'Asnjë produkt' }, { status: 400 })

  let imported = 0, errors = 0

  // Batch insert 50 at a time
  const BATCH = 50
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH).map(p => ({
      company_id:  userData.company_id,
      name:        p.name.trim(),
      price:       Math.round(parseFloat(String(p.priceEUR)) * 10000), // ATK format
      category:    p.category?.trim() || null,
      barcode:     p.barcode?.trim()  || null,
      tax_rate:    ['A','C','D','E'].includes(p.tax_rate) ? p.tax_rate : 'E',
      unit:        p.unit?.trim() || 'cope',
      stock:       p.stock !== null ? parseInt(String(p.stock)) || null : null,
      emoji:       '#9B5CF8',
      is_active:   true,
      sort_order:  i,
      created_at:  new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('pos_products')
      .insert(batch)

    if (error) {
      errors += batch.length
      console.error('Import batch error:', error.message)
    } else {
      imported += batch.length
    }
  }

  return NextResponse.json({ imported, errors, total: products.length })
}
