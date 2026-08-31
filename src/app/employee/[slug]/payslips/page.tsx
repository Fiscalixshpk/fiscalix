'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

function calcTAP(g: number) {
  if (g <= 80) return 0; if (g <= 250) return (g-80)*.04
  if (g <= 450) return 170*.04+(g-250)*.08; return 170*.04+200*.08+(g-450)*.10
}

export default function PayslipsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    const s = sessionStorage.getItem('employee_session')
    if (!s) { router.push(`/employee/${slug}/login`); return }
    setSession(JSON.parse(s))
  }, [slug])

  if (!session) return null

  const emp   = session.employee
  const gross = emp.gross_salary || 0
  const penEmp = +(gross*.05).toFixed(2)
  const tap    = +calcTAP(gross).toFixed(2)
  const net    = +(gross - penEmp - tap).toFixed(2)
  const now    = new Date()

  // Show last 6 months
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return { month: d.getMonth(), year: d.getFullYear(), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` }
  })

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7FF' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #EDE9FF', padding: '0 16px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, height: 52 }}>
          <Link href={`/employee/${slug}/dashboard`} style={{ color: '#9CA3AF', display: 'flex' }}><ArrowLeft size={20} /></Link>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>🧾 Pagat</h1>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {months.map(m => (
          <div key={`${m.year}-${m.month}`} style={{ background: '#fff', borderRadius: 16, border: '1px solid #EDE9FF', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', background: m.month === now.getMonth() && m.year === now.getFullYear() ? 'linear-gradient(135deg,#7C3AED,#A78BFA)' : '#fff', borderBottom: '1px solid #EDE9FF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: m.month === now.getMonth() ? 'rgba(255,255,255,.75)' : '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    {m.month === now.getMonth() && m.year === now.getFullYear() ? '📅 Muaji aktual' : m.label}
                  </p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: m.month === now.getMonth() ? '#fff' : '#10B981', margin: 0 }}>€{net.toFixed(2)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: m.month === now.getMonth() ? 'rgba(255,255,255,.7)' : '#9CA3AF', margin: '0 0 2px' }}>Paga neto</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: m.month === now.getMonth() ? 'rgba(255,255,255,.9)' : '#374151', margin: 0 }}>{m.label}</p>
                </div>
              </div>
            </div>
            {/* Details */}
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Paga Bruto', `€${gross.toFixed(2)}`, '#374151'],
                ['Pension Punonjësi 5%', `-€${penEmp.toFixed(2)}`, '#F59E0B'],
                ['TAP', `-€${tap.toFixed(2)}`, '#EF4444'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#9CA3AF' }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: c as string }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: '1.5px solid #F3F0FF', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Paga Neto</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#10B981' }}>€{net.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
