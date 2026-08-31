import type { Invoice, Expense } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportInvoicesCSV(invoices: Invoice[]): void {
  const headers = [
    "Nr. Faturës",
    "Klienti",
    "Email Klientit",
    "Data Lëshimit",
    "Data Skadimit",
    "Nëntotali (€)",
    "TVSH (%)",
    "TVSH (€)",
    "Zbritja (€)",
    "Totali (€)",
    "Statusi",
    "Shënime",
  ];

  const rows = invoices.map((inv) => {
    const subtotal = Number(inv.subtotal || 0);
    const taxRate = Number(inv.tax_rate || 18);
    const taxAmt = Number(inv.tax_amount || (subtotal * taxRate / 100));
    const discount = Number(inv.discount_amount || 0);
    const total = Number((inv as {total_amount?: number; total?: number}).total_amount ?? inv.total ?? subtotal + taxAmt - discount);

    return [
      inv.invoice_number || "",
      inv.client_name || "",
      inv.client_email || "",
      inv.issue_date ? formatDate(inv.issue_date) : "",
      inv.due_date ? formatDate(inv.due_date) : "",
      subtotal.toFixed(2),
      taxRate.toFixed(2),
      taxAmt.toFixed(2),
      discount.toFixed(2),
      total.toFixed(2),
      inv.status || "",
      inv.notes || "",
    ].map(escapeCSV);
  });

  const csv = [headers.map(escapeCSV), ...rows]
    .map((row) => row.join(","))
    .join("\n");

  const date = new Date().toISOString().split("T")[0];
  downloadCSV(csv, `invoices-${date}.csv`);
}

export function exportExpensesCSV(expenses: Expense[]): void {
  const headers = [
    "Date",
    "Vendor",
    "Description",
    "Amount (€)",
    "Category",
    "Payment Method",
    "Reference",
    "Notes",
    "AI Scanned",
  ];

  const rows = expenses.map((exp) => [
    exp.expense_date ? formatDate(exp.expense_date) : "",  // fixed: expense_date not date
    exp.vendor_name || "",
    exp.description || "",
    Number(exp.amount).toFixed(2),
    (exp.expense_categories as { name_sq?: string; name?: string } | null)?.name_sq || (exp.expense_categories as { name_sq?: string; name?: string } | null)?.name || "",
    exp.payment_method || "",
    exp.reference_number || "",
    exp.notes || "",
  ].map(escapeCSV));

  const csv = [headers.map(escapeCSV), ...rows]
    .map((row) => row.join(","))
    .join("\n");

  const date = new Date().toISOString().split("T")[0];
  downloadCSV(csv, `expenses-${date}.csv`);
}

export function exportToJSON<T>(data: T[], filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
