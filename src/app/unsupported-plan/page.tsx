import Link from 'next/link'

export default function UnsupportedPlan() {
  return (
    <div style={{minHeight:'100vh',background:'var(--bg-card)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter,sans-serif',padding:'20px'}}>
      <div style={{textAlign:'center',maxWidth:460}}>
        <div style={{fontSize:48,marginBottom:20}}>🔧</div>
        <h1 style={{fontSize:24,fontWeight:900,color:'var(--text-1)',letterSpacing:'-0.03em',marginBottom:12}}>
          Lloji i biznesit nuk mbështetet
        </h1>
        <p style={{fontSize:15,color:'#94A3B8',lineHeight:1.65,marginBottom:28}}>
          Ky lloj biznesi nuk është aktualisht i disponueshëm në Fiscalix. Na kontaktoni dhe do t'ju konfigurojmë llogarinë sipas nevojave tuaja.
        </p>
        <a href="mailto:info@fiscalix.com?subject=Konfigurimi i llogarisë"
          style={{display:'inline-flex',alignItems:'center',gap:8,padding:'12px 24px',borderRadius:10,background:'#2563EB',color:'white',fontSize:14,fontWeight:700,textDecoration:'none',marginBottom:16,boxShadow:'0 4px 14px rgba(37,99,235,0.4)'}}>
          Na Kontaktoni →
        </a>
        <br/>
        <Link href="/login" style={{fontSize:13,color:'#64748B',textDecoration:'none'}}>
          ← Kthehu te Login
        </Link>
      </div>
    </div>
  )
}
