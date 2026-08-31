/**
 * excel-export.ts — Gjenerim Excel profesional me ExcelJS
 * Ngjyra, kufij, header bold — jo thjesht tekst i thjeshtë (xlsx bazik s'i mbështet këto).
 */

import ExcelJS from 'exceljs'

const COLORS = {
  brandPurple: 'FF5A1FD6',
  brandPurpleLight: 'FF9B5CF8',
  headerBg: 'FF1E1B3A',     // mbrapa e errët për header titullin
  tableHeaderBg: 'FF5A1FD6', // purple për header tabele
  tableHeaderText: 'FFFFFFFF',
  rowAltBg: 'FFF5F3FF',      // purple shumë i lehtë për rreshta alternues
  rowBg: 'FFFFFFFF',
  borderColor: 'FFD1C7F0',
  positiveGreen: 'FF10B981',
  negativeRed: 'FFEF4444',
  textDark: 'FF1F2937',
  textGray: 'FF6B7280',
}

export interface ExcelExportOptions {
  title: string                    // p.sh. "LIBRI I SHITJEVE"
  companyName: string
  vatNumber?: string
  periodLabel: string              // p.sh. "01/01/2026 - 26/06/2026"
  sheetName: string
  headers: string[]
  rows: (string | number)[][]
  // Kolona që duhen formatuar si valutë (indeksi 0-based)
  currencyColumns?: number[]
  // Kolona që duhen formatuar si datë (tekst i thjeshtë, jo ndryshim)
  totalsRow?: (string | number)[]  // rresht totalesh opsional në fund
  notesSection?: { heading: string; lines: string[] } // udhëzime ligjore, etj — pas tabelës
}

export interface SheetSpec extends ExcelExportOptions {}

/**
 * Shton një fletë të stilizuar (header, tabelë, totale, shënime) te një workbook ekzistues.
 * Përdoret nga generateProfessionalExcel (1 fletë) dhe generateMultiSheetExcel (shumë fletë).
 */
