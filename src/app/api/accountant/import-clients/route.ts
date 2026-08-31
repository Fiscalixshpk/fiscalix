import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ParsedRow {
  business_name: string
  business_type: string
  vat_number: string
  phone: string
  is_vat_registered: boolean
  rowError?: string
}

const TYPE_MAP: Record<string, string> = {
  'market': 'market', 'restorant': 'restorant', 'restaurant': 'restorant',
  'kontabilitet': 'tjeter', 'tjeter': 'tjeter', 'tjetër': 'tjeter',
}

function normalizeType(raw: string): string {
  const key = (raw || '').toLowerCase().trim()
  return TYPE_MAP[key] || 'tjeter'
}

function normalizeBool(raw: string): boolean {
  const key = (raw || '').toLowerCase().trim()
  return ['po', 'yes', 'true', '1', 'x'].includes(key)
}

/**
 * Parson rreshtat e Excel/CSV sipas shabllonit fiks Fiscalix:
 * Kolona A: Emri i Biznesit (e detyrueshme)
 * Kolona B: Lloji (Market/Restorant/Tjetër)
 * Kolona C: NUI
 * Kolona D: Telefoni
 * Kolona E: A është në TVSH (Po/Jo)
 */
function parseRows(rawRows: unknown[][]): ParsedRow[] {
  // Rreshti i parë supozohet header — e kapërcejmë
  const dataRows = rawRows.slice(1)
  return dataRows
    .filter(r => r.some(cell => String(cell ?? '').trim() !== '')) // injoro rreshta krejt bosh
    .map(r => {
      const business_name = String(r[0] ?? '').trim()
      const business_type = normalizeType(String(r[1] ?? ''))
      const vat_number = String(r[2] ?? '').trim()
      const phone = String(r[3] ?? '').trim()
      const is_vat_registered = normalizeBool(String(r[4] ?? ''))

      const row: ParsedRow = { business_name, business_type, vat_number, phone, is_vat_registered }
      if (!business_name) row.rowError = 'Mungon emri i biznesit'
      return row
    })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['accountant', 'admin'].includes(profile?.role || '')) {
    return NextResponse.json({ error: 'Vetëm kontabilistët mund të importojnë klientë' }, { status: 403 })
  }

  const body = await req.json()
  const { fileBase64, mode } = body as { fileBase64: string; mode: 'preview' | 'confirm' }

  if (!fileBase64) return NextResponse.json({ error: 'Fajlli mungon' }, { status: 400 })

  try {
    const XLSX = await import('xlsx')
    const buf = Buffer.from(fileBase64, 'base64')
    const wb = XLSX.read(buf, { type: 'buffer' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

    const parsed = parseRows(rawRows)
    const valid = parsed.filter(r => !r.rowError)
    const invalid = parsed.filter(r => r.rowError)

    if (mode === 'preview') {
      return NextResponse.json({
        totalRows: parsed.length,
        validCount: valid.length,
        invalidCount: invalid.length,
        preview: parsed.slice(0, 10),
      })
    }

    // mode === 'confirm' — krijo bulk
    if (valid.length === 0) {
      return NextResponse.json({ error: 'Nuk ka rreshta të vlefshëm për t\'u importuar' }, { status: 400 })
    }

    const { data: created, error } = await supabase
      .from('lightweight_clients')
      .insert(valid.map(r => ({
        accountant_id: user.id,
        business_name: r.business_name,
        business_type: r.business_type,
        vat_number: r.vat_number || null,
        is_vat_registered: r.is_vat_registered,
        phone: r.phone || null,
      })))
      .select()

    if (error) {
      console.error('[POST /api/accountant/import-clients]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      importedCount: created?.length || 0,
      skippedCount: invalid.length,
      clients: created,
    })
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json({ error: 'Gabim gjatë leximit të fajllit. Sigurohu që është format Excel/CSV i vlefshëm.' }, { status: 500 })
  }
}
