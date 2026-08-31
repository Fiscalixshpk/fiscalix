import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Klientët', { views: [{ showGridLines: false }] })

  const headers = ['Emri i Biznesit', 'Lloji (Market/Restorant/Tjetër)', 'NUI', 'Telefoni', 'Në TVSH? (Po/Jo)']
  const headerRow = sheet.getRow(1)
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5A1FD6' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })
  headerRow.height = 30

  // Rreshta shembull, që kontabilisti t'i fshijë/zëvendësojë
  const examples = [
    ['Market Driloni', 'Market', '800123456', '044123456', 'Jo'],
    ['Restorant Tona', 'Restorant', '800999888', '044999888', 'Po'],
  ]
  examples.forEach((row, rIdx) => {
    const r = sheet.getRow(rIdx + 2)
    row.forEach((val, cIdx) => {
      const cell = r.getCell(cIdx + 1)
      cell.value = val
      cell.font = { size: 10.5, italic: true, color: { argb: 'FF9CA3AF' } }
    })
  })

  sheet.getColumn(1).width = 28
  sheet.getColumn(2).width = 26
  sheet.getColumn(3).width = 16
  sheet.getColumn(4).width = 16
  sheet.getColumn(5).width = 18

  // Shënim udhëzues poshtë shembujve
  const noteRow = sheet.getRow(5)
  sheet.mergeCells(5, 1, 5, 5)
  noteRow.getCell(1).value = 'Fshini këto 2 rreshta shembull dhe shkruani klientët tuaj. Vetëm "Emri i Biznesit" është i detyrueshëm.'
  noteRow.getCell(1).font = { size: 9.5, italic: true, color: { argb: 'FF6B7280' } }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Fiscalix_Shabllon_Importi_Klientesh.xlsx"',
    },
  })
}
