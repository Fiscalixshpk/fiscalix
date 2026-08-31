'use client'
// Products & Stock drawer — hapet nga toolbar i POS
// Tab 1: Produktet (CRUD me kategori)
// Tab 2: Stoku (update i shpejtë)

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  X, Plus, Pencil, Trash2, Package, Search,
  ChevronDown, ChevronUp, Check, AlertTriangle,
  BarChart2
} from 'lucide-react'

interface Product {
  id: string; name: string; price: number; category: string | null
  emoji: string; tax_rate: string; unit: string; stock: number | null
  is_active: boolean; barcode?: string | null
}

interface Props {
  companyId:      string
  businessType:   string
  products:       Product[]
  onClose:        () => void
  onRefresh:      () => void
  onProductClick?: (product: Product) => void  // shtoje direkt nga drawer
}

const TAX_OPTIONS = [
  { value: 'E', label: 'E — 18%', desc: 'Standard' },
  { value: 'D', label: 'D — 8%',  desc: 'Ushqim' },
  { value: 'A', label: 'A — 0%',  desc: 'I liruar' },
]

const UNITS = ['cope', 'kg', 'g', 'L', 'ml', 'pako', 'kuti', 'shishe', 'gotë', 'vizitë', 'shërbim']

const ICON_COLORS = [
  '#9B5CF8', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#6B7280', '#EC4899', '#14B8A6',
]

