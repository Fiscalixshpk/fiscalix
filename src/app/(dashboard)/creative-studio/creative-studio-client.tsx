'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Download, Upload, Trash2, Plus, Type, Square, Image as ImageIcon, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Copy, ChevronDown, ChevronUp, Layers, ArrowUp, ArrowDown, Eye, EyeOff, Lock, Unlock } from 'lucide-react'
import { toast } from 'sonner'

interface Company { name?: string; phone?: string; email?: string }

const FORMATS = [
  { label: 'Post Instagram', w: 1080, h: 1080, icon: '⬜' },
  { label: 'Story / Reel', w: 1080, h: 1920, icon: '📱' },
  { label: 'Cover Facebook', w: 820, h: 312, icon: '🖥️' },
  { label: 'A4 Landscape', w: 1122, h: 794, icon: '📄' },
  { label: 'A4 Portrait', w: 794, h: 1122, icon: '📋' },
  { label: 'Banner Web', w: 1200, h: 400, icon: '🏷️' },
  { label: 'LinkedIn Post', w: 1200, h: 627, icon: '💼' },
  { label: 'Twitter/X Post', w: 1600, h: 900, icon: '🐦' },
]

const FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS', 'Palatino', 'Impact', 'Tahoma', 'Comic Sans MS']

const TEMPLATES = [
  {
    label: '🏖️ Ofertë Pushimesh',
    format: 0, bg: '#0F2027',
    elements: [
      { type:'rect', left:0, top:0, width:1080, height:1080, fill:'#0F2027', selectable:false, name:'Sfondi' },
      { type:'rect', left:0, top:750, width:1080, height:330, fill:'rgba(0,0,0,0.5)', selectable:true, name:'Overlay poshtë' },
      { type:'text', text:'OFERTË SPECIALE', left:540, top:160, fontSize:82, fontWeight:'bold', fill:'#FFD700', textAlign:'center', originX:'center', name:'Titulli kryesor' },
      { type:'text', text:'Pushime Verore 2026', left:540, top:290, fontSize:44, fill:'#FFFFFF', textAlign:'center', originX:'center', name:'Nëntitulli' },
      { type:'text', text:'7 netë · All Inclusive · nga €499/person', left:540, top:370, fontSize:28, fill:'#A7F3D0', textAlign:'center', originX:'center', name:'Çmimi' },
      { type:'rect', left:290, top:480, width:500, height:80, fill:'#059669', rx:40, name:'Butoni CTA' },
      { type:'text', text:'REZERVO TANI', left:540, top:498, fontSize:30, fontWeight:'bold', fill:'#FFFFFF', textAlign:'center', originX:'center', name:'Teksti butonit' },
      { type:'text', text:'📞 +383 49 123 456  ·  info@hotel.com', left:540, top:810, fontSize:24, fill:'#6EE7B7', textAlign:'center', originX:'center', name:'Kontakti' },
    ]
  },
  {
    label: '🏨 Hotel Luxury',
    format: 0, bg: '#0a0a0a',
    elements: [
      { type:'rect', left:0, top:0, width:1080, height:1080, fill:'#0a0a0a', selectable:false, name:'Sfondi' },
      { type:'rect', left:50, top:50, width:980, height:980, fill:'transparent', strokeWidth:2, stroke:'#C9A84C', name:'Korniza' },
      { type:'rect', left:80, top:80, width:920, height:920, fill:'transparent', strokeWidth:1, stroke:'rgba(201,168,76,0.3)', name:'Korniza e brendshme' },
      { type:'text', text:'HOTEL & SPA', left:540, top:200, fontSize:72, fontWeight:'bold', fill:'#FFFFFF', textAlign:'center', originX:'center', name:'Emri hotelt' },
      { type:'rect', left:340, top:295, width:400, height:3, fill:'#C9A84C', name:'Vija ari' },
      { type:'text', text:'BREZOVICA · KOSOVË', left:540, top:320, fontSize:22, fill:'#C9A84C', textAlign:'center', originX:'center', name:'Lokacioni' },
      { type:'rect', left:150, top:400, width:780, height:200, fill:'rgba(201,168,76,0.05)', name:'Karta mesit' },
      { type:'text', text:'Pool & Spa  ·  Restaurant 5★  ·  Free WiFi\nSki Direct  ·  Transfer Falas  ·  Sauna', left:540, top:450, fontSize:22, fill:'var(--bg-muted)', textAlign:'center', originX:'center', lineHeight:1.8, name:'Shërbimet' },
      { type:'text', text:'Nga  €89  natë/person', left:540, top:660, fontSize:38, fontWeight:'bold', fill:'#C9A84C', textAlign:'center', originX:'center', name:'Çmimi' },
      { type:'rect', left:340, top:760, width:400, height:65, fill:'#C9A84C', rx:4, name:'Butoni' },
      { type:'text', text:'RESERVATIONS', left:540, top:778, fontSize:22, fontWeight:'bold', fill:'#0a0a0a', textAlign:'center', originX:'center', name:'Teksti butonit' },
    ]
  },
  {
    label: '✈️ Paketë Turistike',
    format: 0, bg: '#0D1117',
    elements: [
      { type:'rect', left:0, top:0, width:1080, height:1080, fill:'#0D1117', selectable:false, name:'Sfondi' },
      { type:'rect', left:0, top:0, width:1080, height:220, fill:'#134E4A', name:'Header jeshil' },
      { type:'text', text:'TURNE BALLKANIK', left:540, top:75, fontSize:68, fontWeight:'bold', fill:'#FFFFFF', textAlign:'center', originX:'center', name:'Titulli' },
      { type:'text', text:'Prishtinë  ·  Tiranë  ·  Shkodër  ·  Budvë', left:540, top:165, fontSize:28, fill:'#99F6E4', textAlign:'center', originX:'center', name:'Destinacionet' },
      { type:'rect', left:60, top:250, width:460, height:240, fill:'#111827', rx:16, name:'Karta majtas' },
      { type:'text', text:'📅  7 Ditë\n🏨  Hotel 4 Yje\n🚌  Transport VIP\n🍽️  Mëngjes çdo ditë', left:100, top:280, fontSize:24, fill:'#E2E8F0', lineHeight:1.75, name:'Detajet e majtës' },
      { type:'rect', left:560, top:250, width:460, height:240, fill:'#111827', rx:16, name:'Karta djathtas' },
      { type:'text', text:'👥  Grup deri 20\n📸  Guide Shqiptar\n🎫  Hyrjet e includ.\n📞  Suport 24/7', left:600, top:280, fontSize:24, fill:'#E2E8F0', lineHeight:1.75, name:'Detajet e djathtës' },
      { type:'rect', left:0, top:560, width:1080, height:3, fill:'#134E4A', name:'Vija ndarëse' },
      { type:'text', text:'Çmimi: nga €349 / person', left:540, top:610, fontSize:42, fontWeight:'bold', fill:'#10B981', textAlign:'center', originX:'center', name:'Çmimi' },
      { type:'text', text:'Çmimi përfshin: Transport, Akomodim, Ushqim, Guide', left:540, top:680, fontSize:22, fill:'var(--bg-muted)', textAlign:'center', originX:'center', name:'Nota çmimit' },
      { type:'rect', left:290, top:760, width:500, height:72, fill:'#10B981', rx:36, name:'Butoni CTA' },
      { type:'text', text:'REZERVO TANI →', left:540, top:780, fontSize:28, fontWeight:'bold', fill:'#FFFFFF', textAlign:'center', originX:'center', name:'Teksti butonit' },
    ]
  },
  {
    label: '📱 Story Minimal',
    format: 1, bg: '#0f0c29',
    elements: [
      { type:'rect', left:0, top:0, width:1080, height:1920, fill:'#0f0c29', selectable:false, name:'Sfondi' },
      { type:'rect', left:0, top:600, width:1080, height:720, fill:'rgba(124,58,237,0.15)', name:'Zona mesit' },
      { type:'text', text:'DESTINACIONI\nJUAJ I RADHËS', left:540, top:680, fontSize:88, fontWeight:'bold', fill:'#FFFFFF', textAlign:'center', originX:'center', lineHeight:1.1, name:'Titulli kryesor' },
      { type:'text', text:'Zbulo magjinë e Kosovës', left:540, top:940, fontSize:34, fill:'var(--purple)', textAlign:'center', originX:'center', name:'Nëntitulli' },
      { type:'rect', left:240, top:1050, width:600, height:80, fill:'#7C3AED', rx:40, name:'Butoni' },
      { type:'text', text:'SHIKO OFERTAT', left:540, top:1070, fontSize:30, fontWeight:'bold', fill:'#FFFFFF', textAlign:'center', originX:'center', name:'Teksti butonit' },
      { type:'text', text:'Swipe lart për më shumë  ↑', left:540, top:1800, fontSize:26, fill:'var(--bg-muted)', textAlign:'center', originX:'center', name:'Swipe hint' },
    ]
  },
  {
    label: '🌊 Plazh Verë',
    format: 0, bg: '#0369A1',
    elements: [
      { type:'rect', left:0, top:0, width:1080, height:1080, fill:'#0369A1', selectable:false, name:'Sfondi' },
      { type:'rect', left:0, top:0, width:1080, height:540, fill:'#0284C7', name:'Gjysma e sipërme' },
      { type:'rect', left:0, top:540, width:1080, height:540, fill:'#F0F9FF', name:'Rëra' },
      { type:'text', text:'☀️', left:540, top:80, fontSize:120, textAlign:'center', originX:'center', name:'Emoji dielli' },
      { type:'text', text:'SUMMER VIBES', left:540, top:250, fontSize:72, fontWeight:'bold', fill:'#FFFFFF', textAlign:'center', originX:'center', name:'Titulli' },
      { type:'text', text:'Bregdet · Relaks · Aventurë', left:540, top:360, fontSize:32, fill:'#BAE6FD', textAlign:'center', originX:'center', name:'Nëntitulli' },
      { type:'rect', left:140, top:600, width:800, height:120, fill:'#FFFFFF', rx:16, name:'Karta e bardhë' },
      { type:'text', text:'🏄 Plazh  ·  🍹 Bar  ·  🤿 Diving  ·  🛥️ Barka', left:540, top:640, fontSize:26, fill:'#0369A1', textAlign:'center', originX:'center', name:'Aktivitetet' },
      { type:'rect', left:290, top:800, width:500, height:72, fill:'#F97316', rx:36, name:'Butoni' },
      { type:'text', text:'REZERVO PUSHIMET', left:540, top:820, fontSize:26, fontWeight:'bold', fill:'#FFFFFF', textAlign:'center', originX:'center', name:'Teksti butonit' },
    ]
  },
  {
    label: '🎄 Pushime Dimri',
    format: 0, bg: '#0F1923',
    elements: [
      { type:'rect', left:0, top:0, width:1080, height:1080, fill:'#0F1923', selectable:false, name:'Sfondi' },
      { type:'rect', left:0, top:0, width:1080, height:400, fill:'#1B2838', name:'Top zone' },
      { type:'text', text:'❄️', left:540, top:60, fontSize:100, textAlign:'center', originX:'center', name:'Emoji' },
      { type:'text', text:'PUSHIMET E DIMRIT', left:540, top:200, fontSize:60, fontWeight:'bold', fill:'#FFFFFF', textAlign:'center', originX:'center', name:'Titulli' },
      { type:'text', text:'SKI · SPA · NATË FESTIVE', left:540, top:300, fontSize:26, fill:'#94A3B8', textAlign:'center', originX:'center', name:'Kategoritë' },
      { type:'rect', left:80, top:440, width:260, height:260, fill:'#1E293B', rx:20, name:'Karta 1' },
      { type:'text', text:'🎿\nSki\nDirect', left:210, top:490, fontSize:22, fill:'#FFFFFF', textAlign:'center', originX:'center', lineHeight:1.6, name:'Feature 1' },
      { type:'rect', left:410, top:440, width:260, height:260, fill:'#1E293B', rx:20, name:'Karta 2' },
      { type:'text', text:'🛁\nSpa &\nSauna', left:540, top:490, fontSize:22, fill:'#FFFFFF', textAlign:'center', originX:'center', lineHeight:1.6, name:'Feature 2' },
      { type:'rect', left:740, top:440, width:260, height:260, fill:'#1E293B', rx:20, name:'Karta 3' },
      { type:'text', text:'🍷\nDinner\nFestiv', left:870, top:490, fontSize:22, fill:'#FFFFFF', textAlign:'center', originX:'center', lineHeight:1.6, name:'Feature 3' },
      { type:'text', text:'3 netë nga €299 / person', left:540, top:780, fontSize:38, fontWeight:'bold', fill:'#38BDF8', textAlign:'center', originX:'center', name:'Çmimi' },
      { type:'rect', left:290, top:870, width:500, height:65, fill:'#38BDF8', rx:8, name:'Butoni' },
      { type:'text', text:'RESERVO TANI', left:540, top:888, fontSize:26, fontWeight:'bold', fill:'#0F1923', textAlign:'center', originX:'center', name:'Teksti butonit' },
    ]
  },
  {
    label: '💼 LinkedIn Professional',
    format: 6, bg: '#FFFFFF',
    elements: [
      { type:'rect', left:0, top:0, width:1200, height:627, fill:'#FFFFFF', selectable:false, name:'Sfondi' },
      { type:'rect', left:0, top:0, width:400, height:627, fill:'#0A66C2', name:'Kolona majtas' },
      { type:'text', text:'AGJENCI\nTURIZMI', left:200, top:180, fontSize:52, fontWeight:'bold', fill:'#FFFFFF', textAlign:'center', originX:'center', lineHeight:1.2, name:'Emri kompanisë' },
      { type:'text', text:'Kosovë · Ballkan · Europë', left:200, top:360, fontSize:20, fill:'var(--bg-muted)', textAlign:'center', originX:'center', name:'Subtagline' },
      { type:'text', text:'Oferta e Re\nPër Grupet', left:800, top:100, fontSize:54, fontWeight:'bold', fill:'#0A66C2', textAlign:'center', originX:'center', lineHeight:1.2, name:'Titulli' },
      { type:'rect', left:500, top:270, width:600, height:2, fill:'#0A66C2', name:'Vija' },
      { type:'text', text:'✓  Minimum 10 persona\n✓  7 ditë all inclusive\n✓  Transport VIP\n✓  Guide profesional', left:520, top:300, fontSize:22, fill:'#374151', lineHeight:1.8, name:'Beneficat' },
      { type:'text', text:'Kontaktoni tani: +383 49 123 456', left:800, top:540, fontSize:18, fill:'#6B7280', textAlign:'center', originX:'center', name:'Kontakti' },
    ]
  },
  { label: '⬜ Canvas i Zbrazët', format: 0, bg: '#1E293B', elements: [] },
]

