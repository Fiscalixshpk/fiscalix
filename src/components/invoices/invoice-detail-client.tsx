"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Invoice, InvoiceItem, Company } from "@/types";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  formatCurrency,
  formatDate,
  getDaysUntilDue,
} from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  QrCode,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Copy,
  Share2,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  invoice: Invoice & { invoice_items: InvoiceItem[] };
  company: Company;
  logoBase64?: string | null;
  isAccountantView?: boolean;
}

export function InvoiceDetailClient({ invoice, company, logoBase64, isAccountantView }: Props) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const subtotal = Number(invoice.subtotal || 0);
  const invoiceTotal = Number((invoice as {total_amount?: number; total?: number}).total_amount || invoice.total || 0);
  const taxRate = Number(invoice.tax_rate);
  const taxAmt = (subtotal * taxRate) / 100;
  const discount = Number(invoice.discount_amount || 0);
  const total = subtotal + taxAmt - discount;
  const daysUntilDue = getDaysUntilDue(invoice.due_date);

  async function handleExportPDF() {
    setExporting(true);
    try {
      const { generateInvoicePDF } = await import("@/lib/pdf");
      await generateInvoicePDF({
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name,
        client_email: invoice.client_email,
        client_address: invoice.client_address,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date || "",
        currency: invoice.currency || "EUR",
        payment_method: invoice.payment_method,
        payment_split: (invoice as {payment_split?: string}).payment_split,
        notes: invoice.notes,
        status: invoice.status,
        subtotal: Number(invoice.subtotal || 0),
        tax_rate: Number(invoice.tax_rate || 18),
        tax_amount: Number(invoice.tax_amount || 0),
        total_amount: Number((invoice as {total_amount?: number}).total_amount || invoice.total || 0),
        total: Number(invoice.total || 0),
        items: (invoice.invoice_items || invoice.items || []).map((item: {description: string; quantity: number; unit?: string; unit_price: number; discount_percent?: number; total?: number}) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit || "copë",
          unit_price: Number(item.unit_price),
          discount_percent: Number(item.discount_percent || 0),
          total: Number(item.total || Number(item.quantity) * Number(item.unit_price)),
        })),
        company: company ? { ...company, _logoBase64: logoBase64 } : null,
      });
      toast.success("PDF u eksportua me sukses");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Gabim gjatë eksportimit");
    } finally {
      setExporting(false);
    }
  }

  async function handleSendEmail() {
    if (!invoice.client_email) {
      toast.error("Klienti nuk ka email të regjistruar")
      return
    }
    setExporting(true)
    try {
      // First download the PDF so the user has it ready to attach
      const { generateInvoicePDF } = await import("@/lib/pdf");
      await generateInvoicePDF({
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name,
        client_email: invoice.client_email,
        client_address: invoice.client_address,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date || "",
        currency: invoice.currency || "EUR",
        payment_method: invoice.payment_method,
        payment_split: (invoice as {payment_split?: string}).payment_split,
        notes: invoice.notes,
        status: invoice.status,
        subtotal: Number(invoice.subtotal || 0),
        tax_rate: Number(invoice.tax_rate || 18),
        tax_amount: Number(invoice.tax_amount || 0),
        total_amount: Number((invoice as {total_amount?: number}).total_amount || invoice.total || 0),
        total: Number(invoice.total || 0),
        items: (invoice.invoice_items || invoice.items || []).map((item: {description: string; quantity: number; unit?: string; unit_price: number; discount_percent?: number; total?: number}) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit || "copë",
          unit_price: Number(item.unit_price),
          discount_percent: Number(item.discount_percent || 0),
          total: Number(item.total || Number(item.quantity) * Number(item.unit_price)),
        })),
        company: company ? { ...company, _logoBase64: logoBase64 } : null,
      });

      // Then open the user's own email client with everything pre-filled —
      // the email is sent FROM their personal/business email, not from Fiscalix.
      const subject = encodeURIComponent(`Fatura ${invoice.invoice_number} — ${company?.name || ""}`)
      const totalFormatted = formatCurrency(total)
      const body = encodeURIComponent(
        `Përshëndetje ${invoice.client_name},\n\n` +
        `Ju dërgojmë faturën ${invoice.invoice_number} në vlerë të ${totalFormatted}.\n` +
        `PDF-ja e faturës është shkarkuar tani te kompjuteri juaj — ju lutem bashkëngjiteni këtu para se ta dërgoni.\n\n` +
        `Faleminderit për bashkëpunimin!\n\n${company?.name || ""}`
      )
      window.location.href = `mailto:${invoice.client_email}?subject=${subject}&body=${body}`

      toast.success("PDF u shkarkua — bashkëngjite te email-i që u hap dhe dërgoje")
    } catch (err) {
      console.error("Send email error:", err)
      toast.error("Gabim gjatë përgatitjes së email-it")
    } finally {
      setExporting(false)
    }
  }

  async function handleGenerateQR() {
    setGeneratingQR(true);
    try {
      const { generateQRDataUrl } = await import("@/lib/qr");
      const url = await generateQRDataUrl({ invoice, company });
      setQrDataUrl(url);
      setShowQR(true);
    } catch {
      toast.error("Gabim gjatë gjenerimit të QR");
    } finally {
      setGeneratingQR(false);
    }
  }

  async function handleMarkPaid() {
    setMarkingPaid(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", paid_date: new Date().toISOString() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      toast.success("Fatura u shënua si e paguar");
      router.refresh();
    } catch (err) {
      toast.error(`Gabim: ${err instanceof Error ? err.message : 'E panjohur'}`);
    } finally {
      setMarkingPaid(false);
    }
  }

  async function handleDelete() {
    if (!confirm("A jeni i sigurt që doni ta fshini këtë faturë?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Fatura u fshi");
      router.push("/invoices");
    } catch {
      toast.error("Ndodhi një gabim");
    } finally {
      setDeleting(false);
    }
  }

  function handleCopyNumber() {
    navigator.clipboard.writeText(invoice.invoice_number);
    toast.success("Numri u kopjua");
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors hover:text-[var(--text-1)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--text-1)]">
                {invoice.invoice_number}
              </h1>
              <button
                onClick={handleCopyNumber}
                className="p-1 rounded hover:bg-[var(--bg-muted)] transition-colors text-[var(--text-3)] hover:text-[var(--text-2)]"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-[var(--text-3)] text-sm mt-0.5">
              Krijuar më {formatDate(invoice.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateQR}
            disabled={generatingQR}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-1)] transition-all text-sm font-medium"
          >
            {generatingQR ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <QrCode className="w-4 h-4" />
            )}
            QR
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-1)] transition-all text-sm font-medium"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            PDF
          </button>
          {invoice.client_email && (
            <button
              onClick={handleSendEmail}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-1)] transition-all text-sm font-medium"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              Dërgo me Email
            </button>
          )}
          {invoice.status !== "paid" && (
            <button
              onClick={handleMarkPaid}
              disabled={markingPaid}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all text-sm font-medium"
            >
              {markingPaid ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Shëno Paguar
            </button>
          )}
          <Link
            href={`/invoices/${invoice.id}/edit`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-1)] transition-all text-sm font-medium"
          >
            <Edit className="w-4 h-4" />
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Due date warning */}
      {invoice.status !== "paid" && daysUntilDue <= 7 && (
        <div
          className={`flex items-center gap-3 p-3 rounded-xl border mb-6 text-sm ${
            daysUntilDue < 0
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : daysUntilDue <= 3
              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
          }`}
        >
          {daysUntilDue < 0 ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <Clock className="w-4 h-4 shrink-0" />
          )}
          {daysUntilDue < 0
            ? `Fatura ka vonuar ${Math.abs(daysUntilDue)} ditë`
            : `Skadon për ${daysUntilDue} ditë – ${formatDate(invoice.due_date)}`}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main invoice content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Parties */}
          <div className="glass rounded-2xl p-6 border border-[var(--border)]">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-[var(--text-3)] uppercase tracking-wider mb-3">
                  Nga
                </p>
                <p className="font-semibold text-[var(--text-1)]">{company.name}</p>
                <p className="text-sm mt-1">
                  {company.address}
                </p>
                {company.tax_number && (
                  <p className="text-[var(--text-3)] text-xs mt-1">
                    NUI: {company.tax_number}
                  </p>
                )}
                <p className="text-sm">{company.email}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-3)] uppercase tracking-wider mb-3">
                  Për
                </p>
                <p className="font-semibold text-[var(--text-1)]">{invoice.client_name}</p>
                {invoice.client_email && (
                  <p className="text-sm mt-1">
                    {invoice.client_email}
                  </p>
                )}
                {invoice.client_address && (
                  <p className="text-sm">{invoice.client_address}</p>
                )}
                {invoice.client_tax_number && (
                  <p className="text-[var(--text-3)] text-xs mt-1">
                    NUI: {invoice.client_tax_number}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text-1)]">Artikujt</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-xs text-[var(--text-3)] font-medium uppercase tracking-wider px-6 py-3">
                    Përshkrimi
                  </th>
                  <th className="text-center text-xs text-[var(--text-3)] font-medium uppercase tracking-wider px-3 py-3">
                    Sasia
                  </th>
                  <th className="text-right text-xs text-[var(--text-3)] font-medium uppercase tracking-wider px-3 py-3">
                    Çmimi
                  </th>
                  <th className="text-right text-xs text-[var(--text-3)] font-medium uppercase tracking-wider px-6 py-3">
                    Totali
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.invoice_items.map((item, i) => (
                  <tr
                    key={item.id}
                    className={i % 2 === 0 ? "" : "bg-white/[0.02]"}
                  >
                    <td className="px-6 py-4">
                      <p className="text-[var(--text-1)] text-sm">{item.description}</p>
                    </td>
                    <td className="px-3 py-4 text-center text-sm">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-4 text-right text-sm">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-6 py-4 text-right text-[var(--text-1)] font-medium text-sm">
                      {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-[var(--border)] px-6 py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Nëntotali</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>Zbritje</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>TVSH ({taxRate}%)</span>
                <span>{formatCurrency(taxAmt)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[var(--text-1)] pt-2 border-t border-[var(--border)]">
                <span>Totali</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="glass rounded-2xl p-6 border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text-1)] mb-2">Shënime</h3>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div className="glass rounded-2xl p-6 border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text-1)] mb-2">Kushtet</h3>
              <p className="text-sm">{invoice.terms}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Meta */}
          <div className="glass rounded-2xl p-5 border border-[var(--border)] space-y-4">
            <h3 className="font-semibold text-[var(--text-1)] text-sm">Detajet</h3>
            <div className="space-y-3">
              {[
                { label: "Data Lëshimit", value: formatDate(invoice.issue_date) },
                { label: "Data Skadimit", value: formatDate(invoice.due_date) },
                { label: "Monedha", value: "EUR (€)" },
                {
                  label: "Pagesa",
                  value: invoice.payment_method || "Bank Transfer",
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[var(--text-3)] text-xs">{label}</span>
                  <span className="text-[var(--text-1)] text-xs font-medium">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total highlight */}
          <div className="bg-white rounded-2xl p-5">
            <p className="text-zinc-600 text-xs font-medium mb-1">
              Totali për pagesë
            </p>
            <p className="text-black text-2xl font-black">
              {formatCurrency(total)}
            </p>
            {invoice.status === "paid" && invoice.paid_date && (
              <p className="text-emerald-600 text-xs mt-1">
                ✓ Paguar më {formatDate(invoice.paid_date)}
              </p>
            )}
          </div>

          {/* QR Code */}
          {showQR && qrDataUrl && (
            <div className="glass rounded-2xl p-5 border border-[var(--border)] text-center">
              <h3 className="font-semibold text-[var(--text-1)] text-sm mb-3">
                QR Kodi i Pagesës
              </h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-40 h-40 mx-auto rounded-lg"
              />
              <p className="text-[var(--text-3)] text-xs mt-2">
                Skanoni me aplikacionin bankar
              </p>
              <a
                href={qrDataUrl}
                download={`qr-${invoice.invoice_number}.png`}
                className="mt-3 inline-flex items-center gap-1 text-xs hover:text-[var(--text-1)] transition-colors">
                <Download className="w-3 h-3" />
                Shkarko QR
              </a>
            </div>
          )}

          {/* Bank details */}
          {company.iban && (
            <div className="glass rounded-2xl p-5 border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text-1)] text-sm mb-3">
                Detajet Bankare
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">IBAN</span>
                  <span className="text-[var(--text-1)] font-mono">{company.iban}</span>
                </div>
                {company.bank_name && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-3)]">Banka</span>
                    <span className="text-[var(--text-1)]">{company.bank_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">Ref.</span>
                  <span className="text-[var(--text-1)] font-mono">
                    {invoice.invoice_number}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InvoiceDetailClient
