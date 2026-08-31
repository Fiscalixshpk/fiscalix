'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function OvertimePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], hours: '', reason: '' })

  useEffect(() => {
    const s = sessionStorage.getItem('employee_session')
    if (!s) { router.push(`/employee/${slug}/login`); return }
    const p = JSON.parse(s); setSession(p); load(p.employee.id)
  }, [slug])

  async function load(empId: string) {
    const res = await fetch(`/api/employee/overtime?employee_id=${empId}`)
    setRequests(await res.json())
  }

  async function submit() {
    if (!form.hours || !form.date) return
    setLoading(true)
    await fetch('/api/employee/overtime', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, hours: Number(form.hours), employee_id: session.employee.id, company_id: session.company.id }) })
    setShowForm(false); setForm({ date: new Date().toISOString().split('T')[0], hours: '', reason: '' })
    await load(session.employee.id); setLoading(false)
  }

  const sColor = (s: string) => s === 'approved' ? '#10B981' : s === 'rejected' ? '#EF4444' : '#F59E0B'
  const sLabel = (s: string) => s === 'approved' ? 'Aprovuar' : s === 'rejected' ? 'Refuzuar' : 'Në pritje'
  const inp = { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1.5px solid #EDE9FF', background: '#FDFCFF', color: '#111827', fontSize: 13, boxSizing: 'border-box' as const, outline: 'none' }
  const lbl = { fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '.05em' }

  if (!session) return null

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7FF' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #EDE9FF', padding: '0 16px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 52 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href={`/employee/${slug}/dashboard`} style={{ color: '#9CA3AF', display: 'flex' }}><ArrowLeft size={20} /></Link>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>⚡ Orë Shtesë</h1>
          </div>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} /> Kërko
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px' }}>
        {showForm && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 22, border: '1px solid rgba(124,58,237,.2)', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Kërkesë Orë Shtesë</h3>
              <button onClick={() => setShowForm(false)} style={{ background: '#F3F0FF', border: 'none', cursor: 'pointer', width: 28, height: 28, borderRadius: 7, color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Data</label><input type="date" style={inp} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
                <div><label style={lbl}>Orët</label><input type="number" min="0.5" step="0.5" max="12" style={inp} placeholder="p.sh. 2.5" value={form.hours} onChange={e => setForm(p => ({ ...p, hours: e.target.value }))} /></div>
              </div>
              <div><label style={lbl}>Arsyeja</label><textarea style={{ ...inp, height: 70, resize: 'none' }} placeholder="Pse punove shtesë..." value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} /></div>
              <button onClick={submit} disabled={loading || !form.hours} style={{ padding: '12px', borderRadius: 11, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? .7 : 1 }}>
                {loading ? 'Duke dërguar...' : 'Dërgo Kërkesën'}
              </button>
            </div>
          </div>
        )}

        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: '#9CA3AF' }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>⚡</p>
            <p style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Nuk ka kërkesa</p>
            <p style={{ fontSize: 13 }}>Kliko "Kërko" për të deklaruar orë shtesë</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {requests.map(r => (
              <div key={r.id} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #EDE9FF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#111827', margin: '0 0 3px' }}>{r.hours}h orë shtesë</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{new Date(r.date).toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    {r.reason && <p style={{ fontSize: 12, color: '#6B7280', margin: '5px 0 0', fontStyle: 'italic' }}>{r.reason}</p>}
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: sColor(r.status), padding: '4px 10px', borderRadius: 99, background: sColor(r.status) + '15' }}>
                    {sLabel(r.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
