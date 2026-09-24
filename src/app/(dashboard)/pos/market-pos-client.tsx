'use client'
// Market POS — Full Featured: PIN login, hapje/mbyllje kase, borxh, marzhi, skadenca, importim, etiketë

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Zap, Trash2, Plus, Minus, Package, CreditCard, Banknote,
  X, Check, AlertTriangle, Scan, FileText, Settings2,
  Lock, LogOut, Users, TrendingUp, BarChart2, RefreshCw,
  Upload, Tag, Archive, DollarSign, Clock, ChevronRight,
  Printer, Search, ShoppingCart, Eye, EyeOff, Shield, UserCheck
} from 'lucide-react'
import QRCanvas from '@/components/pos/qr-canvas'
import { buildATKReceipt } from '@/hooks/usePrintReceipt'
import { printReceipt } from '@/components/pos/receipt-printer'
import { calculate, type CalcResult, type Discount } from '@/lib/atk/calc'
import { getPaperWidth } from '@/lib/atk/print-client'
import {
  acknowledgeOnlineSale, createOfflineSale, isNetworkError, numbersForOnlineSale,
  pendingCoupons, printOfflineReceipt, refreshKit, syncPending, type OfflineSaleResult,
} from '@/lib/atk/offline/engine'

// ── Types ──────────────────────────────────────────────────────────────
interface Product {
  id: string; name: string; price: number; buy_price?: number
  category: string | null; emoji: string; tax_rate: string
  unit: string; stock: number | null; barcode?: string | null
  expiry_date?: string | null; image_url?: string | null
  discount?: number | null
  is_active?: boolean
}
interface CartItem {
  productId: string; name: string; price: number
  unit: string; quantity: number; taxRate: string; discount?: number
  /** Zbritja e artikullit: % ose vlerë në cent (ka përparësi mbi `discount` %) */
  disc?: Discount | null
}
interface Device {
  id: string; posId: number; name: string; cashierName: string; environment: 'TEST'|'PROD'
}
interface Cashier {
  id: string; name: string; pin: string; role: 'owner'|'cashier'
}
interface DebtClient {
  id: string; name: string; phone?: string; balance: number
}
interface Props {
  userId: string
  company: { id: string; name: string; nui: string; locationCity: string; logo_url?: string }
  devices: Device[]
  initialProducts: Product[]
  isMockMode: boolean
  cashiers?: Cashier[]
  debtClients?: DebtClient[]
  ownerName?: string
  ownerEmail?: string
}

const fmtEUR = (atk: number) => `€${(atk/10000).toFixed(2)}`
const TAX: Record<string,number> = { A:0, C:0, D:0.08, E:0.18 }

const itemDiscount = (it: CartItem): Discount | null =>
  it.disc && it.disc.value > 0 ? it.disc : (it.discount ? { kind: 'percent', value: it.discount } : null)

/** Totalet me të njëjtin motor si serveri — ajo që sheh arkëtari = ajo që del në kupon */
function calcTotals(items: CartItem[], saleDiscount: Discount | null): { total: number; tax: number; calc: CalcResult | null; error?: string } {
  if (!items.length) return { total: 0, tax: 0, calc: null }
  try {
    const calc = calculate({
      vatRegistered: true, saleDiscount,
      payments: [{ type: 'cash', amount: Number.MAX_SAFE_INTEGER }],
      items: items.map(it => ({ name: it.name, unit: it.unit || 'cope', unitPrice: Math.round(it.price), quantity: it.quantity,
        taxRate: (['A','C','D','E'].includes(it.taxRate) ? it.taxRate : 'E') as 'A'|'C'|'D'|'E', discount: itemDiscount(it) })),
    })
    return { total: calc.total / 100, tax: calc.totalTax / 100, calc }
  } catch (e) {
    return { total: 0, tax: 0, calc: null, error: e instanceof Error ? e.message : 'Gabim' }
  }
}
void TAX

const C = {
  bg:'#F4F2FF', card:'#FFFFFF', border:'#E2DCFF',
  purple:'#5B21B6', purpleL:'#7C3AED', purpleBg:'#EEF2FF',
  text1:'#111827', text2:'#374151', text3:'#6B7280',
  green:'#059669', red:'#DC2626', amber:'#D97706', blue:'#2563EB',
}

