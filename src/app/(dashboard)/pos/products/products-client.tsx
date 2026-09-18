'use client'
// Menaxhimi Produkteve POS — me foto, kategori, CRUD
// Style: Behance-inspired light theme

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus, Search, Pencil, Trash2, Package, Upload,
  X, Check, ArrowLeft, Camera, ToggleLeft, ToggleRight
} from 'lucide-react'

interface Product {
  id: string; name: string; price: number; category: string | null
  emoji: string; tax_rate: string; unit: string; stock: number | null; discount?: number | null; buy_price?: number | null
  barcode?: string | null; is_active: boolean; image_url?: string | null
}

interface Props { companyId: string; businessType: string | null; initialView?: string }

const TAX_OPTIONS = [
  { value: 'E', label: 'E — 18% (Standard)' },
  { value: 'D', label: 'D — 8% (Ushqim)' },
  { value: 'A', label: 'A — 0% (I liruar)' },
]
const UNITS = ['cope', 'kg', 'g', 'L', 'ml', 'pako', 'kuti', 'shishe', 'gotë', 'vizitë', 'shërbim']
const ICON_COLORS = ['#9B5CF8','#3B82F6','#10B981','#F59E0B','#EF4444','#6B7280','#EC4899','#14B8A6']

const C = {
  bg:'var(--bg-base)', card:'var(--bg-card)', purple:'#5B21B6', purpleL:'#7C3AED',
  purpleBg:'var(--purple-bg)', text1:'var(--text-1)', text2:'var(--text-2)', text3:'var(--text-3)',
  border:'var(--border)', green:'#10B981', red:'#EF4444',
}

const fmtEUR = (p: number) => `€${(p / 10000).toFixed(2)}`
const emptyForm = { name:'', priceEUR:'', buyPriceEUR:'', category:'', emoji:'#9B5CF8', tax_rate:'E', unit:'cope', stock:'', barcode:'', discount:'', is_active:true, image_url:'' }

