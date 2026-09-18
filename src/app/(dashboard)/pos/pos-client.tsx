'use client'
// src/app/(dashboard)/pos/pos-client.tsx
// Adaptive POS — produkte për market/restorant, shërbime për mjek/sallon

import { useState, useMemo, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Search, Zap, ShoppingCart, Trash2, Plus, Minus, Package, Receipt, Scan,
  CreditCard, Banknote, Wifi, WifiOff, Printer, X, Check,
  AlertTriangle, Stethoscope, Scissors, Edit3
} from 'lucide-react'
import { getPOSConfig } from '@/lib/pos-business-config'
import { buildATKReceipt } from '@/hooks/usePrintReceipt'
import { printReceipt as doPrintReceipt } from '@/components/pos/receipt-printer'

interface Product {
  id: string; name: string; price: number; category: string | null
  emoji: string; tax_rate: string; unit: string; stock: number | null
  is_active: boolean; barcode?: string | null
}

interface CartItem {
  productId: string; name: string; emoji: string
  price: number; unit: string; quantity: number
  taxRate: string; total: number
  customPrice?: number   // për shërbime me çmim të ndryshueshëm
}

interface Props {
  userId:          string
  company:         { id: string; name: string; businessType: string; nui: string; locationCity: string }
  device:          { id: string; posId: number; name: string; cashierName: string; environment: 'TEST' | 'PROD' } | null
  initialProducts: Product[]
  isMockMode:      boolean
}

const priceDisplay = (p: number) => {
  const eur = p / 10000
  // Show 4 decimals if price has sub-cent precision
  return eur % 0.01 !== 0 ? eur.toFixed(4) : eur.toFixed(2)
}

function calcTotals(items: CartItem[]) {
  const TAX: Record<string, number> = { A: 0, C: 0, D: 0.08, E: 0.18 }
  const subtotalRaw = items.reduce((s, i) => s + (i.customPrice ?? i.price) * i.quantity, 0)
  const subtotalEUR = subtotalRaw / 10000
  let taxEUR = 0
  for (const item of items) {
    const rate    = TAX[item.taxRate] ?? 0.18
    const itemEUR = ((item.customPrice ?? item.price) * item.quantity) / 10000
    taxEUR += itemEUR - itemEUR / (1 + rate)
  }
  return {
    subtotalEUR, taxEUR, noTaxEUR: subtotalEUR - taxEUR,
    totalEUR:    subtotalEUR,
    totalCents:  Math.round(subtotalEUR * 100),
    taxCents:    Math.round(taxEUR * 100),
    noTaxCents:  Math.round((subtotalEUR - taxEUR) * 100),
  }
}

import QRCanvas from '@/components/pos/qr-canvas'

