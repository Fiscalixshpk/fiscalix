import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "EUR",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _locale?: string
): string {
  // Use consistent format (no locale) to avoid SSR/client hydration mismatch
  const num = Math.abs(Number(amount) || 0)
  const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  const symbol = currency === "EUR" ? "€" : currency
  return `${symbol}${formatted}`
}

export function formatDate(
  date: string | Date,
  _locale?: string,
  _options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  // Use ISO-based formatting to avoid SSR/client locale mismatch
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

const SQ_WEEKDAYS = ['e diel', 'e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë']
const SQ_MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor']

/**
 * Formaton një datë në shqip, formë e gjatë (p.sh. "e shtunë, 27 qershor 2026").
 * Manual (jo Intl/toLocaleDateString) — i sigurt për SSR/hidratim, sepse del
 * identik në server dhe browser pavarësisht locale të sistemit operativ.
 */
export function formatDateLongSq(date: Date = new Date()): string {
  const weekday = SQ_WEEKDAYS[date.getDay()]
  const day = date.getDate()
  const month = SQ_MONTHS[date.getMonth()]
  const year = date.getFullYear()
  return `${weekday}, ${day} ${month} ${year}`
}

export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueDate: string, status: string): boolean {
  if (status === "paid") return false;
  return getDaysUntilDue(dueDate) < 0;
}

export function generateInvoiceNumber(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function calculateTax(amount: number, taxRate: number): number {
  return amount * (taxRate / 100);
}

export function calculateTotal(
  subtotal: number,
  taxRate: number,
  discountAmount: number = 0
): number {
  const tax = calculateTax(subtotal, taxRate);
  return subtotal + tax - discountAmount;
}

export function getMonthName(month: number, locale: string = "sq-AL"): string {
  const date = new Date(2024, month - 1, 1);
  return new Intl.DateTimeFormat(locale, { month: "long" }).format(date);
}

export function getLast6Months(): { month: string; year: number; label: string }[] {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    months.push({
      month: String(date.getMonth() + 1).padStart(2, "0"),
      year: date.getFullYear(),
      label: new Intl.DateTimeFormat("sq-AL", { month: "short" }).format(date),
    });
  }
  return months;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function bytesToSize(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (bytes === 0) return "0 Byte";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i)) + " " + sizes[i];
}

export const STATUS_COLORS = {
  paid: "text-emerald-400 bg-emerald-400/10",
  pending: "text-amber-400 bg-amber-400/10",
  overdue: "text-red-400 bg-red-400/10",
  draft: "text-zinc-400 bg-zinc-400/10",
  cancelled: "text-zinc-500 bg-zinc-500/10",
  active: "text-emerald-400 bg-emerald-400/10",
  expired: "text-red-400 bg-red-400/10",
  trial: "text-blue-400 bg-blue-400/10",
  confirmed: "text-emerald-400 bg-emerald-400/10",
  rejected: "text-red-400 bg-red-400/10",
} as const;

export const PLAN_COLORS = {
  // Biznes
  basic:    "text-zinc-300 bg-zinc-800",
  // Kontabilistë
  starter:      "text-amber-300 bg-amber-900/30",
  professional: "text-purple-300 bg-purple-900/30",
  // Legacy (backward compat)
  premium:  "text-amber-300 bg-amber-900/30",
  advanced: "text-purple-300 bg-purple-900/30",
  enterprise: "text-blue-300 bg-blue-900/30",
} as const;
