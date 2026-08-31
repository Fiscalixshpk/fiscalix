'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Users, BookOpen, Award, TrendingUp, Search } from 'lucide-react'

interface Props { companyId: string; data1: any[]; data2: any[]; data3: any[] }

export default function EduModuleClient({ companyId, data1: iStudents, data2: iCourses, data3: iEnrollments }: Props) {
  const [tab, setTab] = useState('overview')
  const [students, setStudents] = useState(iStudents || [])
  const [courses, setCourses] = useState(iCourses || [])
  const [enrollments, setEnrollments] = useState(iEnrollments || [])
  const [showForm, setShowForm] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }
  const L = { fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'0.06em' }
  const S = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', marginBottom:14 }

  const activeStudents = students.filter(s => s.status === 'active').length
  const totalRevenue = enrollments.reduce((s, e) => s + Number(e.total_fee || 0), 0)
  const totalPaid = enrollments.reduce((s, e) => s + Number(e.paid_amount || 0), 0)
  const activeEnrollments = enrollments.filter(e => e.status === 'active').length

  async function addStudent(f: any) {
    const { data, error } = await supabase.from('edu_students').insert({ ...f, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setStudents(s => [data, ...s]); setShowForm(null); toast.success('Studenti u shtua')
  }

  async function addCourse(f: any) {
    const { data, error } = await supabase.from('edu_courses').insert({ ...f, price: parseFloat(f.price)||0, duration_weeks: parseInt(f.duration_weeks)||0, max_students: parseInt(f.max_students)||20, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setCourses(c => [data, ...c]); setShowForm(null); toast.success('Kursi u shtua')
  }

  async function addEnrollment(f: any) {
    const { data, error } = await supabase.from('edu_enrollments').insert({ ...f, total_fee: parseFloat(f.total_fee)||0, paid_amount: 0, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setEnrollments(e => [data, ...e]); setShowForm(null); toast.success('Regjistrimi u shtua')
  }

  const filteredStudents = useMemo(() => students.filter(s => !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search)), [students, search])

  return (
    <div className="page-enter">
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>📚 Moduli i Arsimit</h1>
        <p style={{ fontSize:13, color:'var(--text-3)' }}>Studentët, kurset, regjistrimet, pagesat</p>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {['overview','students','courses','enrollments'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${tab===t?'rgba(124,58,237,0.4)':'var(--border)'}`, background:tab===t?'rgba(124,58,237,0.12)':'var(--bg-card)', color:tab===t?'var(--purple)':'var(--text-2)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            {({overview:'Pasqyra',students:'Studentët',courses:'Kurset',enrollments:'Regjistrimet'} as any)[t]}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
            {[
              { label:'Studentë Aktivë', value:activeStudents.toString(), color:'#3B82F6', icon:'👥' },
              { label:'Kurse', value:courses.filter(c => c.status==='active').length.toString(), color:'#9B5CF8', icon:'📖' },
              { label:'Regjistr. Aktive', value:activeEnrollments.toString(), color:'#10B981', icon:'✅' },
              { label:'Të Ardhura', value:`€${totalRevenue.toLocaleString()}`, color:'#F59E0B', icon:'💰' },
              { label:'Arkëtuar', value:`€${totalPaid.toLocaleString()}`, color:'#10B981', icon:'📥' },
              { label:'Mbetur', value:`€${(totalRevenue-totalPaid).toLocaleString()}`, color:'#EF4444', icon:'📋' },
            ].map((k,i) => (
              <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', borderTop:`3px solid ${k.color}` }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{k.icon} {k.label}</p>
                <p style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:900, color:k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
          <div style={S}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>Studentët e Rinj</p>
            {students.slice(0,6).map(s => (
              <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>{s.full_name}</p>
                  <p style={{ fontSize:11, color:'var(--text-1)' }}>{s.phone || '—'} · {s.enrollment_date || '—'}</p>
                </div>
                <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:s.status==='active'?'rgba(16,185,129,0.1)':'rgba(107,114,128,0.1)', color:s.status==='active'?'#10B981':'#6B7280' }}>
                  {s.status==='active'?'🟢 Aktiv':s.status==='graduated'?'🎓 Diplomuar':'⬛ Joaktiv'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'students' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kërko student..." style={{ ...I, paddingLeft:36 }}/>
            </div>
            <button onClick={() => setShowForm('student')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Student i Ri
            </button>
          </div>
          {showForm === 'student' && <SF fields={[
            ['full_name','Emri i Plotë *','text'],['date_of_birth','Data Lindjes','date'],
            ['gender','Gjinia','text'],['phone','Telefoni','text'],['email','Email','text'],
            ['parent_name','Prindi/Kujdestari','text'],['parent_phone','Tel. Prindi','text'],
            ['enrollment_date','Data Regj.','date'],['id_number','Nr. Personal','text'],
          ]} onSave={addStudent} onCancel={() => setShowForm(null)} I={I} L={L}/>}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Emri</th><th>Telefoni</th><th>Prindi</th><th>Data Regj.</th><th>Kurse</th><th>Statusi</th></tr></thead>
              <tbody>
                {filteredStudents.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight:700 }}>{s.full_name}</td>
                    <td style={{ fontSize:12 }}>{s.phone || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{s.parent_name || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-1)' }}>{s.enrollment_date || '—'}</td>
                    <td style={{ textAlign:'center', fontWeight:700, color:'#9B5CF8' }}>{enrollments.filter(e => e.student_id === s.id).length}</td>
                    <td><span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:s.status==='active'?'rgba(16,185,129,0.1)':'rgba(99,102,241,0.1)', color:s.status==='active'?'#10B981':'#818CF8' }}>
                      {s.status==='active'?'🟢 Aktiv':s.status==='graduated'?'🎓 Diplomuar':'⬛ Joaktiv'}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'courses' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button onClick={() => setShowForm('course')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Kurs i Ri
            </button>
          </div>
          {showForm === 'course' && <SF fields={[
            ['name','Emri Kursit *','text'],
            ['category','Kategoria','text'],
            ['duration_weeks','Kohëzgjatja (javë)','number'],
            ['price','Çmimi (€)','number'],
            ['max_students','Max Studentë','number'],
            ['schedule','Orari','text'],
            ['instructor','Instruktori','text'],
          ]} onSave={addCourse} onCancel={() => setShowForm(null)} I={I} L={L}/>}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:12 }}>
            {courses.map(c => (
              <div key={c.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)' }}>{c.name}</p>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'rgba(16,185,129,0.1)', color:'var(--text-1)' }}>🟢 Aktiv</span>
                </div>
                <p style={{ fontSize:12, color:'var(--text-3)', marginBottom:6 }}>📖 {c.category || '—'} · ⏱️ {c.duration_weeks} javë</p>
                <p style={{ fontSize:12, color:'var(--text-3)', marginBottom:8 }}>👩‍🏫 {c.instructor || '—'} · 🕐 {c.schedule || '—'}</p>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <p style={{ fontFamily:'Poppins,sans-serif', fontSize:18, fontWeight:800, color:'var(--text-1)' }}>€{Number(c.price||0).toFixed(0)}</p>
                  <p style={{ fontSize:11, color:'var(--text-3)' }}>{enrollments.filter(e => e.course_id === c.id && e.status==='active').length}/{c.max_students} studentë</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'enrollments' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button onClick={() => setShowForm('enrollment')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Regjistrim i Ri
            </button>
          </div>
          {showForm === 'enrollment' && <SFSelect
            studentOptions={students.map(s => [s.id, s.full_name])}
            courseOptions={courses.map(c => [c.id, `${c.name} — €${c.price}`])}
            onSave={addEnrollment} onCancel={() => setShowForm(null)} I={I} L={L}/>}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Studenti</th><th>Kursi</th><th>Data Regj.</th><th style={{ textAlign:'right' }}>Tarifa</th><th style={{ textAlign:'right' }}>Paguar</th><th style={{ textAlign:'right' }}>Mbetur</th><th>Statusi</th></tr></thead>
              <tbody>
                {enrollments.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight:700 }}>{students.find(s => s.id === e.student_id)?.full_name || '—'}</td>
                    <td style={{ fontSize:12 }}>{courses.find(c => c.id === e.course_id)?.name || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{e.enrollment_date || '—'}</td>
                    <td style={{ textAlign:'right', fontWeight:700 }}>€{Number(e.total_fee||0).toFixed(0)}</td>
                    <td style={{ textAlign:'right', color:'var(--text-1)' }}>€{Number(e.paid_amount||0).toFixed(0)}</td>
                    <td style={{ textAlign:'right', color:'var(--text-1)' }}>€{(Number(e.total_fee||0)-Number(e.paid_amount||0)).toFixed(0)}</td>
                    <td><span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:e.status==='active'?'rgba(16,185,129,0.1)':e.status==='completed'?'rgba(99,102,241,0.1)':'rgba(239,68,68,0.1)', color:e.status==='active'?'#10B981':e.status==='completed'?'#818CF8':'#EF4444' }}>
                      {e.status==='active'?'🟢 Aktiv':e.status==='completed'?'🎓 Kompletuar':'⬛ Ndalur'}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function SF({ fields, onSave, onCancel, I, L }: any) {
  const [form, setForm] = useState<Record<string, string>>({})
  return (
    <div style={{ background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:14, padding:16, marginBottom:14 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:12 }}>
        {fields.map(([key, label, type]: [string, string, string]) => (
          <div key={key}>
            <label style={L}>{label}</label>
            <input type={type} value={form[key]||''} onChange={e => setForm(p => ({...p,[key]:e.target.value}))} style={I}/>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onSave(form)} style={{ padding:'8px 20px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>Shto</button>
        <button onClick={onCancel} style={{ padding:'8px 16px', borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--text-1)', fontSize:13, cursor:'pointer' }}>Anulo</button>
      </div>
    </div>
  )
}

function SFSelect({ studentOptions, courseOptions, onSave, onCancel, I, L }: any) {
  const [form, setForm] = useState<Record<string, string>>({})
  return (
    <div style={{ background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:14, padding:16, marginBottom:14 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:12 }}>
        <div><label style={L}>Studenti *</label>
          <select value={form.student_id||''} onChange={e => setForm(p => ({...p, student_id:e.target.value}))} style={I}>
            <option value="">Zgjidh studentin</option>
            {studentOptions.map(([v,l]: [string,string]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div><label style={L}>Kursi *</label>
          <select value={form.course_id||''} onChange={e => setForm(p => ({...p, course_id:e.target.value}))} style={I}>
            <option value="">Zgjidh kursin</option>
            {courseOptions.map(([v,l]: [string,string]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div><label style={L}>Data Regj.</label><input type="date" value={form.enrollment_date||''} onChange={e => setForm(p => ({...p, enrollment_date:e.target.value}))} style={I}/></div>
        <div><label style={L}>Tarifa (€)</label><input type="number" value={form.total_fee||''} onChange={e => setForm(p => ({...p, total_fee:e.target.value}))} style={I}/></div>
        <div><label style={L}>Fillimi</label><input type="date" value={form.start_date||''} onChange={e => setForm(p => ({...p, start_date:e.target.value}))} style={I}/></div>
        <div><label style={L}>Mbarimi</label><input type="date" value={form.end_date||''} onChange={e => setForm(p => ({...p, end_date:e.target.value}))} style={I}/></div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onSave(form)} style={{ padding:'8px 20px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>Regjistro</button>
        <button onClick={onCancel} style={{ padding:'8px 16px', borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--text-1)', fontSize:13, cursor:'pointer' }}>Anulo</button>
      </div>
    </div>
  )
}