export default function POSClient({ userId, company, device, initialProducts, isMockMode }: Props) {
  const config = getPOSConfig(company.businessType)

  const [cart,        setCart]        = useState<CartItem[]>([])
  const [search,      setSearch]      = useState('')
  const [activeCat,   setActiveCat]   = useState('all')
  const [payMethod,   setPayMethod]   = useState<'cash'|'card'|'split'>('cash')
  const [splitCash,   setSplitCash]   = useState<string>('')
  const [splitCard,   setSplitCard]   = useState<string>('')
  const [totalDiscount, setTotalDiscount] = useState<string>('')
  const [discountType,  setDiscountType]  = useState<'value'|'percent'>('value')
  const [itemDiscounts, setItemDiscounts] = useState<Record<string, {amount:string;type:'value'|'percent'}>>({})
  const [isOnline,    setIsOnline]    = useState(true)
  const [isLoading,   setIsLoading]   = useState(false)
  const [receipt,     setReceipt]     = useState<{
    receiptNumber: string; transactionId: number | null
    totalEUR: string; qrCodeData: string
    items: CartItem[]; payMethod: string
    taxEUR: string; noTaxEUR: string
  } | null>(null)
  // For editable price (services)
  const [editPriceId,  setEditPriceId]  = useState<string | null>(null)
  const [editPriceVal, setEditPriceVal] = useState('')
  const [lastScanned,  setLastScanned]  = useState<string | null>(null)

  // ── CART ACTIONS — duhet para useEffect barcode ──────────────
  const addItem = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id)
      if (existing) {
        return prev.map(i => i.productId === product.id
          ? { ...i, quantity: i.quantity + 1 }
          : i)
      }
      return [...prev, {
        productId: product.id, name: product.name, emoji: product.emoji,
        price: product.price, unit: product.unit, quantity: 1,
        taxRate: product.tax_rate, total: product.price,
      }]
    })
  }, [])

  // ── ONLINE/OFFLINE ───────────────────────────────────────────
  useEffect(() => {
    const on  = () => { setIsOnline(true); fetch('/api/pos/sync-offline', { method: 'POST' }).catch(() => {}) }
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    setIsOnline(navigator.onLine)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // ── BARCODE SCANNER ──────────────────────────────────────────
  // Scanner-i sillet si tastierë — shkruan karaktere shpejt + Enter
  // Nëse > 3 karaktere vijnë brenda 100ms → barcode scan
  useEffect(() => {
    let buffer  = ''
    let timeout: ReturnType<typeof setTimeout> | null = null

    function handleKey(e: KeyboardEvent) {
      // Mos intercepto nëse fokusi është te një input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          // Kërko produktin sipas barcode
          const found = initialProducts.find(p =>
            p.barcode && p.barcode.trim() === buffer.trim()
          )
          if (found) {
            addItem(found)
            setLastScanned(found.name)
            setTimeout(() => setLastScanned(null), 2000)
          } else {
            setLastScanned(`Barcode nuk u gjet: ${buffer}`)
            setTimeout(() => setLastScanned(null), 2500)
          }
        }
        buffer = ''
        if (timeout) clearTimeout(timeout)
        return
      }

      // Vetëm karaktere printable
      if (e.key.length === 1) {
        buffer += e.key
        if (timeout) clearTimeout(timeout)
        // Reset buffer pas 200ms pa input — scanner-i është shumë i shpejtë
        timeout = setTimeout(() => { buffer = '' }, 200)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      if (timeout) clearTimeout(timeout)
    }
  }, [initialProducts, addItem])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(initialProducts.map(p => p.category).filter(Boolean))) as string[]
    return ['all', ...cats]
  }, [initialProducts])

  const filtered = useMemo(() => initialProducts.filter(p => {
    const matchCat    = activeCat === 'all' || p.category === activeCat
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  }), [initialProducts, search, activeCat])

  const totals = useMemo(() => calcTotals(cart), [cart])

  // ── REMOVE ITEM ───────────────────────────────────────────────
  const removeItem = useCallback((productId: string) => {
    setCart(prev => {
      const item = prev.find(i => i.productId === productId)
      if (!item) return prev
      if (item.quantity <= 1) return prev.filter(i => i.productId !== productId)
      return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i)
    })
  }, [])

  function updateCustomPrice(productId: string, priceEUR: string) {
    const price = parseFloat(priceEUR)
    if (isNaN(price) || price < 0) return
    const atkPrice = Math.round(price * 10000)
    setCart(prev => prev.map(i => i.productId === productId
      ? { ...i, customPrice: atkPrice }
      : i))
    setEditPriceId(null)
  }

  // ── THERMAL PRINT ────────────────────────────────────────────
  function printReceipt(r: typeof receipt) {
    if (!r) return

    // Llogarit zbritjen
    let discountCents = 0
    if (totalDiscount) {
      const d = parseFloat(totalDiscount)
      const cartTotal = cart.reduce((s, i) => s + Math.round(i.price * i.quantity / 100), 0)
      discountCents = discountType === 'percent'
        ? Math.round(cartTotal * d / 100)
        : Math.round(d * 100)
    }

    // Split payment
    let splitPayment: { cash: number; card: number } | undefined
    if (payMethod === 'split') {
      splitPayment = {
        cash: Math.round(parseFloat(splitCash || '0') * 100),
        card: Math.round(parseFloat(splitCard || '0') * 100),
      }
    }

    // Ndërto ReceiptData ATK-konforme
    const atk = buildATKReceipt(r, cart.map(i => ({
      name: i.name, price: i.price,
      quantity: i.quantity, unit: i.unit || 'cope',
      taxRate: i.taxRate || 'E',
    })), company, {
      paymentMethod: payMethod,
      operatorName: cashierName,
      totalDiscount: discountCents || undefined,
      splitPayment,
    })
    doPrintReceipt(atk)
  }

  // ── CHECKOUT ─────────────────────────────────────────────────
  async function checkout() {
    if (!cart.length) return
    if (!device) { toast.error('Nuk ka pajisje POS aktive'); return }
    setIsLoading(true)
    try {
      // Normalize items with customPrice
      const normalizedItems = cart.map(item => ({
        ...item,
        price: item.customPrice ?? item.price,
        total: (item.customPrice ?? item.price) * item.quantity,
      }))

      const res  = await fetch('/api/pos/fiscalize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: normalizedItems, paymentMethod: payMethod,
          companyId: company.id, posDeviceId: device.id,
          operatorName: device.cashierName, couponId: 0,
          totalDiscount: discountCents > 0 ? discountCents : undefined,
          splitPayment: splitPayment,
        }),
      })
      const data = await res.json()

      if (data.success || data.status === 'offline') {
        setReceipt({
          receiptNumber: data.receiptNumber, transactionId: data.transactionId,
          totalEUR:  data.totals?.totalEUR  ?? totals.totalEUR.toFixed(2),
          taxEUR:    data.totals?.taxEUR    ?? totals.taxEUR.toFixed(2),
          noTaxEUR:  data.totals?.noTaxEUR  ?? totals.noTaxEUR.toFixed(2),
          qrCodeData: data.qrCodeData,
          items:     [...normalizedItems],
          payMethod,
        })
        setCart([])
        if (data.status === 'offline') toast.warning('Offline — kuponi ruhet, dërgon automatikisht')
      } else {
        toast.error(data.error ?? 'Fiskalizimi dështoi')
      }
    } catch {
      toast.error('Gabim rrjeti')
    } finally {
      setIsLoading(false)
    }
  }

  const isServices = config.mode === 'services'

  return (
    <>
      {/* ── RECEIPT MODAL ── */}
      {receipt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setReceipt(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 28, width: 300, boxShadow:'0 4px 14px rgba(0,0,0,0.08)' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Check size={22} color="#10B981" />
              </div>
              <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 17, fontWeight: 800, color:'var(--text-1)' }}>fiscalix</p>
              <p style={{ fontSize: 12, color:'var(--text-1)', marginTop: 2 }}>{company.name}</p>
              <p style={{ fontSize: 11, color:'var(--text-1)' }}>NUI: {company.nui || '—'} · {new Date().toISOString().split('T')[0]}</p>
            </div>
            <div style={{ background: 'var(--bg-muted)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-3)' }}>Kuponi</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-1)' }}>{receipt.receiptNumber}</span>
              </div>
              {receipt.transactionId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
                  <span style={{ color: 'var(--text-3)' }}>ATK</span>
                  <span style={{ fontFamily: 'monospace', color: '#10B981', fontWeight: 700 }}>#{receipt.transactionId}</span>
                </div>
              )}
              
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>TOTAL</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#9B5CF8', fontFamily: 'Poppins,sans-serif' }}>€{receipt.totalEUR}</span>
            </div>
            {/* QR Code real */}
            {receipt.qrCodeData && receipt.qrCodeData.length > 10
              ? <QRCanvas data={receipt.qrCodeData} />
              : <div style={{ width: 120, height: 120, margin: '0 auto 14px', background: 'var(--bg-muted)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>QR ATK</div>
            }
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => { toast.success('Duke printuar...'); setReceipt(null) }} className="finex-button-secondary" style={{ padding: '10px 0', fontSize: 13 }}>Mbyll</button>
              <button onClick={() => printReceipt(receipt)} className="finex-button-primary" style={{ padding: '10px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Printer size={14} /> Printo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg-base)' }}>

        {/* ── LEFT — PRODUCTS/SERVICES ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>

          {/* Barcode scan feedback */}
          {lastScanned && (
            <div style={{
              padding: '8px 16px',
              background: lastScanned.startsWith('Barcode') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              borderBottom: `1px solid ${lastScanned.startsWith('Barcode') ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
              display: 'flex', alignItems: 'center', gap: 8,
              animation: 'fadeIn 0.15s ease',
            }}>
              <span style={{ fontSize: 14 }}>{lastScanned.startsWith('Barcode') ? '✗' : '✓'}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: lastScanned.startsWith('Barcode') ? '#EF4444' : '#10B981' }}>
                {lastScanned}
              </span>
            </div>
          )}

          {/* Banners */}
          {(isMockMode || device?.environment === 'TEST') && (
            <div style={{ padding: '6px 16px', background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={13} color="#F59E0B" />
              <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>
                {isMockMode ? 'MOCK MODE — kuponët nuk janë fiskalë' : 'TEST MODE'}
              </span>
            </div>
          )}

          {/* Toolbar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={config.placeholderSearch} className="finex-input"
                style={{ paddingLeft: 32, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isOnline
                ? <><Wifi size={13} color="#10B981" /><span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>Live</span></>
                : <><WifiOff size={13} color="#EF4444" /><span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>Offline</span></>}
            </div>
            {/* Barcode indicator — tregon se scanner është aktiv */}
            {!isServices && (
              <div title="Scanner i barkodit aktiv — skanoje produktin"
                style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <Scan size={13} color="#10B981" />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981' }}>Scanner</span>
              </div>
            )}
            <a href="/pos/history" style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
              title="Historia e shitjeve">
              <Receipt size={13} /> Historia
            </a>
            <a href="/pos/products" style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              {isServices ? <Stethoscope size={13} /> : <Package size={13} />}
              {config.itemLabelPlural}
            </a>
          </div>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 4, padding: '8px 16px', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCat(cat)}
                style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                  background: activeCat === cat ? 'var(--purple-bg)' : 'transparent',
                  color:      activeCat === cat ? 'var(--purple-light)' : 'var(--text-3)',
                  outline: activeCat === cat ? '1px solid var(--border-purple)' : 'none', transition: 'all 0.12s' }}>
                {cat === 'all' ? 'Të gjitha' : cat}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: 14,
            display: 'grid',
            gridTemplateColumns: isServices
              ? 'repeat(auto-fill, minmax(210px, 1fr))'  // shërbime → list style
              : 'repeat(auto-fill, minmax(120px, 1fr))', // produkte → grid
            gap: 8, alignContent: 'start',
          }}>
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
                <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p style={{ fontSize: 13, marginBottom: 12 }}>
                  {initialProducts.length === 0 ? `Asnjë ${config.itemLabel.toLowerCase()} ende` : `Asnjë rezultat`}
                </p>
                {initialProducts.length === 0 && (
                  <a href="/pos/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, background: 'var(--purple)', color:'var(--text-1)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                    + Shto {config.itemLabel}
                  </a>
                )}
              </div>
            )}

            {filtered.map(product => {
              const isOutOfStock = config.showStock && product.stock !== null && product.stock === 0
              const isLowStock   = config.showStock && product.stock !== null && product.stock > 0 && product.stock < 5

              if (isServices) {
                // ── SERVICE CARD (list style) ────────────────
                return (
                  <button key={product.id} disabled={isOutOfStock} onClick={() => addItem(product)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, cursor: isOutOfStock ? 'not-allowed' : 'pointer', border: '1px solid var(--border)', background: 'var(--bg-card)', textAlign: 'left', opacity: isOutOfStock ? 0.4 : 1, transition: 'all 0.12s' }}
                    onMouseEnter={e => { if (!isOutOfStock) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-purple)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-muted)' } }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--purple-bg)', border: '1px solid var(--border-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={16} style={{ color: 'var(--purple-light)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{product.unit}</p>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--purple-light)', flexShrink: 0, fontFamily: 'Poppins,sans-serif' }}>
                      €{priceDisplay(product.price)}
                    </p>
                  </button>
                )
              }

              // ── PRODUCT CARD (grid style) ────────────────
              return (
                <button key={product.id} disabled={isOutOfStock} onClick={() => addItem(product)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', borderRadius: 10, cursor: isOutOfStock ? 'not-allowed' : 'pointer', border: '1px solid var(--border)', background: 'var(--bg-card)', opacity: isOutOfStock ? 0.35 : 1, position: 'relative', transition: 'all 0.12s' }}
                  onMouseEnter={e => { if (!isOutOfStock) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-purple)' } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}>
                  {isLowStock && <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>Pak</span>}
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--purple-bg)', border: '1px solid var(--border-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={18} style={{ color: 'var(--purple-light)' }} />
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 600, color:'var(--text-1)', textAlign: 'center', lineHeight: 1.3 }}>{product.name}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple-light)', fontFamily: 'Poppins,sans-serif' }}>€{priceDisplay(product.price)}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── RIGHT — CART ── */}
        <div style={{ width: 300, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', flexShrink: 0 }}>
          {/* Cart header */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={14} style={{ color: 'var(--text-3)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                {isServices ? 'Shërbimet' : 'Shporta'}
              </span>
              {cart.length > 0 && (
                <span style={{ background: 'var(--purple)', color:'var(--text-1)', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#EF4444'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'}>
                <Trash2 size={12} /> Pastro
              </button>
            )}
          </div>

          {/* Cart items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {cart.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', gap: 8 }}>
                <ShoppingCart size={28} style={{ opacity: 0.25 }} />
                <p style={{ fontSize: 12 }}>
                  {isServices ? 'Shto shërbim 👆' : 'Shto produkte 👆'}
                </p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-muted)', marginBottom: 5 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--purple-bg)', border: '1px solid var(--border-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package size={13} style={{ color: 'var(--purple-light)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>

                    {/* Editable price for services */}
                    {config.editablePrice && editPriceId === item.productId ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>€</span>
                        <input
                          autoFocus
                          type="number" step="0.01" min="0"
                          defaultValue={(item.customPrice ?? item.price) / 10000}
                          onBlur={e => updateCustomPrice(item.productId, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') updateCustomPrice(item.productId, (e.target as HTMLInputElement).value) }}
                          style={{ width: 60, fontSize: 11, background: 'var(--bg-card)', border: '1px solid var(--border-purple)', borderRadius: 5, padding: '2px 6px', color: 'var(--text-1)', outline: 'none' }}
                        />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <p style={{ fontSize: 10, color: 'var(--text-3)' }}>
                          €{priceDisplay(item.customPrice ?? item.price)}
                          {item.customPrice && item.customPrice !== item.price && (
                            <span style={{ color: '#F59E0B', marginLeft: 3 }}>*</span>
                          )}
                        </p>
                        {config.editablePrice && (
                          <button onClick={() => { setEditPriceId(item.productId); setEditPriceVal(priceDisplay(item.customPrice ?? item.price)) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2 }}>
                            <Edit3 size={9} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => removeItem(item.productId)}
                      style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
                      <Minus size={11} />
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => addItem({ id: item.productId, name: item.name, emoji: item.emoji, price: item.customPrice ?? item.price, unit: item.unit, stock: null, category: null, tax_rate: item.taxRate, is_active: true })}
                      style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
                      <Plus size={11} />
                    </button>
                  </div>

                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple-light)', minWidth: 50, textAlign: 'right', fontFamily: 'Poppins,sans-serif' }}>
                    €{priceDisplay((item.customPrice ?? item.price) * item.quantity)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Cart footer */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
              <span>Pa TVSH</span><span style={{ fontFamily: 'monospace' }}>€{totals.noTaxEUR.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
              <span>TVSH</span><span style={{ fontFamily: 'monospace' }}>€{totals.taxEUR.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800, color: 'var(--text-1)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <span>TOTAL</span>
              <span style={{ color: 'var(--purple-light)', fontFamily: 'Poppins,sans-serif' }}>€{totals.totalEUR.toFixed(2)}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, margin: '12px 0 8px' }}>
              {(['cash', 'card', 'split'] as const).map(m => (
                <button key={m} onClick={() => setPayMethod(m)}
                  style={{ padding: '8px', borderRadius: 9, border: payMethod === m ? '1.5px solid var(--purple)' : '1px solid var(--border)', background: payMethod === m ? 'var(--purple-bg)' : 'var(--bg-muted)', cursor: 'pointer', textAlign: 'center' }}>
                  {m === 'cash'
                    ? <Banknote size={15} style={{ color: payMethod === 'cash' ? 'var(--purple-light)' : 'var(--text-3)', margin: '0 auto 3px' }} />
                    : m === 'card'
                    ? <CreditCard size={15} style={{ color: payMethod === 'card' ? 'var(--purple-light)' : 'var(--text-3)', margin: '0 auto 3px' }} />
                    : <span style={{ fontSize: 14, display: 'block', margin: '0 auto 3px' }}>💳+💵</span>}
                  <p style={{ fontSize: 10, fontWeight: 600, color: payMethod === m ? 'var(--purple-light)' : 'var(--text-3)', margin: 0 }}>
                    {m === 'cash' ? 'Cash' : m === 'card' ? 'Kartë' : 'Split'}
                  </p>
                </button>
              ))}
            </div>

            {/* Split payment amounts */}
            {payMethod === 'split' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Cash (€)</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={splitCash}
                    onChange={e => setSplitCash(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box' as const }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Kartë (€)</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={splitCard}
                    onChange={e => setSplitCard(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box' as const }} />
                </div>
              </div>
            )}

            {/* Discount */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
              <input type="number" min="0" step="0.01" placeholder="Zbritje..." value={totalDiscount}
                onChange={e => setTotalDiscount(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-1)', fontSize: 12, boxSizing: 'border-box' as const }} />
              <button onClick={() => setDiscountType(t => t === 'value' ? 'percent' : 'value')}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', minWidth: 44 }}>
                {discountType === 'value' ? '€' : '%'}
              </button>
            </div>

            <button disabled={cart.length === 0 || isLoading || !device} onClick={checkout}
              className="finex-button-primary w-full"
              style={{ width: '100%', padding: '12px 0', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {isLoading
                ? <span style={{ width: 18, height: 18, border: '2px solid var(--border-color,#e2dcff)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : <><Zap size={15} /> Fiskalizo</>}
            </button>

            {!device && <p style={{ fontSize: 10, color: '#EF4444', textAlign: 'center', marginTop: 6 }}>Nuk ka pajisje POS</p>}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </>
  )
}
