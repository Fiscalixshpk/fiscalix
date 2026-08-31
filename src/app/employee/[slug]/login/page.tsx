'use client'
import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function EmployeeLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/employee/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email, password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      // Store in sessionStorage
      sessionStorage.setItem('employee_session', JSON.stringify(data))
      router.push(`/employee/${slug}/dashboard`)
    } catch { setError('Gabim rrjeti') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Image src="/logo.svg" alt="Fiscalix" width={120} height={30} style={{ height: 32, width: 'auto' }} unoptimized />
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8, fontFamily: 'Geist Mono, monospace', letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Portal Punëtori
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', boxShadow: '0 4px 24px rgba(124,58,237,.08), 0 1px 4px rgba(0,0,0,.04)', border: '1px solid #EDE9FF' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 6px', letterSpacing: '-.03em' }}>Mirë se keni ardhur</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 28px' }}>Hyni me kredencialet tuaja</p>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#DC2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="emri@kompania.com"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E5E0F8', background: '#FDFCFF', color: '#111827', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Fjalëkalimi</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: 10, border: '1.5px solid #E5E0F8', background: '#FDFCFF', color: '#111827', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(109,40,217,.35)', opacity: loading ? .7 : 1, marginTop: 4 }}>
              {loading ? 'Duke hyrë...' : <><span>Hyr</span><ArrowRight size={16} /></>}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 20 }}>
          Nëse keni probleme me hyrjen, kontaktoni menaxherin tuaj
        </p>
      </div>
    </div>
  )
}