export default function ProductsClient({ companyId, businessType, initialView = 'products' }: Props) {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [activeTab,  setActiveTab]  = useState<'products'|'categories'>(initialView === 'categories' ? 'categories' : 'products')
  const [newCat,     setNewCat]      = useState('')
  const [savingCat,  setSavingCat]   = useState(false)
  const [dbCats,     setDbCats]      = useState<{id:string;name:string}[]>([])
  const [products,   setProducts]   = useState<Product[]>([])
  const [loaded,     setLoaded]     = useState(false)
  const [search,     setSearch]     = useState('')
  const [filterCat,  setFilterCat]  = useState('all')
  const [showForm,   setShowForm]   = useState(false)
  const [editing,    setEditing]    = useState<Product | null>(null)
  const [form,       setForm]       = useState(emptyForm)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [uploading,  setUploading]  = useState(false)
  const [preview,    setPreview]    = useState<string | null>(null)

  // Load products on mount
  useState(() => {
    fetch('/api/pos/products?includeInactive=true')
      .then(r => r.json())
      .then(d => { setProducts(d.products || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  })

  // Load products and categories on mount
  useEffect(() => {
    fetch('/api/pos/products?includeInactive=true')
      .then(r => r.json())
      .then(d => { setProducts(d.products || []); setLoaded(true) })
      .catch(() => setLoaded(true))

    fetch('/api/pos/categories')
      .then(r => r.json())
      .then(d => setDbCats(d.categories || []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]
    return ['all', ...cats]
  }, [products])

  const filtered = useMemo(() => products.filter(p => {
    const mc = filterCat === 'all' || p.category === filterCat
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return mc && ms
  }), [products, search, filterCat])

  function openAdd() {
    setEditing(null); setForm(emptyForm); setPreview(null); setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({ name:p.name, priceEUR:(p.price/10000).toFixed(2), buyPriceEUR:p.buy_price?(p.buy_price/10000).toFixed(2):'', category:p.category||'', emoji:p.emoji||'#9B5CF8', tax_rate:p.tax_rate, unit:p.unit, stock:p.stock!=null?String(p.stock):'', barcode:p.barcode||'', discount:p.discount?String(p.discount):'', is_active:p.is_active, image_url:p.image_url||'' })
    setPreview(p.image_url||null)
    setShowForm(true)
  }

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res  = await fetch('/api/pos/upload-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setForm(f => ({ ...f, image_url: data.url }))
      setPreview(data.url)
    } catch (err) {
      // Fallback: use URL.createObjectURL for preview only
      const url = URL.createObjectURL(file)
      setPreview(url)
      toast.error('Storage nuk është konfiguruar — foto do të humbë pas ruajtjes')
    } finally { setUploading(false) }
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Vendos emrin'); return }
    const price = parseFloat(form.priceEUR)
    if (isNaN(price) || price < 0) { toast.error('Çmim i pavlefshëm'); return }
    setSaving(true)
    try {
      const body = { name:form.name.trim(), priceEUR:price, buyPriceEUR:form.buyPriceEUR?parseFloat(form.buyPriceEUR):null, category:form.category.trim()||null, emoji:form.emoji, tax_rate:form.tax_rate, unit:form.unit, stock:form.stock!==''?parseInt(form.stock):null, barcode:form.barcode.trim()||null, discount:form.discount!==''?parseFloat(form.discount):0, is_active:form.is_active, image_url:form.image_url||null, ...(editing?{id:editing.id}:{}) }
      const res  = await fetch('/api/pos/products', { method:editing?'PUT':'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (editing) setProducts(p => p.map(x => x.id===editing.id?data.product:x))
      else         setProducts(p => [...p, data.product])
      toast.success(editing?'Produkti u përditësua':'Produkti u shtua')
      setShowForm(false)
    } catch (err) { toast.error(err instanceof Error?err.message:'Gabim') }
    finally { setSaving(false) }
  }

  async function del(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/pos/products?id=${id}`, { method:'DELETE' })
      setProducts(p => p.filter(x => x.id!==id))
      toast.success('Produkti u fshi')
    } finally { setDeleting(null) }
  }

  const S = {
    label: { fontSize:11, fontWeight:700 as const, color:C.text3, display:'block', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'0.05em' },
    input: { width:'100%', padding:'9px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:'var(--bg-muted)', fontSize:13, color:C.text1, outline:'none', boxSizing:'border-box' as const, fontFamily:'inherit' },
  }

  const lowStock   = products.filter(p => p.stock !== null && p.stock > 0 && p.stock <= 5 && p.is_active)
  const outOfStock = products.filter(p => p.stock !== null && p.stock === 0 && p.is_active)

  return (
    <div style={{ fontFamily:'Inter,sans-serif', color:C.text1, padding:'24px' }}>
      {/* Stok alerts */}
      {outOfStock.length > 0 && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12, padding:'12px 16px', marginBottom:12, display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', flexShrink:0 }}>Pa stok:</span>
          <span style={{ fontSize:12, color:'var(--text-1)' }}>{outOfStock.map(p=>p.name).join(', ')}</span>
        </div>
      )}
      {lowStock.length > 0 && (
        <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:12, padding:'12px 16px', marginBottom:12, display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#92400E', flexShrink:0 }}>Stok i ulët:</span>
          <span style={{ fontSize:12, color:'#B45309' }}>{lowStock.map(p=>`${p.name} (${p.stock})`).join(', ')}</span>
        </div>
      )}
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>router.back()} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:9, border:`1px solid ${C.border}`, background:C.card, cursor:'pointer', fontSize:13, color:C.text2 }}>
            <ArrowLeft size={14}/> Mbrapa
          </button>
          <div>
            <h1 style={{ fontSize:22, fontWeight:900, color:C.text1 }}>
              {activeTab === 'categories' ? 'Menaxho Kategoritë' : 'Menaxho Produktet'}
            </h1>
            <p style={{ fontSize:12, color:C.text3 }}>{products.filter(p=>p.is_active).length} produkte aktive</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {/* Tabs */}
          <div style={{ display:'flex', gap:2, padding:3, borderRadius:10, background:'var(--bg-muted)', border:`1px solid ${C.border}` }}>
            {[{id:'products',label:'Produktet'},{id:'categories',label:'Kategoritë'}].map(t => (
              <button key={t.id} onClick={()=>setActiveTab(t.id as 'products'|'categories')}
                style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, transition:'all 0.12s',
                  background: activeTab===t.id ? C.card : 'transparent',
                  color: activeTab===t.id ? C.text1 : C.text3,
                  boxShadow: activeTab===t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                {t.label}
              </button>
            ))}
          </div>
          {activeTab === 'products' && (
            <>
              <button onClick={()=>router.push('/pos/import')}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, border:`1px solid ${C.border}`, background:C.card, cursor:'pointer', fontSize:13, fontWeight:600, color:C.text2, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
                <Upload size={14}/> Import Bulk
              </button>
              <button onClick={openAdd}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, background:C.purple, color:'#ffffff', WebkitTextFillColor:'#ffffff', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, boxShadow:'0 4px 12px rgba(91,33,182,0.3)' }}>
                <Plus size={15}/> Shto Produkt
              </button>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <>
          <div onClick={()=>setShowForm(false)} style={{ position:'fixed', inset:0, background:'rgba(30,27,75,0.5)', zIndex:199, backdropFilter:'blur(4px)' }}/>
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:C.card, borderRadius:20, padding:28, width:'min(520px,94vw)', zIndex:200, boxShadow:'0 24px 60px rgba(91,33,182,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <p style={{ fontSize:17, fontWeight:800, color:C.text1 }}>{editing?'Edito Produktin':'Produkt i Ri'}</p>
              <button onClick={()=>setShowForm(false)} style={{ background:'none', border:'none', cursor:'pointer', color:C.text3 }}><X size={18}/></button>
            </div>

            {/* Photo upload */}
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>Foto Produktit</label>
              <div
                onClick={()=>fileRef.current?.click()}
                style={{ width:'100%', height:140, borderRadius:14, border:`2px dashed ${preview?C.purple:C.border}`, background:preview?'transparent':'#F9FAFB', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative', transition:'all 0.15s' }}
                onMouseEnter={e=>{ if(!preview)(e.currentTarget as HTMLElement).style.borderColor=C.purple }}
                onMouseLeave={e=>{ if(!preview)(e.currentTarget as HTMLElement).style.borderColor=C.border }}>
                {preview ? (
                  <>
                    <img src={preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    <div style={{ position:'absolute', inset:0, background:'var(--bg-muted)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.15s' }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity='1'}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity='0'}>
                      <Camera size={28} color="white"/>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign:'center', color:C.text3 }}>
                    {uploading ? (
                      <div style={{ width:24, height:24, border:`2px solid ${C.border}`, borderTop:`2px solid ${C.purple}`, borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }}/>
                    ) : <Camera size={28} style={{ margin:'0 auto 8px', opacity:0.4 }}/>}
                    <p style={{ fontSize:13, fontWeight:600 }}>{uploading?'Duke ngarkuar...':'Kliko për të ngarkuar foto'}</p>
                    <p style={{ fontSize:11 }}>PNG, JPG, WEBP deri 5MB</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
                onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadImage(f) }}/>
              {preview && (
                <button onClick={()=>{ setPreview(null); setForm(f=>({...f,image_url:''})) }}
                  style={{ marginTop:6, fontSize:11, color:C.red, background:'none', border:'none', cursor:'pointer' }}>
                  Hiq foton
                </button>
              )}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Name + Price */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={S.label}>Emri *</label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Espresso, Cheeseburger..." style={S.input} autoFocus/>
                </div>
                <div>
                  <label style={S.label}>Çmimi (€) *</label>
                  <input type="number" step="0.0001" min="0" value={form.priceEUR} onChange={e=>setForm(f=>({...f,priceEUR:e.target.value}))} placeholder="1.5000" style={S.input}/>
                </div>
              </div>

              {/* Category + Unit */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={S.label}>Kategoria</label>
                  {dbCats.length > 0 ? (
                    <select
                      value={form.category}
                      onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                      style={{...S.input, cursor:'pointer'}}>
                      <option value="">-- Zgjidh kategorinë --</option>
                      {dbCats.map(c=>(
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={form.category}
                      onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                      placeholder="Burger, Pizza, Pije..."
                      style={S.input}
                    />
                  )}
                </div>
                <div>
                  <label style={S.label}>Njësia</label>
                  <select value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} style={{...S.input,cursor:'pointer'}}>
                    {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Tax + Stock */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={S.label}>TVSH</label>
                  <select value={form.tax_rate} onChange={e=>setForm(f=>({...f,tax_rate:e.target.value}))} style={{...S.input,cursor:'pointer'}}>
                    {TAX_OPTIONS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Stoku (opsional)</label>
                  <input type="number" min="0" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} placeholder="∞ pa limit" style={S.input}/>
                </div>
              </div>

              {/* Barcode + Color */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                <div>
                  <label style={S.label}>Çmim Blerjeje (€)</label>
                  <input type="number" value={form.buyPriceEUR} onChange={e=>setForm(f=>({...f,buyPriceEUR:e.target.value}))} placeholder="0.00" style={S.input}/>
                </div>
                <div>
                  <label style={S.label}>Zbritje (%)</label>
                  <input type="number" min="0" max="100" value={form.discount} onChange={e=>setForm(f=>({...f,discount:e.target.value}))} placeholder="0" style={S.input}/>
                </div>
                <div>
                  <label style={S.label}>Barkodi</label>
                  <input value={form.barcode} onChange={e=>setForm(f=>({...f,barcode:e.target.value}))} placeholder="EAN-13..." style={S.input}/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={S.label}>Ngjyra Ikonës</label>
                  <div style={{ display:'flex', gap:6, paddingTop:4 }}>
                    {ICON_COLORS.map(c=>(
                      <button key={c} onClick={()=>setForm(f=>({...f,emoji:c}))}
                        style={{ width:28, height:28, borderRadius:'50%', background:c, border:form.emoji===c?`3px solid ${C.text1}`:'2px solid transparent', cursor:'pointer', transition:'all 0.12s', flexShrink:0 }}/>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active toggle */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:10, background:'var(--bg-muted)', border:`1px solid ${C.border}` }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:C.text1 }}>Produkt Aktiv</p>
                  <p style={{ fontSize:11, color:C.text3 }}>Shfaqet te POS dhe menuja</p>
                </div>
                <button onClick={()=>setForm(f=>({...f,is_active:!f.is_active}))} style={{ background:'none', border:'none', cursor:'pointer' }}>
                  {form.is_active
                    ? <ToggleRight size={28} color={C.purple}/>
                    : <ToggleLeft  size={28} color={C.text3}/>}
                </button>
              </div>

              {/* Buttons */}
              <div style={{ display:'flex', gap:10, marginTop:4 }}>
                <button onClick={()=>setShowForm(false)} style={{ flex:1, padding:'11px 0', borderRadius:10, border:`1px solid ${C.border}`, background:C.card, cursor:'pointer', fontSize:13, fontWeight:700, color:C.text2 }}>
                  Anulo
                </button>
                <button onClick={save} disabled={saving||uploading}
                  style={{ flex:2, padding:'11px 0', borderRadius:10, background:C.purple, color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:7, boxShadow:'0 4px 12px rgba(91,33,182,0.3)', opacity:saving?0.7:1 }}>
                  {saving ? <div style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.5)',borderTop:'2px solid white',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/> : <><Check size={14}/> {editing?'Ruaj Ndryshimet':'Shto Produktin'}</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Categories tab */}
      {activeTab === 'categories' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Shto kategori */}
          <div style={{ background:C.card, borderRadius:16, padding:20, border:`1px solid ${C.border}` }}>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, marginBottom:14 }}>Shto Kategori të Re</p>
            <div style={{ display:'flex', gap:10 }}>
              <input
                value={newCat}
                onChange={e=>setNewCat(e.target.value)}
                onKeyDown={async e=>{
                  if(e.key==='Enter' && newCat.trim()) {
                    setSavingCat(true)
                    try {
                      const res = await fetch('/api/pos/categories', {
                        method:'POST', headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({ name:newCat.trim() })
                      })
                      const d=await res.json()
                      if(res.ok && d.category){ setDbCats(p=>[...p,d.category]); setNewCat(''); toast.success('Kategoria u shtua') }
                      else { toast.error(d.error || 'Gabim') }
                    } catch(e){ toast.error('Gabim lidhje') }
                    setSavingCat(false)
                  }
                }}
                placeholder="p.sh. Pizza, Pije, FastFood, Sallatat..."
                style={{ flex:1, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, color:C.text1, outline:'none', background:'var(--bg-muted)' }}
              />
              <button
                disabled={!newCat.trim() || savingCat}
                onClick={async ()=>{
                  if(!newCat.trim()) return
                  setSavingCat(true)
                  try {
                    const res = await fetch('/api/pos/categories', {
                      method:'POST', headers:{'Content-Type':'application/json'},
                      body:JSON.stringify({ name:newCat.trim() })
                    })
                    const d=await res.json()
                    if(res.ok && d.category){ setDbCats(p=>[...p,d.category]); setNewCat(''); toast.success('Kategoria u shtua') }
                    else { toast.error(d.error || 'Gabim') }
                  } catch(e){ toast.error('Gabim lidhje') }
                  setSavingCat(false)
                }}
                style={{ padding:'10px 18px', borderRadius:10, background:newCat.trim()?C.purple:'var(--bg-muted)', color:newCat.trim()?'white':C.text3, border:'none', cursor:newCat.trim()?'pointer':'default', fontSize:13, fontWeight:700, transition:'all 0.12s' }}>
                {savingCat ? '...' : '+ Shto'}
              </button>
            </div>
            <p style={{ fontSize:11, color:C.text3, marginTop:8 }}>Shkruaj emrin dhe shtyp Enter ose butonin Shto</p>
          </div>

          {/* Lista kategorive */}
          <div style={{ background:C.card, borderRadius:16, padding:20, border:`1px solid ${C.border}` }}>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, marginBottom:14 }}>Kategoritë Ekzistuese</p>
            {dbCats.length === 0 ? (
              <p style={{ fontSize:13, color:C.text3, textAlign:'center', padding:'20px 0' }}>Nuk ka kategori ende — shto të parën</p>
            ) : (
              <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                {dbCats.map(cat=>{
                  const count = products.filter(p=>p.category===cat.name).length
                  return (
                    <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:12, background:'#EEF2FF', border:'1.5px solid #C7D2FE' }}>
                      <span style={{ fontSize:14, fontWeight:700, color:'#4F46E5' }}>{cat.name}</span>
                      <span style={{ fontSize:11, color:'#818CF8', fontWeight:600, padding:'1px 6px', background:'white', borderRadius:8 }}>{count}</span>
                      <button
                        onClick={async ()=>{
                          if(!confirm(`Fshi kategorinë "${cat.name}"?`)) return
                          await fetch('/api/pos/categories', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:cat.id}) })
                          setDbCats(prev=>prev.filter(c=>c.id!==cat.id))
                          toast.success(`Kategoria u fshi`)
                        }}
                        style={{ width:20, height:20, borderRadius:'50%', border:'none', background:'#C7D2FE', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#4F46E5', fontSize:13, fontWeight:700, lineHeight:1 }}>
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <>      {/* Filter + search */}
      <div style={{ background:C.card, borderRadius:16, padding:'16px 20px', marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', border:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
          <div style={{ position:'relative', flex:1 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.text3, pointerEvents:'none' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Kërko produkt..."
              style={{ ...S.input, paddingLeft:32, background:'var(--bg-muted)' }}/>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {categories.map(cat=>(
              <button key={cat} onClick={()=>setFilterCat(cat)}
                style={{ padding:'7px 16px', borderRadius:20, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, transition:'all 0.12s',
                  background:filterCat===cat?C.purple:'#EEF2FF',
                  color:filterCat===cat?'white':'#6366F1' }}>
                {cat==='all'?'Të gjitha':cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid — me foto si Behance */}
      {!loaded ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:C.text3 }}>
          <div style={{ width:24,height:24,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.purple}`,borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px' }}/>
          Duke ngarkuar...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:C.text3 }}>
          <Package size={40} style={{ margin:'0 auto 12px', opacity:0.2 }}/>
          <p style={{ fontSize:15, fontWeight:600, color:C.text2, marginBottom:8 }}>Asnjë produkt</p>
          <button onClick={openAdd} style={{ padding:'9px 20px', borderRadius:10, background:C.purple, color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, display:'inline-flex', alignItems:'center', gap:6 }}>
            <Plus size={14}/> Shto Produktin e Parë
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
          {filtered.map(p=>{
            const color = p.emoji || '#9B5CF8'
            return (
              <div key={p.id} style={{ background:C.card, borderRadius:16, overflow:'hidden', border:`1px solid ${C.border}`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', opacity:p.is_active?1:0.5, transition:'all 0.15s' }}
                onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.boxShadow='0 8px 24px rgba(91,33,182,0.12)'; (e.currentTarget as HTMLElement).style.transform='translateY(-2px)' }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.transform='none' }}>

                {/* Image */}
                {p.image_url ? (
                  <div style={{ height:130, overflow:'hidden' }}>
                    <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  </div>
                ) : (
                  <div style={{ height:130, background:`${color}12`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
                    onClick={()=>openEdit(p)}>
                    <Package size={36} style={{ color, opacity:0.5 }}/>
                  </div>
                )}

                <div style={{ padding:'12px 14px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                    <p style={{ fontSize:14, fontWeight:700, color:C.text1, lineHeight:1.3 }}>{p.name}</p>
                    {p.category && (
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${color}15`, color, whiteSpace:'nowrap', flexShrink:0 }}>
                        {p.category}
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <p style={{ fontSize:15, fontWeight:800, color:C.purpleL }}>{fmtEUR(p.price)}</p>
                    {p.stock !== null && (
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20,
                        background: p.stock===0?'#FEF2F2':p.stock<=5?'#FFFBEB':'#F0FDF4',
                        color: p.stock===0?'#DC2626':p.stock<=5?'#92400E':'#059669' }}>
                        {p.stock===0?'Pa stok':`${p.stock} cope`}
                      </span>
                    )}
                  </div>

                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={()=>openEdit(p)}
                      style={{ flex:1, padding:'7px 0', borderRadius:8, border:`1px solid ${C.border}`, background:'var(--bg-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:12, fontWeight:600, color:C.text2 }}>
                      <Pencil size={12}/> Edito
                    </button>
                    <button onClick={()=>del(p.id)} disabled={!!deleting}
                      style={{ width:34, height:34, borderRadius:8, border:`1px solid ${C.border}`, background:'#FEF2F2', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.red }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#FEE2E2'}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#FEF2F2'}>
                      {deleting===p.id
                        ? <div style={{ width:12,height:12,border:`2px solid ${C.red}`,borderTop:'2px solid transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/>
                        : <Trash2 size={13}/>}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
