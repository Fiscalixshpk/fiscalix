// /api/pos/products — CRUD për produktet e POS (tabela pos_products)
//
// Çmimet ruhen në njësi €0.0001 (formati ATK): €1.50 = 15000
// Klienti dërgon priceEUR / buyPriceEUR si numra decimal në euro.
//
// GET ?companyId=...        → legacy (Arkë/service POS): array [{ name, price }] nga tabela `products`
// GET ?includeInactive=true → { products: PosProduct[] }
// POST   body               → { product }
// PUT    body { id, ... }   → { product }   (update i pjesshëm, p.sh. vetëm stock)
// DELETE ?id=...            → { success: true }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PRICE_SCALE = 10_000
const TAX_RATES = ['A', 'C', 'D', 'E'] as const

const PRODUCT_COLUMNS =
  'id, company_id, name, price, category, emoji, tax_rate, unit, stock, barcode, is_active, image_url, buy_price, discount, sort_order, created_at, updated_at'

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

interface ProductPayload {
  id?: string
  name?: string
  priceEUR?: number | string | null
  buyPriceEUR?: number | string | null
  category?: string | null
  emoji?: string | null
  tax_rate?: string
  unit?: string
  stock?: number | string | null
  barcode?: string | null
  discount?: number | string | null
  is_active?: boolean
  image_url?: string | null
}

// ── Helpers ────────────────────────────────────────────────────

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getContext(): Promise<
  { supabase: SupabaseServer; companyId: string } | { error: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: fail('Nuk jeni i autentikuar', 401) }

  const { data } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!data?.company_id) return { error: fail('Kompania nuk u gjet', 404) }
  return { supabase, companyId: data.company_id as string }
}

async function readBody(req: NextRequest): Promise<ProductPayload | null> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' ? (body as ProductPayload) : null
  } catch {
    return null
  }
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const toUnits = (eur: number) => Math.round(eur * PRICE_SCALE)
const cleanText = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * Ndërton rreshtin për DB. `partial=true` (PUT) përfshin vetëm fushat e dërguara.
 * Kthen string me mesazh gabimi nëse validimi dështon.
 */
function buildRow(body: ProductPayload, partial: boolean): Record<string, unknown> | string {
  const row: Record<string, unknown> = {}
  const has = (k: keyof ProductPayload) => Object.prototype.hasOwnProperty.call(body, k)

  if (!partial || has('name')) {
    const name = cleanText(body.name)
    if (!name) return 'Emri i produktit kërkohet'
    row.name = name
  }

  if (!partial || has('priceEUR')) {
    const price = toNumber(body.priceEUR)
    if (price === null || price < 0) return 'Çmimi nuk është valid'
    row.price = toUnits(price)
  }

  if (has('buyPriceEUR')) {
    const buy = toNumber(body.buyPriceEUR)
    if (buy !== null && buy < 0) return 'Çmimi i blerjes nuk është valid'
    row.buy_price = buy === null ? null : toUnits(buy)
  }

  if (has('discount')) {
    const d = toNumber(body.discount) ?? 0
    if (d < 0 || d > 100) return 'Zbritja duhet të jetë 0–100%'
    row.discount = d
  }

  if (has('stock')) {
    const s = toNumber(body.stock)
    if (s !== null && (s < 0 || !Number.isInteger(s))) return 'Stoku duhet të jetë numër i plotë ≥ 0'
    row.stock = s
  }

  if (has('tax_rate') || !partial) {
    const t = body.tax_rate ?? 'E'
    if (!TAX_RATES.includes(t as (typeof TAX_RATES)[number])) return 'Norma e TVSH-së nuk është valide'
    row.tax_rate = t
  }

  if (has('unit') || !partial) row.unit = cleanText(body.unit) ?? 'cope'
  if (has('category')) row.category = cleanText(body.category)
  if (has('barcode')) row.barcode = cleanText(body.barcode)
  if (has('emoji')) row.emoji = cleanText(body.emoji) ?? '#9B5CF8'
  if (has('image_url')) row.image_url = cleanText(body.image_url)
  if (has('is_active')) row.is_active = Boolean(body.is_active)

  return row
}

// ── GET ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const legacyCompanyId = searchParams.get('companyId')

  // Legacy: service POS (Arkë) pret array të thjeshtë nga tabela `products`
  if (legacyCompanyId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('products')
      .select('name, price')
      .eq('company_id', legacyCompanyId)
      .eq('status', 'active')
      .order('name')
      .limit(50)
    return NextResponse.json(data ?? [])
  }

  const ctx = await getContext()
  if ('error' in ctx) return ctx.error

  let query = ctx.supabase
    .from('pos_products')
    .select(PRODUCT_COLUMNS)
    .eq('company_id', ctx.companyId)
    .order('sort_order')
    .order('category')
    .order('name')

  if (searchParams.get('includeInactive') !== 'true') query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) return fail(error.message, 500)
  return NextResponse.json({ products: data ?? [] })
}

// ── POST ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ctx = await getContext()
  if ('error' in ctx) return ctx.error

  const body = await readBody(req)
  if (!body) return fail('Të dhëna të pavlefshme', 400)

  const row = buildRow(body, false)
  if (typeof row === 'string') return fail(row, 400)

  const { data, error } = await ctx.supabase
    .from('pos_products')
    .insert({ ...row, company_id: ctx.companyId })
    .select(PRODUCT_COLUMNS)
    .single()

  if (error) return fail(error.message, 500)
  return NextResponse.json({ product: data }, { status: 201 })
}

// ── PUT ────────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const ctx = await getContext()
  if ('error' in ctx) return ctx.error

  const body = await readBody(req)
  if (!body?.id) return fail('ID e produktit mungon', 400)

  const row = buildRow(body, true)
  if (typeof row === 'string') return fail(row, 400)

  const { data, error } = await ctx.supabase
    .from('pos_products')
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('company_id', ctx.companyId)
    .select(PRODUCT_COLUMNS)
    .maybeSingle()

  if (error) return fail(error.message, 500)
  if (!data) return fail('Produkti nuk u gjet', 404)
  return NextResponse.json({ product: data })
}

// ── DELETE ─────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const ctx = await getContext()
  if ('error' in ctx) return ctx.error

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail('ID e produktit mungon', 400)

  const { error, count } = await ctx.supabase
    .from('pos_products')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('company_id', ctx.companyId)

  if (error) {
    // 23503 = FK violation (produkti është përdorur në shitje) → çaktivizo në vend të fshirjes
    if (error.code === '23503') {
      const { error: softErr } = await ctx.supabase
        .from('pos_products')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', ctx.companyId)
      if (softErr) return fail(softErr.message, 500)
      return NextResponse.json({ success: true, deactivated: true })
    }
    return fail(error.message, 500)
  }

  if (!count) return fail('Produkti nuk u gjet', 404)
  return NextResponse.json({ success: true })
}
