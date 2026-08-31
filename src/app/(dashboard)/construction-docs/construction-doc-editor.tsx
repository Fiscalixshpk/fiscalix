'use client'
import { useState } from 'react'
import { Printer, FileText, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Company { name?: string; address?: string; vat_number?: string; phone?: string; email?: string }

const TEMPLATES = [
  {
    label: 'Kontratë Ndërtimi',
    content: `KONTRATË PËR KRYERJEN E PUNIMEVE TË NDËRTIMIT

Datë: [DATA]    Nr. Kontratës: _______________

PALËT KONTRAKTUESE:

KONTRAKTORIT:
Kompania: [EMRI I FIRMËS]
Adresa: [ADRESA]
NUI TVSH: [NUI]
Telefon: [TELEFON]
Përfaqësohet nga: ___________________________

INVESTITORIT/POROSITËSIT:
Emri/Kompania: ___________________________
Adresa: ___________________________
NUI (nëse kompani): ___________________________
Telefon: ___________________________

OBJEKTI I KONTRATËS:
Ndërtimi/Rinovimi i: ___________________________
Lokacioni i Punimeve: ___________________________
Sipërfaqja: ___________________________  m²

VLERA E KONTRATËS DHE PAGESAT:
Vlera totale e kontratës:  € ___________________________
Avans (para fillimit - ____%): € ___________________________
Situata mujore sipas përparimit: ___________________________
Pagesa përfundimtare (pas dorëzimit): € ___________________________
TVSH (18%): € ___________________________
VLERA TOTALE ME TVSH: € ___________________________

AFATI I REALIZIMIT:
Data e fillimit: ___________________________
Data e përfundimit: ___________________________
Penalitet për vonesë: € ____________ / ditë kalendarike

DETYRIMET E KONTRAKTORIT:
1. Të kryejë punimet sipas projektit teknik të miratuar.
2. Të sigurojë materialet e specifikuara në kontratë.
3. Të respektojë standardet e ndërtimit dhe rregulloret në fuqi.
4. Të mbajë vendndodhjen e punës të sigurt dhe të pastër.
5. Të sigurojë garancion pas dorëzimit: _____ vjet.

DETYRIMET E INVESTITORIT:
1. Të paguajë avansin para fillimit të punimeve.
2. Të kryejë pagesat sipas situatave mujore brenda 15 ditëve.
3. Të sigurojë akses të lirë në vendndodhje.
4. Të mos ndërhyjë në drejtimin teknik të punimeve.

MATERIALE DHE SPECIFIKIME:
Materiale kryesore të ofruara nga kontraktor: ___________________________
Materiale të ofruara nga investitori: ___________________________

GARANCIA:
Kontraktorit i garantohet cilësia e punimeve për _____ vjet pas dorëzimit.
Defektet e zbuluara gjatë periudhës së garancionit riparohen falas.

ZGJIDHJA E MOSMARRËVESHJEVE:
Çdo mosmarrëveshje zgjidhet me marrëveshje, ose Gjykatën kompetente.

Ky kontratë u nënshkrua në dy kopje origjinale, nga një për secilën palë.


KONTRAKTORIT:                      INVESTITORI/POROSITUESI:


_______________________          _______________________
(Emri, Nënshkrimi, Vula)          (Emri dhe Nënshkrimi)

Data: ___________________          Data: ___________________`,
  },
  {
    label: 'Procesverbal Dorëzim-Pranim',
    content: `PROCESVERBAL I DORËZIM-PRANIMIT TË PUNIMEVE

Datë: ___________________________
Nr. Kontratës: ___________________________

PALËT:
Kontraktorit: [EMRI I FIRMËS]
Investitori: ___________________________
Projekti: ___________________________
Lokacioni: ___________________________

PUNIMET E KRYERA:
Konstatohet se janë realizuar punimet e mëposhtme sipas kontratës:

1. ___________________________ ✓
2. ___________________________ ✓
3. ___________________________ ✓
4. ___________________________ ✓
5. ___________________________ ✓

VLERËSIMI I CILËSISË:
☐ Punimet janë kryer sipas projektit teknik dhe standardeve
☐ Materiale të përdorura: sipas specifikimeve
☐ Cilësia e punimeve: e kënaqshme

VËREJTJE DHE DEFI CIENCAT (nëse ka):
___________________________
___________________________

Afati i korrigjimit të deficiencave: ___________________________

PËRFUNDIMI:
Palët konstatojnë dhe marrin dakord se punimet janë dorëzuar dhe pranuar sipas kushteve të kontratës.

Periudha e garancionit fillon nga data e nënshkrimit të këtij procesverbali.


KONTRAKTORIT:                      INVESTITORI/POROSITUESI:


_______________________          _______________________
(Emri, Nënshkrimi, Vula)          (Emri dhe Nënshkrimi)

Data: ___________________          Data: ___________________`,
  },
  { label: 'Dokument i Zbrazët', content: '' },
]

export default function ConstructionDocEditor({ company }: { company: any }) {
  const [title, setTitle] = useState('Kontratë Ndërtimi')
  const [content, setContent] = useState('')

  function applyTemplate(t: typeof TEMPLATES[number]) {
    setTitle(t.label)
    setContent(t.content
      .replace('[EMRI I FIRMËS]', company?.name || '')
      .replace('[ADRESA]', company?.address || '')
      .replace('[NUI]', company?.vat_number || '')
      .replace('[TELEFON]', company?.phone || '')
      .replace('[DATA]', new Date().toLocaleDateString('sq-AL')))
  }

  function printDoc() {
    if (!content.trim()) { toast.error('Shkruaj përmbajtjen e dokumentit'); return }
    const win = window.open('', '_blank')
    if (!win) { toast.error('Lejo popup-et në browser'); return }
    win.document.write(`<!DOCTYPE html><html lang="sq"><head><meta charset="UTF-8">
<style>
  @page{size:A4;margin:20mm 18mm} *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{font-family:'Times New Roman',serif;font-size:11.5pt;color:#000;line-height:1.7}
  .toolbar{position:fixed;top:0;left:0;right:0;background:#1F1135;padding:10px 20px;display:flex;gap:10px;align-items:center;z-index:100}
  .toolbar button{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600;font-family:sans-serif}
  .btn-print{background:#F59E0B;color:#111}
  .btn-close{margin-left:auto;background:var(--bg-muted);color:var(--bg-muted)}
  .page{background:white;width:210mm;min-height:297mm;padding:20mm 18mm;box-shadow:0 4px 24px rgba(0,0,0,0.15)}
  pre{white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:11.5pt;line-height:1.8}
</style></head><body>
  <button class="btn-print" onclick="window.print()">🖨️ Printo / Shkarko PDF</button>
</div>
</style></head><body>
<div class="toolbar">
  <button class="btn-print" onclick="window.print()">🖨️ Printo / Shkarko PDF</button>
  <button class="btn-close" onclick="window.close()">✕ Mbyll</button>
</div>
<div class="page-wrap"><div class="page">
<h1>${title}</h1>
<pre>${content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
</div></div></body></html>`)
    win.document.close()
  }

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }

  return (
    <div className="page-enter" style={{ maxWidth:900, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>Dokumenta Ndërtimi</h1>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>Kontrata, procesverbale dhe dokumente teknike</p>
        </div>
        <button onClick={printDoc} style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:12, background:'linear-gradient(135deg,#B45309,#F59E0B)', color:'white', fontWeight:700, fontSize:14, border:'none', cursor:'pointer' }}>
          <Printer size={16}/> Printo / PDF
        </button>
      </div>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 20px', marginBottom:14 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-1)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Template</p>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {TEMPLATES.map((t, i) => (
            <button key={i} onClick={() => applyTemplate(t)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, border:'1px solid rgba(245,158,11,0.3)', background:'rgba(245,158,11,0.07)', color:'#92400E', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              {i === TEMPLATES.length-1 ? <Plus size={12}/> : <FileText size={12}/>} {t.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 20px' }}>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em' }}>Titulli</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} style={I}/>
        </div>
        <label style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em' }}>Përmbajtja</label>
        <textarea value={content} onChange={e=>setContent(e.target.value)} rows={28}
          placeholder="Shkruaj dokumentin këtu ose zgjedh template..." style={{ ...I, resize:'vertical', fontFamily:'Georgia,serif', fontSize:13, lineHeight:1.8, minHeight:480 }}/>
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
          <button onClick={printDoc} style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, background:'linear-gradient(135deg,#B45309,#F59E0B)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
            Shkarko PDF
          </button>
        </div>
      </div>
    </div>
  )
}
