'use client'
import { useState } from 'react'
import { Award, Printer } from 'lucide-react'
import { toast } from 'sonner'

interface Company { name?: string; address?: string; phone?: string; email?: string }

export default function CertificateEditor({ company }: { company: any }) {
  const [form, setForm] = useState({
    student_name: '',
    course_name: '',
    duration: '',
    completion_date: new Date().toISOString().split('T')[0],
    instructor: '',
    grade: '',
    cert_number: `CERT-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000)}`,
    theme: 'purple',
  })

  const themes: Record<string, { bg: string; accent: string; text: string; border: string; light: string }> = {
    purple: { bg: '#1a0a2e', accent: '#7C3AED', text: '#DDD6FE', border: '#4C1D95', light: '#F5F3FF' },
    blue:   { bg: '#0c1a3d', accent: '#2563EB', text: '#BFDBFE', border: '#1E3A8A', light: '#EFF6FF' },
    gold:   { bg: '#1c1007', accent: '#D97706', text: '#FDE68A', border: '#92400E', light: '#FFFBEB' },
    green:  { bg: '#0a1f0f', accent: '#059669', text: '#A7F3D0', border: '#064E3B', light: '#ECFDF5' },
  }

  function printCert() {
    if (!form.student_name.trim() || !form.course_name.trim()) {
      toast.error('Shto emrin e studentit dhe kursin')
      return
    }
    const t = themes[form.theme]
    const dateStr = new Date(form.completion_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })

    const html = `<!DOCTYPE html><html lang="sq"><head><meta charset="UTF-8">
<style>
  @page{size:A4 landscape;margin:0} *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{font-family:'Georgia',serif;background:#e5e7eb}
  .toolbar{position:fixed;top:0;left:0;right:0;background:#111;padding:10px 20px;display:flex;gap:10px;align-items:center;z-index:100}
  .toolbar button{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600}
  .btn-p{background:${t.accent};color:white}
  .btn-c{margin-left:auto;background:var(--bg-muted);color:var(--bg-muted)}
  .page-wrap{padding-top:52px;display:flex;justify-content:center;padding-bottom:30px}
  .cert{background:${t.bg};width:297mm;height:210mm;position:relative;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.4);display:flex;flex-direction:column;align-items:center;justify-content:center}

  /* Corner decorations */
  .corner{position:absolute;width:80px;height:80px;border-color:${t.accent};border-style:solid}
  .tl{top:20px;left:20px;border-width:3px 0 0 3px}
  .tr{top:20px;right:20px;border-width:3px 3px 0 0}
  .bl{bottom:20px;left:20px;border-width:0 0 3px 3px}
  .br{bottom:20px;right:20px;border-width:0 3px 3px 0}

  /* Inner border */
  .inner-border{position:absolute;inset:30px;border:1px solid ${t.border};border-radius:4px;pointer-events:none}

  /* Content */
  .content{text-align:center;padding:20px 60px;z-index:1}
  .inst-name{font-size:13pt;font-weight:700;color:${t.text};letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;font-family:'Helvetica Neue',sans-serif}
  .presents{font-size:10pt;color:${t.accent};letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;font-style:italic}
  .cert-title{font-size:36pt;font-weight:900;color:white;letter-spacing:-1px;margin-bottom:6px;line-height:1.1}
  .cert-sub{font-size:11pt;color:${t.text};letter-spacing:2px;text-transform:uppercase;margin-bottom:24px}
  .awarded-to{font-size:10pt;color:${t.text};letter-spacing:1px;margin-bottom:10px}
  .student-name{font-size:28pt;color:${t.accent};font-weight:700;letter-spacing:2px;margin-bottom:20px;border-bottom:2px solid ${t.border};padding-bottom:10px;display:inline-block;min-width:300px}
  .course-label{font-size:10pt;color:${t.text};letter-spacing:1px;margin-bottom:6px}
  .course-name{font-size:16pt;color:white;font-weight:700;margin-bottom:20px}

  /* Meta row */
  .meta{display:flex;gap:50px;justify-content:center;margin-bottom:24px}
  .meta-item{text-align:center}
  .meta-label{font-size:8pt;color:${t.accent};letter-spacing:2px;text-transform:uppercase;margin-bottom:3px}
  .meta-value{font-size:10pt;color:white;font-weight:600}

  /* Signatures */
  .sigs{display:flex;gap:80px;justify-content:center}
  .sig{text-align:center}
  .sig-line{width:140px;border-bottom:1px solid ${t.border};margin:0 auto 6px}
  .sig-name{font-size:9pt;color:${t.text};font-weight:600}
  .sig-title{font-size:8pt;color:${t.accent}}

  /* Cert number */
  .cert-num{position:absolute;bottom:35px;right:50px;font-size:8pt;color:${t.border};letter-spacing:1px}

  /* Watermark */
  .watermark{position:absolute;font-size:120pt;color:${t.accent};opacity:0.03;font-weight:900;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);white-space:nowrap;pointer-events:none}

  @media print{.toolbar{display:none}.page-wrap{padding:0;background:white}.cert{box-shadow:none}}
</style></head><body>
<div class="toolbar">
  <button class="btn-p" onclick="window.print()">🖨️ Printo / Shkarko PDF</button>
  <button class="btn-c" onclick="window.close()">✕</button>
</div>
<div class="page-wrap"><div class="cert">
  <div class="corner tl"></div>
  <div class="corner tr"></div>
  <div class="corner bl"></div>
  <div class="corner br"></div>
  <div class="inner-border"></div>
  <div class="watermark">✓</div>

  <div class="content">
    <div class="inst-name">${company?.name || 'Institucioni Arsimor'}</div>
    <div class="presents">Prezanton me Krenari</div>
    <div class="cert-title">Çertifikatë</div>
    <div class="cert-sub">e Përfundimit të Kursit</div>
    <div class="awarded-to">Kjo çertifikatë i lëshohet</div>
    <div class="student-name">${form.student_name}</div>
    <div class="course-label">për përfundimin me sukses të kursit</div>
    <div class="course-name">${form.course_name}</div>
    <div class="meta">
      ${form.duration ? `<div class="meta-item"><div class="meta-label">Kohëzgjatja</div><div class="meta-value">${form.duration}</div></div>` : ''}
      <div class="meta-item"><div class="meta-label">Data e Përfundimit</div><div class="meta-value">${dateStr}</div></div>
      ${form.grade ? `<div class="meta-item"><div class="meta-label">Nota / Vlerësimi</div><div class="meta-value">${form.grade}</div></div>` : ''}
    </div>
    <div class="sigs">
      ${form.instructor ? `<div class="sig"><div class="sig-line"></div><div class="sig-name">${form.instructor}</div><div class="sig-title">Instruktor</div></div>` : ''}
      <div class="sig"><div class="sig-line"></div><div class="sig-name">${company?.name || ''}</div><div class="sig-title">Drejtori / Institucioni</div></div>
    </div>
  </div>
  <div class="cert-num">Nr: ${form.cert_number}</div>
</div></div>
</body></html>`

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
    else toast.error('Lejo popup-et në browser')
  }

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }
  const L = { fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'0.06em' }
  const S = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', marginBottom:14 }

  return (
    <div className="page-enter" style={{ maxWidth:800, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>Çertifikata Kursesh</h1>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>Lësho çertifikata profesionale për studentët</p>
        </div>
        <button onClick={printCert} style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:12, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:14, border:'none', cursor:'pointer' }}>
          <Printer size={16}/> Gjenero Çertifikatën
        </button>
      </div>

      {/* Tema */}
      <div style={S}>
        <label style={L}>Tema e Dizajnit</label>
        <div style={{ display:'flex', gap:10 }}>
          {Object.entries({ purple:'Violet', blue:'Kaltër', gold:'Ari', green:'Jeshil' }).map(([key, label]) => (
            <button key={key} onClick={() => setForm(p => ({...p, theme:key}))}
              style={{ padding:'8px 18px', borderRadius:10, border:`2px solid ${form.theme===key ? '#9B5CF8' : 'var(--border)'}`, background:form.theme===key ? 'rgba(90,31,214,0.15)' : 'transparent', color:form.theme===key ? '#9B5CF8' : 'var(--text-3)', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Studenti */}
      <div style={S}>
        <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>Detajet e Çertifikatës</h3>
        <div className="form-grid-2">
          <div className="form-span-2">
            <label style={L}>Emri i Plotë i Studentit *</label>
            <input value={form.student_name} onChange={e=>setForm(p=>({...p,student_name:e.target.value}))} placeholder="Liridon Berisha" style={I}/>
          </div>
          <div className="form-span-2">
            <label style={L}>Emri i Kursit *</label>
            <input value={form.course_name} onChange={e=>setForm(p=>({...p,course_name:e.target.value}))} placeholder="Kurs Anglisht B2, Trajnim Excel, Dizajn Grafik..." style={I}/>
          </div>
          <div>
            <label style={L}>Kohëzgjatja</label>
            <input value={form.duration} onChange={e=>setForm(p=>({...p,duration:e.target.value}))} placeholder="3 muaj / 48 orë" style={I}/>
          </div>
          <div>
            <label style={L}>Data e Përfundimit</label>
            <input type="date" value={form.completion_date} onChange={e=>setForm(p=>({...p,completion_date:e.target.value}))} style={I}/>
          </div>
          <div>
            <label style={L}>Instruktori</label>
            <input value={form.instructor} onChange={e=>setForm(p=>({...p,instructor:e.target.value}))} placeholder="Prof. Agim Berisha" style={I}/>
          </div>
          <div>
            <label style={L}>Nota / Vlerësimi</label>
            <input value={form.grade} onChange={e=>setForm(p=>({...p,grade:e.target.value}))} placeholder="Shkëlqyer / 10 / A+" style={I}/>
          </div>
          <div>
            <label style={L}>Nr. Çertifikatës</label>
            <input value={form.cert_number} onChange={e=>setForm(p=>({...p,cert_number:e.target.value}))} style={I}/>
          </div>
        </div>
      </div>

      {/* Preview info */}
      <div style={{ padding:'14px 18px', borderRadius:12, background:'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.2)', display:'flex', alignItems:'center', gap:12 }}>
        <Award size={20} style={{ color:'#9B5CF8', flexShrink:0 }}/>
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:2 }}>Formati: A4 Horizontal (Landscape)</p>
          <p style={{ fontSize:11, color:'var(--text-3)' }}>Çertifikata gjenerohet me dizajn profesional, korniza dekorative dhe vendi për nënshkrim</p>
        </div>
        <button onClick={printCert} style={{ marginLeft:'auto', padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', flexShrink:0 }}>
          Gjenero →
        </button>
      </div>
    </div>
  )
}
