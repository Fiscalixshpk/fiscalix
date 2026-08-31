'use client'
import Image from 'next/image'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?type=recovery` })
    if (error) toast.error(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div style={{ position:'absolute', top:'-10%', left:'50%', transform:'translateX(-50%)', width:500, height:300, background:'radial-gradient(ellipse,rgba(123,44,245,0.1) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }}/>
      <div className="w-full max-w-sm relative z-10">
        <div className="flex justify-center mb-8"><Image src="/logo.svg" alt="Fiscalix" width={160} height={40} style={{ height: 36, width: "auto" }} /></div>
        <div style={{ background:'var(--bg-muted)', border:'1px solid var(--border-color,#e2dcff)', borderRadius:20, padding:32 }}>
          {sent ? (
            <div className="text-center space-y-3">
              <div style={{ fontSize:40 }}>📧</div>
              <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:18, fontWeight:700, color:'var(--text-1)' }}>Email u dërgua!</h2>
              <p style={{ color:'#9CA3AF', fontSize:14 }}>Kontrollo emailin tënd për të rivendosur fjalëkalimin.</p>
              <Link href="/login" style={{ display:'block', marginTop:16, color:'#9B5CF8', fontSize:14, fontWeight:600 }}>← Kthehu te hyrja</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:700, color:'var(--text-1)', marginBottom:4 }}>Rivendos fjalëkalimin</h1>
                <p style={{ color:'#6B7280', fontSize:13 }}>Shkruaj emailin dhe do të të dërgojmë linkun.</p>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'#6B7280', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="emri@kompania.com" required className="finex-input" />
              </div>
              <button type="submit" disabled={loading}
                className="finex-button-primary w-full py-3 flex items-center justify-center gap-2 font-semibold">
                {loading ? <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor:'var(--border-color,#e2dcff)', borderTopColor:'white' }}/> : <>Dërgo Linkun <ArrowRight size={16}/></>}
              </button>
              <p className="text-center text-sm" style={{ color:'#6B7280' }}>
                <Link href="/login" style={{ color:'#9B5CF8', fontWeight:600 }}>← Kthehu te hyrja</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
