// ============================================================
// hooks/usePOS.ts
// React hook — gjeneron cart, checkout, offline detection
// Përdoret nga: app/pos/components/POSClient.tsx
// ============================================================

'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  CartItem,
  CartTotals,
  PaymentMethod,
  PosProduct,
  FiscalizeResponse,
  calculateCartTotals,
  toATKItemPrice,
  formatEUR,
} from '@/types/pos'

interface UsePOSOptions {
  companyId:    string
  posDeviceId:  string
  operatorName: string
}

interface UsePOSReturn {
  // Cart state
  cart:          CartItem[]
  totals:        CartTotals
  paymentMethod: PaymentMethod
  isOnline:      boolean
  isLoading:     boolean
  lastReceipt:   FiscalizeResponse | null

  // Actions
  addItem:        (product: PosProduct) => void
  removeItem:     (productId: string) => void
  updateQty:      (productId: string, qty: number) => void
  clearCart:      () => void
  setPayMethod:   (method: PaymentMethod) => void
  checkout:       () => Promise<FiscalizeResponse>
  syncOffline:    () => Promise<void>
}

const EMPTY_TOTALS: CartTotals = {
  subtotal: 0, tax: 0, noTax: 0, discount: 0, total: 0,
}

export function usePOS(options: UsePOSOptions): UsePOSReturn {
  const [cart,          setCart]          = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [isOnline,      setIsOnline]      = useState(true)
  const [isLoading,     setIsLoading]     = useState(false)
  const [lastReceipt,   setLastReceipt]   = useState<FiscalizeResponse | null>(null)

  // ── ONLINE/OFFLINE DETECTION ──────────────────────────
  useEffect(() => {
    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-sync kur kthehet online
  useEffect(() => {
    if (isOnline) {
      syncOffline()
    }
  }, [isOnline])

  // ── CART TOTALS ───────────────────────────────────────
  const totals: CartTotals = cart.length
    ? calculateCartTotals(cart)
    : EMPTY_TOTALS

  // ── ADD ITEM ──────────────────────────────────────────
  const addItem = useCallback((product: PosProduct) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id)
      const atkPrice = toATKItemPrice(product.price / 10000)
      // product.price vjen nga DB si €0.0001 → konverto

      if (existing) {
        return prev.map(i =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, total: atkPrice * (i.quantity + 1) }
            : i
        )
      }

      const newItem: CartItem = {
        productId: product.id,
        name:      product.name,
        emoji:     product.emoji,
        price:     atkPrice,
        unit:      product.unit,
        quantity:  1,
        taxRate:   product.tax_rate,
        total:     atkPrice,
      }

      return [...prev, newItem]
    })
  }, [])

  // ── REMOVE ITEM ───────────────────────────────────────
  const removeItem = useCallback((productId: string) => {
    setCart(prev => {
      const item = prev.find(i => i.productId === productId)
      if (!item) return prev

      if (item.quantity <= 1) {
        return prev.filter(i => i.productId !== productId)
      }

      return prev.map(i =>
        i.productId === productId
          ? { ...i, quantity: i.quantity - 1, total: i.price * (i.quantity - 1) }
          : i
      )
    })
  }, [])

  // ── UPDATE QTY ────────────────────────────────────────
  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.productId !== productId))
      return
    }
    setCart(prev =>
      prev.map(i =>
        i.productId === productId
          ? { ...i, quantity: qty, total: i.price * qty }
          : i
      )
    )
  }, [])

  // ── CLEAR CART ────────────────────────────────────────
  const clearCart = useCallback(() => setCart([]), [])

  // ── SET PAYMENT METHOD ────────────────────────────────
  const setPayMethod = useCallback(
    (method: PaymentMethod) => setPaymentMethod(method),
    []
  )

  // ── CHECKOUT ──────────────────────────────────────────
  const checkout = useCallback(async (): Promise<FiscalizeResponse> => {
    if (!cart.length) {
      throw new Error('Shporta është bosh')
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/pos/fiscalize', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items:         cart,
          paymentMethod,
          companyId:     options.companyId,
          posDeviceId:   options.posDeviceId,
          operatorName:  options.operatorName,
          couponId:      0, // generated server-side
        }),
      })

      const data: FiscalizeResponse = await response.json()
      setLastReceipt(data)

      if (data.success || data.status === 'offline') {
        clearCart()
      }

      return data

    } catch (err) {
      const errorResult: FiscalizeResponse = {
        success:       false,
        saleId:        '',
        receiptNumber: '',
        transactionId: null,
        qrCodeData:    '',
        status:        'failed',
        error:         err instanceof Error ? err.message : 'Network error',
      }
      setLastReceipt(errorResult)
      return errorResult

    } finally {
      setIsLoading(false)
    }
  }, [cart, paymentMethod, options, clearCart])

  // ── SYNC OFFLINE ──────────────────────────────────────
  const syncOffline = useCallback(async () => {
    try {
      await fetch('/api/pos/sync-offline', { method: 'POST' })
    } catch {
      // Silent fail — do not interrupt POS workflow
    }
  }, [])

  return {
    cart,
    totals,
    paymentMethod,
    isOnline,
    isLoading,
    lastReceipt,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    setPayMethod,
    checkout,
    syncOffline,
  }
}