// ── Lock Screen ──────────────────────────────────────────────────────
function LockScreen({ cashiers, ownerName, onLoginCashier, onLoginOwner }: {
  cashiers: Cashier[]
  ownerName: string
  onLoginCashier: (c:Cashier)=>void
  onLoginOwner: (password:string)=>Promise<boolean>
}) {
  const [mode, setMode]       = useState<'select'|'cashier'|'owner'>('select')
  const [selected, setSelected] = useState<Cashier|null>(null)
  const [pin, setPin]         = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function handlePin(d: string) {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) {
      if (selected && selected.pin === next) {
        setTimeout(() => onLoginCashier(selected), 200)
      } else {
        setTimeout(() => { setPin(''); setError('PIN i gabuar') }, 400)
      }
    }
  }

  async function handleOwnerLogin() {
    if (!password) return
    setLoading(true)
    const ok = await onLoginOwner(password)
    if (!ok) { setError('Fjalëkalim i gabuar'); setPassword('') }
    setLoading(false)
  }

  // SELECT MODE
  if (mode === 'select') return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'linear-gradient(160deg,#1e0a4a,#2d1b69,#1a0a3e)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ textAlign:'center' as const }}>
        <div style={{ width:72, height:72, borderRadius:20, background:'rgba(139,92,246,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', border:'1px solid rgba(139,92,246,0.4)' }}>
          <Lock size={32} color="white"/>
        </div>
        <h2 style={{ fontSize:24, fontWeight:900, color:'white', marginBottom:8, letterSpacing:'-0.02em' }}>POS Terminal</h2>
        <p style={{ fontSize:14, color:'rgba(255,255,255,0.5)', marginBottom:40 }}>Zgjidhni si dëshironi të hyni</p>

        <div style={{ display:'flex', flexDirection:'column' as const, gap:12, width:300 }}>
          {/* Pronari */}
          <button onClick={()=>setMode('owner')}
            style={{ padding:'18px 24px', borderRadius:16, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', cursor:'pointer', display:'flex', alignItems:'center', gap:16, textAlign:'left' as const, transition:'all 0.15s' }}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.18)')}
            onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.1)')}>
            <div style={{ width:44, height:44, borderRadius:12, background:'rgba(245,158,11,0.2)', border:'1px solid rgba(245,158,11,0.4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Shield size={20} color="#F59E0B"/>
            </div>
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:'white', marginBottom:2 }}>{ownerName}</p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Hyr te paneli i menaxhimit</p>
            </div>
            <ChevronRight size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft:'auto' }}/>
          </button>

          {/* Kasierët */}
          {cashiers.filter(c=>c.role==='cashier').map(c=>(
            <button key={c.id} onClick={()=>{ setSelected(c); setMode('cashier') }}
              style={{ padding:'18px 24px', borderRadius:16, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', display:'flex', alignItems:'center', gap:16, textAlign:'left' as const, transition:'all 0.15s' }}
              onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.15)')}
              onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.08)')}>
              <div style={{ width:44, height:44, borderRadius:12, background:'rgba(124,58,237,0.2)', border:'1px solid rgba(124,58,237,0.4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <UserCheck size={20} color="#A78BFA"/>
              </div>
              <div>
                <p style={{ fontSize:15, fontWeight:700, color:'white', marginBottom:2 }}>{c.name}</p>
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Kasier — hyr me PIN</p>
              </div>
              <ChevronRight size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft:'auto' }}/>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // OWNER MODE — password
  if (mode === 'owner') return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'linear-gradient(160deg,#1e0a4a,#2d1b69,#1a0a3e)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ background:'white', borderRadius:24, padding:40, width:360, textAlign:'center' as const, boxShadow:'0 24px 64px rgba(0,0,0,0.4)' }}>
        <div style={{ width:56, height:56, borderRadius:14, background:'#FEF3C7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Shield size={26} color="#D97706"/>
        </div>
        <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', marginBottom:4 }}>{ownerName}</h2>
        <p style={{ fontSize:13, color:'#6B7280', marginBottom:24 }}>Fut fjalëkalimin e llogarisë</p>

        <div style={{ position:'relative', marginBottom:16 }}>
          <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handleOwnerLogin()}
            placeholder="Fjalëkalimi" autoFocus
            style={{ width:'100%', padding:'12px 44px 12px 14px', borderRadius:10, border:'1.5px solid #E2DCFF', fontSize:14, color:'#111827', background:'white', outline:'none', boxSizing:'border-box' as const }}/>
          <button type="button" onClick={()=>setShowPass(!showPass)}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
            {showPass?<EyeOff size={16}/>:<Eye size={16}/>}
          </button>
        </div>

        {error && <p style={{ fontSize:12, color:'#DC2626', marginBottom:12, fontWeight:600 }}>{error}</p>}

        <button onClick={handleOwnerLogin} disabled={loading||!password}
          style={{ width:'100%', padding:13, borderRadius:10, background:loading||!password?'#D1D5DB':'#7C3AED', color:'white', border:'none', fontSize:14, fontWeight:700, cursor:loading||!password?'not-allowed':'pointer', marginBottom:12 }}>
          {loading?'Duke verifikuar...':'Hyr'}
        </button>
        <button onClick={()=>{ setMode('select'); setError(''); setPassword('') }}
          style={{ background:'none', border:'none', color:'#6B7280', fontSize:13, cursor:'pointer', fontWeight:500 }}>
          ← Kthehu
        </button>
      </div>
    </div>
  )

  // CASHIER MODE — PIN
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'linear-gradient(160deg,#1e0a4a,#2d1b69,#1a0a3e)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ background:'white', borderRadius:24, padding:40, width:320, textAlign:'center' as const, boxShadow:'0 24px 64px rgba(0,0,0,0.4)' }}>
        <div style={{ width:56, height:56, borderRadius:14, background:'#EEF2FF', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <UserCheck size={26} color="#7C3AED"/>
        </div>
        <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', marginBottom:4 }}>{selected?.name}</h2>
        <p style={{ fontSize:13, color:'#6B7280', marginBottom:24 }}>Fut PIN-in 4-shifror</p>

        {/* Dots */}
        <div style={{ display:'flex', gap:12, justifyContent:'center', marginBottom:24 }}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{ width:14, height:14, borderRadius:'50%', background:i<pin.length?'#7C3AED':'#E2DCFF', transition:'background 0.15s' }}/>
          ))}
        </div>

        {/* Pad */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map(d=>(
            <button key={d} onClick={()=>d==='⌫'?setPin(p=>p.slice(0,-1)):d?handlePin(d):null}
              style={{ height:52, borderRadius:12, border:'1.5px solid #E2DCFF', background:d?'white':'transparent', fontSize:18, fontWeight:700, color:d==='⌫'?'#9CA3AF':'#111827', cursor:d?'pointer':'default' }}>
              {d}
            </button>
          ))}
        </div>

        {error && <p style={{ fontSize:12, color:'#DC2626', fontWeight:600, marginBottom:8 }}>{error}</p>}

        <button onClick={()=>{ setMode('select'); setPin(''); setError('') }}
          style={{ background:'none', border:'none', color:'#6B7280', fontSize:13, cursor:'pointer', fontWeight:500 }}>
          ← Kthehu
        </button>
      </div>
    </div>
  )
}

