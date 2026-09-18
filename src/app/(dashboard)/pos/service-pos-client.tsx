'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Receipt, Printer, CheckCircle, X } from 'lucide-react'

interface Props {
  userId: string
  cashierName: string
  company: { id: string; name: string; nui: string; isVatRegistered?: boolean; businessType?: string }
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
  other:  [], // Shfaq vetëm produktet e veta
}

export default function ServicePOSClient({ cashierName, company, isMockMode, deviceId }: Props) {
  const bType      = company.businessType || 'other'
  const suggestions = SUGGESTIONS[bType] || []
  const taxRate    = bType === 'health' ? 'C' : 'E'
  const isArke     = bType === 'other'

  const [serviceName, setServiceName] = useState('')
  const [price, setPrice]             = useState('')
  const [customProducts, setCustomProducts] = useState<{name:string;price:number}[]>([])

  useEffect(() => {
    if (!isArke) return
    fetch(`/api/pos/products?companyId=${company.id}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCustomProducts(d) })
      .catch(() => {})
  }, [company.id, isArke])
  const [payMethod, setPayMethod]     = useState<'cash'|'card'>('cash')
  const [paying, setPaying]           = useState(false)
  const [receipt, setReceipt]         = useState<any>(null)

  const total  = parseFloat(price) || 0
  const canPay = serviceName.trim().length > 0 && total > 0

  async function checkout() {
    if (!canPay) { toast.error('Plotëso shërbimin dhe çmimin'); return }
    setPaying(true)
    try {
      const res  = await fetch('/api/pos/fiscalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ productId:'service', name:serviceName, price:Math.round(total*10000), quantity:1, total:Math.round(total*100), taxRate, unit:'cope' }],
          paymentMethod: payMethod,
          companyId:     company.id,
          posDeviceId:   deviceId || 'mock-device',
          operatorName:  cashierName,
          couponId:      Date.now(),
        }),
      })
      const data = await res.json()
      if (data.success || data.status === 'fiscalized' || data.status === 'offline') {
        setReceipt({
          serviceName, price: total, payMethod,
          nr:  data.receiptNumber || `KF-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
          tx:  data.transactionId,
          qr:  data.qrCodeData,
          time: new Date(),
        })
        setServiceName('')
        setPrice('')
        toast.success('Kuponi u gjenerua!')
      } else {
        toast.error(data.error || 'Gabim')
      }
    } catch { toast.error('Gabim rrjeti') }
    finally { setPaying(false) }
  }

  function printReceipt() {
    if (!receipt) return
    import('@/hooks/usePrintReceipt').then(({ buildATKReceipt }) => {
      import('@/components/pos/receipt-printer').then(({ printReceipt: doPrint }) => {
        const atk = buildATKReceipt(
          {
            receiptNumber: receipt.nr,
            transactionId: receipt.tx,
            qrCodeData:    receipt.qr,
            status:        'fiscalized',
            total:         Math.round(receipt.price * 100),
          },
          [{
            name:     receipt.serviceName,
            price:    Math.round(receipt.price * 10000),
            quantity: 1,
            unit:     'cope',
            taxRate:  taxRate || 'E',
          }],
          company,
          { paymentMethod: receipt.payMethod, operatorName: cashierName }
        )
        doPrint(atk)
      })
    })
  }

  const P = '#7C3AED'
  const G = '#10B981'

  return (
    <>
      <style>{`
        .spos-wrap {
          height: calc(100dvh - 64px);
          display: flex;
          flex-direction: column;
          background: #F8F7FF;
          font-family: Inter, sans-serif;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .spos-inner {
          flex: 1;
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          padding: 20px 16px 32px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .spos-card {
          background: #fff;
          border-radius: 16px;
          padding: 18px;
          border: 1.5px solid #EEE9FF;
        }
        .spos-label {
          font-size: 11px;
          font-weight: 700;
          color: #9CA3AF;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 10px;
          display: block;
        }
        .spos-input {
          width: 100%;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1.5px solid #EEE9FF;
          font-size: 16px;
          color: #111827;
          background: #F8F7FF;
          outline: none;
          box-sizing: border-box;
          font-family: Inter, sans-serif;
          -webkit-appearance: none;
        }
        .spos-input:focus { border-color: #7C3AED; background: #fff; }
        .spos-price-input {
          font-size: 28px;
          font-weight: 900;
          color: #7C3AED;
          padding: 12px 14px;
        }
        .spos-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }
        .spos-chip {
          padding: 5px 12px;
          border-radius: 20px;
          border: 1.5px solid #EEE9FF;
          background: #fff;
          color: #6B7280;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          white-space: nowrap;
        }
        .spos-chip.active { background: #F3F0FF; color: #7C3AED; border-color: #7C3AED; }
        .spos-pay-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .spos-pay-btn {
          padding: 16px;
          border-radius: 14px;
          border: 2px solid #EEE9FF;
          background: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          color: #6B7280;
          -webkit-tap-highlight-color: transparent;
        }
        .spos-pay-btn.active {
          background: #F3F0FF;
          border-color: #7C3AED;
          color: #7C3AED;
        }
        .spos-submit {
          width: 100%;
          padding: 18px;
          border-radius: 16px;
          border: none;
          font-size: 17px;
          font-weight: 900;
          cursor: pointer;
          letter-spacing: -0.02em;
          -webkit-tap-highlight-color: transparent;
          transition: all 0.15s;
        }
        .spos-submit:active { transform: scale(0.98); }
        .spos-receipt {
          background: #F3F0FF;
          border-radius: 16px;
          padding: 18px;
          border: 2px solid #7C3AED;
          position: relative;
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .spos-receipt { animation: fadeUp 0.25s ease; }
      `}</style>

      <div className="spos-wrap">
        <div className="spos-inner">

          {/* Header */}
          <div style={{ paddingBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: 0 }}>Arka Fiskale</h1>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{company.name} · {cashierName}</p>
            
          </div>

          {/* Receipt success */}
          {receipt && (
            <div className="spos-receipt">
              <button onClick={() => setReceipt(null)}
                style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                <X size={16}/>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <CheckCircle size={18} color={G}/>
                <span style={{ fontSize: 13, fontWeight: 700, color: G }}>Kuponi u gjenerua</span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 4 }}>{receipt.serviceName}</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: P, marginBottom: 6 }}>€{receipt.price.toFixed(2)}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                <span>Nr: {receipt.nr}</span>
                <span>{receipt.time.toLocaleTimeString('sq-AL')}</span>
              </div>
              <button onClick={printReceipt}
                style={{ width: '100%', padding: '12px', borderRadius: 10, background:'var(--bg-card)', color:'var(--text-1)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Printer size={15}/> Printo Kuponin
              </button>
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
              color: canPay ? 'white' : '#9CA3AF',
              boxShadow: canPay ? '0 6px 20px rgba(124,58,237,0.4)' : 'none',
              cursor: canPay ? 'pointer' : 'not-allowed',
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
