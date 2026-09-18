'use client'
import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import {
  Plus, Minus, X, Check, ChevronLeft, Users, Clock,
  Search, Coffee, Lock, LogOut, Zap, CreditCard, Banknote,
  Maximize, Minimize,
  UtensilsCrossed, ShoppingCart,
} from 'lucide-react'
import QRCanvas from '@/components/pos/qr-canvas'
import { printKOT } from '@/components/pos/kot-print'

interface Product { id:string; name:string; price:number; category:string|null; emoji:string; tax_rate:string; unit:string; image_url?:string|null }
interface WaiterT  { id:string; name:string; color:string; rfid_tag?:string|null }
interface TableT   { id:string; table_number:number; label:string; seats:number; pos_x:number; pos_y:number; shape:'rect'|'round'; section:string }
interface ActiveOrder { id:string; table_id:string; status:string; guests:number; opened_at:string; cashier_name:string|null; waiter_id?:string|null }
interface OrderItem   { id:string; order_id:string; product_id:string|null; name:string; price:number; quantity:number; total:number; tax_rate:string; unit:string }
interface Props { userId:string; cashierName:string; company:{ id:string; name:string; nui:string; businessType?:string; isVatRegistered?:boolean; city?:string; address?:string; phone?:string; locationCity?:string; vatNumber?:string }; initialProducts:Product[]; isMockMode:boolean }

const TAX:Record<string,number> = {A:0,C:0,D:0.08,E:0.18}
const fmtEUR = (a:number|string) => '€'+(Number(a)/10000).toFixed(2)
const fmtCnt = (c:number) => '€'+(c/100).toFixed(2)

function calcTotals(items:OrderItem[], isVatRegistered = true) {
  let total=0, tax=0
  for (const i of items) {
    const e=i.total/10000
    total+=e
    if (isVatRegistered) {
      const r=TAX[i.tax_rate]??0.18
      tax+=e-e/(1+r)
    }
  }
  return { totalCents:Math.round(total*100), taxCents:Math.round(tax*100), noTaxCents:Math.round((total-tax)*100) }
}

function elapsed(iso:string) {
  const m=Math.floor((Date.now()-new Date(iso).getTime())/60000)
  return m<60?`${m}m`:`${Math.floor(m/60)}h ${m%60}m`
}

