import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]
  const in7days = new Date(now.getTime() + 7*24*60*60*1000).toISOString().split('T')[0]

  const { data: clientsRaw } = await supabase
    .from('accountant_clients')
    .select('company_id, companies(id, name, email, is_vat_registered)')
    .eq('accountant_id', user.id)
    .eq('is_active', true)
    .eq('status', 'active')

  if (!clientsRaw || clientsRaw.length === 0) {
    return NextResponse.json({ urgent: [], today: [], week: [] })
  }

  type Task = { id: string; client: string; clientId: string; issue: string; action: string; href: string }
  const urgent: Task[] = []
  const todayTasks: Task[] = []
  const weekTasks: Task[] = []

  for (const c of clientsRaw) {
    const comp = c.companies as unknown as { id: string; name: string; email?: string; is_vat_registered?: boolean } | null
    if (!comp) continue

    // 1. Fatura të vonuara
    const { data: overdueInvs } = await supabase
      .from('invoices').select('id, total_amount, total')
      .eq('company_id', comp.id).eq('status', 'overdue')

    if (overdueInvs && overdueInvs.length > 0) {
      const total = overdueInvs.reduce((s, i) => s + (Number(i.total_amount) || Number(i.total) || 0), 0)
      urgent.push({
        id: `overdue-${comp.id}`, client: comp.name, clientId: comp.id,
        issue: `${overdueInvs.length} fatura të vonuara · €${total.toFixed(0)}`,
        action: 'Shiko faturat', href: `/invoices?company=${comp.id}`
      })
    }

    // 2. TVSH afat brenda 7 ditësh
    if (comp.is_vat_registered) {
      const vatMonths = [0,3,6,9]
      const m = now.getMonth()
      if (vatMonths.includes(m) && now.getDate() >= 13) {
        const deadline = new Date(now.getFullYear(), m, 20)
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000*60*60*24))
        if (daysLeft >= 0 && daysLeft <= 2) {
          urgent.push({
            id: `vat-${comp.id}`, client: comp.name, clientId: comp.id,
            issue: `TVSH — skadon pas ${daysLeft} ditësh`,
            action: 'Shiko klientin', href: `/accountant/clients/${comp.id}`
          })
        } else if (daysLeft > 2 && daysLeft <= 7) {
          weekTasks.push({
            id: `vat-${comp.id}`, client: comp.name, clientId: comp.id,
            issue: `TVSH — skadon pas ${daysLeft} ditësh`,
            action: 'Shiko klientin', href: `/accountant/clients/${comp.id}`
          })
        }
      }
    }

    // 3. Asnjë faturë këtë muaj (pas ditës 10)
    if (now.getDate() > 10) {
      const { data: thisMonth } = await supabase
        .from('invoices').select('id').eq('company_id', comp.id)
        .gte('issue_date', monthStart).limit(1)
      if (!thisMonth || thisMonth.length === 0) {
        todayTasks.push({
          id: `no-inv-${comp.id}`, client: comp.name, clientId: comp.id,
          issue: 'Asnjë faturë këtë muaj',
          action: 'Krijo faturë', href: `/invoices/new?company=${comp.id}`
        })
      }
    }

    // 4. Fatura pending me afat javën e ardhshme
    const { data: pendingInvs } = await supabase
      .from('invoices').select('id').eq('company_id', comp.id)
      .eq('status', 'pending').lt('due_date', in7days).gt('due_date', today)
    if (pendingInvs && pendingInvs.length > 0) {
      weekTasks.push({
        id: `pending-${comp.id}`, client: comp.name, clientId: comp.id,
        issue: `${pendingInvs.length} fatura me afat javën e ardhshme`,
        action: 'Shiko faturat', href: `/invoices?company=${comp.id}`
      })
    }
  }

  return NextResponse.json({ urgent, today: todayTasks, week: weekTasks })
}
