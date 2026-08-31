'use client'
import './login.css'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { translateAuthError } from '@/lib/auth-errors'
import { toast } from 'sonner'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'

function AtmosphereCanvas() {
  const cv = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = cv.current; if (!el) return
    const ctx = el.getContext('2d')!
    let W = 0, H = 0, raf = 0, t = 0
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    const N = 240
    const px = new Float32Array(N), py = new Float32Array(N)
    const vx = new Float32Array(N), vy = new Float32Array(N)
    const sz = new Float32Array(N), ph = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      px[i] = Math.random(); py[i] = Math.random()
      const a = Math.random() * Math.PI * 2, s = .00012 + Math.random() * .0002
      vx[i] = Math.cos(a) * s; vy[i] = Math.sin(a) * s
      sz[i] = .3 + Math.random() * 1.2; ph[i] = Math.random() * Math.PI * 2
    }
    const logoImg = new window.Image()
    logoImg.src = '/logo.svg'

    function resize() {
      W = el.offsetWidth; H = el.offsetHeight
      el.width = W * DPR; el.height = H * DPR
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(el)

    function frame() {
      t += .007
      ctx.clearRect(0, 0, W, H)
      const grd = ctx.createRadialGradient(W*.5, H*.46, 0, W*.5, H*.46, Math.max(W,H)*.7)
      grd.addColorStop(0, 'rgba(109,40,217,.32)')
      grd.addColorStop(.38, 'rgba(91,33,182,.12)')
      grd.addColorStop(1, 'rgba(5,5,7,0)')
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H)

      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < N; i++) {
        px[i] += vx[i]; py[i] += vy[i]
        if (px[i] < 0) px[i] = 1; if (px[i] > 1) px[i] = 0
        if (py[i] < 0) py[i] = 1; if (py[i] > 1) py[i] = 0
        px[i] += Math.sin(t * .6 + ph[i]) * .0007
        py[i] += Math.cos(t * .5 + ph[i]) * .0005
        const x = px[i] * W, y = py[i] * H
        const al = (.1 + sz[i] * .18) * (.55 + Math.sin(t + ph[i]) * .45)
        const r = (.6 + sz[i]) * .65
        const g2 = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5)
        g2.addColorStop(0, 'rgba(167,139,250,' + al.toFixed(2) + ')')
        g2.addColorStop(1, 'rgba(139,92,246,0)')
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, r * 3.5, 0, 6.2832); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      const cx = W * .5, cy = H * .46, R = Math.min(W, H) * .20
      for (let a = 0; a < 3; a++) {
        const rot = t * (.22 + a * .05) * (a === 1 ? -1 : 1)
        const al2 = .18 + Math.sin(t * .7 + a) * .06
        ctx.beginPath()
        ctx.ellipse(cx, cy, R * (1.10 + a * .16), R * (.48 + a * .08), rot + a * 1.05, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(' + (a === 1 ? '192,132,252' : '167,139,250') + ',' + al2.toFixed(2) + ')'
        ctx.lineWidth = 1; ctx.stroke()
      }

      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoH = R * 1.0
        const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight)
        ctx.globalAlpha = .55 + Math.sin(t * .9) * .08
        ctx.drawImage(logoImg, cx - logoW / 2, cy - logoH / 2, logoW, logoH)
        ctx.globalAlpha = 1
        const glw = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .9)
        glw.addColorStop(0, 'rgba(139,92,246,.18)')
        glw.addColorStop(1, 'rgba(139,92,246,0)')
        ctx.fillStyle = glw; ctx.beginPath(); ctx.arc(cx, cy, R * .9, 0, 6.2832); ctx.fill()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])
  return (
    <canvas ref={cv} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
  )
}

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/dashboard'); return }
      const { data: profile } = await supabase
        .from('users')
        .select('role, company_id, companies(pos_enabled, business_type)')
        .eq('id', user.id)
        .single()
      if (profile?.role === 'admin') router.push('/admin')
      else if (profile?.role === 'accountant') router.push('/accountant')
      else {
        const bizType = (profile?.companies as any)?.business_type
        if (bizType === 'b2b') router.push('/dashboard')
        else router.push('/pos')
      }
      router.refresh()
    } catch (err: unknown) {
      toast.error(translateAuthError(err, 'Email ose fjalëkalim i gabuar'))
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { label: 'POS me fiskalizim ATK',     desc: 'Kupona fiskalë të vërtetë' },
    { label: 'Raporte financiare',         desc: 'TB, TVSH, kontribute' },
    { label: 'Bashkëpunim me kontabilist', desc: 'Qasje e drejtpërdrejtë' },
  ]

  return (
    <div className="lp-wrap">

      {/* ── LEFT ─────────────────────────────────────── */}
      <div className="lp-left">
        <div className="lp-form">

          <div className="lp-fade lp-fade-1" style={{ marginBottom: 24 }}>
            <h1 className="lp-heading">Mirë se keni ardhur</h1>
            <p className="lp-sub">Hyni në llogarinë tuaj për të vazhduar</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="lp-fade lp-fade-3">
              <label className="lp-label">Email</label>
              <input
                className="lp-input"
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="emri@kompania.com" required
              />
            </div>

            <div className="lp-fade lp-fade-4">
              <label className="lp-label">Fjalëkalimi</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="lp-input"
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2, display: 'flex' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="lp-fade lp-fade-5">
              <button type="submit" className="lp-btn" disabled={loading}>
                <span className="sweep" />
                {loading
                  ? <div className="lp-spinner" />
                  : <><span>Hyr në llogarinë</span><ArrowRight size={16} /></>
                }
              </button>
            </div>
          </form>

          <p className="lp-fade lp-fade-6" style={{ textAlign: 'center', fontSize: 13, marginTop: 26, color: '#6B7280' }}>
            Nuk keni llogari?{' '}
            <a href="https://wa.me/38343813121" target="_blank" rel="noopener noreferrer" style={{ color: '#8B5CF6', fontWeight: 500, textDecoration: 'none' }}>
              Kërkoni Demo
            </a>
          </p>
        </div>
      </div>

      {/* ── RIGHT ────────────────────────────────────── */}
      <div className="lp-right">
        <AtmosphereCanvas />
        <div className="lp-right-content">
          <h2 className="lp-fade lp-fade-1">
            Biznesi yt.<br />
            <span className="lp-grad">Nën kontroll.</span>
          </h2>
          <p className="lp-fade lp-fade-2">
            POS, fatura, raporte financiare dhe bashkëpunim me kontabilistin —
            gjithçka në një platformë të vetme.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {features.map((f, i) => (
              <div key={f.label} className={'lp-feature lp-fade lp-fade-' + (i + 3)}>
                <div className="lp-check">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 6.5L5 9.5L11 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="lp-feature-title">{f.label}</p>
                  <p className="lp-feature-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