export default function ProductsDrawer({ companyId, businessType, products: initialProducts, onClose, onRefresh, onProductClick }: Props) {
  const [tab,       setTab]       = useState<'products' | 'stock'>('products')
  const [products,  setProducts]  = useState<Product[]>(initialProducts)
  const [search,    setSearch]    = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [stockEdit, setStockEdit] = useState<Record<string, string>>({})

  // Form state
  const emptyForm = { name: '', priceEUR: '', category: '', emoji: '#9B5CF8', tax_rate: 'E', unit: 'cope', stock: '', barcode: '', is_active: true }
  const [form,      setForm]      = useState(emptyForm)
  const [editing,   setEditing]   = useState<Product | null>(null)
  const [showForm,  setShowForm]  = useState(false)

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]
    return ['all', ...cats]
  }, [products])

  const filtered = useMemo(() => products.filter(p => {
    const mc = filterCat === 'all' || p.category === filterCat
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return mc && ms
  }), [products, search, filterCat])

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, Product[]> = {}
    for (const p of filtered) {
      const cat = p.category || 'Të tjera'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(p)
    }
    return groups
  }, [filtered])

  const lowStock = useMemo(() =>
    products.filter(p => p.stock !== null && p.stock < 5),
  [products])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      name:     p.name,
      priceEUR: (p.price / 10000).toFixed(2),
      category: p.category ?? '',
      emoji:    p.emoji || '#9B5CF8',
      tax_rate: p.tax_rate,
      unit:     p.unit,
      stock:    p.stock != null ? String(p.stock) : '',
      barcode:  p.barcode ?? '',
      is_active: p.is_active,
    })
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Vendos emrin'); return }
    const price = parseFloat(form.priceEUR)
    if (isNaN(price) || price < 0) { toast.error('Çmim i pavlefshëm'); return }
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(), priceEUR: price,
        category: (form.category ?? '').trim() || null,
        emoji: form.emoji, tax_rate: form.tax_rate, unit: form.unit,
        stock: form.stock !== '' ? parseInt(form.stock) : null,
        barcode: (form.barcode ?? '').trim() || null,
        is_active: form.is_active,
        ...(editing ? { id: editing.id } : {}),
      }
      const res  = await fetch('/api/pos/products', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (editing) {
        setProducts(prev => prev.map(p => p.id === editing.id ? data.product : p))
        toast.success('Produkti u përditësua')
      } else {
        setProducts(prev => [...prev, data.product])
        toast.success('Produkti u shtua')
      }
      setShowForm(false)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    } finally { setSaving(false) }
  }

  async function deleteProduct(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/pos/products?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setProducts(prev => prev.filter(p => p.id !== id))
      toast.success('Produkti u fshi')
      onRefresh()
    } catch { toast.error('Gabim gjatë fshirjes') }
    finally { setDeleting(null) }
  }

  async function updateStock(productId: string, value: string) {
    const stock = parseInt(value)
    if (isNaN(stock) || stock < 0) return
    try {
      const res = await fetch('/api/pos/products', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, stock }),
      })
      if (!res.ok) throw new Error()
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock } : p))
      setStockEdit(prev => { const n = { ...prev }; delete n[productId]; return n })
      toast.success('Stoku u përditësua')
      onRefresh()
    } catch { toast.error('Gabim') }
  }

  const S = {
    label: { fontSize: 10, fontWeight: 700 as const, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  }

  return (
    <div style={{
      position: 'fixed', top: 64, right: 0, bottom: 0, width: 380, zIndex: 100,
      background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
      animation: 'slideIn 0.2s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'products', label: 'Produktet', count: products.length },
            { id: 'stock',    label: 'Stoku', count: lowStock.length > 0 ? lowStock.length : undefined, urgent: lowStock.length > 0 },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as 'products' | 'stock')}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: tab === t.id ? 'var(--purple-bg)' : 'transparent',
                color: tab === t.id ? 'var(--purple-light)' : 'var(--text-3)',
                outline: tab === t.id ? '1px solid var(--border-purple)' : 'none', transition: 'all 0.12s',
                display: 'flex', alignItems: 'center', gap: 6 }}>
              {t.label}
              {t.count !== undefined && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: t.urgent ? 'rgba(245,158,11,0.2)' : 'var(--bg-muted)', color: t.urgent ? '#F59E0B' : 'var(--text-3)' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color:'var(--text-1)', padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      {/* ── TAB: PRODUKTET ── */}
      {tab === 'products' && (
        <>
          {/* Search + filter */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Kërko produkt..." className="finex-input"
                style={{ paddingLeft: 30, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  style={{ padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                    background: filterCat === cat ? 'var(--purple-bg)' : 'var(--bg-muted)',
                    color: filterCat === cat ? 'var(--purple-light)' : 'var(--text-3)' }}>
                  {cat === 'all' ? 'Të gjitha' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product list grouped by category */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {showForm && (
              /* ── INLINE FORM ── */
              <div style={{ margin: '0 12px 12px', background: 'var(--bg-muted)', border: '1px solid var(--border-purple)', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{editing ? 'Edito' : 'Produkt i Ri'}</p>
                  <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={14} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Name */}
                  <div>
                    <label style={S.label}>Emri *</label>
                    <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Espresso..." className="finex-input" style={{ fontSize: 13 }} />
                  </div>
                  {/* Price + Unit */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={S.label}>Çmimi (€) *</label>
                      <input type="number" step="0.01" min="0" value={form.priceEUR ?? ''}
                        onChange={e => setForm(f => ({ ...f, priceEUR: e.target.value }))}
                        placeholder="1.50" className="finex-input" style={{ fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={S.label}>Njësia</label>
                      <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                        className="finex-input" style={{ fontSize: 13, cursor: 'pointer' }}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Category + Tax */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={S.label}>Kategoria</label>
                      <input value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        placeholder="Kafe, Pije..." className="finex-input" style={{ fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={S.label}>TVSH</label>
                      <select value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
                        className="finex-input" style={{ fontSize: 13, cursor: 'pointer' }}>
                        {TAX_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Stock + Barcode */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={S.label}>Stoku (opsional)</label>
                      <input type="number" min="0" value={form.stock ?? ''}
                        onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                        placeholder="∞" className="finex-input" style={{ fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={S.label}>Barkodi</label>
                      <input value={form.barcode ?? ''} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                        placeholder="Skanoje..." className="finex-input" style={{ fontSize: 13 }} />
                    </div>
                  </div>
                  {/* Color */}
                  <div>
                    <label style={S.label}>Ngjyra</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {ICON_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setForm(f => ({ ...f, emoji: c }))}
                          style={{ width: 26, height: 26, borderRadius: 7, cursor: 'pointer', background: `${c}20`, border: form.emoji === c ? `2px solid ${c}` : `1px solid ${c}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    <button onClick={() => setShowForm(false)} className="finex-button-secondary"
                      style={{ flex: 1, padding: '8px 0', fontSize: 12 }}>Anulo</button>
                    <button onClick={save} disabled={saving} className="finex-button-primary"
                      style={{ flex: 2, padding: '8px 0', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {saving
                        ? <span style={{ width: 14, height: 14, border: '2px solid var(--border-color,#e2dcff)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        : <><Check size={13} /> {editing ? 'Ruaj' : 'Shto'}</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {Object.keys(grouped).length === 0 && !showForm ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-3)' }}>
                <Package size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p style={{ fontSize: 13, marginBottom: 12 }}>Asnjë produkt ende</p>
                <button onClick={openAdd} className="finex-button-primary"
                  style={{ margin: '0 auto', padding: '9px 20px', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                  <Plus size={14} /> Shto Produktin e Parë
                </button>
              </div>
            ) : (
              Object.entries(grouped).map(([cat, prods]) => (
                <div key={cat}>
                  {/* Category header */}
                  <button onClick={() => setExpanded(expanded === cat ? null : cat)}
                    style={{ width: '100%', padding: '7px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat} ({prods.length})</span>
                    {expanded === cat ? <ChevronUp size={13} color="#6B7280" /> : <ChevronDown size={13} color="#6B7280" />}
                  </button>

                  {/* Products */}
                  {expanded !== cat && prods.map(p => {
                    const color = p.emoji || '#9B5CF8'
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', margin: '2px 8px', borderRadius: 9, background: 'var(--bg-muted)', opacity: p.is_active ? 1 : 0.45 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Package size={13} style={{ color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-3)' }}>
                            €{(p.price / 10000).toFixed(2)} · {p.tax_rate}
                            {p.stock !== null && <span style={{ color: p.stock < 5 ? '#F59E0B' : 'var(--text-3)', marginLeft: 4 }}>· {p.stock} {p.unit}</span>}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {onProductClick && (
                            <button onClick={() => { onProductClick(p); onClose() }}
                              style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--purple)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Shto në listë">
                              <Plus size={13} color="white" />
                            </button>
                          )}
                          <button onClick={() => openEdit(p)}
                            style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => deleteProduct(p.id)} disabled={deleting === p.id}
                            style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                            {deleting === p.id
                              ? <span style={{ width: 10, height: 10, border: '2px solid #EF4444', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                              : <Trash2 size={12} />}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Add button */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button onClick={openAdd} className="finex-button-primary"
              style={{ width: '100%', padding: '10px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Plus size={14} /> Shto Produkt
            </button>
          </div>
        </>
      )}

      {/* ── TAB: STOKU ── */}
      {tab === 'stock' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {/* Low stock warning */}
            {lowStock.length > 0 && (
              <div style={{ margin: '8px 12px', padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <AlertTriangle size={14} color="#F59E0B" />
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>Stok i ulët ({lowStock.length})</p>
                </div>
                {lowStock.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid rgba(245,158,11,0.15)' }}>
                    <p style={{ flex: 1, fontSize: 12, color: 'var(--text-1)', fontWeight: 600 }}>{p.name}</p>
                    <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700 }}>{p.stock} {p.unit}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number" min="0"
                        value={stockEdit[p.id] ?? ''}
                        onChange={e => setStockEdit(prev => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="+"
                        style={{ width: 52, padding: '4px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-1)', fontSize: 12, outline: 'none', textAlign: 'center' }}
                      />
                      <button onClick={() => updateStock(p.id, stockEdit[p.id] ?? '')}
                        disabled={!stockEdit[p.id]}
                        style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: stockEdit[p.id] ? 'var(--purple)' : 'var(--bg-muted)', cursor: stockEdit[p.id] ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={13} color={stockEdit[p.id] ? 'white' : 'var(--text-3)'} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* All products with stock */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 16px 4px' }}>
              Të gjitha produktet
            </p>
            {products.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', margin: '2px 8px', borderRadius: 9, background: 'var(--bg-muted)' }}>
                <p style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                <span style={{ fontSize: 11, color: p.stock === null ? 'var(--text-3)' : p.stock < 5 ? '#F59E0B' : '#10B981', fontWeight: 600, minWidth: 40, textAlign: 'right' }}>
                  {p.stock != null ? `${p.stock} ${p.unit}` : '∞'}
                </span>
                {p.stock !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="number" min="0"
                      value={stockEdit[p.id] ?? ''}
                      onChange={e => setStockEdit(prev => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="0"
                      style={{ width: 48, padding: '4px 6px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-1)', fontSize: 11, outline: 'none', textAlign: 'center' }}
                    />
                    <button onClick={() => updateStock(p.id, stockEdit[p.id] ?? '')}
                      disabled={!stockEdit[p.id]}
                      style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: stockEdit[p.id] ? 'var(--purple)' : 'var(--bg-muted)', cursor: stockEdit[p.id] ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={11} color={stockEdit[p.id] ? 'white' : 'var(--text-3)'} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
    </div>
  )
}
