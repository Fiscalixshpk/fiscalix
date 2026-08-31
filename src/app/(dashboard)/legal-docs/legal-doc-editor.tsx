'use client'

import { useState } from 'react'
import { FileDown, Printer, Plus, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface Company { name?: string; address?: string; vat_number?: string; phone?: string; email?: string }

const TEMPLATES = [
  {
    label: 'Kontratë Shërbimi',
    content: `KONTRATË PËR SHËRBIME JURIDIKE

Datë: [DATA]

PALËT KONTRAKTUESE:

AVOKATI/FIRMA JURIDIKE:
[EMRI I FIRMËS]
[ADRESA]
NUI: [NUMRI FISKAL]

KLIENTI/PALA:
Emri: ___________________________
Adresa: ___________________________
NUI (nëse kompani): ___________________________

OBJEKTI I KONTRATËS:
Ky kontratë rregullon marrëdhëniet ndërmjet palëve për ofrimin e shërbimeve juridike si vijon:

___________________________
___________________________
___________________________

HONORARI DHE KUSHTET E PAGESËS:
Honorari total i rënë dakord: € ___________________________
Mënyra e pagesës: ___________________________
Afati i pagesës: ___________________________

DETYRIMET E AVOKATIT:
1. Të përfaqësojë klientin me profesionalizëm dhe dili.
2. Të ruajë konfidencialitetin e plotë të çështjes.
3. Të informojë klientin për ecurinë e çështjes.

DETYRIMET E KLIENTIT:
1. Të paguajë honorarin sipas marrëveshjes.
2. Të ofrojë dokumentacionin e nevojshëm.
3. Të respektojë këshillat juridike të avokatit.

KONFIDENCIALITETI:
Të gjitha informatat e shkëmbyera midis palëve janë konfidenciale dhe mbrohen sipas Ligjit nr. 04/L-193 për Avokatinë.

ZGJIDHJA E MOSMARRËVESHJEVE:
Çdo mosmarrëveshje do të zgjidhet me marrëveshje reciproke ose nëpërmjet Gjykatës kompetente në Kosovë.

DISPOZITAT E FUNDIT:
Ky kontratë hyn në fuqi me datën e nënshkrimit nga të dyja palët dhe është i vlefshëm deri në përfundimin e shërbimeve të rënë dakord.


AVOKATI/FIRMA JURIDIKE          KLIENTI/PALA


_______________________          _______________________
(Emri dhe Nënshkrimi)             (Emri dhe Nënshkrimi)


Data: ___________________          Data: ___________________`,
  },
  {
    label: 'Prokurë e Posaçme',
    content: `PROKURË E POSAÇME

Unë, i nënshkruari/a:

Emri: ___________________________
Atësia: ___________________________
Datëlindja: ___________________________
Nr. i Letërnjoftimit: ___________________________
Adresa: ___________________________

me anë të kësaj PROKURE autorizoj:

Emri i Autorizuarit: ___________________________
Cilësia: ___________________________

që në emrin tim dhe për llogari time të kryejë veprimet e mëposhtme:

___________________________
___________________________
___________________________
___________________________

Kjo prokurë është e vlefshme nga data e lëshimit deri më: ___________________________

Autorizuesi ka të drejtë të nënshkruajë çdo dokument dhe të kryejë çdo veprim ligjor të nevojshëm për realizimin e qëllimit të mësipërm.


Lëshuar në: ___________________________
Datë: ___________________________


PROKURËDHËNËSI:                    PROKURËMARRËSI:


_______________________          _______________________
(Emri dhe Nënshkrimi)             (Emri dhe Nënshkrimi)


VULA E NOTERIT (nëse nevojitet):`,
  },
  {
    label: 'Marrëveshje Konfidencialiteti (NDA)',
    content: `MARRËVESHJE E KONFIDENCIALITETIT (NDA)

Datë: ___________________________

PALËT:

Pala Zbuluese:
Emri/Kompania: ___________________________
Adresa: ___________________________

Pala Marrëse:
Emri/Kompania: ___________________________
Adresa: ___________________________

QËLLIMI:
Palët dëshirojnë të shkëmbejnë informacion konfidencial në lidhje me:
___________________________
___________________________

INFORMACIONI KONFIDENCIAL përfshin:
- Informacionin financiar dhe komercial
- Planifikimet strategjike dhe biznesore
- Të dhënat e klientëve dhe partnerëve
- Teknologjitë dhe proceset e punës
- Çdo informacion tjetër të etiketuar si "Konfidencial"

DETYRIMET E PALËS MARRËSE:
1. Ta mbajë informacionin rreptësisht konfidencial.
2. Ta përdorë vetëm për qëllimin e përcaktuar.
3. Të mos e zbulojë palëve të treta pa leje me shkrim.
4. Të njoftojë menjëherë për çdo zbulim të paautorizuar.

PËRJASHTIMET:
Kjo marrëveshje nuk zbatohet për informacionin që:
- Është tashmë publik pa faj të Palës Marrëse
- Dihet nga Pala Marrëse para marrëveshjes
- Zbulohet nga palë e tretë e pavarur

KOHËZGJATJA: _____ vjet nga data e nënshkrimit.

SHKELJET: Çdo shkelje do të sjellë dëmshpërblim sipas legjislacionit në fuqi.


PALA ZBULUESE:                     PALA MARRËSE:


_______________________          _______________________
(Emri dhe Nënshkrimi)             (Emri dhe Nënshkrimi)

Data: ___________________          Data: ___________________`,
  },
  {
    label: 'Marrëveshje Punësimi',
    content: `KONTRATË E PUNËS

Datë: ___________________________

PUNËDHËNËSI:
Kompania: ___________________________
NUI: ___________________________
Adresa: ___________________________
Përfaqësohet nga: ___________________________

PUNËMARRËSI:
Emri i plotë: ___________________________
Datëlindja: ___________________________
Nr. i Letërnjoftimit: ___________________________
Adresa: ___________________________

POZITA DHE DETYRAT:
Pozita e punës: ___________________________
Departamenti: ___________________________
Mbikëqyrësi direkt: ___________________________
Detyrat kryesore: ___________________________

KOHËZGJATJA:
☐ Kontratë e përhershme
☐ Kontratë me afat të caktuar: nga _____________ deri _____________ 
☐ Periudhë prove: _____ muaj

PAGA DHE BENEFICIONET:
Paga bruto mujore: € ___________________________
Kontributet pensionale punëdhënës (5%): € ___________________________
Kontributet pensionale punëmarrës (5%): € ___________________________
Paga neto: € ___________________________
Pushimi vjetor: _____ ditë pune

ORARI I PUNËS:
Orari: ___________________________ 
Ditët e punës: ___________________________

KUSHTET E NDËRPRERJES:
Afati i njoftimit: _____ ditë kalendarike nga të dyja palët.

Ky kontratë është hartuar në dy kopje origjinale, nga një për secilën palë.


PUNËDHËNËSI:                       PUNËMARRËSI:


_______________________          _______________________
(Emri dhe Nënshkrimi)             (Emri dhe Nënshkrimi)
(Vula e Kompanisë)

Data: ___________________          Data: ___________________`,
  },
  { label: 'Dokument i Zbrazët', content: '' },
]

export default function LegalDocEditor({ company }: { company: Company | null }) {
  const [title, setTitle] = useState('Dokument Juridik')
  const [content, setContent] = useState('')
  const [printing, setPrinting] = useState(false)

  function applyTemplate(t: typeof TEMPLATES[number]) {
    setTitle(t.label)
    const filled = t.content
      .replace('[EMRI I FIRMËS]', company?.name || '')
      .replace('[ADRESA]', company?.address || '')
      .replace('[NUMRI FISKAL]', company?.vat_number || '')
    setContent(filled)
  }

  function printDoc() {
    setPrinting(true)
    const html = `<!DOCTYPE html>
<html lang="sq">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4 portrait; margin: 25mm 20mm }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important }
  body { font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; color: #000; line-height: 1.6 }
  .toolbar { position:fixed; top:0; left:0; right:0; background:#1a1a2e; padding:10px 20px; display:flex; gap:10px; align-items:center; z-index:100 }
  .toolbar button { padding:8px 16px; border-radius:8px; border:none; cursor:pointer; font-size:13px; font-weight:600; font-family:sans-serif }
  .btn-print { background:#8B5CF6; color:white }
  .btn-close { margin-left:auto; background:var(--bg-muted); color:var(--bg-muted) }
  .page { background:white; width:210mm; min-height:297mm; padding:25mm 20mm; box-shadow:0 4px 32px rgba(0,0,0,0.15) }
  pre { white-space:pre-wrap; font-family:'Times New Roman',Georgia,serif; font-size:12pt; line-height:1.8 }
</style>
<body>
  <button class="btn-print" onclick="window.print()">🖨️ Printo / Shkarko PDF</button>
</style>
</head>
<body>
<div class="toolbar">
  <button class="btn-print" onclick="window.print()">🖨️ Printo / Shkarko PDF</button>
  <button class="btn-close" onclick="window.close()">✕ Mbyll</button>
</div>
<div class="page-wrap"><div class="page">
<h1>${title}</h1>
<pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</div></div>
</body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    } else {
      toast.error('Lejo popup-et në browser')
    }
    setPrinting(false)
  }

  const I = { background: 'var(--bg-input,var(--bg-muted))', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--text-1)', fontSize: 13, width: '100%', outline: 'none' }

  return (
    <div className="page-enter" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>Dokumenta Juridike</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Krijo, edito dhe shkarko dokumenta juridike si PDF</p>
        </div>
        <button onClick={printDoc} disabled={!content.trim() || printing}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 12, background: content.trim() ? 'linear-gradient(135deg,#6D28D9,#8B5CF6)' : 'var(--bg-muted)', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', cursor: content.trim() ? 'pointer' : 'not-allowed', opacity: content.trim() ? 1 : 0.5 }}>
          <Printer size={16} /> Printo / Shkarko PDF
        </button>
      </div>

      {/* Templates */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color:'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Template të Gatshme</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TEMPLATES.map((t, i) => (
            <button key={i} onClick={() => applyTemplate(t)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.07)', color: 'var(--purple)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {i === TEMPLATES.length - 1 ? <Plus size={12} /> : <FileText size={12} />} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Titulli i Dokumentit</label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={I} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Përmbajtja</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Shkruaj dokumentin juridik këtu... ose zgjedh një template nga lart."
            rows={30}
            style={{ ...I, resize: 'vertical', fontFamily: 'Georgia, serif', fontSize: 13, lineHeight: 1.8, minHeight: 500 }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{content.length} karaktere</p>
          <button onClick={printDoc} disabled={!content.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, background: content.trim() ? 'linear-gradient(135deg,#6D28D9,#8B5CF6)' : 'var(--bg-muted)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: content.trim() ? 'pointer' : 'not-allowed', opacity: content.trim() ? 1 : 0.5 }}>
            <FileDown size={14} /> Shkarko si PDF
          </button>
        </div>
      </div>
    </div>
  )
}