// ── Hapje Kase Modal ───────────────────────────────────────────────────
function OpenShiftModal({ onOpen }: { onOpen: (cash:number)=>void }) {
  const [cash, setCash] = useState('')
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, fontFamily:'Inter,sans-serif' }}>
      <div style={{ background:'white', borderRadius:20, padding:36, width:360, boxShadow:'0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ width:56, height:56, borderRadius:14, background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
          <DollarSign size={26} color={C.green}/>
        </div>
        <h3 style={{ fontSize:18, fontWeight:800, color:'#111827', marginBottom:6 }}>Hapje e Kasës</h3>
        <p style={{ fontSize:13, color:'#6B7280', marginBottom:20 }}>Sa cash ka në kasë tani?</p>
        <input type="number" value={cash} onChange={e=>setCash(e.target.value)} placeholder="0.00 €"
          style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1.5px solid #E2DCFF', fontSize:16, fontWeight:700, color:'#111827', outline:'none', boxSizing:'border-box' as const, marginBottom:16 }}
          autoFocus/>
        <button onClick={()=>onOpen(parseFloat(cash)||0)}
          style={{ width:'100%', padding:14, borderRadius:12, background:C.purpleL, color:'white', border:'none', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          Hap Kasën
        </button>
      </div>
    </div>
  )
}

// ── Mbyllje Kase Modal ─────────────────────────────────────────────────
function CloseShiftModal({ shift, onClose, onCancel }: { shift:any; onClose:()=>void; onCancel:()=>void }) {
  const [counted, setCounted] = useState('')
  const expected = shift.opening_cash + shift.total_cash
  const diff = (parseFloat(counted)||0) - expected
  const hasCounted = counted !== ''

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, fontFamily:'Inter,sans-serif' }}>
      <div style={{ background:'white', borderRadius:20, padding:36, width:420, boxShadow:'0 24px 64px rgba(0,0,0,0.3)' }}>
        <h3 style={{ fontSize:18, fontWeight:800, color:'#111827', marginBottom:6 }}>Mbyllje e Shiftit</h3>
        <p style={{ fontSize:13, color:'#6B7280', marginBottom:20 }}>Numëro kasën fizikisht para se të mbyllësh shiftin</p>

        {/* Raport */}
        <div style={{ background:'#F4F2FF', borderRadius:12, padding:16, marginBottom:16 }}>
          {[
            ['Cash fillestar (hapje)', `€${shift.opening_cash.toFixed(2)}`],
            ['Shitje me Cash', `€${shift.total_cash.toFixed(2)}`],
            ['Shitje me Kartë', `€${shift.total_card.toFixed(2)}`],
            ['Total Shitje', `€${(shift.total_cash+shift.total_card).toFixed(2)}`],
          ].map(([l,v],i)=>(
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:i<3?'1px solid #E2DCFF':'none', fontSize:13 }}>
              <span style={{ color:'#6B7280' }}>{l}</span>
              <span style={{ fontWeight:700, color:'#111827' }}>{v}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0 0', fontSize:14 }}>
            <span style={{ fontWeight:700, color:'#111827' }}>Cash i pritshëm në kasë</span>
            <span style={{ fontWeight:900, color:'#5B21B6' }}>€{expected.toFixed(2)}</span>
          </div>
        </div>

        {/* Input */}
        <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:8 }}>
          Sa cash ke numëruar fizikisht?
        </label>
        <input type="number" value={counted} onChange={e=>setCounted(e.target.value)}
          placeholder={`€${expected.toFixed(2)} (i pritshëm)`}
          autoFocus
          style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1.5px solid #E2DCFF', fontSize:16, fontWeight:700, color:'#111827', outline:'none', boxSizing:'border-box' as const, marginBottom:12 }}/>

        {/* Diferenca */}
        {hasCounted && (
          <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:16,
            background: diff===0?'#F0FDF4':diff>0?'#FEF3C7':'#FEF2F2',
            border: `1px solid ${diff===0?'#BBF7D0':diff>0?'#FDE68A':'#FECACA'}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:20 }}>{diff===0?'✓':diff>0?'↑':'↓'}</span>
              <div>
                <p style={{ fontSize:14, fontWeight:800, color:diff===0?'#059669':diff>0?'#D97706':'#DC2626' }}>
                  {diff===0
                    ? 'Kasa përputhet plotësisht!'
                    : diff>0
                    ? `Tepricë: €${diff.toFixed(2)}`
                    : `Mungesë: €${Math.abs(diff).toFixed(2)}`
                  }
                </p>
                {diff!==0 && <p style={{ fontSize:11, color:'#6B7280', marginTop:2 }}>
                  {diff>0?'Ka më shumë cash se sa pritej':'Ka më pak cash se sa pritej'}
                </p>}
              </div>
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel}
            style={{ flex:1, padding:12, borderRadius:10, border:'1.5px solid #E2DCFF', background:'white', fontSize:13, fontWeight:600, color:'#374151', cursor:'pointer' }}>
            Vazhdo Punën
          </button>
          <button onClick={onClose}
            style={{ flex:2, padding:12, borderRadius:10, background:'#DC2626', color:'white', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            Perfundo Shiftin
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Borxhi i Klientit ──────────────────────────────────────────────────
function DebtModal({ clients, onSelect, onClose }: { clients:DebtClient[]; onSelect:(c:DebtClient)=>void; onClose:()=>void }) {
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const filtered = clients.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, fontFamily:'Inter,sans-serif' }}>
      <div style={{ background:'white', borderRadius:20, padding:28, width:400, maxHeight:'80vh', display:'flex', flexDirection:'column' as const, boxShadow:'0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ fontSize:16, fontWeight:800, color:'#111827' }}>Shitje me Borxh</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#6B7280' }}><X size={18}/></button>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Kërko klient..."
          style={{ padding:'10px 14px', borderRadius:10, border:'1.5px solid #E2DCFF', fontSize:13, marginBottom:12, outline:'none', background:'#FFFFFF', color:'#111827', width:'100%', boxSizing:'border-box' as const }}/>
        <div style={{ flex:1, overflowY:'auto' as const }}>
          {filtered.map(c=>(
            <button key={c.id} onClick={()=>onSelect(c)}
              style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1.5px solid #E2DCFF', background:'#FAFAFA', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, cursor:'pointer' }}>
              <div style={{ textAlign:'left' as const }}>
                <p style={{ fontSize:14, fontWeight:700, color:'#111827' }}>{c.name}</p>
                {c.phone && <p style={{ fontSize:12, color:'#6B7280' }}>{c.phone}</p>}
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:c.balance>0?'#DC2626':'#059669' }}>
                {c.balance>0?`Borxh: €${c.balance.toFixed(2)}`:'Pa borxh'}
              </span>
            </button>
          ))}
          {filtered.length===0 && (
            <div style={{ textAlign:'center' as const, padding:24 }}>
              <p style={{ fontSize:13, color:'#6B7280', marginBottom:12 }}>Klient i ri</p>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Emri i klientit"
                style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid #E2DCFF', fontSize:13, marginBottom:10, outline:'none', boxSizing:'border-box' as const, background:'#FFFFFF', color:'#111827' }}/>
              <button onClick={()=>newName&&onSelect({id:'new',name:newName,balance:0})}
                style={{ width:'100%', padding:10, borderRadius:10, background:'#7C3AED', color:'#FFFFFF', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Shto Klient
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────
export default function MarketPOS({ userId, company, devices, initialProducts, isMockMode, cashiers=[], debtClients=[], ownerName='Pronari', ownerEmail='' }: Props) {
  const supabase = createClient()

  // Auth state
  const [currentCashier, setCurrentCashier] = useState<Cashier|null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [shiftOpen, setShiftOpen] = useState(false)
  const [showOpenShift, setShowOpenShift] = useState(false)
  const [showCloseShift, setShowCloseShift] = useState(false)
  const [shift, setShift] = useState({ opening_cash:0, total_cash:0, total_card:0 })

  // POS state
  const [products] = useState(initialProducts)
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [payMethod, setPayMethod] = useState<'cash'|'card'|'split'|'debt'>('cash')
  const [splitCash, setSplitCash] = useState('')
  const [saleDiscount, setSaleDiscount] = useState<Discount | null>(null)
  const [showSaleDiscount, setShowSaleDiscount] = useState(false)
  const [discKind, setDiscKind] = useState<'percent'|'amount'>('percent')
  const [discInput, setDiscInput] = useState('')
  const [online, setOnline] = useState(true)
  const [pending, setPending] = useState(0)
  const [paying, setPaying] = useState(false)
  const [receipt, setReceipt] = useState<any>(null)
  const [savedCart, setSavedCart] = useState<any[]>([])
  const [change, setChange] = useState('')

  // Modals
  const [showDebt, setShowDebt] = useState(false)
  const [debtClient, setDebtClient] = useState<DebtClient|null>(null)
  const [showDiscount, setShowDiscount] = useState<string|null>(null)
  const [kgModal, setKgModal] = useState<Product|null>(null)
  const [kgInput, setKgInput] = useState('')

  // Refs
  const searchRef = useRef<HTMLInputElement>(null)
  const barcodeRef = useRef('')
  const barcodeTimer = useRef<any>(null)

  const dev = devices[0]

  // Fshih sidebar/header kur kasieri është aktiv
  useEffect(() => {
    if (currentCashier) {
      document.body.classList.add('pos-cashier-mode')
    } else {
      document.body.classList.remove('pos-cashier-mode')
      // Dil nga fullscreen kur logout
      if (document.fullscreenElement) document.exitFullscreen().catch(()=>{})
    }
    return () => document.body.classList.remove('pos-cashier-mode')
  }, [currentCashier])

  // Barcode scanner
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && barcodeRef.current.length > 2) {
        const code = barcodeRef.current
        const prod = products.find(p=>p.barcode===code)
        if (prod) addItem(prod)
        else toast.error(`Barkod i panjohur: ${code}`)
        barcodeRef.current = ''
        return
      }
      if (e.key.length === 1) {
        barcodeRef.current += e.key
        clearTimeout(barcodeTimer.current)
        barcodeTimer.current = setTimeout(()=>{ barcodeRef.current='' }, 100)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [products])

  // Alert skadenca
  const expiryAlerts = useMemo(() => {
    const soon = new Date(); soon.setDate(soon.getDate()+7)
    return products.filter(p => p.expiry_date && new Date(p.expiry_date) <= soon && p.stock && p.stock > 0)
  }, [products])

  // Kategorite
  const categories = useMemo(() => ['all', ...Array.from(new Set(products.map(p=>p.category).filter(Boolean))) as string[]], [products])

  // Filtered
  const filtered = useMemo(() => {
    return products.filter(p =>
      p.is_active &&
      (category==='all'||p.category===category) &&
      (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search))
    )
  }, [products, category, search])

  const totals = useMemo(() => calcTotals(cart, saleDiscount), [cart, saleDiscount])

  // ── Offline: kit-i, gjendja e rrjetit, sinkronizimi automatik ──
  const refreshPending = useCallback(async () => {
    try { setPending((await pendingCoupons()).length) } catch { /* IndexedDB i padisponueshëm */ }
  }, [])
  const goOnlineTasks = useCallback(async () => {
    try { await refreshKit() } catch { /* provohet më vonë */ }
    const r = await syncPending()
    await refreshPending()
    if (r.sent > 0) toast.success(`${r.sent} kupon${r.sent === 1 ? '' : 'ë'} offline u dërguan te ATK`)
    if (r.failed > 0) toast.error(`${r.failed} kupon${r.failed === 1 ? '' : 'ë'} offline nuk u pranuan — shiko Historinë`)
  }, [refreshPending])
  useEffect(() => {
    const on = () => { setOnline(true); goOnlineTasks() }
    const off = () => setOnline(false)
    setOnline(navigator.onLine)
    if (navigator.onLine) goOnlineTasks(); else refreshPending()
    window.addEventListener('online', on); window.addEventListener('offline', off)
    const t = setInterval(() => { if (navigator.onLine) goOnlineTasks() }, 60_000)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(t) }
  }, [goOnlineTasks, refreshPending])

  function addItem(p: Product, qty?: number) {
    // Produktet me kg — hap modal
    if ((p.unit==='kg'||p.unit==='g'||p.unit==='l') && qty===undefined) {
      setKgModal(p); setKgInput(''); return
    }
    const quantity = qty || 1
    const autoDiscount = p.discount || 0
    setCart(prev => {
      const ex = prev.find(i=>i.productId===p.id)
      if (ex) return prev.map(i=>i.productId===p.id?{...i,quantity:i.quantity+quantity}:i)
      return [...prev, { productId:p.id, name:p.name, price:p.price, unit:p.unit, quantity, taxRate:p.tax_rate, discount:autoDiscount }]
    })
  }
  
  function addKgItem() {
    if (!kgModal || !kgInput) return
    const qty = parseFloat(kgInput)
    if (isNaN(qty) || qty <= 0) return
    addItem(kgModal, qty)
    setKgModal(null); setKgInput('')
  }

  function removeItem(id: string) { setCart(prev=>prev.filter(i=>i.productId!==id)) }
  function updateQty(id: string, d: number) {
    setCart(prev => prev.map(i=>i.productId===id?{...i,quantity:Math.max(0,i.quantity+d)}:i).filter(i=>i.quantity>0))
  }
  function setDiscount(id: string, disc: number) {
    setCart(prev=>prev.map(i=>i.productId===id?{...i,discount:0,disc:disc>0?{kind:'percent',value:disc}:null}:i))
    setShowDiscount(null)
  }
  function applyCustomDiscount(target: string | 'sale') {
    const v = parseFloat(discInput.replace(',', '.'))
    if (!Number.isFinite(v) || v < 0) { toast.error('Vlerë e pavlefshme'); return }
    if (discKind === 'percent' && v > 100) { toast.error('Zbritja në % duhet të jetë 0–100'); return }
    const d: Discount | null = v === 0 ? null : discKind === 'percent' ? { kind: 'percent', value: v } : { kind: 'amount', value: Math.round(v * 100) }
    if (target === 'sale') { setSaleDiscount(d); setShowSaleDiscount(false) }
    else { setCart(prev => prev.map(i => i.productId === target ? { ...i, discount: 0, disc: d } : i)); setShowDiscount(null) }
    setDiscInput('')
  }

  async function checkout() {
    if (cart.length===0) return
    if (totals.error) { toast.error(totals.error); return }
    const totalCents = Math.round(totals.total * 100)
    setPaying(true)
    try {
      const items = cart.map(i=>({
        productId: i.productId, name: i.name, unit: i.unit,
        quantity: i.quantity, price: i.price, taxRate: i.taxRate,
        itemDiscount: itemDiscount(i),
      }))
      // Pagesa: cash (me kusur), kartelë, e kombinuar cash + kartelë
      let payments: { type: 'cash'|'card'; amount: number }[] | undefined
      if (payMethod === 'split') {
        const cashPart = Math.round((parseFloat(splitCash.replace(',', '.')) || 0) * 100)
        if (cashPart <= 0 || cashPart >= totalCents) { toast.error('Shëno sa paguhet cash (më pak se totali) — pjesa tjetër shkon me kartelë'); setPaying(false); return }
        payments = [{ type: 'cash', amount: cashPart }, { type: 'card', amount: totalCents - cashPart }]
      } else if (payMethod === 'cash') {
        const tendered = Math.round((parseFloat(change.replace(',', '.')) || 0) * 100)
        payments = [{ type: 'cash', amount: tendered > totalCents ? tendered : totalCents }]
      } else if (payMethod === 'card') {
        payments = [{ type: 'card', amount: totalCents }]
      }
      const sale = {
        companyId: company.id, userId, isMockMode,
        paymentMethod: payMethod === 'split' ? 'cash' : payMethod,
        payments, saleDiscount,
        debtClientId: debtClient?.id, debtClientName: debtClient?.name,
        operatorName: currentCashier?.name, items,
      }

      const finish = (data: any, offline: boolean) => {
        setSavedCart([...cart])
        setReceipt({ ...data, offline })
        const cashAmt = (payments ?? []).filter(p => p.type === 'cash').reduce((a, p) => a + p.amount, 0) / 100 - (data.change ?? 0) / 100
        const cardAmt = (payments ?? []).filter(p => p.type === 'card').reduce((a, p) => a + p.amount, 0) / 100
        setShift(s => ({ ...s, total_cash: s.total_cash + Math.max(0, cashAmt), total_card: s.total_card + cardAmt }))
        setCart([]); setDebtClient(null); setSaleDiscount(null); setChange(''); setSplitCash('')
      }

      const goOffline = async () => {
        if (payMethod === 'debt') throw new Error('Shitja me borxh kërkon internet')
        const r: OfflineSaleResult = await createOfflineSale(sale, currentCashier?.name || 'Operator')
        await refreshPending()
        finish({ couponId: r.couponId, dailyCouponNo: r.dailyNo, qrCodeData: r.qrCode, qrCode: r.qrCode, change: r.calc.change, offlineReceipt: r.receipt }, true)
        toast.warning(`Pa internet — kuponi #${r.couponId} u lëshua OFFLINE dhe do të dërgohet automatikisht`)
      }

      if (!navigator.onLine) { await goOffline(); return }

      const nums = await numbersForOnlineSale().catch(() => null)
      let res: Response
      try {
        res = await fetch('/api/pos/fiscalize', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...sale, ...(nums ?? {}) }), signal: AbortSignal.timeout(12_000),
        })
      } catch (err) {
        if (isNetworkError(err)) { setOnline(false); await goOffline(); return }
        throw err
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||'Gabim')
      await acknowledgeOnlineSale(data.dailyCouponNo)
      finish(data, false)
      toast.success(payMethod==='debt'?`Borxh regjistruar — ${debtClient?.name}`:data.status==='offline'?'ATK s\'u arrit — kuponi u ruajt dhe dërgohet automatikisht':'Shitja u fiskalizua!')
    } catch(e:any) {
      toast.error(e.message)
    } finally {
      setPaying(false)
    }
  }

  // Owner login me password Supabase
  async function handleOwnerLogin(password: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: ownerEmail, password })
      if (error) return false
      // Pronari shkon te dashboard — jo te POS
      window.location.href = '/dashboard'
      return true
    } catch { return false }
  }

  // Lock screen — gjithmonë kur nuk ka kasier aktiv
  if (!currentCashier) {
    return <LockScreen
      cashiers={cashiers}
      ownerName={ownerName}
      onLoginCashier={c=>{
        setCurrentCashier(c)
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(()=>{})
        }
        setIsFullscreen(true)
        setShowOpenShift(true)
      }}
      onLoginOwner={handleOwnerLogin}
    />
  }

  // Hapje kase — vetëm për kasier, pronari shkon direkt
  if (showOpenShift && currentCashier?.role === 'cashier') return (
    <OpenShiftModal onOpen={cash=>{ setShift(s=>({...s,opening_cash:cash})); setShiftOpen(true); setShowOpenShift(false) }}/>
  )

  return (
    <div style={{ 
      position: currentCashier.role === 'cashier' ? 'fixed' : 'relative',
      inset: currentCashier.role === 'cashier' ? 0 : 'auto',
      zIndex: currentCashier.role === 'cashier' ? 100 : 'auto',
      height: '100%',
      display:'flex', flexDirection:'column' as const, 
      background:'#F4F2FF', fontFamily:'Inter,sans-serif', overflow:'hidden' 
    }}>

      {/* Alert skadenca */}
      {expiryAlerts.length>0 && (
        <div style={{ background:'#FEF3C7', borderBottom:'1px solid #FDE68A', padding:'8px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <AlertTriangle size={14} color={C.amber}/>
          <span style={{ fontSize:12, fontWeight:600, color:'#92400E' }}>
            {expiryAlerts.length} produkte skadojnë brenda 7 ditësh: {expiryAlerts.slice(0,3).map(p=>p.name).join(', ')}
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{ height:52, background:'#FFFFFF', borderBottom:'1.5px solid '+C.border, display:'flex', alignItems:'center', padding:'0 16px', gap:12, flexShrink:0 }}>
        <span style={{ fontSize:15, fontWeight:800, color:'#111827', letterSpacing:'-0.02em' }}>{company.name}</span>
        <div style={{ flex:1 }}/>
        <span style={{ fontSize:12, color:'#6B7280', fontWeight:600 }}>{currentCashier.name}</span>
        {currentCashier.role==='owner' && (
          <>
            <button onClick={()=>setShowCloseShift(true)}
              style={{ height:32, padding:'0 12px', borderRadius:8, border:'1px solid #E2DCFF', background:'white', fontSize:12, fontWeight:600, color:'#374151', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <BarChart2 size={13}/> Mbyll Kasën
            </button>
          </>
        )}
        <button onClick={()=>{
            if(currentCashier?.role==='cashier') {
              setShowCloseShift(true)
            } else {
              setCurrentCashier(null)
            }
          }}
          title={currentCashier?.role==='cashier'?'Mbyll Shiftin':'Kyçu'}
          style={{ height:32, width:32, borderRadius:8, border:'1px solid #E2DCFF', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6B7280' }}>
          <LogOut size={14}/>
        </button>
      </div>

      {/* Njoftimi OFFLINE (Neni 26.12) */}
      {(!online || pending > 0) && (
        <div role="status" aria-live="polite" style={{ padding:'8px 16px', display:'flex', alignItems:'center', gap:10, fontSize:13, fontWeight:700,
          background: online ? '#EEF2FF' : '#FEF3C7', color: online ? '#3730A3' : '#92400E', borderBottom: `1px solid ${online ? '#C7D2FE' : '#FDE68A'}` }}>
          <AlertTriangle size={15}/>
          {online
            ? <>Po dërgohen {pending} kupon{pending === 1 ? '' : 'ë'} offline te ATK…</>
            : <>OFFLINE — pa internet. Arka vazhdon punën: kuponët nënshkruhen këtu, printohen me „OFFLINE” dhe dërgohen automatikisht kur kthehet interneti.{pending > 0 ? ` (${pending} në pritje)` : ''}</>}
        </div>
      )}

      {/* Body */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Products */}
        <div style={{ flex:1, display:'flex', flexDirection:'column' as const, overflow:'hidden' }}>
          {/* Search + Categories */}
          <div style={{ padding:'12px 14px', background:'#FFFFFF', borderBottom:'1px solid '+C.border, flexShrink:0 }}>
            <div style={{ position:'relative', marginBottom:10 }}>
              <Scan size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#6B7280', pointerEvents:'none' as const }}/>
              <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Kërko ose skano barkod..."
                style={{ width:'100%', padding:'10px 12px 10px 34px', borderRadius:10, border:'1.5px solid #E2DCFF', fontSize:13, color:'#111827', outline:'none', background:'#F4F2FF', boxSizing:'border-box' as const }}/>
            </div>
            <div style={{ display:'flex', gap:6, overflowX:'auto' as const, paddingBottom:2 }}>
              {categories.map(cat=>(
                <button key={cat} onClick={()=>setCategory(cat)}
                  style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:700, whiteSpace:'nowrap' as const, flexShrink:0,
                    background:category===cat?C.purpleL:'transparent', color:category===cat?'white':C.text2,
                    border:'1.5px solid '+(category===cat?C.purpleL:C.border) }}>
                  {cat==='all'?'Gjithçka':cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div style={{ flex:1, overflowY:'auto' as const, padding:14, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, alignContent:'start' as const }}>
            {filtered.map(p=>{
              const inCart = cart.find(i=>i.productId===p.id)
              const col = (p.emoji&&p.emoji.startsWith('#'))?p.emoji:'#7C3AED'
              const expiring = p.expiry_date && new Date(p.expiry_date) <= new Date(Date.now()+7*86400000)
              return (
                <div key={p.id} onClick={()=>addItem(p)}
                  style={{ borderRadius:12, border:'2px solid '+(inCart?C.purpleL:'#E5E7EB'), background:inCart?'#F5F3FF':'white',
                    cursor:'pointer', overflow:'hidden', position:'relative', minHeight:160,
                    boxShadow:inCart?'0 4px 12px rgba(124,58,237,0.15)':'0 1px 3px rgba(0,0,0,0.06)', transition:'all 0.15s' }}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:90, objectFit:'cover' as const, display:'block' }}/>
                    : <div style={{ width:'100%', height:90, background:col+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Package size={30} color={col} opacity={0.6}/>
                      </div>
                  }
                  {expiring && <div style={{ position:'absolute', top:6, left:6, background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:6, padding:'2px 6px', fontSize:10, fontWeight:700, color:'#92400E' }}>Skadon</div>}
              {p.discount && p.discount>0 && <div style={{ position:'absolute', top:expiring?26:6, left:6, background:'#7C3AED', borderRadius:6, padding:'2px 6px', fontSize:10, fontWeight:700, color:'white' }}>-{p.discount}%</div>}
                  {p.stock!==null && p.stock<=5 && <div style={{ position:'absolute', top:6, right:6, background:p.stock===0?'#FEF2F2':'#FEF3C7', border:`1px solid ${p.stock===0?'#FECACA':'#FDE68A'}`, borderRadius:6, padding:'2px 6px', fontSize:10, fontWeight:700, color:p.stock===0?C.red:C.amber }}>{p.stock===0?'0':'⚠'}</div>}
                  <div style={{ padding:'8px 10px 10px' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#111827', lineHeight:'1.3', marginBottom:4, overflow:'hidden', whiteSpace:'nowrap' as const, textOverflow:'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize:15, fontWeight:900, color:inCart?C.purple:C.purpleL }}>{fmtEUR(p.price)}</div>
                    {p.buy_price && <div style={{ fontSize:10, color:'#6B7280' }}>Marzhi: €{((p.price-p.buy_price)/10000).toFixed(2)}</div>}
                  </div>
                  {inCart && <div style={{ position:'absolute', bottom:8, right:8, width:22, height:22, borderRadius:'50%', background:C.purpleL, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'white' }}>{inCart.quantity}</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Cart */}
        <div style={{ width:320, background:'#FFFFFF', borderLeft:'1.5px solid '+C.border, display:'flex', flexDirection:'column' as const, flexShrink:0 }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', gap:8 }}>
            <ShoppingCart size={16} color={C.purpleL}/>
            <span style={{ fontSize:14, fontWeight:700, color:'#111827' }}>Shporta</span>
            {cart.length>0 && <span style={{ marginLeft:'auto', fontSize:12, color:'#6B7280' }}>{cart.reduce((a,i)=>a+i.quantity,0)} cop.</span>}
          </div>

          <div style={{ flex:1, overflowY:'auto' as const, padding:'8px 12px' }}>
            {cart.length===0 ? (
              <div style={{ textAlign:'center' as const, padding:40, color:'#6B7280', fontSize:13 }}>Skano ose kliko produkt</div>
            ) : cart.map(item=>(
              <div key={item.productId} style={{ padding:'10px 12px', borderRadius:10, border:'1px solid #E2DCFF', marginBottom:8, background:'white' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'#111827', flex:1, marginRight:8 }}>{item.name}</span>
                  <button onClick={()=>removeItem(item.productId)} style={{ background:'none', border:'none', cursor:'pointer', color:'#6B7280', padding:2 }}><X size={14}/></button>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={()=>updateQty(item.productId,-1)} style={{ width:24, height:24, borderRadius:6, border:'1px solid #E2DCFF', background:'#F3F4F6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#111827' }}><Minus size={12}/></button>
                  <span style={{ fontSize:13, fontWeight:700, color:'#111827', minWidth:20, textAlign:'center' as const }}>{item.quantity}</span>
                  <button onClick={()=>updateQty(item.productId,1)} style={{ width:24, height:24, borderRadius:6, border:'1px solid #E2DCFF', background:'#F3F4F6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#111827' }}><Plus size={12}/></button>
                  <span style={{ flex:1 }}/>
                  <button onClick={()=>{ setShowDiscount(item.productId); setDiscKind('percent'); setDiscInput('') }} style={{ fontSize:11, color:C.purpleL, fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>
                    {(() => { const d = itemDiscount(item); return d ? (d.kind === 'percent' ? `-${d.value}%` : `-€${(d.value/100).toFixed(2)}`) : 'Zbritje' })()}
                  </button>
                  <span style={{ fontSize:14, fontWeight:800, color:C.purpleL }}>€{(((totals.calc?.lines.find(l => l.productId === item.productId || l.name === item.name)?.grossTotal ?? 0) - (totals.calc?.lines.find(l => l.productId === item.productId || l.name === item.name)?.itemDiscount ?? 0)) / 100).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totali + Pagesa */}
          <div style={{ padding:16, borderTop:'1.5px solid '+C.border }}>
            {totals.calc && totals.calc.saleDiscount && (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:13, color:'#6B7280' }}>Nëntotali</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>€{(totals.calc.subtotal/100).toFixed(2)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:13, color:C.purpleL }}>Zbritje {totals.calc.saleDiscount.kind === 'percent' ? `${totals.calc.saleDiscount.value}%` : ''}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:C.purpleL }}>-€{(totals.calc.saleDiscount.amount/100).toFixed(2)}</span>
                </div>
              </>
            )}
            <button onClick={()=>{ setShowSaleDiscount(true); setDiscKind('percent'); setDiscInput('') }} disabled={cart.length===0}
              style={{ width:'100%', marginBottom:8, padding:'6px 10px', borderRadius:8, border:'1px dashed #C4B5FD', background:'transparent', fontSize:12, fontWeight:700, color:C.purpleL, cursor: cart.length===0 ? 'not-allowed' : 'pointer' }}>
              {saleDiscount ? 'Ndrysho zbritjen në total' : '+ Zbritje në total'}
            </button>
            {totals.error && <div style={{ padding:'6px 10px', borderRadius:8, background:'#FEF2F2', color:C.red, fontSize:12, fontWeight:600, marginBottom:8 }}>{totals.error}</div>}
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:13, color:'#6B7280' }}>TVSH</span>
              <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>€{totals.tax.toFixed(2)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <span style={{ fontSize:16, fontWeight:800, color:'#111827' }}>TOTAL</span>
              <span style={{ fontSize:22, fontWeight:900, color:C.purpleL }}>€{totals.total.toFixed(2)}</span>
            </div>

            {/* Metoda pagese */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6, marginBottom:12 }}>
              {([['cash','Cash',Banknote],[' card','Kartë',CreditCard],['split','Cash+Kartë',DollarSign],['debt','Borxh',Users]] as any[]).map(([m,l,Icon])=>(
                <button key={m} onClick={()=>{ setPayMethod(m.trim()); if(m.trim()==='debt')setShowDebt(true) }}
                  style={{ padding:'8px 4px', borderRadius:8, border:'2px solid '+(payMethod===m.trim()?'#7C3AED':'#E2DCFF'),
                    background:payMethod===m.trim()?'#EEF2FF':'#F9FAFB', cursor:'pointer', fontSize:11, fontWeight:700,
                    color:payMethod===m.trim()?'#5B21B6':'#374151', display:'flex', flexDirection:'column' as const, alignItems:'center', gap:4 }}>
                  <Icon size={14}/>{l}
                </button>
              ))}
            </div>

            {payMethod==='debt' && debtClient && (
              <div style={{ padding:'8px 12px', borderRadius:8, background:'#FEF3C7', border:'1px solid #FDE68A', marginBottom:10 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'#92400E' }}>📋 {debtClient.name}</span>
              </div>
            )}

            {payMethod==='split' && (
              <div style={{ marginBottom:8 }}>
                <input type="number" inputMode="decimal" value={splitCash} onChange={e=>setSplitCash(e.target.value)} placeholder="Sa paguhet CASH (€)…"
                  aria-label="Pjesa cash"
                  style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1.5px solid #E2DCFF', fontSize:13, color:'#111827', outline:'none', marginBottom:6, boxSizing:'border-box' as const }}/>
                {parseFloat(splitCash) > 0 && parseFloat(splitCash) < totals.total && (
                  <div style={{ padding:'6px 12px', borderRadius:8, background:'#EEF2FF', fontSize:12, fontWeight:700, color:'#3730A3' }}>
                    Cash €{parseFloat(splitCash).toFixed(2)} + Kartë €{(totals.total - parseFloat(splitCash)).toFixed(2)}
                  </div>
                )}
              </div>
            )}

            {payMethod==='cash' && (
              <input type="number" value={change} onChange={e=>setChange(e.target.value)} placeholder="Cash i dhënë..."
                style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1.5px solid #E2DCFF', fontSize:13, color:'#111827', outline:'none', marginBottom:8, boxSizing:'border-box' as const }}/>
            )}
            {payMethod==='cash' && change && parseFloat(change)>totals.total && (
              <div style={{ padding:'6px 12px', borderRadius:8, background:'#F0FDF4', marginBottom:8, fontSize:13, fontWeight:700, color:C.green }}>
                Kusur: €{(parseFloat(change)-totals.total).toFixed(2)}
              </div>
            )}

            <button onClick={checkout} disabled={paying||cart.length===0||(payMethod==='debt'&&!debtClient)}
              style={{ width:'100%', padding:'13px', borderRadius:12, background:paying||cart.length===0?'#D1D5DB':C.purpleL, color:'white', border:'none', fontSize:14, fontWeight:800, cursor:paying||cart.length===0?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {paying ? <RefreshCw size={16} style={{ animation:'spin 0.8s linear infinite' }}/> : <><Zap size={16}/> Fiskalizo</>}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showDebt && <DebtModal clients={debtClients} onSelect={c=>{ setDebtClient(c); setShowDebt(false) }} onClose={()=>setShowDebt(false)}/>}
      {showCloseShift && <CloseShiftModal shift={shift} onClose={()=>{ setShowCloseShift(false); setCart([]); setCurrentCashier(null) }} onCancel={()=>setShowCloseShift(false)}/>}

      {/* KG Modal */}
      {kgModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, fontFamily:'Inter,sans-serif' }}>
          <div style={{ background:'white', borderRadius:20, padding:32, width:320, textAlign:'center' as const, boxShadow:'0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#111827', marginBottom:6 }}>{kgModal.name}</div>
            <div style={{ fontSize:13, color:'#6B7280', marginBottom:20 }}>€{(kgModal.price/10000).toFixed(2)} / {kgModal.unit}</div>
            <input
              type="number" step="0.01" min="0.01"
              value={kgInput} onChange={e=>setKgInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&addKgItem()}
              placeholder={`Sa ${kgModal.unit}?`} autoFocus
              style={{ width:'100%', padding:'14px', borderRadius:10, border:'1.5px solid #E2DCFF', fontSize:20, fontWeight:700, color:'#111827', outline:'none', textAlign:'center' as const, marginBottom:8, boxSizing:'border-box' as const }}/>
            {kgInput && !isNaN(parseFloat(kgInput)) && (
              <div style={{ fontSize:14, fontWeight:700, color:'#7C3AED', marginBottom:16 }}>
                Totali: €{((kgModal.price/10000) * parseFloat(kgInput)).toFixed(2)}
              </div>
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setKgModal(null)} style={{ flex:1, padding:12, borderRadius:10, border:'1.5px solid #E2DCFF', background:'white', fontSize:13, fontWeight:600, color:'#374151', cursor:'pointer' }}>Anulo</button>
              <button onClick={addKgItem} style={{ flex:2, padding:12, borderRadius:10, background:'#7C3AED', color:'white', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>Shto</button>
            </div>
          </div>
        </div>
      )}

      {/* Discount modal */}
      {showDiscount && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div style={{ background:'white', borderRadius:16, padding:24, width:280 }}>
            <h4 style={{ fontSize:15, fontWeight:700, color:'#111827', marginBottom:12 }}>Zbritje në artikull</h4>
            <DiscountEditor kind={discKind} setKind={setDiscKind} value={discInput} setValue={setDiscInput} onApply={()=>applyCustomDiscount(showDiscount)} />
            <p style={{ fontSize:11, color:'#6B7280', margin:'4px 0 8px' }}>Ose zgjidh shpejt:</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
              {[5,10,15,20,25,30,50].map(d=>(
                <button key={d} onClick={()=>setDiscount(showDiscount,d)}
                  style={{ padding:'8px 4px', borderRadius:8, border:'1.5px solid #E2DCFF', background:'white', fontSize:12, fontWeight:700, color:'#111827', cursor:'pointer' }}>
                  {d}%
                </button>
              ))}
            </div>
            <button onClick={()=>setShowDiscount(null)} style={{ width:'100%', padding:10, borderRadius:8, border:'none', background:'#F4F2FF', fontSize:13, color:'#374151', cursor:'pointer', fontWeight:600 }}>Anulo</button>
          </div>
        </div>
      )}

      {/* Zbritje në total */}
      {showSaleDiscount && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div role="dialog" aria-label="Zbritje në total" style={{ background:'white', borderRadius:16, padding:24, width:300 }}>
            <h4 style={{ fontSize:15, fontWeight:700, color:'#111827', marginBottom:12 }}>Zbritje në total</h4>
            <DiscountEditor kind={discKind} setKind={setDiscKind} value={discInput} setValue={setDiscInput} onApply={()=>applyCustomDiscount('sale')} />
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              {saleDiscount && <button onClick={()=>{ setSaleDiscount(null); setShowSaleDiscount(false) }} style={{ flex:1, padding:10, borderRadius:8, border:'1px solid #FECACA', background:'#FEF2F2', fontSize:13, color:C.red, cursor:'pointer', fontWeight:600 }}>Hiq zbritjen</button>}
              <button onClick={()=>setShowSaleDiscount(false)} style={{ flex:1, padding:10, borderRadius:8, border:'none', background:'#F4F2FF', fontSize:13, color:'#374151', cursor:'pointer', fontWeight:600 }}>Anulo</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt */}
      {receipt && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div style={{ background:'white', borderRadius:20, padding:32, width:380, textAlign:'center' as const }}>
            <div style={{ width:56, height:56, borderRadius:14, background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <Check size={28} color={C.green}/>
            </div>
            <h3 style={{ fontSize:18, fontWeight:800, color:'#111827', marginBottom:4 }}>
              {receipt.offline || receipt.status === 'offline' ? 'Kuponi u lëshua OFFLINE' : 'Shitja u fiskalizua!'}
            </h3>
            <p style={{ fontSize:13, color:'#6B7280', marginBottom:4 }}>Kuponi #{receipt.couponId}{receipt.dailyCouponNo ? ` · ditor ${String(receipt.dailyCouponNo).padStart(4,'0')}` : ''}</p>
            {(receipt.offline || receipt.status === 'offline') && <p style={{ fontSize:12, color:'#92400E', fontWeight:700, marginBottom:12 }}>Do të dërgohet te ATK automatikisht</p>}
            {receipt.change > 0 && <p style={{ fontSize:15, color:C.green, fontWeight:800, marginBottom:12 }}>Kusuri: €{(receipt.change/100).toFixed(2)}</p>}
            {(receipt.qrCodeData || receipt.qrCode) && <div style={{ margin:'8px auto 20px', width:140, height:140 }}><QRCanvas data={receipt.qrCodeData || receipt.qrCode} size={140}/></div>}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>{
                if (receipt.offlineReceipt) { printOfflineReceipt(receipt.offlineReceipt, getPaperWidth()); return }
                const atk = buildATKReceipt(receipt, savedCart, company, {
                  paymentMethod: payMethod,
                  operatorName: currentCashier?.name
                })
                printReceipt(atk)
              }} style={{ flex:1, padding:12, borderRadius:10, border:'1.5px solid #E2DCFF', background:'white', fontSize:13, fontWeight:600, color:'#374151', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <Printer size={14}/> Printo
              </button>
              <button onClick={()=>setReceipt(null)} style={{ flex:2, padding:12, borderRadius:10, background:C.purpleL, color:'white', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Shitje e Re
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        ${currentCashier ? `
          [class*="sidebar"], nav[class*="sidebar"], aside, .sidebar,
          header, [class*="header"], nav:not(.pos-nav) {
            display: none !important;
          }
          main, [class*="main-content"], #main-content {
            padding: 0 !important;
            margin: 0 !important;
          }
        ` : ''}
      `}</style>
    </div>
  )
}

// ── Zbritja: % ose vlerë (€) ─────────────────────────────────────────────
function DiscountEditor({ kind, setKind, value, setValue, onApply }: {
  kind: 'percent'|'amount'; setKind: (k: 'percent'|'amount') => void
  value: string; setValue: (v: string) => void; onApply: () => void
}) {
  return (
    <div>
      <div role="radiogroup" aria-label="Lloji i zbritjes" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:8 }}>
        {([['percent','Në %'],['amount','Në vlerë (€)']] as const).map(([k,l]) => (
          <button key={k} type="button" role="radio" aria-checked={kind===k} onClick={()=>setKind(k)}
            style={{ padding:'7px 8px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer',
              border:`1.5px solid ${kind===k ? '#7C3AED' : '#E2DCFF'}`, background: kind===k ? '#EEF2FF' : 'white', color: kind===k ? '#5B21B6' : '#374151' }}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ display:'flex', gap:6 }}>
        <input autoFocus type="number" inputMode="decimal" min={0} step="any" value={value} onChange={e=>setValue(e.target.value)}
          onKeyDown={e=>{ if (e.key==='Enter') onApply() }}
          placeholder={kind==='percent' ? 'p.sh. 12.5' : 'p.sh. 1.50'} aria-label="Vlera e zbritjes"
          style={{ flex:1, padding:'9px 10px', borderRadius:8, border:'1.5px solid #E2DCFF', fontSize:14, color:'#111827', outline:'none', minWidth:0 }}/>
        <button type="button" onClick={onApply} style={{ padding:'9px 14px', borderRadius:8, border:'none', background:'#7C3AED', color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>Apliko</button>
      </div>
    </div>
  )
}
