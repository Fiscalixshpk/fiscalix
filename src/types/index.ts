// ============================================================
// Fiscalix — TypeScript Types
// ============================================================

export type UserRole = 'admin' | 'business_owner' | 'staff'
export type SubscriptionPlan = 'basic' | 'pro' | 'business' | 'accountant'
export type SubscriptionStatus = 'active' | 'expired' | 'grace_period' | 'cancelled' | 'pending'
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'
export type PaymentMethod = 'bank_transfer' | 'cash' | 'other'
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected'
export type RecurringStatus = 'active' | 'paused' | 'cancelled'
export type ExpenseFrequency = 'one_time' | 'daily' | 'weekly' | 'monthly' | 'yearly'

// ── Database Entities ─────────────────────────────────────

export interface Company {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country: string
  vat_number?: string
  business_number?: string
  logo_url?: string
  invoice_color?: string  // hex color for PDF branding e.g. #7B2CF5
  website?: string
  bank_account?: string
  bank_name?: string
  currency: string
  invoice_prefix: string
  invoice_counter: number
  iban?: string
  tax_number?: string
  default_tax_rate?: number
  is_active: boolean
  is_vat_registered?: boolean
  business_type?: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: UserRole
  company_id?: string
  phone?: string
  language: string
  is_active: boolean
  last_login?: string
  email_verified: boolean
  created_at: string
  updated_at: string
  company?: Company
}

export interface Subscription {
  id: string
  company_id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  price_monthly?: number
  price_paid?: number
  billing_cycle: string
  current_period_start?: string
  current_period_end?: string
  grace_period_end?: string
  notes?: string
  activated_by?: string
  activated_at?: string
  cancelled_at?: string
  created_at: string
  updated_at: string
  company?: Company
}

export interface Payment {
  id: string
  subscription_id: string
  company_id: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  reference_number?: string
  bank_name?: string
  receipt_url?: string
  period_months: number
  notes?: string
  submitted_by?: string
  confirmed_by?: string
  submitted_at: string
  confirmed_at?: string
  created_at: string
  updated_at: string
  company?: Company
}

export interface ExpenseCategory {
  id: string
  company_id?: string
  name_sq: string
  name_en: string
  name?: string  // alias for name_sq for compatibility
  icon?: string
  color?: string
  is_active: boolean
  created_at: string
}

export interface Expense {
  id: string
  company_id: string
  created_by: string
  category_id?: string
  vendor_name?: string
  description?: string
  amount: number
  currency: string
  expense_date: string
  receipt_url?: string
  receipt_filename?: string
  tags?: string[]
  notes?: string
  created_at: string
  updated_at: string
  category?: ExpenseCategory
  creator?: User
}

export interface AIScan {
  id: string
  company_id: string
  user_id: string
  image_url: string
  image_filename?: string
  extracted_vendor?: string
  extracted_amount?: number
  extracted_date?: string
  extracted_category?: string
  extracted_description?: string
  raw_text?: string
  confidence_score?: number
  expense_id?: string
  tokens_used: number
  processing_time_ms?: number
  success: boolean
  error_message?: string
  created_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit?: string
  unit_price: number
  discount_percent: number
  total: number
  sort_order: number
  created_at: string
}

export interface Invoice {
  id: string
  company_id: string
  created_by: string
  invoice_number: string
  client_name: string
  client_email?: string
  client_phone?: string
  client_address?: string
  client_vat?: string
  status: InvoiceStatus
  issue_date: string
  due_date?: string
  paid_date?: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total: number
  total_amount?: number  // alias for total, synced via DB trigger
  currency: string
  notes?: string
  terms?: string
  qr_code_url?: string
  pdf_url?: string
  recurring_id?: string
  is_recurring: boolean
  payment_method?: string
  bank_reference?: string
  created_at: string
  updated_at: string
  items?: InvoiceItem[]
  company?: Company
  creator?: User
}

