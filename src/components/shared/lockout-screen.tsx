'use client'
import { useState } from 'react'
import { Lock, CheckCircle, ArrowRight, Phone, Mail, CreditCard } from 'lucide-react'
import Image from 'next/image'

interface Props {
  companyName: string
  trialEndedAt?: string
  daysOverdue?: number
}

export default function LockoutScreen({ companyName, trialEndedAt, daysOverdue = 0 }: Props) {
  const [copied, setCopied] = useState(false)

  const BANK_ACCOUNT = 'PK36SCBL0000001123456702' // Zëvendëso me xhirollogarinë tuaj
  const BANK_NAME = 'Banka e Kosovës'

  function copyAccount() {
    navigator.clipboard.writeText(BANK_ACCOUNT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const PLANS = [
    { name: 'ARKA', price: 59, priceM: 4.92, color: '#06B6D4', features: ['1 pajisje', 'Arka Fiskale ATK', 'Historia kuponave', 'Lidhja me kontabilist'] },
    { name: 'BASIC',       price: 99,  priceM: 8.25,  color: '#10B981', features: ['1 pajisje', 'Arka Fiskale ATK', 'Raporte simple', 'iOS + Android + Web'] },
    { name: 'PRO',         price: 199, priceM: 16.58, color: '#2563EB', features: ['3 pajisje', 'POS Tavolina', 'Portal Kontabilisti', 'Terminet & Stoku'], popular: true },
    { name: 'BUSINESS',    price: 230, priceM: 19.17, color: '#7C3AED', features: ['Pajisje pa limit', 'Gjithçka nga Pro', 'Role & Permisione', 'Support 24/7'] },
    { name: 'KONTABILIST', price: 149, priceM: 12.42, color: '#F59E0B', features: ['Klientë pa limit', 'Panel i unifikuar', 'Raporte tatimore', 'Komision 20%'] },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-sidebar)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px 16px' }}>

      {/* Logo */}
      <div style={{ marginBottom:32 }}>
        <Image src="/logo.svg" alt="Fiscalix" width={160} height={40} style={{ height:36, width:'auto' }}/>
      </div>

      {/* Lock icon */}
      <div style={{ width:72, height:72, borderRadius:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
        <Lock size={32} style={{ color:'#EF4444' }}/>
      </div>

      <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:28, fontWeight:900, color:'var(--text-1)', marginBottom:8, textAlign:'center' }}>
        Periudha e Provës ka Skaduar
      </h1>
      <p style={{ fontSize:14, color:'#64748B', marginBottom:4, textAlign:'center' }}>
        {companyName} — 15 ditë trial falas kanë përfunduar
      </p>
      {daysOverdue > 0 && (
        <p style={{ fontSize:13, color:'#EF4444', marginBottom:32, textAlign:'center' }}>
          ! Ka kaluar {daysOverdue} {daysOverdue === 1 ? 'ditë' : 'ditë'} pas skadimit
        </p>
      )}
      {daysOverdue === 0 && <div style={{ marginBottom:32 }}/>}

      {/* Plans */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12, width:'100%', maxWidth:760, marginBottom:32 }}>
        {PLANS.map((plan) => (
          <div key={plan.name} style={{ background: plan.popular ? 'var(--purple-bg)' : 'var(--bg-muted)', border:`1px solid ${plan.popular ? 'var(--purple-bg)' : 'var(--bg-muted)'}`, borderRadius:16, padding:'20px 18px', position:'relative' }}>
            {plan.popular && (
              <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', borderRadius:20, padding:'3px 14px', fontSize:10, fontWeight:800, color:'white', whiteSpace:'nowrap' }}>
                MË E POPULLARIZUARA
              </div>
            )}
            <p style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:800, color:plan.color, marginBottom:4 }}>{plan.name}</p>
            <p style={{ fontFamily:'Poppins,sans-serif', fontSize:28, fontWeight:900, color:'var(--text-1)', marginBottom:14 }}>
              €{plan.price}<span style={{ fontSize:13, fontWeight:400, color:'#64748B' }}>/vit</span>
              <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>€{plan.priceM}/muaj</div>
            </p>
            {plan.features.map((f,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <CheckCircle size={13} style={{ color:plan.color, flexShrink:0 }}/>
                <p style={{ fontSize:12, color:'#94A3B8' }}>{f}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Payment instructions */}
      <div style={{ background:'var(--bg-muted)', border:'1px solid var(--border)', borderRadius:16, padding:'24px 28px', width:'100%', maxWidth:500, marginBottom:20 }}>
        <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:15, fontWeight:800, color:'var(--text-1)', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
          <CreditCard size={16} style={{ color:'#9B5CF8' }}/> Si të Paguash
        </h3>

        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Transfer Bankar</p>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <code style={{ fontSize:13, color:'var(--text-1)', background:'var(--bg-input)', padding:'8px 14px', borderRadius:8, flex:1 }}>
              {BANK_ACCOUNT}
            </code>
            <button onClick={copyAccount}
              style={{ padding:'8px 14px', borderRadius:8, background: copied ? 'rgba(16,185,129,0.12)' : 'var(--bg-muted)', border:'1px solid var(--border)', color: copied ? '#10B981' : '#94A3B8', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
              {copied ? 'Kopjuar' : 'Kopjo'}
            </button>
          </div>
          <p style={{ fontSize:11, color:'#475569', marginTop:6 }}>{BANK_NAME}</p>
        </div>

        <div style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:10, padding:'10px 14px' }}>
          <p style={{ fontSize:12, color:'#2563EB' }}>
             Pas transferit, dërgoni dëshminë e pagesës — llogaria zhbllokohet brenda <strong>1 ore</strong>
          </p>
        </div>
      </div>

      {/* Contact */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', justifyContent:'center' }}>
        <a href="mailto:info@bearix.agency" style={{ display:'flex', alignItems:'center', gap:6, color:'#64748B', fontSize:13, textDecoration:'none' }}>
          <Mail size={14}/> info@bearix.agency
        </a>
        <a href="tel:+38344000000" style={{ display:'flex', alignItems:'center', gap:6, color:'#64748B', fontSize:13, textDecoration:'none' }}>
          <Phone size={14}/> +383 44 000 000
        </a>
      </div>

      <p style={{ fontSize:11, color:'#334155', marginTop:24, textAlign:'center' }}>
        Të dhënat tuaja janë të sigurta dhe ruhen edhe pas skadimit · Fiscalix © 2026
      </p>
    </div>
  )
}
