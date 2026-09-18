'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Printer, CheckCircle, X } from 'lucide-react'
import { buildATKReceipt } from '@/hooks/usePrintReceipt'
import { printReceipt as doPrint } from '@/components/pos/receipt-printer'

interface Props {
  userId: string
  cashierName: string
  company: {
    id: string
    name: string
    nui: string
    location_city?: string
    address?: string
    phone?: string
    logo_url?: string
    isVatRegistered?: boolean
    businessType?: string
  }
  isMockMode: boolean
  deviceId?: string | null
}

const SUGGESTIONS: Record<string, string[]> = {
  health: ['Vizitë konsultative','Ekzaminim klinik','Trajtim mjekësor','Analizë','Imazherik','Kontroll periodik'],
  salon:  ['Prerje flokësh','Ngjyrosje','Keratin','Banjo','Rregullim vetullash','Blowout'],
  barber: ['Prerje flokësh','Rroje klasike','Rregullim mjekre','Prerje + Rroje','Ngjyrosje mjekre'],
  beauty: ['Manikyr','Pedikyr','Gels','Akryl','Trajtim fytyre','Extension'],
  spa:    ['Masazh relaksues','Masazh terapeutik','Trajtim fytyre','Peeling','Spa paketë'],
  gym:    ['Hyrje ditore','Abonament mujor','Abonament 3 mujor','Abonament vjetor','Personal trainer','Klasë grupi'],
  other:  [],
}

