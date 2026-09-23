'use client'
// Printimi i kuponit fiskal zyrtar nga serveri — përmes iframe-it të fshehur (pa popup).
// Printimi i parë është origjinali; çdo printim tjetër del automatikisht "KOPJE E KUPONIT".

export type PaperWidth = 58 | 80

const PAPER_KEY = 'fiscalix.receipt.paper'

export function getPaperWidth(): PaperWidth {
  try { return localStorage.getItem(PAPER_KEY) === '58' ? 58 : 80 } catch { return 80 }
}
export function setPaperWidth(w: PaperWidth) {
  try { localStorage.setItem(PAPER_KEY, String(w)) } catch { /* private mode */ }
}

export function receiptUrl(saleId: string, opts: { print?: boolean; copy?: boolean; preview?: boolean; paper?: PaperWidth } = {}) {
  const q = new URLSearchParams({ paper: String(opts.paper ?? getPaperWidth()) })
  if (opts.print) q.set('print', '1')
  if (opts.copy) q.set('copy', '1')
  if (opts.preview) q.set('preview', '1')
  return `/api/pos/receipt/${encodeURIComponent(saleId)}?${q}`
}

/** Printon kuponin zyrtar. Kthen false nëse serveri refuzoi (p.sh. kupon i refuzuar nga ATK). */
export async function printFiscalReceipt(saleId: string, opts: { copy?: boolean; paper?: PaperWidth } = {}): Promise<boolean> {
  const url = receiptUrl(saleId, { ...opts, print: true })
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return false
  const html = await res.text()

  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  if (!doc) { frame.remove(); return false }
  doc.open(); doc.write(html); doc.close()
  const cleanup = () => setTimeout(() => frame.remove(), 1000)
  frame.contentWindow?.addEventListener('afterprint', cleanup)
  setTimeout(cleanup, 60_000)
  return true
}

/** "Print Preview" (Neni 25.18) — kuponi në ekran, klienti skanon QR-në pa e printuar */
export function previewFiscalReceipt(saleId: string) {
  window.open(receiptUrl(saleId, { preview: true }), '_blank', 'width=420,height=820,noopener')
}