const SCALE = 0.48

export default function CreativeStudio({ company }: { company: Company | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [formatIdx, setFormatIdx] = useState(0)
  const [activeObj, setActiveObj] = useState<any>(null)
  const [showFormats, setShowFormats] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showLayers, setShowLayers] = useState(true)
  const [layers, setLayers] = useState<any[]>([])
  const [textVal, setTextVal] = useState('')
  const [fontSize, setFontSize] = useState(40)
  const [fontFamily, setFontFamily] = useState('Arial')
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [fillColor, setFillColor] = useState('#7C3AED')
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  const [align, setAlign] = useState('center')
  const [bgColor, setBgColor] = useState('#1E293B')
  const [animating, setAnimating] = useState(false)
  const [opacity, setOpacity] = useState(100)
  const fileRef = useRef<HTMLInputElement>(null)

  const fmt = FORMATS[formatIdx]
  const cW = fmt.w * SCALE
  const cH = fmt.h * SCALE

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js'
    script.onload = () => setLoaded(true)
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  useEffect(() => {
    if (!loaded || !canvasRef.current) return
    const fabric = (window as any).fabric
    if (fabricRef.current) fabricRef.current.dispose()
    const canvas = new fabric.Canvas(canvasRef.current, { width: cW, height: cH, backgroundColor: bgColor, selection: true })
    fabricRef.current = canvas
    canvas.on('selection:created', (e: any) => { updatePanel(e.selected[0]); syncLayers() })
    canvas.on('selection:updated', (e: any) => { updatePanel(e.selected[0]); syncLayers() })
    canvas.on('selection:cleared', () => { setActiveObj(null); syncLayers() })
    canvas.on('object:modified', (e: any) => { updatePanel(e.target); syncLayers() })
    canvas.on('object:added', () => syncLayers())
    canvas.on('object:removed', () => syncLayers())
    syncLayers()
  }, [loaded, formatIdx])

  function syncLayers() {
    const canvas = fabricRef.current
    if (!canvas) return
    const objs = canvas.getObjects()
    setLayers([...objs].reverse().map((obj: any, idx: number) => ({
      id: obj.__uid || (obj.__uid = Math.random().toString(36).slice(2)),
      name: obj.name || (obj.type === 'i-text' ? `Tekst ${objs.length-idx}` : obj.type === 'rect' ? `Formë ${objs.length-idx}` : obj.type === 'image' ? `Foto ${objs.length-idx}` : `Element ${objs.length-idx}`),
      type: obj.type,
      visible: obj.visible !== false,
      locked: !obj.selectable,
      obj,
    })))
  }

  function updatePanel(obj: any) {
    if (!obj) return
    setActiveObj(obj)
    setOpacity(Math.round((obj.opacity ?? 1) * 100))
    if (obj.type === 'i-text' || obj.type === 'text') {
      setTextVal(obj.text || '')
      setFontSize(obj.fontSize || 40)
      setFontFamily(obj.fontFamily || 'Arial')
      setTextColor(obj.fill || '#FFFFFF')
      setBold(obj.fontWeight === 'bold')
      setItalic(obj.fontStyle === 'italic')
      setAlign(obj.textAlign || 'center')
    }
    if (obj.type === 'rect') setFillColor(typeof obj.fill === 'string' ? obj.fill : '#7C3AED')
  }

  function applyTemplate(t: typeof TEMPLATES[number]) {
    const fabric = (window as any).fabric
    const canvas = fabricRef.current
    if (!canvas) return
    setFormatIdx(t.format)
    canvas.clear()
    setBgColor(t.bg)
    canvas.setBackgroundColor(t.bg, canvas.renderAll.bind(canvas))
    t.elements.forEach((el: any) => {
      const props = {
        left: (el.left || 0) * SCALE, top: (el.top || 0) * SCALE,
        selectable: el.selectable !== false, name: el.name || '',
      }
      if (el.type === 'rect') {
        const r = new fabric.Rect({ ...props, width: (el.width||200)*SCALE, height: (el.height||60)*SCALE, fill: el.fill||'#7C3AED', rx:(el.rx||0)*SCALE, ry:(el.ry||0)*SCALE, stroke: el.stroke, strokeWidth: el.strokeWidth ? el.strokeWidth*SCALE : 0 })
        canvas.add(r)
      } else if (el.type === 'text') {
        const txt = new fabric.IText(el.text||'', { ...props, fontSize:(el.fontSize||30)*SCALE, fontWeight:el.fontWeight||'normal', fill:el.fill||'#FFF', fontFamily:el.fontFamily||'Arial', textAlign:el.textAlign||'left', originX:el.originX||'left', lineHeight:el.lineHeight||1.2, editable:true })
        canvas.add(txt)
      }
    })
    canvas.renderAll()
    syncLayers()
    setShowTemplates(false)
    toast.success('Template u aplikua')
  }

  function addText() {
    const fabric = (window as any).fabric
    const canvas = fabricRef.current; if (!canvas) return
    const txt = new fabric.IText('Tekst i ri', { left:cW/2, top:cH/3, fontSize:36*SCALE, fill:'#FFFFFF', fontFamily:'Arial', textAlign:'center', originX:'center', originY:'center', editable:true, name:'Tekst' })
    canvas.add(txt); canvas.setActiveObject(txt); canvas.renderAll()
  }

  function addRect() {
    const fabric = (window as any).fabric
    const canvas = fabricRef.current; if (!canvas) return
    const r = new fabric.Rect({ left:cW/2-80*SCALE, top:cH/2-25*SCALE, width:160*SCALE, height:50*SCALE, fill:'#7C3AED', rx:10*SCALE, name:'Formë' })
    canvas.add(r); canvas.setActiveObject(r); canvas.renderAll()
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const fabric = (window as any).fabric
    const canvas = fabricRef.current; if (!canvas) return
    const reader = new FileReader()
    reader.onload = ev => {
      fabric.Image.fromURL(ev.target?.result as string, (img: any) => {
        const sc = Math.min(cW * 0.7 / img.width, cH * 0.7 / img.height)
        img.set({ left:cW/2, top:cH/2, originX:'center', originY:'center', scaleX:sc, scaleY:sc, name:'Foto' })
        canvas.add(img); canvas.setActiveObject(img); canvas.renderAll()
      })
    }
    reader.readAsDataURL(file)
  }

  function updateText(val: string) {
    setTextVal(val)
    const obj = fabricRef.current?.getActiveObject()
    if (obj && (obj.type==='i-text'||obj.type==='text')) { obj.set('text',val); fabricRef.current.renderAll() }
  }

  function updateStyle(patch: any) {
    const canvas = fabricRef.current
    const obj = canvas?.getActiveObject(); if (!obj) return
    obj.set(patch); canvas.renderAll()
  }

  function deleteSelected() {
    const canvas = fabricRef.current
    const obj = canvas?.getActiveObject(); if (!obj) return
    canvas.remove(obj); canvas.discardActiveObject(); canvas.renderAll(); setActiveObj(null)
  }

  function duplicate() {
    const canvas = fabricRef.current
    const obj = canvas?.getActiveObject(); if (!obj) return
    obj.clone((cloned: any) => { cloned.set({ left:obj.left+15, top:obj.top+15, name:(obj.name||'Element')+' kopje' }); canvas.add(cloned); canvas.setActiveObject(cloned); canvas.renderAll() })
  }

  // LAYER OPERATIONS
  function selectLayer(layerObj: any) {
    const canvas = fabricRef.current; if (!canvas) return
    canvas.setActiveObject(layerObj.obj); canvas.renderAll(); updatePanel(layerObj.obj)
  }

  function bringForward() {
    const canvas = fabricRef.current
    const obj = canvas?.getActiveObject(); if (!obj) return
    canvas.bringForward(obj); syncLayers()
  }

  function sendBackward() {
    const canvas = fabricRef.current
    const obj = canvas?.getActiveObject(); if (!obj) return
    canvas.sendBackwards(obj); syncLayers()
  }

  function bringToFront() {
    const canvas = fabricRef.current
    const obj = canvas?.getActiveObject(); if (!obj) return
    canvas.bringToFront(obj); syncLayers()
  }

  function sendToBack() {
    const canvas = fabricRef.current
    const obj = canvas?.getActiveObject(); if (!obj) return
    canvas.sendToBack(obj); syncLayers()
  }

  function toggleVisibility(layerObj: any) {
    layerObj.obj.set('visible', !layerObj.obj.visible)
    fabricRef.current?.renderAll(); syncLayers()
  }

  function toggleLock(layerObj: any) {
    const locked = layerObj.obj.selectable === false
    layerObj.obj.set('selectable', locked)
    fabricRef.current?.renderAll(); syncLayers()
  }

  function renameLay(layerObj: any, name: string) {
    layerObj.obj.name = name; syncLayers()
  }

  function moveLayerUp(layerObj: any) {
    const canvas = fabricRef.current; if (!canvas) return
    canvas.bringForward(layerObj.obj); syncLayers()
  }

  function moveLayerDown(layerObj: any) {
    const canvas = fabricRef.current; if (!canvas) return
    canvas.sendBackwards(layerObj.obj); syncLayers()
  }

  function playAnimation() {
    const fabric = (window as any).fabric
    const canvas = fabricRef.current; if (!canvas||animating) return
    setAnimating(true)
    const objs = canvas.getObjects()
    const saved = objs.map((o: any) => ({ left:o.left, opacity:o.opacity??1 }))
    objs.forEach((obj: any, i: number) => { obj.set({ opacity:0, left:saved[i].left-40*SCALE }); })
    canvas.renderAll()
    objs.forEach((obj: any, i: number) => {
      setTimeout(() => {
        obj.animate({ opacity:saved[i].opacity, left:saved[i].left }, {
          duration:500, easing:fabric.util.ease.easeOutCubic,
          onChange:canvas.renderAll.bind(canvas),
          onComplete:() => { if(i===objs.length-1) setAnimating(false) }
        })
      }, i*100)
    })
  }

  function exportJPG() {
    const canvas = fabricRef.current; if (!canvas) return
    const dataURL = canvas.toDataURL({ format:'jpeg', quality:0.95, multiplier:1/SCALE })
    const a = document.createElement('a'); a.href=dataURL; a.download=`design-${Date.now()}.jpg`; a.click()
    toast.success('U ruajt si JPG')
  }

  function exportPNG() {
    const canvas = fabricRef.current; if (!canvas) return
    const dataURL = canvas.toDataURL({ format:'png', multiplier:1/SCALE })
    const a = document.createElement('a'); a.href=dataURL; a.download=`design-${Date.now()}.png`; a.click()
    toast.success('U ruajt si PNG')
  }

  function exportPDF() {
    const canvas = fabricRef.current; if (!canvas) return
    const dataURL = canvas.toDataURL({ format:'jpeg', quality:0.95, multiplier:1/SCALE })
    const win = window.open('','_blank'); if (!win) { toast.error('Lejo popup-et'); return }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:${fmt.w > fmt.h ? 'A4 landscape':'A4 portrait'};margin:0}*{margin:0;padding:0;-webkit-print-color-adjust:exact!important}body{background:#111}.tb{position:fixed;top:0;left:0;right:0;background:#111;padding:10px 20px;display:flex;gap:10px;z-index:100}.tb button{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600}.p{background:#7C3AED;color:white}.c{margin-left:auto;background:var(--bg-muted);color:var(--bg-muted)}.w{padding-top:56px;display:flex;justify-content:center;background:#222;min-height:100vh}img{max-width:100%}@media print{.tb{display:none}.w{padding:0;background:white}}</style></head><body><div class="tb"><button class="p" onclick="window.print()">🖨️ PDF</button><button class="c" onclick="window.close()">✕</button></div><div class="w"><img src="${dataURL}"/></div></body></html>`)
    win.document.close()

    setBgColor(color)
    canvas.setBackgroundColor(color, canvas.renderAll.bind(canvas))


    canvas.setBackgroundColor(color, canvas.renderAll.bind(canvas))
  }

  const BG = ['#0F172A','#1E293B','#0F2027','#134E4A','#1a1a2e','#0f0c29','#4C1D95','#0A66C2','#0a0a0a','#0D1117','#FFFFFF','#F8FAFC']

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:8, padding:'5px 8px', color:'var(--text-1)', fontSize:12, width:'100%', outline:'none' }

  const activeLayerId = activeObj?.__uid

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
        <div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:800, color:'var(--text-1)', marginBottom:2 }}>Studio Kreative</h1>
          <p style={{ fontSize:11, color:'var(--text-3)' }}>Dizajno materiale profesionale — postime, story, flyer, banner</p>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <button onClick={exportJPG} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:8, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', color:'var(--text-1)', fontSize:11, fontWeight:700, cursor:'pointer' }}><Download size={12}/> JPG</button>
          <button onClick={exportPNG} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:8, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', color:'#60A5FA', fontSize:11, fontWeight:700, cursor:'pointer' }}><Download size={12}/> PNG</button>
          <button onClick={exportPDF} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:8, background:'linear-gradient(135deg,#4C1D95,#7C3AED)', color:'white', fontSize:11, fontWeight:700, border:'none', cursor:'pointer' }}><Download size={12}/> PDF</button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
        {/* Format */}
        <div style={{ position:'relative' }}>
          <button onClick={()=>setShowFormats(!showFormats)} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-1)', fontSize:11, fontWeight:600, cursor:'pointer' }}>
            {fmt.icon} {fmt.label} <ChevronDown size={11}/>
          </button>
          {showFormats && (
            <div style={{ position:'absolute', top:'100%', left:0, marginTop:4, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:6, zIndex:200, minWidth:200, boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
              {FORMATS.map((f,i)=>(
                <button key={i} onClick={()=>{setFormatIdx(i);setShowFormats(false)}}
                  style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 10px', borderRadius:7, background:i===formatIdx?'rgba(124,58,237,0.15)':'transparent', border:'none', color:i===formatIdx?'#9B5CF8':'var(--text-1)', fontSize:11, cursor:'pointer' }}>
                  {f.icon} {f.label} <span style={{ marginLeft:'auto', fontSize:10, color:'var(--text-3)' }}>{f.w}×{f.h}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Templates */}
        <div style={{ position:'relative' }}>
          <button onClick={()=>setShowTemplates(!showTemplates)} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:8, border:'1px solid rgba(124,58,237,0.3)', background:'rgba(124,58,237,0.07)', color:'var(--purple)', fontSize:11, fontWeight:600, cursor:'pointer' }}>
            Template <ChevronDown size={11}/>
          </button>
          {showTemplates && (
            <div style={{ position:'absolute', top:'100%', left:0, marginTop:4, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:6, zIndex:200, minWidth:230, boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
              {TEMPLATES.map((t,i)=>(
                <button key={i} onClick={()=>applyTemplate(t)}
                  style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px', borderRadius:7, background:'transparent', border:'none', color:'var(--text-1)', fontSize:11, cursor:'pointer', textAlign:'left' }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ width:1, height:20, background:'var(--border)' }}/>
        <button onClick={addText} style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-1)', fontSize:11, cursor:'pointer' }}><Type size={12}/> Tekst</button>
        <button onClick={addRect} style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-1)', fontSize:11, cursor:'pointer' }}><Square size={12}/> Formë</button>
        <button onClick={()=>fileRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-1)', fontSize:11, cursor:'pointer' }}><ImageIcon size={12}/> Foto</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImageUpload}/>
        <div style={{ width:1, height:20, background:'var(--border)' }}/>
        {/* Layer order buttons */}
        {activeObj && (<>
          <button onClick={bringToFront} title="Kalo para gjithçkaje" style={{ padding:'6px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-1)', fontSize:10, cursor:'pointer', fontWeight:700 }}>⬆⬆ Kreu</button>
          <button onClick={bringForward} title="Kalo një hap para" style={{ padding:'6px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-1)', fontSize:10, cursor:'pointer', fontWeight:700 }}>⬆ Para</button>
          <button onClick={sendBackward} title="Kalo një hap prapa" style={{ padding:'6px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-1)', fontSize:10, cursor:'pointer', fontWeight:700 }}>⬇ Prapa</button>
          <button onClick={sendToBack} title="Kalo prapa gjithçkaje" style={{ padding:'6px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-1)', fontSize:10, cursor:'pointer', fontWeight:700 }}>⬇⬇ Fundi</button>
        </>)}
        <div style={{ width:1, height:20, background:'var(--border)' }}/>
        <button onClick={playAnimation} disabled={animating} style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:8, border:'1px solid rgba(245,158,11,0.3)', background:'rgba(245,158,11,0.07)', color:'#92400E', fontSize:11, cursor:'pointer', opacity:animating?0.5:1 }}>▶ Animo</button>
      </div>

      <div style={{ display:'flex', gap:12, alignItems:'flex-start', flexWrap:'wrap' }}>

        {/* Canvas */}
        <div style={{ flex:'0 0 auto' }}>
          {!loaded ? (
            <div style={{ width:cW, height:Math.min(cH, 500), background:'#111', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <p style={{ color:'var(--text-3)', fontSize:12 }}>Duke ngarkuar...</p>
            </div>
          ) : (
            <div style={{ borderRadius:12, overflow:'hidden', boxShadow:'0 4px 14px rgba(0,0,0,0.08)', maxHeight:'70vh', overflowY:'auto' }}>
              <canvas ref={canvasRef}/>
            </div>
          )}
          {/* BG */}
          <div style={{ marginTop:8 }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Sfondi</p>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
              {BG.map((c,i)=>(
                <div key={i} onClick={()=>changeBg(c)} style={{ width:24, height:24, borderRadius:5, background:c, cursor:'pointer', border:bgColor===c?'2px solid #9B5CF8':'1px solid var(--border)', flexShrink:0 }}/>
              ))}
              <input type="color" value={bgColor} onChange={e=>changeBg(e.target.value)} style={{ width:24, height:24, border:'none', borderRadius:5, cursor:'pointer', padding:0 }}/>
            </div>
          </div>
          <p style={{ fontSize:10, color:'var(--text-3)', marginTop:6 }}>💡 Klik dy herë mbi tekst → edito · Drag lirshëm · Delete/⌫ fshin</p>
        </div>

        {/* RIGHT: Properties + Layers */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, minWidth:200, flex:1 }}>

          {/* Properties */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:14 }}>
            {!activeObj ? (
              <p style={{ fontSize:11, color:'var(--text-3)', textAlign:'center', padding:'16px 0' }}>Kliko element për edito</p>
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Vetitë</p>
                  <div style={{ display:'flex', gap:5 }}>
                    <button onClick={duplicate} style={{ padding:'3px 6px', borderRadius:5, border:'1px solid var(--border)', background:'transparent', color:'var(--text-3)', cursor:'pointer', display:'flex' }}><Copy size={11}/></button>
                    <button onClick={deleteSelected} style={{ padding:'3px 6px', borderRadius:5, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.07)', color:'var(--text-1)', cursor:'pointer', display:'flex' }}><Trash2 size={11}/></button>
                  </div>
                </div>

                {(activeObj.type==='i-text'||activeObj.type==='text') && <>
                  <div style={{ marginBottom:8 }}>
                    <label style={{ fontSize:10, color:'var(--text-3)', display:'block', marginBottom:3 }}>Teksti</label>
                    <textarea value={textVal} onChange={e=>updateText(e.target.value)} rows={2} style={{ ...I, resize:'none' }}/>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <label style={{ fontSize:10, color:'var(--text-3)', display:'block', marginBottom:3 }}>Fonti</label>
                    <select value={fontFamily} onChange={e=>{setFontFamily(e.target.value);updateStyle({fontFamily:e.target.value})}} style={I}>
                      {FONTS.map(f=><option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <label style={{ fontSize:10, color:'var(--text-3)', display:'block', marginBottom:3 }}>Madhësia: {Math.round(fontSize/SCALE)}px</label>
                    <input type="range" min={8*SCALE} max={180*SCALE} step={SCALE} value={fontSize} onChange={e=>{const v=parseInt(e.target.value);setFontSize(v);updateStyle({fontSize:v})}} style={{ width:'100%' }}/>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <label style={{ fontSize:10, color:'var(--text-3)', display:'block', marginBottom:3 }}>Ngjyra</label>
                    <input type="color" value={textColor} onChange={e=>{setTextColor(e.target.value);updateStyle({fill:e.target.value})}} style={{ width:'100%', height:28, border:'none', borderRadius:7, cursor:'pointer' }}/>
                  </div>
                  <div style={{ display:'flex', gap:4, marginBottom:8 }}>
                    <button onClick={()=>{const v=!bold;setBold(v);updateStyle({fontWeight:v?'bold':'normal'})}}
                      style={{ flex:1, padding:'5px', borderRadius:6, border:`1px solid ${bold?'#9B5CF8':'var(--border)'}`, background:bold?'rgba(124,58,237,0.15)':'transparent', color:bold?'#9B5CF8':'var(--text-3)', cursor:'pointer', fontWeight:'bold', display:'flex', justifyContent:'center' }}><Bold size={12}/></button>
                    <button onClick={()=>{const v=!italic;setItalic(v);updateStyle({fontStyle:v?'italic':'normal'})}}
                      style={{ flex:1, padding:'5px', borderRadius:6, border:`1px solid ${italic?'#9B5CF8':'var(--border)'}`, background:italic?'rgba(124,58,237,0.15)':'transparent', color:italic?'#9B5CF8':'var(--text-3)', cursor:'pointer', fontStyle:'italic', display:'flex', justifyContent:'center' }}><Italic size={12}/></button>
                    {(['left','center','right'] as const).map(a=>(
                      <button key={a} onClick={()=>{setAlign(a);updateStyle({textAlign:a})}}
                        style={{ flex:1, padding:'5px', borderRadius:6, border:`1px solid ${align===a?'#9B5CF8':'var(--border)'}`, background:align===a?'rgba(124,58,237,0.15)':'transparent', color:align===a?'#9B5CF8':'var(--text-3)', cursor:'pointer', display:'flex', justifyContent:'center' }}>
                        {a==='left'?<AlignLeft size={11}/>:a==='center'?<AlignCenter size={11}/>:<AlignRight size={11}/>}
                      </button>
                    ))}
                  </div>
                </>}

                {activeObj.type==='rect' && <>
                  <div style={{ marginBottom:8 }}>
                    <label style={{ fontSize:10, color:'var(--text-3)', display:'block', marginBottom:3 }}>Ngjyra</label>
                    <input type="color" value={fillColor} onChange={e=>{setFillColor(e.target.value);updateStyle({fill:e.target.value})}} style={{ width:'100%', height:28, border:'none', borderRadius:7, cursor:'pointer' }}/>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <label style={{ fontSize:10, color:'var(--text-3)', display:'block', marginBottom:3 }}>Rrumbullakësia</label>
                    <input type="range" min={0} max={100*SCALE} defaultValue={10*SCALE} onChange={e=>{const v=parseInt(e.target.value);updateStyle({rx:v,ry:v})}} style={{ width:'100%' }}/>
                  </div>
                </>}

                {/* Opacity */}
                <div style={{ marginBottom:8 }}>
                  <label style={{ fontSize:10, color:'var(--text-3)', display:'block', marginBottom:3 }}>Transparenca: {opacity}%</label>
                  <input type="range" min={0} max={100} value={opacity} onChange={e=>{const v=parseInt(e.target.value);setOpacity(v);updateStyle({opacity:v/100})}} style={{ width:'100%' }}/>
                </div>
              </>
            )}
          </div>

          {/* LAYERS PANEL */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
            <button onClick={()=>setShowLayers(!showLayers)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'none', border:'none', cursor:'pointer', color:'var(--text-1)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <Layers size={14} style={{ color:'#9B5CF8' }}/>
                <span style={{ fontSize:12, fontWeight:700 }}>Layers ({layers.length})</span>
              </div>
              {showLayers ? <ChevronUp size={13} style={{ color:'var(--text-3)' }}/> : <ChevronDown size={13} style={{ color:'var(--text-3)' }}/>}
            </button>
            {showLayers && (
              <div style={{ borderTop:'1px solid var(--border)', maxHeight:280, overflowY:'auto' }}>
                {layers.length === 0 ? (
                  <p style={{ fontSize:11, color:'var(--text-3)', textAlign:'center', padding:'16px 0' }}>Canvas është bosh</p>
                ) : layers.map((lay, i) => (
                  <div key={lay.id} onClick={()=>selectLayer(lay)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:activeLayerId===lay.obj.__uid?'rgba(124,58,237,0.12)':'transparent', borderBottom:'1px solid var(--border)', cursor:'pointer', opacity:lay.visible?1:0.4 }}>
                    {/* Type icon */}
                    <span style={{ fontSize:11, color:'var(--text-3)', flexShrink:0 }}>
                      {lay.type==='i-text'||lay.type==='text' ? '𝐓' : lay.type==='rect' ? '▬' : lay.type==='image' ? '🖼' : '◦'}
                    </span>
                    {/* Name */}
                    <input
                      value={lay.name}
                      onChange={e=>renameLay(lay, e.target.value)}
                      onClick={e=>e.stopPropagation()}
                      style={{ flex:1, background:'transparent', border:'none', color:activeLayerId===lay.obj.__uid?'var(--purple)':'var(--text-1)', fontSize:11, outline:'none', cursor:'text', minWidth:0 }}
                    />
                    {/* Controls */}
                    <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                      <button onClick={e=>{e.stopPropagation();moveLayerUp(lay)}} title="Lart" style={{ padding:'2px 4px', border:'none', background:'transparent', color:'var(--text-3)', cursor:'pointer', fontSize:11 }}>↑</button>
                      <button onClick={e=>{e.stopPropagation();moveLayerDown(lay)}} title="Poshtë" style={{ padding:'2px 4px', border:'none', background:'transparent', color:'var(--text-3)', cursor:'pointer', fontSize:11 }}>↓</button>
                      <button onClick={e=>{e.stopPropagation();toggleVisibility(lay)}} title={lay.visible?'Fshih':'Trego'}
                        style={{ padding:'2px 4px', border:'none', background:'transparent', color:lay.visible?'var(--text-3)':'var(--border)', cursor:'pointer', display:'flex' }}>
                        {lay.visible ? <Eye size={11}/> : <EyeOff size={11}/>}
                      </button>
                      <button onClick={e=>{e.stopPropagation();toggleLock(lay)}} title={lay.locked?'Zhblloko':'Blloko'}
                        style={{ padding:'2px 4px', border:'none', background:'transparent', color:lay.locked?'#F59E0B':'var(--text-3)', cursor:'pointer', display:'flex' }}>
                        {lay.locked ? <Lock size={11}/> : <Unlock size={11}/>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