export default function ServicePOSClient({ cashierName, company, isMockMode, deviceId }: Props) {
  const bType       = company.businessType || 'other'
  const suggestions = SUGGESTIONS[bType] || []
  const taxRate     = bType === 'health' ? 'C' : 'E'
  const isArke      = bType === 'other'

  const [serviceName,     setServiceName]     = useState('')
  const [price,           setPrice]           = useState('')
  const [payMethod,       setPayMethod]       = useState<'cash'|'card'>('cash')
  const [paying,          setPaying]          = useState(false)
  const [receipt,         setReceipt]         = useState<any>(null)
  const [customProducts,  setCustomProducts]  = useState<{name:string;price:number}[]>([])

  useEffect(() => {
    if (!isArke) return
    fetch(`/api/pos/products?companyId=${company.id}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCustomProducts(d) })
      .catch(() => {})
  }, [company.id, isArke])

  const total  = parseFloat(price) || 0
  const canPay = serviceName.trim().length > 0 && total > 0

  // ── TVSH llogaritja
  const tvshRate   = taxRate === 'E' ? 0.18 : taxRate === 'D' ? 0.08 : 0
  const tvshAmount = tvshRate > 0 ? total * tvshRate / (1 + tvshRate) : 0
  const patvsh     = total - tvshAmount

  async function checkout() {
    if (!canPay) { toast.error('Plotëso shërbimin dhe çmimin'); return }
    setPaying(true)
    try {
      const res = await fetch('/api/pos/fiscalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            productId: 'service',
            name:      serviceName,
            price:     Math.round(total * 10000),
            quantity:  1,
            total:     Math.round(total * 100),
            taxRate,
            unit:      'cope',
          }],
          paymentMethod: payMethod,
          companyId:     company.id,
          posDeviceId:   deviceId || 'mock-device',
          operatorName:  cashierName,
          couponId:      Date.now(),
        }),
      })
      const data = await res.json()
      if (data.success || data.status === 'fiscalized' || data.status === 'offline') {
        const r = {
          serviceName,
          price:   total,
          payMethod,
          taxRate,
          nr:      data.receiptNumber || `KF-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
          nuikf:   data.nuikf || data.iic || null,
          sefId:   data.sefId || null,
          qr:      data.qrCodeData || null,
          status:  data.status || 'fiscalized',
          time:    new Date(),
        }
        setReceipt(r)
        setServiceName('')
        setPrice('')
        // Auto-print menjëherë pas fiskalizimit
        handlePrint(r)
        toast.success(data.status === 'offline' ? 'Kupon OFFLINE — do dërgohet te ATK' : 'Kuponi fiskal u gjenerua!')
      } else {
        toast.error(data.error || 'Gabim fiskalizimi')
      }
    } catch {
      toast.error('Gabim rrjeti')
    } finally {
      setPaying(false)
    }
  }

  function handlePrint(r?: any) {
    const rec = r || receipt
    if (!rec) return
    const atk = buildATKReceipt(
      {
        receiptNumber: rec.nr,
        qrCodeData:    rec.qr,
        nuikf:         rec.nuikf,
        sefId:         rec.sefId,
        status:        rec.status || 'fiscalized',
        total:         Math.round(rec.price * 100),
        tax:           Math.round(rec.price * tvshRate / (1 + tvshRate) * 100),
      },
      [{
        name:     rec.serviceName,
        price:    Math.round(rec.price * 10000),
        quantity: 1,
        unit:     'cope',
        taxRate:  rec.taxRate || 'E',
      }],
      {
        name:          company.name,
        nui:           company.nui,
        location_city: company.location_city || 'Kosovë',
        address:       company.address,
        phone:         company.phone,
        logo_url:      company.logo_url,
      },
      { paymentMethod: rec.payMethod, operatorName: cashierName }
    )
    doPrint(atk)
  }

  const P = '#7C3AED'
  const G = '#10B981'

  return (
    <>
      <style>{`
        .spos-wrap { height:calc(100dvh - 64px); display:flex; flex-direction:column; background:#F8F7FF; font-family:Inter,sans-serif; overflow-y:auto; -webkit-overflow-scrolling:touch; }
        .spos-inner { flex:1; width:100%; max-width:520px; margin:0 auto; padding:20px 16px 32px; display:flex; flex-direction:column; gap:14px; }
        .spos-card { background:#fff; border-radius:16px; padding:18px; border:1.5px solid #EEE9FF; }
        .spos-label { font-size:11px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px; display:block; }
        .spos-input { width:100%; padding:13px 14px; border-radius:12px; border:1.5px solid #EEE9FF; font-size:16px; color:#111827; background:#F8F7FF; outline:none; box-sizing:border-box; font-family:Inter,sans-serif; -webkit-appearance:none; }
        .spos-input:focus { border-color:#7C3AED; background:#fff; }
        .spos-price-input { font-size:28px; font-weight:900; color:#7C3AED; padding:12px 14px; }
        .spos-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
        .spos-chip { padding:5px 12px; border-radius:20px; border:1.5px solid #EEE9FF; background:#fff; color:#6B7280; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; }
        .spos-chip.active { background:#F3F0FF; color:#7C3AED; border-color:#7C3AED; }
        .spos-pay-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .spos-pay-btn { padding:16px; border-radius:14px; border:2px solid #EEE9FF; background:#fff; font-size:15px; font-weight:700; cursor:pointer; color:#6B7280; }
        .spos-pay-btn.active { background:#F3F0FF; border-color:#7C3AED; color:#7C3AED; }
        .spos-submit { width:100%; padding:18px; border-radius:16px; border:none; font-size:17px; font-weight:900; cursor:pointer; letter-spacing:-0.02em; transition:all 0.15s; }
        .spos-submit:active { transform:scale(0.98); }
        .spos-receipt { background:#F3F0FF; border-radius:16px; padding:18px; border:2px solid #7C3AED; position:relative; animation:fadeUp 0.25s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .atk-preview { background:#fff; border:1px dashed #D1D5DB; border-radius:10px; padding:14px 12px; margin-bottom:12px; font-family:'Courier New',monospace; }
        .atk-row { display:flex; justify-content:space-between; margin:2px 0; font-size:11px; }
        .atk-divider-dash { border-top:1px dashed #9CA3AF; margin:6px 0; }
        .atk-divider-solid { border-top:2px solid #111; margin:6px 0; }
      `}</style>

      <div className="spos-wrap">
        <div className="spos-inner">

          {/* Header */}
          <div style={{ paddingBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: 0 }}>Arka Fiskale</h1>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{company.name} · {cashierName}</p>
          </div>

          {/* Receipt preview pas fiskalizimit */}
          {receipt && (
            <div className="spos-receipt">
              <button onClick={() => setReceipt(null)}
                style={{ position:'absolute', top:12, right:12, background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
                <X size={16}/>
              </button>

              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <CheckCircle size={18} color={G}/>
                <span style={{ fontSize:13, fontWeight:700, color:G }}>
                  {receipt.status === 'offline' ? 'Kupon OFFLINE' : 'Kuponi Fiskal u gjenerua'}
                </span>
              </div>

              {/* ATK Preview */}
              <div className="atk-preview">
                <div style={{ textAlign:'center', fontWeight:900, fontSize:13, marginBottom:2 }}>
                  {company.name.toUpperCase()}
                </div>
                <div style={{ textAlign:'center', fontSize:10, color:'#6B7280', marginBottom:6 }}>
                  NF-NUI: {company.nui}
                  {company.location_city ? ` | ${company.location_city}` : ''}
                </div>
                <div className="atk-divider-dash"/>
                <div style={{ textAlign:'center', fontWeight:800, fontSize:12, letterSpacing:1, marginBottom:6 }}>
                  KUPON FISKAL
                </div>

                <div className="atk-row">
                  <span style={{ fontWeight:600 }}>{receipt.serviceName}</span>
                  <span style={{ fontWeight:700 }}>€{receipt.price.toFixed(2)}</span>
                </div>

                <div className="atk-divider-solid"/>

                <div className="atk-row" style={{ fontWeight:900, fontSize:13, marginBottom:4 }}>
                  <span>TOTALI PËR PAGESË</span>
                  <span>€{receipt.price.toFixed(2)}</span>
                </div>

                <div className="atk-row" style={{ color:'#6B7280', fontSize:10, marginBottom:1 }}>
                  <span>Mënyra e pagesës:</span>
                  <span>{receipt.payMethod === 'cash' ? 'PARA TË GATSHME' : 'KARTË BANKARE'}</span>
                </div>

                <div className="atk-divider-dash"/>

                {tvshRate > 0 && (
                  <>
                    <div className="atk-row" style={{ fontSize:10, color:'#6B7280' }}>
                      <span>TVSH {taxRate} {tvshRate === 0.18 ? '18%' : '8%'}:</span>
                      <span>€{(receipt.price * tvshRate / (1 + tvshRate)).toFixed(2)}</span>
                    </div>
                    <div className="atk-row" style={{ fontSize:10, color:'#6B7280', marginBottom:4 }}>
                      <span>Totali pa TVSH:</span>
                      <span>€{(receipt.price / (1 + tvshRate)).toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="atk-divider-dash"/>

                {receipt.nuikf && (
                  <div style={{ fontSize:9, color:'#6B7280', marginBottom:1 }}>
                    NUIKF: {receipt.nuikf}
                  </div>
                )}
                <div style={{ fontSize:10, marginBottom:1 }}>
                  Nr. Kuponit: {receipt.nr}
                </div>
                <div style={{ fontSize:10, color:'#6B7280', marginBottom:6 }}>
                  {receipt.time.toLocaleDateString('sq-AL')} {receipt.time.toLocaleTimeString('sq-AL')}
                </div>

                <div style={{ textAlign:'center', fontSize:11, fontWeight:700, letterSpacing:2, marginTop:6 }}>
                  ★ RKS MF ★
                </div>
                <div style={{ textAlign:'center', fontSize:10, fontStyle:'italic' }}>e-kuponi</div>
              </div>

              {/* Butonat */}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => handlePrint()}
                  style={{ flex:1, padding:'12px', borderRadius:10, background:P, color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <Printer size={14}/> Printo Sërish
                </button>
                <button onClick={() => setReceipt(null)}
                  style={{ flex:1, padding:'12px', borderRadius:10, background:'#fff', color:'#374151', border:'1.5px solid #E5E7EB', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                  Kupon i Ri
                </button>
              </div>
            </div>
          )}

          {/* Shërbimi */}
          <div className="spos-card">
            <label className="spos-label">Shërbimi</label>
            <input
              className="spos-input"
              value={serviceName}
              onChange={e => setServiceName(e.target.value)}
              placeholder="p.sh. Prerje flokësh..."
            />
            <div className="spos-chips">
              {isArke
                ? customProducts.map(p => (
                    <button key={p.name} className={`spos-chip${serviceName===p.name?' active':''}`}
                      onClick={() => { setServiceName(p.name); if (p.price) setPrice(String(p.price / 100)) }}>
                      {p.name}
                    </button>
                  ))
                : suggestions.map(s => (
                    <button key={s} className={`spos-chip${serviceName===s?' active':''}`}
                      onClick={() => setServiceName(s)}>{s}</button>
                  ))
              }
            </div>
          </div>

          {/* Çmimi */}
          <div className="spos-card">
            <label className="spos-label">Çmimi (€)</label>
            <input
              className="spos-input spos-price-input"
              type="number"
              inputMode="decimal"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.50"
            />
            <div className="spos-chips">
              {[5,10,15,20,25,30,50].map(p => (
                <button key={p} className={`spos-chip${parseFloat(price)===p?' active':''}`}
                  onClick={() => setPrice(String(p))}>€{p}</button>
              ))}
            </div>
          </div>

          {/* Mënyra pagese */}
          <div className="spos-card">
            <label className="spos-label">Mënyra e Pagesës</label>
            <div className="spos-pay-grid">
              <button className={`spos-pay-btn${payMethod==='cash'?' active':''}`}
                onClick={() => setPayMethod('cash')}>💵 Cash</button>
              <button className={`spos-pay-btn${payMethod==='card'?' active':''}`}
                onClick={() => setPayMethod('card')}>💳 Kartë</button>
            </div>
          </div>

          {/* Butoni kryesor */}
          <button
            className="spos-submit"
            onClick={checkout}
            disabled={paying || !canPay}
            style={{
              background: canPay ? P : '#D1D5DB',
              color:      canPay ? 'white' : '#9CA3AF',
              boxShadow:  canPay ? '0 6px 20px rgba(124,58,237,0.4)' : 'none',
              cursor:     canPay ? 'pointer' : 'not-allowed',
            }}>
            {paying
              ? 'Duke gjeneruar...'
              : canPay
                ? `Gjenero Kupon · €${total.toFixed(2)}`
                : 'Plotëso shërbimin dhe çmimin'}
          </button>

        </div>
      </div>
    </>
  )
}
