'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, TrendingUp, Receipt, ListChecks, Check, Loader2, BookMarked, ShoppingCart, Wallet, Landmark, Download, Users2, ShoppingBag, Package } from 'lucide-react'
import dynamic from 'next/dynamic'
import POSCouponsTab from './pos-coupons-tab'
import RestaurantWorkspace from './restaurant-workspace'
const LightweightEmployeesTab = dynamic(() => import('./tabs/listepagesa-tab').then(m => {
  const Comp = ({ clientId, clientName }: { clientId: string; clientName: string }) => {
    const Tab = m.default
    return <Tab companyId={clientId} companyName={clientName} />
  }
  return Comp
}), { ssr: false })
import { toast } from 'sonner'

interface Client {
  id: string; business_name: string; business_type: string; pos_enabled?: boolean
  vat_number?: string; is_vat_registered: boolean; phone?: string; address?: string
}
interface SalesEntry { id: string; entry_date: string; gross_amount: number; vat_amount: number; source_note?: string }
interface Expense { id: string; vendor_name?: string; amount: number; category?: string; expense_date: string }
interface ChecklistItem { id: string; label: string; is_done: boolean }

const POS_TYPES = ['market','pharmacy','bakery','salon','health','barber','beauty','spa','gym','restaurant','cafe','bar','fastfood']
const REST_TYPES = ['restaurant','cafe','bar','fastfood']

// Tab-et sipas llojit të biznesit
function buildTabs(businessType: string) {
  const isPOS        = POS_TYPES.includes(businessType)
  const isRestaurant = REST_TYPES.includes(businessType)

  if (isRestaurant) {
    // Restorant/kafe/bar — workspace i posaçëm + kuponë + raportet Z + shpenzime
    return [
      { key: 'restaurant', label: '🍽️ Restorant',     icon: ShoppingBag },
      { key: 'pos',        label: 'Kuponë Fiskalë',   icon: Receipt     },
      { key: 'expenses',   label: 'Shpenzimet',       icon: Package     },
      { key: 'employees',  label: 'Punonjësit',       icon: Users2      },
      { key: 'checklist',  label: 'Checklist',        icon: ListChecks  },
    ] as const
  }

  if (isPOS) {
    // Market/farmaci/sallon etj — kuponë fiskalë + shpenzime, pa fatura
    return [
      { key: 'pos',        label: 'Kuponë Fiskalë',   icon: Receipt     },
      { key: 'expenses',   label: 'Shpenzimet',       icon: Package     },
      { key: 'employees',  label: 'Punonjësit',       icon: Users2      },
      { key: 'checklist',  label: 'Checklist',        icon: ListChecks  },
      { key: 'books',      label: 'Librat & Eksport', icon: BookMarked  },
    ] as const
  }

  // Të tjerë — fatura + shpenzime
  return [
    { key: 'sales',      label: 'Shitjet',         icon: TrendingUp  },
    { key: 'expenses',   label: 'Shpenzimet',       icon: Receipt     },
    { key: 'employees',  label: 'Punonjësit',       icon: Users2      },
    { key: 'checklist',  label: 'Checklist',        icon: ListChecks  },
    { key: 'books',      label: 'Librat & Eksport', icon: BookMarked  },
    { key: 'pos',        label: 'Kuponë Fiskalë',   icon: ShoppingBag },
  ] as const
}

type TabKey = 'sales' | 'expenses' | 'employees' | 'checklist' | 'books' | 'pos' | 'restaurant'

