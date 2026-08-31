'use client'

import { useState, useEffect } from 'react'
import {
  FileText, Receipt, CreditCard, UserPlus, LogIn, LogOut,
  Building2, Activity as ActivityIcon
} from 'lucide-react'

interface ActivityItem {
  id: string
  action: string
  entity_type: string | null
  description: string | null
  created_at: string
  user: { full_name: string; role: string } | null
}

const ACTION_META: Record<string, { icon: typeof FileText; color: string; label: string }> = {
  create_invoice:  { icon: FileText,  color: '#10B981', label: 'Krijoi faturë' },
  update_invoice:  { icon: FileText,  color: '#3B82F6', label: 'Përditësoi faturë' },
  delete_invoice:  { icon: FileText,  color: '#EF4444', label: 'Fshiu faturë' },
  create_expense:  { icon: Receipt,   color: '#F59E0B', label: 'Shtoi shpenzim' },
  update_expense:  { icon: Receipt,   color: '#3B82F6', label: 'Përditësoi shpenzim' },
  delete_expense:  { icon: Receipt,   color: '#EF4444', label: 'Fshiu shpenzim' },
  ai_scan:         { icon: FileText,  color: '#9B5CF8', label: 'Aktivitet AI' },
  payment_submitted: { icon: CreditCard, color: '#F59E0B', label: 'Dërgoi pagesë' },
  payment_confirmed: { icon: CreditCard, color: '#10B981', label: 'Pagesa u konfirmua' },
  user_created:    { icon: UserPlus,  color: '#9B5CF8', label: 'Përdorues i ri' },
  company_created: { icon: Building2, color: '#9B5CF8', label: 'Kompania u krijua' },
  login:           { icon: LogIn,     color: 'var(--text-3)', label: 'U kyç' },
  logout:          { icon: LogOut,    color: 'var(--text-3)', label: 'U çkyç' },
}

export default function TimelineTab({ companyId }: { companyId: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/accountant/timeline?company_id=${companyId}`)
      .then(r => r.json())
      .then(d => setActivities(d.activities || []))
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading) return <p style={{ color:'var(--text-3)', fontSize:13, textAlign:'center', padding:30 }}>Duke ngarkuar...</p>

  if (activities.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:40, color:'var(--text-3)', fontSize:13 }}>
        Nuk ka aktivitet të regjistruar ende për këtë klient.
      </div>
    )
  }

  return (
    <div style={{ position:'relative', paddingLeft:8 }}>
      <div style={{ position:'absolute', left:19, top:8, bottom:8, width:2, background:'var(--border)' }}/>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {activities.map(act => {
          const meta = ACTION_META[act.action] || { icon: ActivityIcon, color: 'var(--text-3)', label: act.action }
          const Icon = meta.icon
          return (
            <div key={act.id} style={{ display:'flex', gap:14, position:'relative' }}>
              <div style={{
                width:32, height:32, borderRadius:'50%', background:`${meta.color}18`, border:`1.5px solid ${meta.color}40`,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, zIndex:1,
              }}>
                <Icon size={14} style={{ color: meta.color }}/>
              </div>
              <div style={{ flex:1, paddingTop:4 }}>
                <p style={{ fontSize:13, color:'var(--text-1)', fontWeight:600 }}>
                  {meta.label}
                  {act.user?.full_name && <span style={{ color:'var(--text-3)', fontWeight:400 }}> · {act.user.full_name}</span>}
                </p>
                {act.description && <p style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{act.description}</p>}
                <p style={{ fontSize:11, color:'var(--text-3)', marginTop:3 }}>
                  {new Date(act.created_at).toLocaleDateString('en-GB')} · {new Date(act.created_at).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
