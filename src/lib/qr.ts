import type { Invoice, Company } from "@/types";

interface QRPaymentData {
  invoice: Invoice;
  company: Company;
}

export async function generateQRDataUrl(data: QRPaymentData): Promise<string> {
  const QRCode = (await import("qrcode")).default;

  const { invoice, company } = data;
  const subtotal = Number(invoice.subtotal);
  const taxRate = Number(invoice.tax_rate);
  const taxAmt = (subtotal * taxRate) / 100;
  const discount = Number(invoice.discount_amount || 0);
  const total = subtotal + taxAmt - discount;

  // EPC QR standard (used in EU/Kosovo banking)
  const epcData = [
    "BCD",               // Service Tag
    "002",               // Version
    "1",                 // Encoding (UTF-8)
    "SCT",               // SEPA Credit Transfer
    company.iban ? company.iban.replace(/\s/g, "") : "",  // BIC (optional)
    company.name,         // Beneficiary Name
    company.iban || "",  // IBAN
    `EUR${total.toFixed(2)}`, // Amount
    "",                  // Purpose
    invoice.invoice_number, // Remittance Reference
    `Faturë ${invoice.invoice_number}`, // Remittance Information
  ].join("\n");

  return QRCode.toDataURL(epcData, {
    width: 256,
    margin: 1,
    color: { dark: "#000000", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
}

export async function generateQRCanvas(
  canvasEl: HTMLCanvasElement,
  text: string
): Promise<void> {
  const QRCode = (await import("qrcode")).default;
  await QRCode.toCanvas(canvasEl, text, {
    width: 200,
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

export async function generateSimpleQR(text: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(text, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}