export default function RestaurantPOS({ userId, cashierName, company, initialProducts, isMockMode }:Props) {
  const isBakery = ['bakery','pastry'].includes(company.businessType || '')
  const [products]                      = useState(initialProducts)
  const [tables,     setTables]         = useState<TableT[]>([])
  const [orders,     setOrders]         = useState<ActiveOrder[]>([])
  const [orderTotals,setOrderTotals]    = useState<Record<string,number>>({})
  const [loading,    setLoading]        = useState(true)
  const [waiters,    setWaiters]        = useState<WaiterT[]>([])
  const [activeWaiter,setActiveWaiter]  = useState<WaiterT|null>(null)
  const [showWaiter,  setShowWaiter]    = useState(false)
  const [waiterMode, setWaiterMode]     = useState(false) // fsheh Historia/Raportet
  const [section,    setSection]        = useState('all')
  const [showAddSection, setShowAddSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [editMode,   setEditMode]       = useState(false)
  const [editingTable,setEditingTable]  = useState<TableT|null>(null)
  const [editForm,   setEditForm]       = useState({label:'',seats:4,shape:'rect' as 'rect'|'round',section:'Salla'})
  const [view,       setView]           = useState<'tables'|'order'>(isBakery ? 'order' : 'tables')
  const [activeTable,setActiveTable]    = useState<TableT|null>(isBakery ? { id: 'counter', label: 'Counter', seats: 1, section: 'Counter', shape: 'rect' as const, pos_x: 0, pos_y: 0, sort_order: 1, is_active: true } : null)
  const [activeOrder,setActiveOrder]    = useState<ActiveOrder|null>(null)
  const [items,      setItems]          = useState<OrderItem[]>([])
  const [loadingOrder,setLoadingOrder]  = useState(false)
  const [category,   setCategory]       = useState('all')
  const [search,     setSearch]         = useState('')
  const [payMethod,  setPayMethod]      = useState<'cash'|'card'>('cash')
  const [cashGiven,  setCashGiven]       = useState('')
  const [showPayPanel, setShowPayPanel]  = useState(false)
  const [paying,     setPaying]         = useState(false)
  const [mounted,    setMounted]        = useState(false)
  const [locked,     setLocked]         = useState(false)
  const [lockPin,    setLockPin]        = useState('')    // PIN input
  const [ownerPinMode, setOwnerPinMode] = useState(false) // owner password input
  const [ownerPassword, setOwnerPassword] = useState('')
  const [ownerError,    setOwnerError]    = useState('')
  const [ownerLoading,  setOwnerLoading]  = useState(false)
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Lock + mount para paint — pa flash
  useLayoutEffect(() => {
    if (isBakery) {
      // Bakery/Pastiqeria - nuk ka nevoj per lock ose kamarier
      sessionStorage.setItem('pos_owner_unlocked', '1')
      setLocked(false)
    } else {
      const ownerUnlocked = sessionStorage.getItem('pos_owner_unlocked')
      if (!ownerUnlocked) {
        setLocked(true)
      }
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      load()
      // Bakery mode - krijo order virtual automatikisht
      if (isBakery) {
        const virtualTable = { id: 'counter', label: 'Counter', seats: 1, section: 'Counter', shape: 'rect' as const, pos_x: 0, pos_y: 0, sort_order: 1, is_active: true }
        setActiveTable(virtualTable)
        // Krijo order te DB
        fetch('/api/pos/table-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableId: 'counter', cashierName: cashierName, waiterId: null })
        }).then(r => r.json()).then(d => {
          if (d.orderId) {
            setActiveOrder({ id: d.orderId, table_id: 'counter', status: 'open', guests: 1, opened_at: new Date().toISOString(), cashier_name: cashierName, waiter_id: null })
          }
        }).catch(() => {
          // Fallback - virtual order pa DB
          setActiveOrder({ id: 'virtual-' + Date.now(), table_id: 'counter', status: 'open', guests: 1, opened_at: new Date().toISOString(), cashier_name: cashierName, waiter_id: null })
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // Inaktiviteti → lock pas 3 minutash
  function resetInactivity() {
    if (inactivityRef.current) clearTimeout(inactivityRef.current)
    inactivityRef.current = setTimeout(() => {
      setLocked(true)
      setActiveWaiter(null)
      setWaiterMode(false)
    }, 3 * 60 * 1000)
  }

  useEffect(() => {
    const events = ['mousedown','touchstart','keydown']
    events.forEach(e => window.addEventListener(e, resetInactivity))
    resetInactivity()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivity))
      if (inactivityRef.current) clearTimeout(inactivityRef.current)
    }
  }, [])
  const [kotSent,    setKotSent]        = useState(false) // nëse KOT është dërguar
  const [receipt,    setReceipt]        = useState<{receiptNumber:string;transactionId:number|null;totalEUR:string;qrCodeData:string;items:OrderItem[];waiter:WaiterT|null;table:TableT|null;cashGiven?:number;change?:number}|null>(null)
  const draggingRef = useRef<string|null>(null)
  const [dragging,   setDragging]       = useState<string|null>(null)
  const [dragOffset, setDragOffset]     = useState({x:0,y:0})
  const mapRef = useRef<HTMLDivElement>(null)

  const C = {
    bg:'var(--bg-base)', card:'var(--bg-card)', purple:'#5B21B6', purpleL:'#7C3AED',
    purpleBg:'var(--purple-bg)', text1:'var(--text-1)', text2:'var(--text-2)',
    text3:'var(--text-3)', border:'var(--border)', green:'#059669', amber:'#D97706', red:'#DC2626',
  }

  const load = useCallback(async () => {
    try {
      const [t,w] = await Promise.all([
        fetch('/api/pos/tables?t='+Date.now()),
        fetch('/api/pos/waiters')
      ])
      const td=await t.json(), wd=await w.json()
      setTables(td.tables||[]); setOrders(td.orders||[]); setWaiters(wd.waiters||[])
      const tot:Record<string,number>={}
      for (const o of td.orders||[]) {
        const s=(td.items||[]).filter((i:{order_id:string;total:number})=>i.order_id===o.id)
          .reduce((a:number,b:{total:number})=>a+b.total,0)
        tot[o.table_id]=Math.round(s/100)
      }
      setOrderTotals(tot)
    } finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])
  // load thirret nga useLayoutEffect

  // Unlock me kamarier - CSS fsheh sidebar dhe header
  function unlockWithWaiter(w: WaiterT) {
    setActiveWaiter(w)
    setWaiterMode(true)
    setLocked(false)
    setLockPin('')
    resetInactivity()
  }

  // Unlock si owner - shfaq sidebar dhe header
  function unlockAsOwner() {
    setLocked(false)
    setOwnerPassword('')
    setOwnerPinMode(false)
    setWaiterMode(false)
    setActiveWaiter(null)
    setOwnerError('')
    sessionStorage.setItem('pos_owner_unlocked', '1')
  }

  // Login me password të llogarisë
  async function doOwnerLogin() {
    if (!ownerPassword || ownerLoading) return
    setOwnerLoading(true)
    setOwnerError('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      // Merr email e user-it aktual
      const { data: { user } } = await sb.auth.getUser()
      if (!user?.email) throw new Error('Nuk u gjet llogaria')
      // Verifiko passwordin
      const { error } = await sb.auth.signInWithPassword({
        email: user.email,
        password: ownerPassword,
      })
      if (error) throw new Error('Password i gabuar')
      unlockAsOwner()
    } catch (e) {
      setOwnerError(e instanceof Error ? e.message : 'Password i gabuar')
      setOwnerPassword('')
    } finally {
      setOwnerLoading(false)
    }
  }

  // Unlock me PIN
  function tryPinUnlock(pin: string) {
    const found = waiters.find(w => w.pin === pin)
    if (found) {
      unlockWithWaiter(found)
    } else {
      setLockPin('')
      // shake feedback
      const el = document.getElementById('pin-display')
      if (el) { el.style.animation = 'shake 0.3s'; setTimeout(() => { if(el) el.style.animation = '' }, 300) }
    }
  }

  async function addNewSection() {
    const name = newSectionName.trim()
    if (!name) return
    const res = await fetch('/api/pos/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'T1', seats: 4, shape: 'rect', section: name, pos_x: 100, pos_y: 100 })
    })
    if (res.ok) {
      await load()
      setSection(name)
      setShowAddSection(false)
      setNewSectionName('')
      toast.success(`Hapësira "${name}" u krijua`)
    } else {
      toast.error('Gabim gjatë krijimit')
    }
  }

  // ── KEYBOARD SHORTCUTS ───────────────────────────────────
  useEffect(()=>{
    const handler = (e: KeyboardEvent) => {
      // Injoro kur fokusi te input
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch(e.key) {
        case 'F1': // Fiskalizо
          e.preventDefault()
          if (view === 'order' && items.length > 0 && !paying) checkout()
          break
        case 'F2': // Print kupon i fundit (ATK)
          e.preventDefault()
          if (receipt) {
            import('@/hooks/usePrintReceipt').then(({ buildATKReceipt }) => {
              import('@/components/pos/receipt-printer').then(({ printReceipt }) => {
                const atk = buildATKReceipt(
                  { receiptNumber: receipt.receiptNumber, qrCodeData: receipt.qrCodeData, status: 'fiscalized', totals: { totalEUR: receipt.totalEUR, taxEUR: (parseFloat(receipt.totalEUR)*0.18/1.18).toFixed(2), noTaxEUR: (parseFloat(receipt.totalEUR)/1.18).toFixed(2) } },
                  receipt.items.map((i: any) => ({ name: i.name, price: i.price, quantity: i.quantity, unit: i.unit||'cope', taxRate: i.tax_rate||'E' })),
                  company,
                  { paymentMethod: payMethod, operatorName: receipt.waiter?.name || cashierName }
                )
                printReceipt(atk)
              })
            })
          }
          break
        case 'F3': // Full screen
          e.preventDefault()
          if (!document.fullscreenElement) document.documentElement.requestFullscreen()
          else document.exitFullscreen()
          break
        case 'F4': // Cash
          e.preventDefault()
          if (view === 'order') setPayMethod('cash')
          break
        case 'F5': // Kartë
          e.preventDefault()
          if (view === 'order') setPayMethod('card')
          break
        case 'F6': // KOT — Kuzhina
          e.preventDefault()
          if (view === 'order' && items.length > 0) sendToKitchen()
          break
        case 'Escape':
          if (view === 'order' && !paying && !receipt) {
            setView('tables'); setActiveTable(null); setActiveOrder(null); setItems([]); load()
          }
          break
      }
    }
    window.addEventListener('keydown', handler)
    return ()=> window.removeEventListener('keydown', handler)
  }, [view, items, paying, receipt, payMethod])

  // ── RFID LISTENER ────────────────────────────────────────
  // USB RFID reader dërgon ID si keyboard input + Enter
  useEffect(()=>{
    let buffer = ''
    let timer: ReturnType<typeof setTimeout>
    const handler = (e: KeyboardEvent) => {
      // Injoro kur fokusi është te input field
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          const rfid = buffer.trim()
          const found = waiters.find(w => w.rfid_tag === rfid)
          if (found) {
            setActiveWaiter(found)
            setWaiterMode(true)
            setShowWaiter(false)
            toast.success(found.name + ' u kyç me RFID')
          } else if (buffer.length > 0) {
            toast.error('Byzylyk i panjohur: ' + rfid)
          }
        }
        buffer = ''
      } else if (e.key.length === 1) {
        buffer += e.key
        clearTimeout(timer)
        timer = setTimeout(() => { buffer = '' }, 100)
      }
    }
    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler); clearTimeout(timer) }
  }, [waiters])

  // Drag
  const dragStartPos = useRef<{x:number;y:number}|null>(null)
  const dragTablePos = useRef<{x:number;y:number}|null>(null)

  function onMouseDown(e:React.MouseEvent, tableId:string) {
    if (!editMode) return  // vetëm në editMode
    e.preventDefault()
    e.stopPropagation()
    const map=mapRef.current; if (!map) return
    const r=map.getBoundingClientRect()
    const t=tables.find(t=>t.id===tableId); if (!t) return
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    draggingRef.current  = tableId
    setDragging(tableId)
    setDragOffset({x:e.clientX-r.left-t.pos_x, y:e.clientY-r.top-t.pos_y})
  }

  function onMouseMove(e:React.MouseEvent) {
    if (!draggingRef.current) return
    const map=mapRef.current; if (!map) return
    const r=map.getBoundingClientRect()
    const x=Math.max(0,Math.min(r.width-140, e.clientX-r.left-dragOffset.x))
    const y=Math.max(0,Math.min(r.height-100, e.clientY-r.top-dragOffset.y))
    dragTablePos.current = {x, y}
    setTables(prev=>prev.map(t=>t.id===draggingRef.current?{...t,pos_x:x,pos_y:y}:t))
  }

  async function onMouseUp(e:React.MouseEvent, tableId?:string) {
    const id = draggingRef.current
    if (!id) return
    const start = dragStartPos.current
    const moved = start ? (Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y)) > 8 : false

    draggingRef.current = null
    setDragging(null)
    dragStartPos.current = null

    if (moved) {
      const pos = dragTablePos.current
      const table = tables.find(t=>t.id===id)
      if (table && pos) {
        await fetch('/api/pos/tables',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:table.id,pos_x:pos.x,pos_y:pos.y})})
      }
      dragTablePos.current = null
    } else if (tableId) {
      const table = tables.find(t=>t.id===tableId)
      if (table) {
        if (editMode) { setEditingTable(table); setEditForm({label:table.label,seats:table.seats,shape:table.shape,section:table.section}) }
        else openTable(table)
      }
    }
  }

  async function openTable(table:TableT) {
    const existingOrder = getOrder(table.id)

    if (existingOrder?.waiter_id) {
      const tableWaiter = waiters.find(w => w.id === existingOrder.waiter_id)
      if (tableWaiter) {
        // Tavolina ka kamerier — vetëm ai mund ta hapë
        if (!activeWaiter) {
          toast.error(`${table.label} është e ${tableWaiter.name} — kyçu si ${tableWaiter.name}`)
          setLocked(true); setActiveWaiter(null); setWaiterMode(false)
          return
        }
        if (activeWaiter.id !== tableWaiter.id) {
          toast.error(`${table.label} është e ${tableWaiter.name}`)
          return
        }
        // I njëjti kamerier — hap direkt
        setActiveTable(table)
        await continueOpenTable(table, activeWaiter)
        return
      }
    }

    // Tavolinë e lirë — duhet kamerier aktiv
    if (!activeWaiter) {
      setActiveTable(table)
      setLocked(true); setActiveWaiter(null); setWaiterMode(false)
      return
    }

    setActiveTable(table)
    await continueOpenTable(table, activeWaiter)
  }

  async function continueOpenTable(table:TableT, waiter:WaiterT) {
    setLoadingOrder(true); setView('order')
    const res=await fetch('/api/pos/table-orders?'+new URLSearchParams({tableId:table.id}))
    const d=await res.json()
    if (d.order){ setActiveOrder(d.order); setItems(d.order.table_order_items||[]) }
    else {
      const r2=await fetch('/api/pos/table-orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tableId:table.id,cashierName:waiter.name,waiterId:waiter.id})})
      const d2=await r2.json()
      setActiveOrder({id:d2.orderId,table_id:table.id,status:'open',guests:1,opened_at:new Date().toISOString(),cashier_name:waiter.name,waiter_id:waiter.id})
      setItems([])
    }
    setLoadingOrder(false)
  }

  function closeTable() {
    setKotSent(false)
    setCashGiven('')
    setView('tables'); setActiveTable(null); setActiveOrder(null); setItems([])
    load()
  }

  async function closeTableSmart() {
    // Nëse order ka 0 produkte — fshije automatikisht nga DB
    if (activeOrder && items.length === 0) {
      try {
        await fetch('/api/pos/table-orders', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: activeOrder.id })
        })
        setOrders(o => o.filter(x => x.id !== activeOrder.id))
      } catch(_) {}
    }
    closeTable()
  }

  async function addItem(p:Product) {
    if (!activeOrder) return
    setItems(prev=>{
      const ex=prev.find(i=>i.product_id===p.id || i.name===p.name)
      if (ex) return prev.map(i=>(i.product_id===p.id||i.name===p.name)?{...i,quantity:i.quantity+1,total:i.price*(i.quantity+1)}:i)
      const newItem = {id:crypto.randomUUID(),order_id:activeOrder!.id,product_id:p.id,name:p.name,price:p.price,quantity:1,total:p.price,tax_rate:p.tax_rate,unit:p.unit}
      return [...prev, newItem]
    })
    fetch('/api/pos/table-orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'add_item',orderId:activeOrder.id,item:{productId:p.id,name:p.name,price:p.price,quantity:1,taxRate:p.tax_rate,unit:p.unit}})})
  }

  async function removeItem(item:OrderItem) {
    setItems(p=>p.filter(i=>i.id!==item.id))
    fetch('/api/pos/table-orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove_item',orderId:activeOrder?.id,item:{id:item.id}})})
  }

  // ── DËRGO TE KUZHINA (KOT) ──────────────────────────────
  async function sendToKitchen() {
    if (!items.length || !activeOrder || !activeTable) return
    try {
      // Ruaj KOT te DB
      const res = await fetch('/api/pos/kot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId:    activeOrder.id,
          tableLabel: activeTable.label,
          waiterName: activeWaiter?.name || cashierName,
          items:      items.map(i => ({ name: i.name, quantity: i.quantity })),
        }),
      })
      const data = await res.json()

      // Printo KOT
      printKOT({
        tableLabel:  activeTable.label,
        waiterName:  activeWaiter?.name || null,
        items:       items.map(i => ({ name: i.name, quantity: i.quantity })),
        ticketNumber: data.ticket?.id?.slice(-6).toUpperCase(),
      })

      setKotSent(true)
      toast.success('KOT u dërgua te kuzhina')
    } catch (err) {
      toast.error('Gabim KOT: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  async function checkout() {
    if (!items.length) return
    setPaying(true)
    try {
      // Merr device aktiv
      const devRes = await fetch('/api/pos/verify-device?companyId='+company.id)
      const devData = await devRes.json().catch(()=>({}))
      const posDeviceId = devData?.device?.id || 'mock-device'

      const res=await fetch('/api/pos/fiscalize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        items:items.map(i=>({productId:i.product_id,name:i.name,price:i.price,quantity:i.quantity,total:i.total,taxRate:i.tax_rate,unit:i.unit})),
        paymentMethod:payMethod,companyId:company.id,posDeviceId,
        operatorName:activeWaiter?.name||cashierName,couponId:0,
      })})
      const data=await res.json()
      if (data.success||data.status==='offline') {
        await fetch('/api/pos/table-orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'set_status',orderId:activeOrder?.id,status:'closed'})})
        const tot=calcTotals(items, isVAT)
        const given  = payMethod==='cash' && cashGiven ? parseFloat(cashGiven) : 0
        const change = given > 0 ? given - tot.totalCents/100 : 0
        setCashGiven('') // Reset menjëherë
        setReceipt({receiptNumber:data.receiptNumber,transactionId:data.transactionId,totalEUR:(tot.totalCents/100).toFixed(2),qrCodeData:data.qrCodeData,items:[...items],waiter:activeWaiter,table:activeTable,cashGiven:given||undefined,change:change>0?change:undefined})
        if (data.status==='offline') toast.warning('Offline - dergon automatikisht')
      } else toast.error(data.error||'Fiskalizimi deshtoi')
    } catch(e){ toast.error('Gabim: '+(e instanceof Error?e.message:String(e))) }
    finally { setPaying(false) }
  }

  const sections   = useMemo(()=>['all',...Array.from(new Set(tables.map(t=>t.section)))],[tables])
  const visible    = useMemo(()=>section==='all'?tables:tables.filter(t=>t.section===section),[tables,section])
  const categories = useMemo(()=>['all',...Array.from(new Set(products.map(p=>p.category).filter(Boolean))) as string[]],[products])
  const filtered   = useMemo(()=>{
    const seen = new Set<string>()
    return products
      .filter(p => { if(seen.has(p.id)) return false; seen.add(p.id); return true })
      .filter(p=>(category==='all'||p.category===category)&&(!search||p.name.toLowerCase().includes(search.toLowerCase())))
  },[products,category,search])
  const isVAT      = company.isVatRegistered !== false
  const totals     = useMemo(()=>calcTotals(items, isVAT),[items, isVAT])
  const getOrder   = (tid:string)=>orders.find(o=>o.table_id===tid)
  const getWaiter  = (wid?:string|null)=>waiters.find(w=>w.id===wid)

  const [isFullscreen, setIsFullscreen] = useState(false)

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  function tableColor(tid: string) {
    const o=getOrder(tid)
    if (!o) return {bg:'#FAFAFA',border:'#E5E7EB',text:'#9CA3AF',dot:'#E5E7EB',chairBg:'#F3F4F6'}
    if (o.status==='paying') return {bg:'rgba(245,158,11,0.08)',border:'#F59E0B',text:'#B45309',dot:'#F59E0B',chairBg:'rgba(245,158,11,0.15)'}
    const w = waiters.find(w => w.id === o.waiter_id)
    const wColor = w?.color || '#10B981'
    return {
      bg: wColor+'14',
      border: wColor,
      text: wColor,
      dot: wColor,
      chairBg: wColor+'25',
    }
  }

  if (!mounted) return null

  return (
    <div style={{height:'calc(100vh - 64px)',display:'flex',flexDirection:'column',background:C.bg,fontFamily:'Inter,sans-serif',overflow:'hidden'}}>

      {/* LOCK SCREEN */}
      {locked && (
        <div style={{position:'fixed',inset:0,zIndex:500,background:'#F4F2FF',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Inter,sans-serif'}}>
          <style>{`
            @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
            @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
            .lock-wrap { animation: fadeIn 0.35s cubic-bezier(.22,1,.36,1) }
            .pkey:active { transform: scale(0.93) !important; background: #EDE9FE !important; }
          `}</style>

          <div className="lock-wrap" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:0,width:'100%',maxWidth:320,padding:'0 24px'}}>

            {/* Logo */}
            <div style={{textAlign:'center',marginBottom:28}}>
              <img src="/logo.svg" alt="Fiscalix" style={{height:80,width:'auto',display:'block',margin:'0 auto 12px'}} />
              <p suppressHydrationWarning style={{fontSize:13,color:'#9CA3AF',fontWeight:500}}>
                {new Date().toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'})}
                &nbsp;·&nbsp;
                {new Date().toLocaleDateString('sq-AL',{weekday:'long',day:'numeric',month:'long'})}
              </p>
            </div>

            {/* PIN dots */}
            {!ownerPinMode && (
              <>
                <div id="pin-display" style={{display:'flex',gap:14,marginBottom:22}}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{width:14,height:14,borderRadius:'50%',background:lockPin.length > i ? '#7C3AED' : '#D1D5DB',transition:'all 0.15s',transform:lockPin.length > i ? 'scale(1.25)' : 'scale(1)'}}/>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,width:'100%',marginBottom:20}}>
                  {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k,idx) => (
                    <button key={idx} className="pkey" onClick={() => {
                      if (!k) return
                      if (k === '⌫') { setLockPin(p => p.slice(0,-1)) }
                      else {
                        const np = lockPin + k
                        setLockPin(np)
                        if (np.length === 4) tryPinUnlock(np)
                      }
                    }}
                    disabled={!k}
                    style={{height:62,borderRadius:16,border:'1.5px solid #E2DCFF',background:k?'white':'transparent',cursor:k?'pointer':'default',fontSize:k==='⌫'?22:22,fontWeight:k==='⌫'?400:600,color:k?'#1F1635':'transparent',transition:'all 0.12s',boxShadow:k?'0 2px 8px rgba(124,58,237,0.06)':'none'}}>
                      {k}
                    </button>
                  ))}
                </div>
                <button onClick={() => setOwnerPinMode(true)}
                  style={{fontSize:13,color:'var(--purple)',background:'none',border:'none',cursor:'pointer',fontWeight:600,padding:'6px 12px'}}>
                  Hyr si Owner
                </button>
              </>
            )}

            {/* Owner Password */}
            {ownerPinMode && (
              <>
                <p style={{fontSize:16,fontWeight:700,color:'#1F1635',marginBottom:4}}>Hyr si Owner</p>
                <p style={{fontSize:13,color:'#9CA3AF',marginBottom:24}}>Passwordi i llogarisë Fiscalix</p>
                <div style={{width:'100%',marginBottom:12,position:'relative'}}>
                  <input
                    type="password"
                    value={ownerPassword}
                    onChange={e => { setOwnerPassword(e.target.value); setOwnerError('') }}
                    onKeyDown={async e => { if(e.key==='Enter') await doOwnerLogin() }}
                    placeholder="Passwordi juaj..."
                    autoFocus
                    style={{width:'100%',padding:'14px 16px',borderRadius:14,border:'1.5px solid '+( ownerError ? '#EF4444' : '#E2DCFF'),background:'white',fontSize:16,color:'#1F1635',outline:'none',boxSizing:'border-box',boxShadow:'0 2px 8px rgba(124,58,237,0.06)',letterSpacing:ownerPassword ? '4px' : '0'}}
                  />
                </div>
                {ownerError && (
                  <p style={{fontSize:12,color:'var(--text-1)',marginBottom:12,textAlign:'center'}}>{ownerError}</p>
                )}
                <button onClick={doOwnerLogin} disabled={ownerLoading || !ownerPassword}
                  style={{width:'100%',padding:'14px',borderRadius:14,background:ownerPassword && !ownerLoading ? '#7C3AED' : '#E2DCFF',color:ownerPassword && !ownerLoading ? 'white' : '#9CA3AF',border:'none',cursor:ownerPassword && !ownerLoading ? 'pointer' : 'default',fontSize:15,fontWeight:700,marginBottom:16,transition:'all 0.12s',boxShadow:ownerPassword ? '0 4px 16px rgba(124,58,237,0.3)' : 'none'}}>
                  {ownerLoading ? 'Duke verifikuar...' : 'Hyr'}
                </button>
                <button onClick={() => { setOwnerPinMode(false); setOwnerPassword(''); setOwnerError('') }}
                  style={{fontSize:13,color:'#9CA3AF',background:'none',border:'none',cursor:'pointer',fontWeight:500,padding:'6px 12px'}}>
                  Kthehu
                </button>
              </>
            )}

          </div>

          {/* Footer */}
          <p style={{position:'absolute',bottom:24,fontSize:11,color:'var(--purple)',fontWeight:500,textAlign:'center'}}>
            {company.name}
          </p>
        </div>
      )}

      {waiterMode && (
        <style>{`
          a[href="/pos/reports"], a[href="/dashboard"], a[href="/expenses"],
          a[href="/expenses/new"], a[href="/raporte-financiare"],
          a[href^="/pos/reports"], a[href^="/dashboard"],
          a[href^="/expenses"], a[href^="/raporte"] {
            pointer-events: none !important;
            opacity: 0.3 !important;
          }
        `}</style>
      )}

      {/* WAITER MODE — fsheh sidebar dhe header */}
      {waiterMode && (
        <style>{`
          aside { display: none !important; }
          header { display: none !important; }
          main { padding-left: 0 !important; margin-left: 0 !important; padding-top: 0 !important; }
          .dashboard-main { padding-left: 0 !important; padding-top: 0 !important; }
        `}</style>
      )}

      {/* RECEIPT MODAL - ATK format */}
      {receipt && (
        <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'white',borderRadius:6,width:'min(320px,94vw)',maxHeight:'92vh',overflowY:'auto',fontFamily:'Courier New,monospace',fontSize:12,color:'#000',boxShadow:'0 4px 14px rgba(0,0,0,0.08)'}}>

            {/* Kusuri — shfaqet vetëm te ekrani, jo te printimi */}
            {receipt.change && receipt.change > 0 && (
              <div style={{padding:'16px',background:'#ECFDF5',borderBottom:'2px dashed #000',textAlign:'center'}}>
                <p style={{fontSize:11,fontWeight:700,color:'var(--text-1)',letterSpacing:'0.08em',textTransform:'uppercase' as const,marginBottom:4}}>Kusuri</p>
                <p style={{fontSize:48,fontWeight:900,color:'var(--text-1)',lineHeight:1,fontFamily:'Courier New,monospace'}}>€{receipt.change.toFixed(2)}</p>
                <p style={{fontSize:11,color:'#6B7280',marginTop:4}}>Dhënë: €{receipt.cashGiven?.toFixed(2)} · Total: €{receipt.totalEUR}</p>
              </div>
            )}
            <div id="fiscal-receipt" style={{padding:'14px 12px',fontFamily:'Courier New,monospace'}}>
              {/* Header — Emri biznesi */}
              <div style={{textAlign:'center',marginBottom:10}}>
                <p style={{fontSize:14,fontWeight:900,letterSpacing:1,lineHeight:1.4}}>{company.name.toUpperCase()}</p>
                {company.city && <p style={{fontSize:11}}>{company.city}</p>}
                {company.address && <p style={{fontSize:11}}>{company.address}</p>}
                {company.phone && <p style={{fontSize:11}}>Tel: {company.phone}</p>}
              </div>

              {/* Numrat fiskalë */}
              <div style={{borderTop:'1px solid #000',borderBottom:'1px solid #000',padding:'6px 0',marginBottom:8}}>
                {company.nui && (
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                    <span>Numri Fiskal:</span><span style={{fontWeight:700}}>{company.nui}</span>
                  </div>
                )}
                {company.vatNumber && isVAT && (
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                    <span>Numri i TVSH:</span><span style={{fontWeight:700}}>{company.vatNumber}</span>
                  </div>
                )}
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                  <span>Nr. i PEF:</span><span style={{fontWeight:700}}>1</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                  <span>OPERATORI:</span><span style={{fontWeight:700}}>{receipt.waiter?.name?.toUpperCase() || cashierName.split(' ')[0].toUpperCase()}</span>
                </div>
              </div>

              {/* Titulli */}
              <div style={{textAlign:'center',margin:'8px 0',letterSpacing:2}}>
                <p style={{fontSize:14,fontWeight:900}}>KUPON FISKAL</p>
              </div>

              {/* Items */}
              <div style={{borderBottom:'1px dashed #000',paddingBottom:8,marginBottom:8}}>
                {receipt.items.map((item,i)=>(
                  <div key={i} style={{marginBottom:4}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:700}}>
                      <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,maxWidth:'60%'}}>{item.name.toUpperCase()}</span>
                      <span>{fmtEUR(item.total)} {item.tax_rate||'A'}</span>
                    </div>
                    <p style={{fontSize:10,color:'#555'}}>{item.quantity}x{fmtEUR(item.price)}</p>
                  </div>
                ))}
              </div>

              {/* Totali */}
              <div style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:900,letterSpacing:1,marginBottom:4}}>
                  <span>TOTALI NE EURO</span><span>{receipt.totalEUR}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                  <span>PARA TE GATSHME</span>
                  <span>{receipt.cashGiven ? receipt.cashGiven.toFixed(2) : receipt.totalEUR}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                  <span>TOT. PA TVSH</span>
                  <span>{isVAT ? fmtCnt(calcTotals(receipt.items, isVAT).noTaxCents).replace('€','') : receipt.totalEUR}</span>
                </div>
                {isVAT && calcTotals(receipt.items, isVAT).taxCents > 0 && (
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                    <span>TVSH</span>
                    <span>{fmtCnt(calcTotals(receipt.items, isVAT).taxCents).replace('€','')}</span>
                  </div>
                )}
              </div>

              {/* Footer fiskal */}
              <div style={{borderTop:'1px solid #000',paddingTop:8,fontSize:10}}>
                {receipt.table && (
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span>TAVOLINA:</span><span>{receipt.table.label}</span>
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,marginTop:4}}>
                  <span>EJ NR. 1</span>
                  <span style={{textAlign:'right' as const}}>DOK.NR. {receipt.receiptNumber||'—'}</span>
                  <span>DATA {new Date().toLocaleDateString('sq-AL',{day:'2-digit',month:'2-digit',year:'numeric'}).replace(/\//g,'-')}</span>
                  <span style={{textAlign:'right' as const}}>ORA {new Date().toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).replace(/:/g,':')}</span>
                </div>
                {receipt.transactionId && (
                  <p style={{marginTop:4,fontWeight:700}}>EN{String(receipt.transactionId).padStart(8,'0')}</p>
                )}
                {receipt.receiptNumber && (
                  <p style={{textAlign:'center' as const,marginTop:4}}>Numri Serik:</p>
                )}
                {receipt.receiptNumber && (
                  <p style={{textAlign:'center' as const,fontWeight:700}}>KUPONI FISKAL NR. {receipt.receiptNumber}</p>
                )}
                {receipt.qrCodeData?.startsWith('MOCK') && (
                  <p style={{textAlign:'center' as const,fontSize:9,color:'#999',marginTop:4}}>MOCK MODE</p>
                )}
                {receipt.qrCodeData && !receipt.qrCodeData.startsWith('MOCK') && (
                  <div style={{textAlign:'center' as const,marginTop:8}}>
                    <QRCanvas data={receipt.qrCodeData} size={100}/>
                  </div>
                )}
              </div>
            </div>
            {/* Buttons */}
            <div style={{padding:'0 14px 14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button
                onClick={()=>{
                  import('@/hooks/usePrintReceipt').then(({ buildATKReceipt }) => {
                    import('@/components/pos/receipt-printer').then(({ printReceipt }) => {
                      const atk = buildATKReceipt(
                        {
                          receiptNumber: receipt.receiptNumber,
                          qrCodeData:    receipt.qrCodeData,
                          status:        'fiscalized',
                          totals: {
                            totalEUR: receipt.totalEUR,
                            taxEUR:   (parseFloat(receipt.totalEUR) * 0.18 / 1.18).toFixed(2),
                            noTaxEUR: (parseFloat(receipt.totalEUR) / 1.18).toFixed(2),
                          }
                        },
                        receipt.items.map((i: any) => ({
                          name: i.name, price: i.price,
                          quantity: i.quantity, unit: i.unit || 'cope',
                          taxRate: i.tax_rate || 'E',
                        })),
                        company,
                        { paymentMethod: payMethod, operatorName: receipt.waiter?.name || cashierName }
                      )
                      printReceipt(atk)
                    })
                  })
                }}
                style={{padding:'11px 0',borderRadius:8,border:'1.5px solid #5B21B6',background:'white',cursor:'pointer',fontSize:13,fontWeight:700,color:'white'}}>
                🖨️ Printo
              </button>
              <button onClick={()=>{ setReceipt(null); closeTable(); setLocked(true); setActiveWaiter(null); setWaiterMode(false); sessionStorage.removeItem('pos_owner_unlocked') }}
                style={{padding:'11px 0',borderRadius:8,background:'#5B21B6',color:'white',border:'none',cursor:'pointer',fontSize:13,fontWeight:700}}>
                Mbyll ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WAITER MODAL */}
      {/* Modal — Shto Hapësirë */}
      {showAddSection && (
        <>
          <div onClick={()=>{setShowAddSection(false);setNewSectionName('')}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,backdropFilter:'blur(4px)'}}/>
          <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'var(--bg-card)',border:`1px solid ${C.border}`,borderRadius:18,padding:28,width:'min(360px,94vw)',zIndex:301,boxShadow:'0 24px 60px rgba(0,0,0,0.3)'}}>
            <h3 style={{fontSize:17,fontWeight:800,color:C.text1,marginBottom:6}}>Shto Hapësirë</h3>
            <p style={{fontSize:13,color:C.text3,marginBottom:20}}>Krijo hapësirë të re — Terrasa, Bar, VIP, Oborri...</p>
            <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:6}}>Emri i Hapësirës</label>
            <input
              value={newSectionName}
              onChange={e=>setNewSectionName(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter' && newSectionName.trim()) addNewSection() }}
              placeholder="p.sh. Terrasa, Bar, VIP..."
              autoFocus
              style={{width:'100%',padding:'10px 14px',borderRadius:10,border:`1.5px solid ${C.border}`,background:'var(--bg-muted)',fontSize:14,color:C.text1,outline:'none',marginBottom:16}}
            />
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setShowAddSection(false);setNewSectionName('')}}
                style={{flex:1,padding:'10px',borderRadius:10,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',fontSize:13,fontWeight:600,color:C.text2}}>
                Anulo
              </button>
              <button onClick={addNewSection} disabled={!newSectionName.trim()}
                style={{flex:1,padding:'10px',borderRadius:10,background:newSectionName.trim()?C.purple:'var(--bg-muted)',color:newSectionName.trim()?'white':C.text3,border:'none',cursor:newSectionName.trim()?'pointer':'default',fontSize:13,fontWeight:700,transition:'all 0.12s'}}>
                Shto Hapësirën
              </button>
            </div>
          </div>
        </>
      )}



      {/* TABLE EDIT MODAL */}
      {editingTable && (
        <>
          <div onClick={()=>setEditingTable(null)} style={{position:'fixed',inset:0,background:'var(--bg-muted)',zIndex:199,backdropFilter:'blur(4px)'}}/>
          <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:C.card,borderRadius:20,padding:24,width:'min(360px,94vw)',zIndex:200,boxShadow:'0 24px 60px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:18}}>
              <p style={{fontSize:16,fontWeight:800,color:C.text1}}>Edito {editingTable.label}</p>
              <button onClick={()=>setEditingTable(null)} style={{background:'none',border:'none',cursor:'pointer',color:C.text3}}><X size={18}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:C.text3,display:'block',marginBottom:4,textTransform:'uppercase' as const,letterSpacing:'0.05em'}}>Emri</label>
                  <input value={editForm.label} onChange={e=>setEditForm(f=>({...f,label:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid '+C.border,background:'var(--bg-muted)',fontSize:13,color:C.text1,outline:'none',boxSizing:'border-box' as const}}/>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:C.text3,display:'block',marginBottom:4,textTransform:'uppercase' as const,letterSpacing:'0.05em'}}>Forma</label>
                  <div style={{display:'flex',gap:8}}>
                    {(['rect','round'] as const).map(s=>(
                      <button key={s} onClick={()=>setEditForm(f=>({...f,shape:s}))}
                        style={{flex:1,padding:'9px 0',borderRadius:9,border:'1.5px solid '+(editForm.shape===s?C.purple:C.border),background:editForm.shape===s?C.purpleBg:'var(--bg-muted)',cursor:'pointer',fontSize:12,fontWeight:700,color:editForm.shape===s?C.purple:C.text3}}>
                        {s==='rect'?'Rektangull':'Rreth'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:C.text3,display:'block',marginBottom:4,textTransform:'uppercase' as const,letterSpacing:'0.05em'}}>Zona</label>
                <input value={editForm.section} onChange={e=>setEditForm(f=>({...f,section:e.target.value}))} placeholder="Salla, Terraca, Bar..."
                  style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid '+C.border,background:'var(--bg-muted)',fontSize:13,color:C.text1,outline:'none',boxSizing:'border-box' as const}}/>
              </div>
              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button onClick={async()=>{
                  const tid = editingTable.id
                  setEditingTable(null)
                  const r = await fetch('/api/pos/tables',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({tableId:tid})})
                  const d = await r.json()
                  if(d.success) { await load(); toast.success('Tavolina u fshi') }
                  else { toast.error('Gabim: ' + (d.error||'RLS')); await load() }
                }}
                  style={{padding:'10px 14px',borderRadius:10,border:'1px solid rgba(220,38,38,0.3)',background:'rgba(220,38,38,0.06)',cursor:'pointer',fontSize:12,fontWeight:700,color:C.red}}>
                  Fshi
                </button>
                <button onClick={async()=>{
                  await fetch('/api/pos/tables',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editingTable.id,...editForm})})
                  setTables(p=>p.map(t=>t.id===editingTable.id?{...t,...editForm}:t))
                  setEditingTable(null); toast.success('U perditesua')
                }} style={{flex:1,padding:'10px 0',borderRadius:10,background:C.purple,color:'white',border:'none',cursor:'pointer',fontSize:13,fontWeight:700}}>
                  Ruaj
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* HEADER */}
      <div style={{display:'flex',alignItems:'center',height:56,background:C.card,borderBottom:'1.5px solid '+C.border,padding:'0 16px',gap:12,flexShrink:0,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        {view==='order' ? (
          <div style={{display:'flex',alignItems:'center',gap:10,flex:1}}>
            <button onClick={()=>closeTableSmart()}
              style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',color:C.text2,fontSize:13,fontWeight:600}}>
              <ChevronLeft size={16}/> Tavolinat
            </button>
            {activeTable && (
              <span style={{fontSize:13,fontWeight:700,color:C.text1}}>{activeTable.label}</span>
            )}
            {/* Lësho Tavolinën — vetëm nëse nuk ka porosi aktive */}
            {activeTable && !getOrder(activeTable.id) && (
              <button onClick={()=>closeTableSmart()}
                style={{marginLeft:'auto',padding:'5px 12px',borderRadius:8,border:'1px solid #FCA5A5',background:'rgba(239,68,68,0.05)',cursor:'pointer',fontSize:12,fontWeight:600,color:'var(--text-1)'}}>
                Lësho Tavolinën
              </button>
            )}
            {activeTable && getOrder(activeTable.id) && (
              <button onClick={async ()=>{
                const ord = getOrder(activeTable.id)
                if (!ord) return
                if (!confirm('Anulo porosinë dhe lëshoje tavolinën?')) return
                await fetch('/api/pos/table-orders',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:ord.id})})
                setOrders(o=>o.filter(x=>x.id!==ord.id))
                closeTable()
              }}
                style={{marginLeft:'auto',padding:'5px 12px',borderRadius:8,border:'1px solid #FCA5A5',background:'rgba(239,68,68,0.05)',cursor:'pointer',fontSize:12,fontWeight:600,color:'var(--text-1)'}}>
                Anulo Porosinë
              </button>
            )}
          </div>
        ) : <p style={{fontSize:15,fontWeight:800,color:C.text1}}>Tavolinat</p>}

        {view==='tables' && (
          <div style={{display:'flex',gap:4,alignItems:'center'}}>
            {sections.map(s=>(
              <button key={s} onClick={()=>setSection(s)}
                style={{padding:'5px 14px',borderRadius:20,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,background:section===s?C.purple:'transparent',color:section===s?'white':C.text3,transition:'all 0.12s'}}>
                {s==='all'?'Te gjitha':s}
              </button>
            ))}

          </div>
        )}

        {view==='order' && activeTable && (
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{padding:'4px 14px',borderRadius:20,background:C.purpleBg,color:C.purple,fontWeight:700,fontSize:13}}>{activeTable.label}</span>
            {activeOrder && <span style={{fontSize:12,color:C.text3,display:'flex',alignItems:'center',gap:4}}><Clock size={12}/>{elapsed(activeOrder.opened_at)}</span>}
          </div>
        )}
        <div style={{flex:1}}/>
        {/* Fullscreen button */}
        <button onClick={toggleFullscreen} title={isFullscreen?'Dil nga Fullscreen [F3]':'Fullscreen [F3]'}
          style={{height:34,width:34,borderRadius:8,border:'1px solid '+C.border,background:'var(--bg-muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.text2,flexShrink:0,transition:'all 0.15s'}}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=C.purpleBg;(e.currentTarget as HTMLElement).style.borderColor=C.purple;(e.currentTarget as HTMLElement).style.color=C.purple}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='var(--bg-muted)';(e.currentTarget as HTMLElement).style.borderColor=C.border;(e.currentTarget as HTMLElement).style.color=C.text2}}>
          {isFullscreen?<Minimize size={15}/>:<Maximize size={15}/>}
        </button>
        {view==='order' && (
          <div style={{display:'flex',gap:4}}>
            {[
              { label:'Paguaj',  sub:'F1', onClick:()=>{ if(items.length>0&&!paying) checkout() } },
              { label:'Kuzhina', sub:'F6', onClick:()=>{ if(items.length>0) sendToKitchen() } },
            ].map(b=>(
              <button key={b.label} onClick={b.onClick} title={`${b.label} [${b.sub}]`}
                style={{height:30,padding:'0 10px',borderRadius:8,border:'1px solid '+C.border,background:'var(--bg-muted)',cursor:'pointer',fontSize:11,fontWeight:700,color:C.text2,transition:'all 0.15s',whiteSpace:'nowrap' as const,display:'flex',alignItems:'center',gap:5}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=C.purpleBg;(e.currentTarget as HTMLElement).style.color=C.purple;(e.currentTarget as HTMLElement).style.borderColor=C.purple}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='var(--bg-muted)';(e.currentTarget as HTMLElement).style.color=C.text2;(e.currentTarget as HTMLElement).style.borderColor=C.border}}>
                <span>{b.label}</span>
                <span style={{fontSize:9,opacity:0.6,background:'rgba(0,0,0,0.08)',borderRadius:4,padding:'1px 4px'}}>{b.sub}</span>
              </button>
            ))}
          </div>
        )}

        {isMockMode && <span style={{fontSize:10,fontWeight:700,color:C.amber,padding:'2px 8px',background:'rgba(217,119,6,0.1)',borderRadius:20}}>MOCK</span>}

        {/* Kyçu — lock manual për owner */}
        {!waiterMode && (
          <button
            onClick={() => { setLocked(true); setActiveWaiter(null); setWaiterMode(false); sessionStorage.removeItem('pos_owner_unlocked') }}
            style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:9,border:'1px solid '+C.border,background:'var(--bg-muted)',cursor:'pointer',fontSize:12,fontWeight:600,color:C.text3,transition:'all 0.15s'}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='#EF4444';(e.currentTarget as HTMLElement).style.color='#EF4444'}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.border;(e.currentTarget as HTMLElement).style.color=C.text3}}>
            Kyçu
          </button>
        )}



        {/* Kamarieri aktiv — vetëm info, pa klikim */}
        {activeWaiter && (
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:20,border:'1.5px solid '+activeWaiter.color,background:activeWaiter.color+'15'}}>
              <div style={{width:24,height:24,borderRadius:'50%',background:activeWaiter.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'var(--text-1)'}}>
                {activeWaiter.name[0].toUpperCase()}
              </div>
              <span style={{fontSize:12,fontWeight:700,color:activeWaiter.color}}>{activeWaiter.name}</span>
            </div>
            <button onClick={()=>{ setLocked(true); setActiveWaiter(null); setWaiterMode(false) }}
              style={{padding:'6px 12px',borderRadius:9,border:'1px solid #FCA5A5',background:'rgba(239,68,68,0.06)',cursor:'pointer',fontSize:12,fontWeight:700,color:'var(--text-1)',transition:'all 0.15s'}}>
              Kyçu
            </button>
          </div>
        )}

        {view==='tables' && (
          <>
            <button onClick={()=>setEditMode(e=>!e)}
              style={{padding:'6px 12px',borderRadius:9,border:'1.5px solid '+(editMode?C.purple:C.border),background:editMode?C.purpleBg:'var(--bg-muted)',cursor:'pointer',fontSize:12,fontWeight:700,color:editMode?C.purple:C.text2}}>
              {editMode?'Ruaj Hartën':'Edito Hartën'}
            </button>
            <button onClick={async(e)=>{
              const btn = e.currentTarget as HTMLButtonElement
              btn.disabled = true
              const targetSection = section === 'all' ? 'Salla' : section
              try {
                const r=await fetch('/api/pos/tables',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({section: targetSection})})
                const d=await r.json()
                if(d.table) {
                  setTables(prev => {
                    const exists = prev.find(t => t.id === d.table.id)
                    if (exists) return prev
                    return [...prev, d.table]
                  })
                  toast.success(`Tavolina u shtua te ${targetSection}`)
                } else {
                  toast.error(d.error||'Gabim — provo sërish')
                }
              } catch(e2) { toast.error('Gabim lidhje') }
              finally { btn.disabled = false }
            }}
              style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:10,background:C.purple,color:'white',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,boxShadow:'0 4px 12px rgba(91,33,182,0.25)'}}>
              <Plus size={14}/> Tavolinë
              </button>
            </>
          )}
        </div>
      {/* STATS BAR — vetëm view tables */}
      {view==='tables' && (
        <div style={{display:'flex',alignItems:'center',gap:0,background:C.card,borderBottom:'1px solid '+C.border,flexShrink:0}}>
          {[
            {label:'Aktive', value:orders.filter(o=>o.status==='open').length, color:C.purpleL},
            {label:'Boshe',  value:tables.length - orders.filter(o=>o.status==='open').length, color:C.text3},
            {label:'Totali', value:tables.length, color:C.text2},
          ].map((s,i)=>(
            <div key={s.label} style={{flex:1,textAlign:'center' as const,padding:'12px 0',borderRight:i<2?'1px solid '+C.border:'none'}}>
              <p style={{fontSize:34,fontWeight:900,color:s.color,lineHeight:1,letterSpacing:'-0.04em'}}>{s.value}</p>
              <p style={{fontSize:10,color:C.text3,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',marginTop:4}}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* TABLE MAP */}
      {view==='tables' && (
        <div style={{flex:1,overflow:'hidden',position:'relative',background:C.bg}}>
          {loading ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',gap:12,color:C.text3}}>
              <div style={{width:16,height:16,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.purpleL}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
              <span style={{fontSize:13}}>Duke ngarkuar...</span>
            </div>
          ) : (
            <>
              {editMode && (
                <div style={{position:'absolute',top:12,left:'50%',transform:'translateX(-50%)',zIndex:20,background:'rgba(124,58,237,0.9)',borderRadius:20,padding:'6px 16px',fontSize:12,fontWeight:700,color:'var(--text-1)',letterSpacing:'0.04em'}}>
                  Modaliteti i editimit — Tërhiqni tavolinën
                </div>
              )}
              <div ref={mapRef}
                style={{width:'100%',height:'100%',position:'relative',cursor:editMode?'crosshair':'default'}}
                onMouseMove={onMouseMove} onMouseUp={e=>onMouseUp(e)} onMouseLeave={e=>onMouseUp(e)}>

                {visible.length===0 && (
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:16}}>
                    <UtensilsCrossed size={40} style={{opacity:0.2,color:C.text3}}/>
                    <p style={{fontSize:14,color:C.text3}}>Asnjë tavolinë</p>
                    <button onClick={async()=>{
                      try {
                        const r=await fetch('/api/pos/tables',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({section:section==='all'?'Salla':section})})
                        const d=await r.json()
                        if(d.table){setTables(p=>[...p,d.table]);toast.success('Tavolina u shtua')}
                        else toast.error(d.error||'Gabim')
                      } catch(e:any){toast.error('Gabim: '+(e?.message||'lidhje'))}
                    }}
                      style={{padding:'10px 22px',borderRadius:10,background:C.purpleL,color:'white',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:8}}>
                      <Plus size={14}/> Shto Tavolinën e Parë
                    </button>
                  </div>
                )}
                {visible.map(table=>{
                  const order=getOrder(table.id)
                  const col=tableColor(table.id)
                  const waiter=getWaiter(order?.waiter_id)
                  const total=orderTotals[table.id]
                  const isRound=table.shape==='round'
                  const w=isRound?96:(table.seats<=2?110:table.seats<=4?130:160)
                  const h=isRound?96:84
                  return (
                    <div key={table.id}
                      style={{position:'absolute',left:table.pos_x+'px',top:table.pos_y+'px',userSelect:'none',zIndex:dragging===table.id?10:1}}
                      onMouseDown={e=>{if(editMode)onMouseDown(e,table.id)}}
                      onMouseUp={e=>{if(editMode)onMouseUp(e,table.id)}}
                      onClick={()=>{if(!editMode&&!draggingRef.current){if(editMode){setEditingTable(table);setEditForm({label:table.label,seats:table.seats,shape:table.shape,section:table.section})}else openTable(table)}}}>
                      <div
                        style={{
                          width:w,height:h,minHeight:isRound?96:84,
                          borderRadius:isRound?'50%':12,
                          background:col.bg,
                          border:`2px solid ${col.border}`,
                          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                          cursor:'pointer',position:'relative',
                          boxShadow:`0 4px 20px ${col.border}40, 0 1px 3px rgba(0,0,0,0.12)`,
                          transition:dragging?'none':'box-shadow 0.15s, transform 0.15s',
                        }}
                        onMouseEnter={e=>{if(!draggingRef.current){(e.currentTarget as HTMLElement).style.transform='scale(1.06)';(e.currentTarget as HTMLElement).style.boxShadow=`0 8px 32px ${col.border}60`}}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='none';(e.currentTarget as HTMLElement).style.boxShadow=`0 4px 20px ${col.border}40`}}>
                        <p style={{fontSize:isRound?14:16,fontWeight:900,color:col.text,lineHeight:1,letterSpacing:'-0.03em'}}>{table.label}</p>
                        {order?(
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1,marginTop:3}}>
                            <p style={{fontSize:10,color:col.text,opacity:0.7,fontWeight:600}}>{elapsed(order.opened_at)}</p>
                            {total&&<p style={{fontSize:12,fontWeight:800,color:col.text}}>{fmtCnt(total)}</p>}
                          </div>
                        ):(
                          <p style={{fontSize:10,color:col.text,opacity:0.5,marginTop:2}}>{table.seats} vc</p>
                        )}
                        {waiter&&(
                          <div style={{position:'absolute',top:-8,right:-8,width:22,height:22,borderRadius:'50%',background:waiter.color,border:'2px solid var(--bg-card)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:'white',boxShadow:`0 2px 8px ${waiter.color}80`}}>
                            {waiter.name[0].toUpperCase()}
                          </div>
                        )}
                        {col.dot&&(
                          <div style={{position:'absolute',bottom:4,left:'50%',transform:'translateX(-50%)',width:6,height:6,borderRadius:'50%',background:col.dot}}/>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}


      {/* ORDER VIEW */}
      {view==='order' && (
        <div style={{flex:1,display:'flex',overflow:'hidden',flexDirection:'column'}}>

          <div className="pos-order-main" style={{flex:1,display:'flex',overflow:'hidden'}}>
            {/* PRODUKTET — marrin hapësirën kryesore */}
            <div className="pos-product-area" style={{flex:1,display:'flex',flexDirection:'column' as const,overflow:'hidden',background:C.bg}}>
            <div style={{padding:'12px 14px',background:C.card,borderBottom:'1px solid '+C.border,flexShrink:0}}>
              <div style={{position:'relative',marginBottom:10}}>
                <Search size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:C.text3,pointerEvents:'none'}}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Kërko produkt..."
                  style={{width:'100%',padding:'10px 12px 10px 34px',borderRadius:10,border:'1.5px solid '+C.border,background:C.bg,fontSize:13,color:C.text1,outline:'none',boxSizing:'border-box' as const}}/>
              </div>
              <div style={{display:'flex',gap:6,overflowX:'auto' as const,paddingBottom:2}}>
                {categories.map(cat=>(
                  <button key={cat} onClick={()=>setCategory(cat)}
                    style={{padding:'7px 16px',borderRadius:20,cursor:'pointer',fontSize:12,fontWeight:700,whiteSpace:'nowrap' as const,flexShrink:0,
                      background:category===cat?C.purpleL:'transparent',
                      color:category===cat?'white':C.text2,
                      border:'1.5px solid '+(category===cat?C.purpleL:C.border)}}>
                    {cat==='all'?'Gjithçka':cat}
                  </button>
                ))}
              </div>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:14,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,alignContent:'start' as const}}>
              {filtered.length===0&&(
                <div style={{gridColumn:'1/-1',textAlign:'center',padding:'40px 0',fontSize:14,fontWeight:600,color:'#6B7280'}}>Nuk ka produkte</div>
              )}
              {filtered.map(p=>{
                const inCart=items.find(i=>i.product_id===p.id)
                const col=(p.emoji&&p.emoji.startsWith('#'))?p.emoji:'#9B5CF8'
                const pr=Number(p.price)||0
                const nm=String(p.name||'Pa emër')
                return (
                  <div key={p.id} onClick={()=>addItem(p)} style={{
                    borderRadius:14,
                    border:'2px solid '+(inCart?'#7C3AED':'#E5E7EB'),
                    background:inCart?'#F5F3FF':'#FFFFFF',
                    cursor:'pointer',overflow:'hidden',position:'relative',
                    boxShadow:inCart?'0 4px 14px rgba(124,58,237,0.2)':'0 1px 4px rgba(0,0,0,0.08)',
                    transition:'all 0.15s',userSelect:'none' as const,
                    minHeight:180
                  }}>
                    {p.image_url
                      ? <img src={p.image_url} alt={nm} style={{width:'100%',height:110,objectFit:'cover' as const,display:'block',flexShrink:0}}/>
                      : <div style={{width:'100%',height:110,flexShrink:0,background:col+'18',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <Coffee size={36} color={col} opacity={0.7}/>
                        </div>
                    }
                    <div style={{padding:'8px 10px 10px'}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#111827',lineHeight:'1.3',marginBottom:5,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{nm}</div>
                      <div style={{fontSize:15,fontWeight:900,color:inCart?'#5B21B6':'#7C3AED'}}>{pr>0?'€'+(pr/10000).toFixed(2):'—'}</div>
                    </div>
                    {inCart&&(
                      <div style={{
                        position:'absolute',top:6,right:6,
                        width:22,height:22,borderRadius:'50%',
                        background:'#7C3AED',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:11,fontWeight:800,color:'#FFFFFF',
                        boxShadow:'0 2px 6px rgba(124,58,237,0.5)'
                      }}>{inCart.quantity}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mobile cart toggle */}
          <div className="pos-cart-toggle" style={{display:'none',position:'fixed',bottom:16,left:'50%',transform:'translateX(-50%)',zIndex:60,gap:10}}>
            <button onClick={()=>{
              const p=document.querySelector('.pos-cart-panel') as HTMLElement
              if(p) p.classList.toggle('open')
            }} style={{padding:'12px 24px',borderRadius:50,background:C.purple,color:'white',border:'none',cursor:'pointer',fontSize:14,fontWeight:800,boxShadow:`0 8px 24px ${C.purple}60`,display:'flex',alignItems:'center',gap:8}}>
              <ShoppingCart size={16}/> {items.length>0?`Porosia (${items.length}) · ${fmtCnt(totals.totalCents)}`:'Shporta'}
            </button>
          </div>
          {/* CART PANEL — gjerësi fikse 320px */}
          <div className="pos-cart-panel" style={{width:320,flexShrink:0,display:'flex',flexDirection:'column' as const,background:C.card,borderLeft:'1.5px solid '+C.border,overflow:'hidden'}}>
          <div style={{padding:'12px 14px',borderBottom:'1px solid '+C.border,flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <p style={{fontSize:16,fontWeight:900,color:C.text1,letterSpacing:'-0.02em'}}>{activeTable?.label}</p>
                <p style={{fontSize:11,color:C.text3}}>{activeWaiter?.name||cashierName} · {activeOrder?elapsed(activeOrder.opened_at):'0m'}</p>
              </div>
              {items.length>0&&<button onClick={()=>setItems([])} style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:6,cursor:'pointer',fontSize:11,color:C.red,padding:'4px 10px',fontWeight:600}}>Pastro</button>}
              </div>
            </div>

            <div style={{flex:1,overflowY:'auto'}}>
              {loadingOrder?(
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:60,gap:8,color:C.text3}}>
                  <div style={{width:14,height:14,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.purpleL}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                </div>
              ):items.length===0?(
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:80,gap:6,paddingBottom:12}}>
                  <ShoppingCart size={18} style={{opacity:0.15,color:C.text3}}/>
                  <p style={{fontSize:11,color:C.text3,opacity:0.7}}>Zgjedh nga menuja</p>
                </div>
              ):(
                items.map((item,i)=>(
                  <div key={item.id||i} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderBottom:'1px solid '+C.border}}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:12,fontWeight:700,color:C.text1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{item.name}</p>
                      <p style={{fontSize:11,color:C.text3}}>{fmtEUR(item.price)}</p>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <button onClick={()=>{if(item.quantity<=1)removeItem(item);else setItems(p=>p.map(x=>x.id===item.id?{...x,quantity:x.quantity-1,total:x.price*(x.quantity-1)}:x))}}
                        style={{width:22,height:22,borderRadius:5,border:'1px solid '+C.border,background:C.bg,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Minus size={10} color={C.text2}/>
                      </button>
                      <span style={{fontSize:14,fontWeight:800,minWidth:18,textAlign:'center' as const,color:C.text1}}>{item.quantity}</span>
                      <button onClick={()=>setItems(p=>p.map(x=>x.id===item.id?{...x,quantity:x.quantity+1,total:x.price*(x.quantity+1)}:x))}
                        style={{width:22,height:22,borderRadius:5,border:'1px solid '+C.border,background:C.bg,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Plus size={10} color={C.text2}/>
                      </button>
                    </div>
                    <span style={{fontSize:13,fontWeight:800,color:C.purpleL,minWidth:44,textAlign:'right' as const}}>{fmtEUR(item.total)}</span>
                    <button onClick={()=>removeItem(item)} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,padding:2}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#EF4444'}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color=C.text3}>
                      <X size={12}/>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{padding:'12px 14px',borderTop:'1px solid '+C.border,flexShrink:0}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style={{fontSize:12,color:C.text3}}>TVSH {fmtCnt(totals.taxCents)}</span>
                <span style={{fontSize:20,fontWeight:900,color:C.text1,letterSpacing:'-0.03em'}}>{fmtCnt(totals.totalCents)}</span>
              </div>

              {showPayPanel&&payMethod==='cash'&&(
                <div style={{marginBottom:8}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4,marginBottom:6}}>
                    {[5,10,20,50].map(amt=>(
                      <button key={amt} onClick={()=>setCashGiven(String(amt))}
                        style={{padding:'7px 0',borderRadius:7,border:'1px solid '+C.border,background:cashGiven===String(amt)?C.purpleL:C.bg,color:cashGiven===String(amt)?'white':C.text2,cursor:'pointer',fontSize:13,fontWeight:700}}>
                        €{amt}
                      </button>
                    ))}
                  </div>
                  <div style={{position:'relative',marginBottom:4}}>
                    <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:13,fontWeight:700,color:C.text3}}>€</span>
                    <input type="number" step="0.01" min="0" value={cashGiven}
                      onChange={e=>setCashGiven(e.target.value)}
                      placeholder={(totals.totalCents/100).toFixed(2)}
                      style={{width:'100%',padding:'8px 10px 8px 22px',borderRadius:8,border:'1px solid '+C.border,background:C.bg,fontSize:14,fontWeight:800,color:C.text1,outline:'none',boxSizing:'border-box' as const}}/>
                  </div>
                  {cashGiven&&parseFloat(cashGiven)>=totals.totalCents/100&&(
                    <div style={{display:'flex',justifyContent:'space-between',padding:'8px 10px',borderRadius:8,background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',marginBottom:6}}>
                      <span style={{fontSize:12,fontWeight:600,color:C.green}}>Kusuri</span>
                      <span style={{fontSize:18,fontWeight:900,color:C.green}}>€{(parseFloat(cashGiven)-totals.totalCents/100).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1.3fr',gap:6}}>
                <button onClick={()=>closeTableSmart()}
                  style={{padding:'10px 0',borderRadius:9,border:'1px solid '+C.border,background:C.card,cursor:'pointer',fontSize:12,fontWeight:700,color:C.text2,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:1}}>
                  <ChevronLeft size={14}/><span style={{fontSize:9,color:C.text3}}>ESC</span>
                </button>
                <button onClick={sendToKitchen} disabled={items.length===0}
                  style={{padding:'10px 0',borderRadius:9,cursor:items.length?'pointer':'default',fontSize:11,fontWeight:700,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:1,
                    border:kotSent?'1px solid rgba(16,185,129,0.3)':'1px solid '+C.amber+'40',
                    background:kotSent?'rgba(16,185,129,0.08)':'rgba(217,119,6,0.06)',
                    color:kotSent?C.green:C.amber}}>
                  <span style={{display:'flex',alignItems:'center',gap:3}}>{kotSent?<><Check size={11}/> KOT</>:<><UtensilsCrossed size={11}/> Kuzhina</>}</span>
                  <span style={{fontSize:9,opacity:0.6}}>F6</span>
                </button>
                <button
                  disabled={items.length===0||paying||(payMethod==='cash'&&!!cashGiven&&parseFloat(cashGiven)<totals.totalCents/100)}
                  onClick={checkout}
                  style={{padding:'10px 0',borderRadius:9,border:'none',cursor:items.length?'pointer':'default',fontSize:12,fontWeight:800,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:1,transition:'all 0.12s',
                    background:items.length?`linear-gradient(135deg,${C.purple},${C.purpleL})`:'rgba(0,0,0,0.05)',
                    color:items.length?'white':C.text3,
                    boxShadow:items.length?`0 4px 16px ${C.purpleL}50`:'none'}}>
                  {paying
                    ? <div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTop:'2px solid white',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                    : <><span style={{display:'flex',alignItems:'center',gap:4}}>
                        {payMethod==='cash'?<Banknote size={13}/>:<CreditCard size={13}/>} Paguaj
                      </span><span style={{fontSize:9,opacity:0.6}}>F1</span></>
                  }
                </button>
              </div>
              <div style={{display:'flex',gap:6,marginTop:6}}>
                <button onClick={()=>{setPayMethod('cash');setShowPayPanel(p=>!p)}}
                  style={{flex:1,padding:'8px 0',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,
                    background:payMethod==='cash'?C.purpleBg:'transparent',color:payMethod==='cash'?C.purpleL:C.text3,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                  <Banknote size={13}/> Cash
                </button>
                <button onClick={()=>{setPayMethod('card');setShowPayPanel(false)}}
                  style={{flex:1,padding:'8px 0',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,
                    background:payMethod==='card'?C.purpleBg:'transparent',color:payMethod==='card'?C.purpleL:C.text3,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                  <CreditCard size={13}/> Kartë
                </button>
              </div>
            </div>
          </div>{/* end pos-cart-panel */}
          </div>
          </div>
      )}

    </div>
  )
}