export default function LightweightClientDetail({ client }: { client: Client }) {
  const isPOS        = POS_TYPES.includes(client.business_type || '')
  const isRestaurant = REST_TYPES.includes(client.business_type || '')
  const TABS         = buildTabs(client.business_type || '')
  const router       = useRouter()
  const defaultTab   = isRestaurant ? 'restaurant' : isPOS ? 'pos' : 'sales'
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab as TabKey)

  const [sales, setSales] = useState<SalesEntry[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [checklist, setChecklist] = useState<{ id: string; items: ChecklistItem[] } | null>(null)
  const [loading, setLoading] = useState(true)

  const [showAddSale, setShowAddSale] = useState(false)
  const [saleForm, setSaleForm] = useState({ entry_date: new Date().toISOString().slice(0, 10), gross_amount: '', vat_amount: '', source_note: '' })

  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expForm, setExpForm] = useState({ vendor_name: '', amount: '', category: 'Furnizues', expense_date: new Date().toISOString().slice(0, 10) })

  const [submitting, setSubmitting] = useState(false)
  const [downloadingBook, setDownloadingBook] = useState<string | null>(null)

  async function downloadBook(type: string) {
    setDownloadingBook(type)
    try {
      const res = await fetch(`/api/accountant/lightweight-clients/${client.id}/books?type=${type}`)
      if (!res.ok) throw new Error('Gabim gjatë shkarkimit')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Libri_${type}_${client.business_name.replace(/\s+/g,'_')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Gabim gjatë shkarkimit të librit')
    } finally {
      setDownloadingBook(null)
    }
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [salesRes, expRes, checkRes] = await Promise.all([
        fetch(`/api/accountant/lightweight-clients/${client.id}/sales`),
        fetch(`/api/accountant/lightweight-clients/${client.id}/expenses`),
        fetch(`/api/accountant/lightweight-clients/${client.id}/checklist`),
      ])
      const salesData = await salesRes.json()
      const expData = await expRes.json()
      const checkData = await checkRes.json()
      setSales(salesData.entries || [])
      setExpenses(expData.expenses || [])
      setChecklist(checkData.checklist ? { id: checkData.checklist.id, items: checkData.checklist.lightweight_checklist_items || [] } : null)
    } catch {
      toast.error('Gabim gjatë ngarkimit')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [client.id])

  async function addSale() {
    if (!saleForm.gross_amount) { toast.error('Shuma është e detyrueshme'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/accountant/lightweight-clients/${client.id}/sales`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...saleForm, gross_amount: Number(saleForm.gross_amount), vat_amount: Number(saleForm.vat_amount || 0) }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success('Shitja u shtua')
      setShowAddSale(false)
      setSaleForm({ entry_date: new Date().toISOString().slice(0, 10), gross_amount: '', vat_amount: '', source_note: '' })
      await loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally { setSubmitting(false) }
  }

  async function addExpense() {
    if (!expForm.amount) { toast.error('Shuma është e detyrueshme'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/accountant/lightweight-clients/${client.id}/expenses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expForm, amount: Number(expForm.amount) }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success('Shpenzimi u shtua')
      setShowAddExpense(false)
      setExpForm({ vendor_name: '', amount: '', category: 'Furnizues', expense_date: new Date().toISOString().slice(0, 10) })
      await loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally { setSubmitting(false) }
  }

  async function toggleChecklistItem(itemId: string, current: boolean) {
    if (!checklist) return
    setChecklist({ ...checklist, items: checklist.items.map(i => i.id === itemId ? { ...i, is_done: !current } : i) })
    // Note: a dedicated PATCH endpoint for lightweight checklist items would be a nice follow-up;
    // for now this is optimistic UI only and re-syncs on next load.
  }

  const totalSales = sales.reduce((s, e) => s + Number(e.gross_amount), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const checklistDone = checklist?.items.filter(i => i.is_done).length || 0
  const checklistTotal = checklist?.items.length || 0

  return (
    <div className="page-enter">
      <button onClick={() => router.push('/accountant/markets')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13 }}>
        <ArrowLeft size={15} /> Kthehu te Markete & Restorante
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#F59E0B,#D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: 18, color: 'white', flexShrink: 0 }}>
          {client.business_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 800, color:'white' }}>{client.business_name}</h1>
          <p style={{ fontSize: 13, color:'white' }}>
            {client.is_vat_registered ? 'Në TVSH' : 'Pa TVSH'}{client.vat_number ? ` · NUI: ${client.vat_number}` : ''}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div className="finex-card" style={{ flex: 1, padding: 14, borderRadius: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Shitje Totale</p>
          <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 18, fontWeight: 800, color: '#10B981' }}>€ {totalSales.toFixed(2)}</p>
        </div>
        <div className="finex-card" style={{ flex: 1, padding: 14, borderRadius: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Shpenzime Totale</p>
          <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 18, fontWeight: 800, color: '#EF4444' }}>€ {totalExpenses.toFixed(2)}</p>
        </div>
        <div className="finex-card" style={{ flex: 1, padding: 14, borderRadius: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Checklist</p>
          <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--purple-light)' }}>{checklistDone}/{checklistTotal}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = activeTab === t.key
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: active ? '2px solid var(--purple-light)' : '2px solid transparent',
                color: active ? 'var(--purple-light)' : 'var(--text-3)', fontSize: 13, fontWeight: 700, marginBottom: -1 }}>
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: 30 }}>Duke ngarkuar...</p>
      ) : (
        <>
          {activeTab === 'sales' && (
            <div>
              <button onClick={() => setShowAddSale(true)} className="finex-button-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 16px' }}>
                <Plus size={15} /> Shto Shitje nga Kupon Fiskal
              </button>
              {sales.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: 30 }}>Nuk ka hyrje shitjesh ende.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sales.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{new Date(s.entry_date).toLocaleDateString('en-GB')}</p>
                        {s.source_note && <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.source_note}</p>}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#10B981' }}>€ {Number(s.gross_amount).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'expenses' && (
            <div>
              <button onClick={() => setShowAddExpense(true)} className="finex-button-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 16px' }}>
                <Plus size={15} /> Shto Shpenzim
              </button>
              {expenses.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: 30 }}>Nuk ka shpenzime ende.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {expenses.map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{e.vendor_name || 'Furnizues'}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{e.category} · {new Date(e.expense_date).toLocaleDateString('en-GB')}</p>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#EF4444' }}>€ {Number(e.amount).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'employees' && (
            <LightweightEmployeesTab clientId={client.id} clientName={client.business_name} />
          )}

          {activeTab === 'checklist' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(checklist?.items || []).map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <button onClick={() => toggleChecklistItem(item.id, item.is_done)}
                    style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                      border: item.is_done ? 'none' : '2px solid var(--border)', background: item.is_done ? '#10B981' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.is_done && <Check size={13} color="white" strokeWidth={3} />}
                  </button>
                  <span style={{ flex: 1, fontSize: 14, color: item.is_done ? 'var(--text-3)' : 'var(--text-1)', textDecoration: item.is_done ? 'line-through' : 'none' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'books' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:4 }}>
                Shkarko librat kontabël për <strong style={{ color:'var(--text-1)' }}>{client.business_name}</strong>
              </p>
              {[
                { type:'shitjeve', label:'Libri i Shitjeve', icon:TrendingUp, color:'#10B981', desc:'Të gjitha shitjet dhe TVSH dalëse' },
                { type:'blerjeve', label:'Libri i Blerjeve', icon:ShoppingCart, color:'#3B82F6', desc:'Të gjitha blerjet dhe TVSH hyrëse' },
                { type:'shpenzimeve', label:'Libri i Shpenzimeve', icon:Receipt, color:'#F59E0B', desc:'Shpenzimet sipas kategorive' },
              ].map(book => {
                const Icon = book.icon
                const isLoading = downloadingBook === book.type
                return (
                  <div key={book.type} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 18px', borderRadius:14, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:`${book.color}15`, border:`1px solid ${book.color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon size={18} style={{ color: book.color }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:2 }}>{book.label}</p>
                      <p style={{ fontSize:12, color:'var(--text-3)' }}>{book.desc}</p>
                    </div>
                    <button onClick={() => downloadBook(book.type)} disabled={isLoading}
                      style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10, border:`1px solid ${book.color}30`, background:`${book.color}10`, color:book.color, fontSize:13, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                      {isLoading ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}
                      {isLoading ? 'Duke shkarkuar...' : 'Shkarko Excel'}
                    </button>
                  </div>
                )
              })}
              <div style={{ marginTop:4, padding:'16px 18px', borderRadius:14, background:'rgba(90,31,214,0.05)', border:'1px solid rgba(90,31,214,0.15)' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--purple-light)', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.06em' }}>Përmbledhja</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  <div><p style={{ fontSize:11, color:'var(--text-3)', marginBottom:3 }}>Totali Shitjeve</p><p style={{ fontSize:18, fontWeight:800, color:'var(--text-1)', fontFamily:'Poppins,sans-serif' }}>€{sales.reduce((s,e) => s+(Number(e.gross_amount)||0),0).toFixed(0)}</p></div>
                  <div><p style={{ fontSize:11, color:'var(--text-3)', marginBottom:3 }}>Totali Shpenzimeve</p><p style={{ fontSize:18, fontWeight:800, color:'var(--text-1)', fontFamily:'Poppins,sans-serif' }}>€{expenses.reduce((s,e) => s+(Number(e.amount)||0),0).toFixed(0)}</p></div>
                  <div><p style={{ fontSize:11, color:'var(--text-3)', marginBottom:3 }}>TVSH Dalëse</p><p style={{ fontSize:18, fontWeight:800, color:'var(--text-1)', fontFamily:'Poppins,sans-serif' }}>€{sales.reduce((s,e) => s+(Number(e.vat_amount)||0),0).toFixed(0)}</p></div>
                </div>
              </div>
            </div>
          )}

          {/* ── RESTORANT WORKSPACE TAB ── */}
          {activeTab === 'restaurant' && (
            <RestaurantWorkspace
              companyId={client.id}
              companyName={client.business_name}
              businessType={client.business_type}
            />
          )}

          {/* ── KUPONË FISKALË TAB ── */}
          {activeTab === 'pos' && (
            <POSCouponsTab
              companyId={client.id}
              companyName={client.business_name}
            />
          )}
        </>
      )}

      {showAddSale && (
        <>
          <div onClick={() => setShowAddSale(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, width: 'min(400px,92vw)', zIndex: 100 }}>
            <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Shto Shitje nga Kupon Fiskal</h3>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Data</label>
            <input type="date" value={saleForm.entry_date} onChange={e => setSaleForm(p => ({ ...p, entry_date: e.target.value }))} className="finex-input" style={{ marginBottom: 12 }} />
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Shitja Bruto (€)</label>
            <input type="number" value={saleForm.gross_amount} onChange={e => setSaleForm(p => ({ ...p, gross_amount: e.target.value }))} placeholder="0.00" className="finex-input" style={{ marginBottom: 12 }} />
            {client.is_vat_registered && (
              <>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>TVSH e Mbledhur (€)</label>
                <input type="number" value={saleForm.vat_amount} onChange={e => setSaleForm(p => ({ ...p, vat_amount: e.target.value }))} placeholder="0.00" className="finex-input" style={{ marginBottom: 12 }} />
              </>
            )}
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Shënim (opsionale)</label>
            <input value={saleForm.source_note} onChange={e => setSaleForm(p => ({ ...p, source_note: e.target.value }))} placeholder="Kupon Fiskal #1234" className="finex-input" style={{ marginBottom: 18 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAddSale(false)} className="finex-button-secondary flex-1 py-2.5">Anullo</button>
              <button onClick={addSale} disabled={submitting} className="finex-button-primary flex-1 py-2.5">
                {submitting ? <Loader2 size={15} className="animate-spin" style={{ margin: '0 auto' }} /> : 'Shto'}
              </button>
            </div>
          </div>
        </>
      )}

      {showAddExpense && (
        <>
          <div onClick={() => setShowAddExpense(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, width: 'min(400px,92vw)', zIndex: 100 }}>
            <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Shto Shpenzim</h3>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Furnizuesi</label>
            <input value={expForm.vendor_name} onChange={e => setExpForm(p => ({ ...p, vendor_name: e.target.value }))} placeholder="p.sh. Furnizuesi i Bukës" className="finex-input" style={{ marginBottom: 12 }} />
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Shuma (€)</label>
            <input type="number" value={expForm.amount} onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className="finex-input" style={{ marginBottom: 12 }} />
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Data</label>
            <input type="date" value={expForm.expense_date} onChange={e => setExpForm(p => ({ ...p, expense_date: e.target.value }))} className="finex-input" style={{ marginBottom: 18 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAddExpense(false)} className="finex-button-secondary flex-1 py-2.5">Anullo</button>
              <button onClick={addExpense} disabled={submitting} className="finex-button-primary flex-1 py-2.5">
                {submitting ? <Loader2 size={15} className="animate-spin" style={{ margin: '0 auto' }} /> : 'Shto'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
