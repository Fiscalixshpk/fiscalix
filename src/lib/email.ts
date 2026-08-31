/**
 * lib/email.ts — Dërgim email-ash me Resend
 * Përdoret nga API routes për njoftimet automatike.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@fiscalix.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fiscalix.com'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams) {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY mungon — email nuk u dërgua')
    return { success: false, error: 'RESEND_API_KEY mungon' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Fiscalix <${FROM_EMAIL}>`,
        to,
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('[Email] Resend error:', data)
      return { success: false, error: data.message || 'Gabim gjatë dërgimit' }
    }

    return { success: true, id: data.id }
  } catch (err) {
    console.error('[Email] Fetch error:', err)
    return { success: false, error: String(err) }
  }
}

// ─── Templates ───────────────────────────────────────────────

export function emailAccountActivated(userName: string) {
  return {
    subject: 'Llogaria juaj Fiscalix është aktivizuar ✅',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0B1020;color:#F9FAFB;padding:32px;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="font-size:28px;font-weight:800;color:#9B5CF8;margin:0">Fiscalix</h1>
        </div>
        <h2 style="font-size:20px;font-weight:700;margin-bottom:12px">Mirë se vini, ${userName}! 🎉</h2>
        <p style="color:#CBD5E1;line-height:1.6;margin-bottom:20px">
          Llogaria juaj është aktivizuar dhe jeni gati të filloni. Fiscalix ju ndihmon të menaxhoni financat dhe bashkëpunimin me kontabilistin tuaj nga një vend i vetëm.
        </p>
        <div style="text-align:center;margin:28px 0">
          <a href="${APP_URL}/dashboard" style="background:linear-gradient(135deg,#5A1FD6,#9B5CF8);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
            Hyr te Fiscalix →
          </a>
        </div>
        <p style="color:#6B7280;font-size:12px;text-align:center;margin-top:32px">
          Nëse keni pyetje, na kontaktoni: info@fiscalix.com<br>
          © 2026 Fiscalix. Të gjitha të drejtat e rezervuara.
        </p>
      </div>
    `,
  }
}

export function emailAccountantActivated(userName: string) {
  return {
    subject: 'Llogaria juaj Fiscalix (Kontabilist) është aktivizuar ✅',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0B1020;color:#F9FAFB;padding:32px;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="font-size:28px;font-weight:800;color:#9B5CF8;margin:0">Fiscalix</h1>
        </div>
        <h2 style="font-size:20px;font-weight:700;margin-bottom:12px">Mirë se vini, ${userName}! 🎉</h2>
        <p style="color:#CBD5E1;line-height:1.6;margin-bottom:20px">
          Llogaria juaj si kontabilist është aktivizuar. Tani mund të ftoni klientë, të menaxhoni portofolin tuaj dhe të bashkëpunoni me bizneset tuaja nga Command Center.
        </p>
        <div style="text-align:center;margin:28px 0">
          <a href="${APP_URL}/accountant" style="background:linear-gradient(135deg,#5A1FD6,#9B5CF8);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
            Hyr te Command Center →
          </a>
        </div>
        <p style="color:#6B7280;font-size:12px;text-align:center;margin-top:32px">
          Nëse keni pyetje, na kontaktoni: info@fiscalix.com<br>
          © 2026 Fiscalix. Të gjitha të drejtat e rezervuara.
        </p>
      </div>
    `,
  }
}

export function emailDocumentRequested(businessName: string, documentName: string, message: string) {
  return {
    subject: `Kontabilisti juaj kërkon dokument: ${documentName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0B1020;color:#F9FAFB;padding:32px;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="font-size:28px;font-weight:800;color:#9B5CF8;margin:0">Fiscalix</h1>
        </div>
        <h2 style="font-size:20px;font-weight:700;margin-bottom:12px">📄 Kërkesë Dokumenti</h2>
        <p style="color:#CBD5E1;line-height:1.6;margin-bottom:8px">
          Kontabilisti i <strong>${businessName}</strong> ka kërkuar dokumentin:
        </p>
        <div style="background:#1a2338;border:1px solid rgba(123,44,245,0.3);border-radius:8px;padding:14px;margin:16px 0">
          <p style="font-weight:700;font-size:15px;margin:0 0 6px">${documentName}</p>
          ${message ? `<p style="color:#9CA3AF;font-size:13px;margin:0">${message}</p>` : ''}
        </div>
        <div style="text-align:center;margin:28px 0">
          <a href="${APP_URL}/documents" style="background:linear-gradient(135deg,#5A1FD6,#9B5CF8);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
            Ngarko Dokumentin →
          </a>
        </div>
        <p style="color:#6B7280;font-size:12px;text-align:center;margin-top:32px">
          © 2026 Fiscalix. Të gjitha të drejtat e rezervuara.
        </p>
      </div>
    `,
  }
}

export function emailInvoicePaid(clientName: string, invoiceNumber: string, amount: string) {
  return {
    subject: `Fatura ${invoiceNumber} u pagua ✅`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0B1020;color:#F9FAFB;padding:32px;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="font-size:28px;font-weight:800;color:#9B5CF8;margin:0">Fiscalix</h1>
        </div>
        <h2 style="font-size:20px;font-weight:700;margin-bottom:12px">✅ Fatura u Pagua</h2>
        <p style="color:#CBD5E1;line-height:1.6;margin-bottom:16px">
          Fatura <strong>${invoiceNumber}</strong> nga <strong>${clientName}</strong> u shënua si e paguar.
        </p>
        <div style="background:#1a2338;border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:14px;margin:16px 0;text-align:center">
          <p style="font-size:28px;font-weight:800;color:#10B981;margin:0">${amount}</p>
        </div>
        <div style="text-align:center;margin:28px 0">
          <a href="${APP_URL}/invoices" style="background:linear-gradient(135deg,#5A1FD6,#9B5CF8);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
            Shiko Faturat →
          </a>
        </div>
        <p style="color:#6B7280;font-size:12px;text-align:center;margin-top:32px">
          © 2026 Fiscalix. Të gjitha të drejtat e rezervuara.
        </p>
      </div>
    `,
  }
}

// ─── Kërkesë Dokumentesh (nga Kontabilisti te Klienti) ───────

interface DocumentRequestParams {
  clientName: string
  accountantName: string
  accountantEmail: string
  accountantPhone?: string
  month: string        // p.sh. "Korrik 2026"
  deadline: string     // p.sh. "20 Korrik 2026"
  documents: string[]  // lista e dokumenteve
  uploadUrl: string    // link portali
}

export function emailDocumentRequest({
  clientName,
  accountantName,
  accountantEmail,
  accountantPhone,
  month,
  deadline,
  documents,
  uploadUrl,
}: DocumentRequestParams) {
  const docList = documents.map(d => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #1e2d45;color:#CBD5E1;font-size:14px">
        <span style="color:#9B5CF8;margin-right:8px">☐</span>${d}
      </td>
    </tr>
  `).join('')

  return {
    subject: `Dokumentet e ${month} — ${clientName}`,
    replyTo: accountantEmail,
    html: `
      <!DOCTYPE html>
      <html lang="sq">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f4f6f9;font-family:'Inter',Arial,sans-serif">
        <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#020617,#0a1628);padding:32px 36px 28px">
            <p style="color:#9B5CF8;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 6px;font-weight:600">
              Fiscalix · Platformë Financiare
            </p>
            <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.02em">
              Dokumentet e ${month}
            </h1>
          </div>

          <!-- Body -->
          <div style="padding:32px 36px">
            <p style="color:#374151;font-size:15px;line-height:1.65;margin:0 0 24px">
              Përshëndetje <strong>${clientName}</strong>,
            </p>
            <p style="color:#374151;font-size:15px;line-height:1.65;margin:0 0 24px">
              Kontabilisti juaj <strong>${accountantName}</strong> kërkon dokumentet e mëposhtme
              për muajin <strong>${month}</strong>.
            </p>

            <!-- Deadline alert -->
            <div style="background:#fff8ed;border:1px solid #fbbf24;border-radius:10px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;gap:10px">
              <span style="font-size:18px">⏰</span>
              <p style="margin:0;color:#92400e;font-size:14px;font-weight:600">
                Afati i dorëzimit: <strong>${deadline}</strong>
              </p>
            </div>

            <!-- Document list -->
            <p style="color:#6B7280;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px">
              Dokumentet e kërkuara
            </p>
            <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:10px;overflow:hidden;margin-bottom:28px">
              <tbody>${docList}</tbody>
            </table>

            <!-- CTA Button -->
            <div style="text-align:center;margin-bottom:32px">
              <a href="${uploadUrl}"
                style="display:inline-block;background:linear-gradient(135deg,#5A1FD6,#7B2CF5);color:#ffffff;padding:15px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:-0.01em">
                Ngarko Dokumentet →
              </a>
            </div>

            <p style="color:#6B7280;font-size:13px;line-height:1.6;margin:0">
              Nëse keni pyetje, mund të na kontaktoni direkt duke klikuar
              "Përgjigju" ose duke na shkruar në
              <a href="mailto:${accountantEmail}" style="color:#5A1FD6;text-decoration:none">${accountantEmail}</a>.
            </p>
          </div>

          <!-- Footer / Accountant Signature -->
          <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 36px">
            <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111827">${accountantName}</p>
            <p style="margin:0 0 2px;font-size:12px;color:#6B7280">Kontabilist · Fiscalix</p>
            <p style="margin:0;font-size:12px;color:#9B5CF8">
              <a href="mailto:${accountantEmail}" style="color:#5A1FD6;text-decoration:none">${accountantEmail}</a>
              ${accountantPhone ? ` · ${accountantPhone}` : ''}
            </p>
          </div>

        </div>
        <p style="text-align:center;color:#9CA3AF;font-size:11px;margin:16px 0 32px">
          © 2026 Fiscalix SH.P.K. · Ky email u dërgua automatikisht nga platforma Fiscalix
        </p>
      </body>
      </html>
    `,
  }
}
