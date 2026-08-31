import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { invoiceId } = await req.json()
    if (!invoiceId) return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 })

    const { data: invoice } = await supabase
      .from('invoices').select('*, invoice_items(*)').eq('id', invoiceId).single()
    if (!invoice) return NextResponse.json({ error: 'Fatura nuk u gjet' }, { status: 404 })

    const { data: company } = await supabase
      .from('companies').select('*').eq('id', invoice.company_id).single()

    if (!invoice.client_email) {
      return NextResponse.json({ error: 'Klienti nuk ka email të regjistruar' }, { status: 400 })
    }

    // If Resend/SMTP configured, send real email
    const RESEND_KEY = process.env.RESEND_API_KEY
    if (RESEND_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${company?.name || 'Fiscalix'} <noreply@fiscalix.com>`,
          to: [invoice.client_email],
          subject: `Fatura ${invoice.invoice_number} — ${company?.name}`,
          html: `
            <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#111827;border-radius:16px;overflow:hidden">
              <div style="background:linear-gradient(135deg,#5A1FD6,#7B2CF5);padding:28px;text-align:center">
                <h1 style="color:white;font-size:24px;margin:0">Fiscalix</h1>
                <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px">Smart Accounting for Modern Businesses</p>
              </div>
              <div style="padding:32px">
                <p style="color:#E5E7EB;font-size:15px">Përshëndetje <strong>${invoice.client_name}</strong>,</p>
                <p style="color:#9CA3AF;font-size:14px;line-height:1.7">Ju dërgojmë faturën <strong style="color:#9B5CF8">${invoice.invoice_number}</strong> nga <strong>${company?.name}</strong>.</p>
                <div style="background:#1a2338;border:1px solid rgba(123,44,245,0.2);border-radius:12px;padding:20px;margin:20px 0">
                  <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                    <span style="color:#9CA3AF;font-size:13px">Totali:</span>
                    <span style="color:#9B5CF8;font-size:18px;font-weight:700">€${Number((invoice.total_amount ?? invoice.total)).toFixed(2)}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between">
                    <span style="color:#9CA3AF;font-size:13px">Data e skadimit:</span>
                    <span style="color:#F9FAFB;font-size:13px">${new Date(invoice.due_date).toLocaleDateString('sq-AL')}</span>
                  </div>
                </div>
                ${company?.iban ? `<p style="color:#9CA3AF;font-size:13px">IBAN: <strong style="color:#E5E7EB">${company.iban}</strong></p>` : ''}
                <p style="color:#9CA3AF;font-size:13px;margin-top:20px">Faleminderit për bashkëpunimin!</p>
              </div>
              <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
                <p style="color:#4B5563;font-size:12px;margin:0">© ${new Date().getFullYear()} ${company?.name}</p>
              </div>
            </div>`,
        }),
      })
      if (!res.ok) throw new Error('Email dërgimi dështoi')
    }

    // Log the send event
    await supabase.from('activity_logs').insert({
      company_id: invoice.company_id,
      user_id: user.id,
      action: 'invoice_sent',
      entity_type: 'invoice',
      entity_id: invoiceId,
      metadata: { client_email: invoice.client_email, invoice_number: invoice.invoice_number }
    }).select()

    return NextResponse.json({ success: true, message: `Email u dërgua te ${invoice.client_email}` })
  } catch (err) {
    console.error('Send invoice error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Gabim gjatë dërgimit' }, { status: 500 })
  }
}