function addStyledSheet(workbook: ExcelJS.Workbook, opts: SheetSpec) {
  const sheet = workbook.addWorksheet(opts.sheetName.slice(0, 31), {
    views: [{ showGridLines: false }],
  })

  const colCount = opts.headers.length

  // ── Header i dokumentit (titull + kompani + periudhë) ──
  sheet.mergeCells(1, 1, 1, colCount)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = opts.title
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
  sheet.getRow(1).height = 32

  sheet.mergeCells(2, 1, 2, colCount)
  const companyCell = sheet.getCell(2, 1)
  companyCell.value = `${opts.companyName}${opts.vatNumber ? `  •  NUI/NF: ${opts.vatNumber}` : ''}`
  companyCell.font = { size: 11, color: { argb: 'FFFFFFFF' } }
  companyCell.alignment = { horizontal: 'center', vertical: 'middle' }
  companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
  sheet.getRow(2).height = 22

  sheet.mergeCells(3, 1, 3, colCount)
  const periodCell = sheet.getCell(3, 1)
  periodCell.value = `Periudha: ${opts.periodLabel}`
  periodCell.font = { size: 10, italic: true, color: { argb: 'FFD1C7F0' } }
  periodCell.alignment = { horizontal: 'center', vertical: 'middle' }
  periodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
  sheet.getRow(3).height = 20

  sheet.getRow(4).height = 6

  // ── Header i tabelës ──
  const headerRowIdx = 5
  const headerRow = sheet.getRow(headerRowIdx)
  opts.headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, size: 11, color: { argb: COLORS.tableHeaderText } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.tableHeaderBg } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: COLORS.borderColor } },
      bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
      left: { style: 'thin', color: { argb: COLORS.borderColor } },
      right: { style: 'thin', color: { argb: COLORS.borderColor } },
    }
  })
  headerRow.height = 26

  // ── Rreshtat e të dhënave (me alternim ngjyrash) ──
  opts.rows.forEach((rowData, rIdx) => {
    const row = sheet.getRow(headerRowIdx + 1 + rIdx)
    const isAlt = rIdx % 2 === 1
    rowData.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1)
      const isCurrency = opts.currencyColumns?.includes(cIdx)
      if (isCurrency && typeof val === 'string') {
        const num = parseFloat(val.replace(/[^\d.-]/g, ''))
        cell.value = isNaN(num) ? val : num
        cell.numFmt = '€ #,##0.00'
      } else if (isCurrency && typeof val === 'number') {
        cell.value = val
        cell.numFmt = '€ #,##0.00'
      } else {
        cell.value = val
      }
      cell.font = { size: 10.5, color: { argb: COLORS.textDark } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? COLORS.rowAltBg : COLORS.rowBg } }
      cell.alignment = { horizontal: isCurrency ? 'right' : 'left', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.borderColor } },
        bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
        left: { style: 'thin', color: { argb: COLORS.borderColor } },
        right: { style: 'thin', color: { argb: COLORS.borderColor } },
      }
    })
    row.height = 20
  })

  // ── Rreshti i totaleve (nëse ka) ──
  if (opts.totalsRow) {
    const totalsRowIdx = headerRowIdx + 1 + opts.rows.length
    const totalsRow = sheet.getRow(totalsRowIdx)
    opts.totalsRow.forEach((val, cIdx) => {
      const cell = totalsRow.getCell(cIdx + 1)
      const isCurrency = opts.currencyColumns?.includes(cIdx)
      if (isCurrency && typeof val === 'number') {
        cell.value = val
        cell.numFmt = '€ #,##0.00'
      } else {
        cell.value = val
      }
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandPurple } }
      cell.alignment = { horizontal: isCurrency ? 'right' : 'left', vertical: 'middle' }
      cell.border = {
        top: { style: 'medium', color: { argb: COLORS.brandPurpleLight } },
        bottom: { style: 'medium', color: { argb: COLORS.brandPurpleLight } },
      }
    })
    totalsRow.height = 24
  }

  // ── Gjerësia automatike e kolonave bazuar te përmbajtja ──
  opts.headers.forEach((h, i) => {
    const col = sheet.getColumn(i + 1)
    const maxContentLen = Math.max(
      h.length,
      ...opts.rows.map(r => String(r[i] ?? '').length)
    )
    col.width = Math.min(Math.max(maxContentLen + 4, 11), 38)
  })

  // ── Seksioni i shënimeve/udhëzimeve ligjore (opsional) ──
  let nextRowIdx = headerRowIdx + 1 + opts.rows.length + (opts.totalsRow ? 1 : 0)
  if (opts.notesSection) {
    nextRowIdx += 1
    sheet.mergeCells(nextRowIdx, 1, nextRowIdx, colCount)
    const headingCell = sheet.getCell(nextRowIdx, 1)
    headingCell.value = opts.notesSection.heading
    headingCell.font = { bold: true, size: 10.5, color: { argb: COLORS.brandPurple } }
    nextRowIdx += 1
    opts.notesSection.lines.forEach(line => {
      sheet.mergeCells(nextRowIdx, 1, nextRowIdx, colCount)
      const cell = sheet.getCell(nextRowIdx, 1)
      cell.value = line
      cell.font = { size: 9.5, color: { argb: COLORS.textGray } }
      nextRowIdx += 1
    })
  }

  // ── Footer i lehtë (gjeneruar nga Fiscalix) ──
  const footerRowIdx = nextRowIdx + 1
  sheet.mergeCells(footerRowIdx, 1, footerRowIdx, colCount)
  const footerCell = sheet.getCell(footerRowIdx, 1)
  footerCell.value = `Gjeneruar nga Fiscalix • ${new Date().toLocaleDateString('sq-AL')}`
  footerCell.font = { size: 8.5, italic: true, color: { argb: COLORS.textGray } }
  footerCell.alignment = { horizontal: 'center' }
}

/**
 * Gjeneron një workbook me 1 fletë të stilizuar (rasti i zakonshëm).
 */
export async function generateProfessionalExcel(opts: ExcelExportOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = opts.companyName
  workbook.created = new Date()
  addStyledSheet(workbook, opts)
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * Gjeneron një workbook me SHUMË fletë të stilizuara (p.sh. raporti "Per Klient",
 * ku secili klient merr fletën e vet brenda të njëjtit skedar Excel).
 */
export async function generateMultiSheetExcel(sheets: SheetSpec[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = sheets[0]?.companyName || 'Fiscalix'
  workbook.created = new Date()
  sheets.forEach(spec => addStyledSheet(workbook, spec))
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