export interface RecurringInvoice {
  id: string
  company_id: string
  created_by: string
  name: string
  client_name: string
  client_email?: string
  client_phone?: string
  client_address?: string
  client_vat?: string
  frequency: ExpenseFrequency
  amount: number
  tax_rate: number
  currency: string
  next_invoice_date?: string
  last_invoice_date?: string
  start_date: string
  end_date?: string
  status: RecurringStatus
  items?: InvoiceItem[]
  notes?: string
  invoices_generated: number
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  company_id?: string
  title: string
  message?: string
  type: 'info' | 'warning' | 'error' | 'success'
  action_url?: string
  is_read: boolean
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id?: string
  company_id?: string
  action: string
  entity_type?: string
  entity_id?: string
  description?: string
  metadata?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
  user?: User
}

// ── Dashboard Types ────────────────────────────────────────

export interface DashboardStats {
  totalRevenue: number
  monthlyRevenue: number
  totalExpenses: number
  monthlyExpenses: number
  profit: number
  pendingAmount: number
  overdueAmount: number
  pendingCount: number
  overdueCount: number
  totalInvoices: number
  paidInvoices: number
}

export interface MonthlyData {
  month: string
  revenue: number
  expenses: number
  profit: number
}

export interface SubscriptionInfo {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  daysRemaining: number
  inGracePeriod: boolean
  aiScansRemaining: number
  aiScansUsed: number
  aiScansLimit: number
}

// ── Form Types ─────────────────────────────────────────────

export interface CreateInvoiceInput {
  client_name: string
  client_email?: string
  client_phone?: string
  client_address?: string
  client_vat?: string
  issue_date: string
  due_date?: string
  tax_rate: number
  discount_amount: number
  currency: string
  notes?: string
  terms?: string
  items: Array<{
    description: string
    quantity: number
    unit?: string
    unit_price: number
    discount_percent: number
  }>
}

export interface CreateExpenseInput {
  category_id?: string
  vendor_name?: string
  description?: string
  amount: number
  currency: string
  expense_date: string
  tags?: string[]
  notes?: string
}

export interface PlanFeatures {
  invoices: boolean
  expenses: boolean
  dashboard: boolean
  pdfExport: boolean
  qrInvoices: boolean
  aiScanner: boolean
  aiScansLimit: number | null // null = unlimited
  recurringInvoices: boolean
  prioritySupport: boolean
  multiCompany: boolean
  aiFinancialAdvisor: boolean
  csvExport: boolean
  customDevelopment: boolean
  fiscalIntegrations: boolean
}

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  basic: {
    invoices: true,
    expenses: true,
    dashboard: true,
    pdfExport: true,
    qrInvoices: true,
    aiScanner: false,
    aiScansLimit: 0,
    recurringInvoices: false,
    prioritySupport: false,
    multiCompany: false,
    aiFinancialAdvisor: false,
    csvExport: true,
    customDevelopment: false,
    fiscalIntegrations: false,
  },
  premium: {
    invoices: true,
    expenses: true,
    dashboard: true,
    pdfExport: true,
    qrInvoices: true,
    aiScanner: true,
    aiScansLimit: 150,
    recurringInvoices: true,
    prioritySupport: true,
    multiCompany: false,
    aiFinancialAdvisor: false,
    csvExport: true,
    customDevelopment: false,
    fiscalIntegrations: false,
  },
  advanced: {
    invoices: true,
    expenses: true,
    dashboard: true,
    pdfExport: true,
    qrInvoices: true,
    aiScanner: true,
    aiScansLimit: null,
    recurringInvoices: true,
    prioritySupport: true,
    multiCompany: true,
    aiFinancialAdvisor: true,
    csvExport: true,
    customDevelopment: false,
    fiscalIntegrations: false,
  },
  enterprise: {
    invoices: true,
    expenses: true,
    dashboard: true,
    pdfExport: true,
    qrInvoices: true,
    aiScanner: true,
    aiScansLimit: null,
    recurringInvoices: true,
    prioritySupport: true,
    multiCompany: true,
    aiFinancialAdvisor: true,
    csvExport: true,
    customDevelopment: true,
    fiscalIntegrations: true,
  },
}

export const PLAN_PRICES: Record<SubscriptionPlan, number | null> = {
  basic: 19,
  premium: 39,
  advanced: 79,
  enterprise: null,
}
