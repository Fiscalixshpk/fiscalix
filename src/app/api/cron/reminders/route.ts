import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  let sent = 0

  // 1. Fatura të vonuara 3+ ditë
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('id, due_date, total_amount, total, companies(name, email)')
    .eq('status', 'pending')
    .lt('due_date', today)

  for (const inv of (overdueInvoices || [])) {
    const comp = inv.companies as { name: string; email?: string } | null
    if (!comp?.email) continue
    const daysOverdue = Math.ceil((now.getTime() - new Date(inv.due_date).getTime()) / (1000*60*60*24))
    if (daysOverdue < 3) continue
    try {
      await sendEmail({
        to: comp.email,
        subject: `⚠️ Faturë e papaguar — ${daysOverdue} ditë vonë`,
        html: `<div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px">
          <h2 style="color:#EF4444">Faturë e papaguar</h2>
          <p>Pershendetje <strong>${comp.name}</strong>,</p>
          <p>Keni një faturë të papaguar prej <strong>${daysOverdue} ditësh</strong>.</p>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0;color:#991B1B;font-weight:600">Shuma: €${Number(inv.total_amount||inv.total||0).toFixed(2)}</p>
            <p style="margin:4px 0 0;color:#7F1D1D;font-size:14px">Afati kaloi: ${inv.due_date}</p>
          </div>
        </div>`,
      })
      sent++
    } catch {}
  }

  // 2. TVSH afati (ditët 15-20 të muajit tatimor)
  const m = now.getMonth()
  if ([3,6,9,0].includes(m) && now.getDate() >= 15 && now.getDate() <= 20) {
    const { data: vatCompanies } = await supabase
      .from('companies').select('name, email').eq('is_vat_registered', true)
    const mLabel = ['Janar','Prill','Korrik','Tetor'][Math.floor(m/3)] || ''
    for (const c of (vatCompanies || [])) {
      if (!c.email) continue
      try {
        await sendEmail({
          to: c.email,
          subject: `📅 Afati TVSH — deri më 20 ${mLabel}`,
          html: `<div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px">
            <h2 style="color:#F59E0B">Kujtues: Afati TVSH</h2>
            <p>Pershendetje <strong>${c.name}</strong>, afati i TVSH skadon <strong>më 20 ${mLabel}</strong>.</p>
          </div>`,
        })
        sent++
      } catch {}
    }
  }

  // 3. Kontabilistëve: dita 18, klientë pa dokumente
  if (now.getDate() === 18) {
    const { data: accountants } = await supabase.from('users').select('id, full_name, email').eq('role', 'accountant')
    for (const acc of (accountants || [])) {
      const { count } = await supabase.from('accountant_clients')
        .select('*', { count:'exact', head:true }).eq('accountant_id', acc.id).eq('is_active', true)
      if (!count || count === 0) continue
      try {
        await sendEmail({
          to: acc.email,
          subject: `📋 Kujtues: Dokumentet e muajit`,
          html: `<div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px">
            <h2 style="color:#5A1FD6">Kujtues Fiscalix</h2>
            <p>Pershendetje <strong>${acc.full_name || acc.email}</strong>,</p>
            <p>Ju kujtojmë të kontrolloni dokumentet e muajit për klientët tuaj.</p>
          </div>`,
        })
        sent++
      } catch {}
    }
  }

  // 4. Expire subscriptions që kanë kaluar datën
  const { data: expiredSubs } = await supabase
    .from('subscriptions')
    .select('id, company_id, current_period_end')
    .eq('status', 'active')
    .lt('current_period_end', today)

  for (const sub of (expiredSubs || [])) {
    await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id)
    // Njofto biznesin
    const { data: bizOwner } = await supabase
      .from('users').select('id, email').eq('company_id', sub.company_id).eq('role', 'business_owner').maybeSingle()
    if (bizOwner?.id) {
      await supabase.from('notifications').insert({
        user_id: bizOwner.id,
        company_id: sub.company_id,
        title: '⚠️ Abonimenti skadoi',
        message: 'Abonimenti juaj skadoi. Ju lutem rinovoni për të vazhduar përdorimin e Fiscalix.',
        type: 'warning',
        is_read: false,
      })
      try {
        await sendEmail({
          to: bizOwner.email,
          subject: '⚠️ Abonimenti juaj Fiscalix skadoi',
          html: `<div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px">
            <h2 style="color:#EF4444">Abonimenti skadoi</h2>
            <p>Abonimenti juaj Fiscalix skadoi më <strong>${sub.current_period_end?.split('T')[0]}</strong>.</p>
            <p>Ju lutem kontaktoni ekipin tonë për ta rinovuar.</p>
          </div>`,
        })
      } catch {}
    }
    sent++
  }

  // 5. Expire accountant subscriptions
  const { data: expiredAccSubs } = await supabase
    .from('accountant_subscriptions')
    .select('id, user_id, current_period_end')
    .eq('status', 'active')
    .lt('current_period_end', today)

  for (const sub of (expiredAccSubs || [])) {
    await supabase.from('accountant_subscriptions').update({ status: 'expired' }).eq('id', sub.id)
  }

  return NextResponse.json({ success: true, sent })
}
