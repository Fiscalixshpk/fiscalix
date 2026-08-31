'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const LEAVE_TYPES = ['Pushim Vjetor','Sëmundje','Mungesë','Pushim Lindje','Pushim Familjar','Tjetër']

export default function LeavesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ type: 'Pushim Vjetor', start_date: '', end_date: '', reason: '' })

  useEffect(() => {
    const s = sessionStorage.getItem('employee_session')
    if (!s) { router.push(`/employee/${slug}/login`); return }
    const p = JSON.parse(s); setSession(p)
    load(p.employee.id)
  }, [slug])

  async function load(empId: string) {
    const res = await fetch(`/api/employee/leaves?employee_id=${empId}`)
    setRequests(await res.json())
  }

  async function submit() {
    if (!form.start_date || !form.end_date) return
    setLoading(true)
    const days = Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000) + 1
    await fetch('/api/employee/leaves', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, days, employee_id: session.employee.id, company_id: session.company.id }) })
    setShowForm(false); setForm({ type: 'Pushim Vjetor', start_date: '', end_date: '', reason: '' })
    await load(session.employee.id)
    setLoading(false)
  }

  const sIcon = (s: string) => s === 'approved' ? <CheckCircle size={14} /> : s === 'rejected' ? <XCircle size={14} /> : <AlertCircle size={14} />
  const sLabel = (s: string) => s === 'approved' ? 'Aprovuar' : s === 'rejected' ? 'Refuzuar' : 'Në pritje'
  const sColor = (s: string) => s === 'approved' ? '#10B981' : s === 'rejected' ? '#EF4444' : '#F59E0B'
  const inp = { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1.5px solid #EDE9FF', background: '#FDFCFF', color: '#111827', fontSize: 13, boxSizing: 'border-box' as const, outline: 'none' }
  const lbl = { fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '.05em' }

  if (!session) return null

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7FF' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #EDE9FF', padding: '0 16px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 52 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href={`/employee/${slug}/dashboard`} style={{ color: '#9CA3AF', display: 'flex' }}><ArrowLeft size={20} /></Link>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>🏖️ Kërkesa Pushimi</h1>
          </div>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} /> Kërko
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px' }}>
        {showForm && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 22, border: '1px solid rgba(124,58,237,.2)', marginBottom: 16, boxShadow: '0 4px 20px rgba(124,58,237,.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Kërkesë e re pushimi</h3>
              <button onClick={() => setShowForm(false)} style={{ background: '#F3F0FF', border: 'none', cursor: 'pointer', width: 28, height: 28, borderRadius: 7, color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={lbl}>Lloji i Pushimit</label>
                <select style={inp} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Data e Fillimit</label>
                  <input type="date" style={inp} value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
                <div><label style={lbl}>Data e Mbarimit</label>
                  <input type="date" style={inp} value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
              </div>
              {form.start_date && form.end_date && (
                <div style={{ padding: '10px 14px', background: '#F3F0FF', borderRadius: 10, fontSize: 13, color: '#7C3AED', fontWeight: 600 }}>
                  📅 {Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000) + 1} ditë pushim
                </div>
              )}
              <div><label style={lbl}>Arsyeja (opsionale)</label>
                <textarea style={{ ...inp, height: 70, resize: 'none' }} placeholder="Sheno arsyen..." value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} /></div>
              <button onClick={submit} disabled={loading || !form.start_date || !form.end_date}
                style={{ padding: '12px', borderRadius: 11, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? .7 : 1 }}>
                {loading ? 'Duke dërguar...' : 'Dërgo Kërkesën'}
              </button>
            </div>
          </div>
        )}

        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: '#9CA3AF' }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>🏖️</p>
            <p style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Nuk ka kërkesa</p>
            <p style={{ fontSize: 13 }}>Kliko "Kërko" për të bërë kërkesë pushimi</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {requests.map(r => (
              <div key={r.id} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #EDE9FF', boxShadow: '0 2px 6px rgba(0,0,0,.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: '0 0 4px' }}>{r.type}</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{r.start_date} → {r.end_date} · <strong style={{ color: '#374151' }}>{r.days} ditë</strong></p>
                    {r.reason && <p style={{ fontSize: 12, color: '#6B7280', margin: '6px 0 0', fontStyle: 'italic' }}>{r.reason}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: sColor(r.status), padding: '4px 10px', borderRadius: 99, background: sColor(r.status) + '15' }}>
                    {sIcon(r.status)} {sLabel(r.status)}
                  </div>
                </div>
                {r.notes && <div style={{ marginTop: 10, padding: '8px 12px', background: '#F8F7FF', borderRadius: 8, fontSize: 12, color: '#6B7280' }}>Shënim: {r.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
