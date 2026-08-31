-- ============================================================
-- FineX OS — EKZEKUTO KËTË TË GJITHËN NJË HERË
-- Kopjo gjithë këtë fajll dhe paste në Supabase SQL Editor
-- ============================================================

-- ============================================================
-- FineX OS — Database Schema
-- PostgreSQL via Supabase
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'business_owner', 'staff');
CREATE TYPE subscription_plan AS ENUM ('basic', 'premium', 'advanced', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'grace_period', 'cancelled', 'pending', 'trialing');
CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE payment_method AS ENUM ('bank_transfer', 'cash', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'confirmed', 'rejected');
CREATE TYPE expense_frequency AS ENUM ('one_time', 'daily', 'weekly', 'monthly', 'yearly');
CREATE TYPE recurring_invoice_status AS ENUM ('active', 'paused', 'cancelled');
CREATE TYPE activity_action AS ENUM (
  'login', 'logout', 'create_invoice', 'update_invoice', 'delete_invoice',
  'create_expense', 'update_expense', 'delete_expense', 'ai_scan',
  'subscription_activated', 'subscription_expired', 'payment_submitted',
  'payment_confirmed', 'user_created', 'user_updated', 'company_created',
  'admin.company.activate', 'admin.company.deactivate', 'admin.client.created',
  'admin.subscription.extend', 'admin.subscription.change_plan',
  'admin.user.deactivate', 'admin.user.activate', 'admin.user.change_role'
);

-- ============================================================
-- COMPANIES
-- ============================================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Kosovo',
  vat_number VARCHAR(100),
  business_number VARCHAR(100),
  logo_url TEXT,
  website VARCHAR(255),
  bank_account VARCHAR(100),
  bank_name VARCHAR(100),
  currency VARCHAR(10) DEFAULT 'EUR',
  invoice_prefix VARCHAR(20) DEFAULT 'INV',
  invoice_counter INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role user_role DEFAULT 'business_owner',
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  phone VARCHAR(50),
  language VARCHAR(10) DEFAULT 'sq',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'basic',
  status subscription_status NOT NULL DEFAULT 'pending',
  price_monthly DECIMAL(10,2),
  price_paid DECIMAL(10,2),
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly' | 'yearly'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  grace_period_end TIMESTAMPTZ,
  ai_scans_used INTEGER DEFAULT 0,
  ai_scans_limit INTEGER DEFAULT 0, -- 0 = unlimited
  notes TEXT,
  activated_by UUID REFERENCES users(id),
  activated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',
  method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  reference_number VARCHAR(100),
  bank_name VARCHAR(100),
  receipt_url TEXT,
  period_months INTEGER DEFAULT 1,
  notes TEXT,
  submitted_by UUID REFERENCES users(id),
  confirmed_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPENSE CATEGORIES
-- ============================================================

CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL = global
  name_sq VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO expense_categories (id, name_sq, name_en, icon, color) VALUES
  (uuid_generate_v4(), 'Ushqim & Pije', 'Food & Beverages', 'utensils', '#F59E0B'),
  (uuid_generate_v4(), 'Transport', 'Transport', 'car', '#3B82F6'),
  (uuid_generate_v4(), 'Teknologji', 'Technology', 'laptop', '#8B5CF6'),
  (uuid_generate_v4(), 'Marketing', 'Marketing', 'megaphone', '#EC4899'),
  (uuid_generate_v4(), 'Qiraja', 'Rent', 'building', '#10B981'),
  (uuid_generate_v4(), 'Pagat', 'Salaries', 'users', '#EF4444'),
  (uuid_generate_v4(), 'Furnizues', 'Supplies', 'package', '#6366F1'),
  (uuid_generate_v4(), 'Shërbime komunale', 'Utilities', 'zap', '#F97316'),
  (uuid_generate_v4(), 'Sigurimi', 'Insurance', 'shield', '#14B8A6'),
  (uuid_generate_v4(), 'Të tjera', 'Other', 'more-horizontal', '#6B7280');

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  category_id UUID REFERENCES expense_categories(id),
  vendor_name VARCHAR(255),
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  receipt_filename VARCHAR(255),
  is_ai_scanned BOOLEAN DEFAULT FALSE,
  ai_scan_id UUID,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI SCANS
-- ============================================================

CREATE TABLE ai_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  image_url TEXT NOT NULL,
  image_filename VARCHAR(255),
  extracted_vendor VARCHAR(255),
  extracted_amount DECIMAL(10,2),
  extracted_date DATE,
  extracted_category VARCHAR(100),
  extracted_description TEXT,
  raw_text TEXT,
  confidence_score DECIMAL(5,2),
  expense_id UUID REFERENCES expenses(id),
  tokens_used INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  invoice_number VARCHAR(50) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_phone VARCHAR(50),
  client_address TEXT,
  client_vat VARCHAR(100),
  status invoice_status DEFAULT 'pending',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 18.00, -- Kosovo VAT 18%
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'EUR',
  notes TEXT,
  terms TEXT,
  qr_code_url TEXT,
  pdf_url TEXT,
  recurring_id UUID,
  is_recurring BOOLEAN DEFAULT FALSE,
  payment_method VARCHAR(50),
  bank_reference VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICE ITEMS
-- ============================================================

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit VARCHAR(50),
  unit_price DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RECURRING INVOICES
-- ============================================================

CREATE TABLE recurring_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_phone VARCHAR(50),
  client_address TEXT,
  client_vat VARCHAR(100),
  frequency expense_frequency DEFAULT 'monthly',
  amount DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 18.00,
  currency VARCHAR(10) DEFAULT 'EUR',
  next_invoice_date DATE,
  last_invoice_date DATE,
  start_date DATE NOT NULL,
  end_date DATE,
  status recurring_invoice_status DEFAULT 'active',
  items JSONB, -- snapshot of line items
  notes TEXT,
  invoices_generated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'info', -- info, warning, error, success
  action_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  action activity_action NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  description TEXT,
  metadata JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER COMPANY ACCESS (for multi-company ADVANCED plan)
-- ============================================================

CREATE TABLE user_company_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role user_role DEFAULT 'staff',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_created_by ON invoices(created_by);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_expenses_company_id ON expenses(company_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_ai_scans_company_id ON ai_scans(company_id);
CREATE INDEX idx_ai_scans_created_at ON ai_scans(created_at);
CREATE INDEX idx_payments_company_id ON payments(company_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_activity_logs_company_id ON activity_logs(company_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recurring_invoices_updated_at BEFORE UPDATE ON recurring_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNCTION: Auto-update overdue invoices
-- ============================================================

CREATE OR REPLACE FUNCTION update_overdue_invoices()
RETURNS void AS $$
BEGIN
  UPDATE invoices
  SET status = 'overdue'
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Check subscription status
-- ============================================================

CREATE OR REPLACE FUNCTION get_company_subscription_status(p_company_id UUID)
RETURNS TABLE(
  plan subscription_plan,
  status subscription_status,
  days_remaining INTEGER,
  in_grace_period BOOLEAN,
  ai_scans_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.plan,
    s.status,
    EXTRACT(DAY FROM (s.current_period_end - NOW()))::INTEGER AS days_remaining,
    (NOW() BETWEEN s.current_period_end AND s.grace_period_end) AS in_grace_period,
    CASE
      WHEN s.ai_scans_limit = 0 THEN 999999
      ELSE GREATEST(0, s.ai_scans_limit - s.ai_scans_used)
    END AS ai_scans_remaining
  FROM subscriptions s
  WHERE s.company_id = p_company_id
    AND s.status IN ('active', 'grace_period')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Handle new user registration
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'business_owner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTE: Run this separately in Supabase if needed:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- VIEWS
-- ============================================================

-- Dashboard summary view
CREATE VIEW company_dashboard_stats AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  -- Revenue (current month)
  COALESCE(SUM(CASE WHEN i.status = 'paid' AND DATE_TRUNC('month', i.paid_date) = DATE_TRUNC('month', NOW()) THEN i.total ELSE 0 END), 0) AS monthly_revenue,
  -- Total revenue (all time)
  COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END), 0) AS total_revenue,
  -- Pending invoices
  COALESCE(SUM(CASE WHEN i.status = 'pending' THEN i.total ELSE 0 END), 0) AS pending_revenue,
  -- Overdue invoices
  COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN i.total ELSE 0 END), 0) AS overdue_amount,
  COUNT(CASE WHEN i.status = 'pending' THEN 1 END) AS pending_count,
  COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) AS overdue_count
FROM companies c
LEFT JOIN invoices i ON i.company_id = c.id
GROUP BY c.id, c.name;


-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ============================================================
-- FineX OS — Row Level Security Policies
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_access ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get current user's company
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- COMPANIES POLICIES
-- ============================================================

CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = public.user_company_id() OR public.is_admin());

CREATE POLICY "Admin can view all companies"
  ON companies FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Business owners can update their company"
  ON companies FOR UPDATE
  USING (id = public.user_company_id() AND public.user_role() IN ('admin', 'business_owner'));

CREATE POLICY "Admin can insert companies"
  ON companies FOR INSERT
  WITH CHECK (public.is_admin() OR auth.uid() IS NOT NULL);

CREATE POLICY "Admin can delete companies"
  ON companies FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- USERS POLICIES
-- ============================================================

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid() OR public.is_admin() OR company_id = public.user_company_id());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admin can update any user"
  ON users FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Allow insert on registration"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================
-- SUBSCRIPTIONS POLICIES
-- ============================================================

CREATE POLICY "Company members can view their subscription"
  ON subscriptions FOR SELECT
  USING (company_id = public.user_company_id() OR public.is_admin());

CREATE POLICY "Only admin can manage subscriptions"
  ON subscriptions FOR ALL
  USING (public.is_admin());

-- ============================================================
-- PAYMENTS POLICIES
-- ============================================================

CREATE POLICY "Company members can view their payments"
  ON payments FOR SELECT
  USING (company_id = public.user_company_id() OR public.is_admin());

CREATE POLICY "Company members can submit payments"
  ON payments FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Only admin can confirm payments"
  ON payments FOR UPDATE
  USING (public.is_admin());

-- ============================================================
-- INVOICES POLICIES
-- ============================================================

CREATE POLICY "Company members can view invoices"
  ON invoices FOR SELECT
  USING (company_id = public.user_company_id() OR public.is_admin());

CREATE POLICY "Staff and owners can create invoices"
  ON invoices FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Staff and owners can update invoices"
  ON invoices FOR UPDATE
  USING (company_id = public.user_company_id() OR public.is_admin());

CREATE POLICY "Owners and admin can delete invoices"
  ON invoices FOR DELETE
  USING (
    (company_id = public.user_company_id() AND public.user_role() IN ('business_owner', 'admin'))
    OR public.is_admin()
  );

-- ============================================================
-- INVOICE ITEMS POLICIES
-- ============================================================

CREATE POLICY "Company members can view invoice items"
  ON invoice_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE company_id = public.user_company_id()
    ) OR public.is_admin()
  );

CREATE POLICY "Company members can manage invoice items"
  ON invoice_items FOR ALL
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE company_id = public.user_company_id()
    ) OR public.is_admin()
  );

-- ============================================================
-- EXPENSES POLICIES
-- ============================================================

CREATE POLICY "Company members can view expenses"
  ON expenses FOR SELECT
  USING (company_id = public.user_company_id() OR public.is_admin());

CREATE POLICY "Company members can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Company members can update expenses"
  ON expenses FOR UPDATE
  USING (company_id = public.user_company_id() OR public.is_admin());

CREATE POLICY "Owners can delete expenses"
  ON expenses FOR DELETE
  USING (
    (company_id = public.user_company_id() AND public.user_role() IN ('business_owner', 'admin'))
    OR public.is_admin()
  );

-- ============================================================
-- EXPENSE CATEGORIES POLICIES
-- ============================================================

CREATE POLICY "Anyone can view global categories"
  ON expense_categories FOR SELECT
  USING (company_id IS NULL OR company_id = public.user_company_id() OR public.is_admin());

CREATE POLICY "Company owners can manage their categories"
  ON expense_categories FOR ALL
  USING (
    (company_id = public.user_company_id() AND public.user_role() IN ('business_owner', 'admin'))
    OR public.is_admin()
  );

-- ============================================================
-- AI SCANS POLICIES
-- ============================================================

CREATE POLICY "Company members can view AI scans"
  ON ai_scans FOR SELECT
  USING (company_id = public.user_company_id() OR public.is_admin());

CREATE POLICY "Company members can create AI scans"
  ON ai_scans FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

-- ============================================================
-- RECURRING INVOICES POLICIES
-- ============================================================

CREATE POLICY "Company members can manage recurring invoices"
  ON recurring_invoices FOR ALL
  USING (company_id = public.user_company_id() OR public.is_admin());

-- ============================================================
-- NOTIFICATIONS POLICIES
-- ============================================================

CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================
-- ACTIVITY LOGS POLICIES
-- ============================================================

CREATE POLICY "Company members can view their logs"
  ON activity_logs FOR SELECT
  USING (company_id = public.user_company_id() OR public.is_admin());

CREATE POLICY "System can insert logs"
  ON activity_logs FOR INSERT
  WITH CHECK (TRUE);

-- Admin can view all
CREATE POLICY "Admin can view all activity logs"
  ON activity_logs FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Run in Supabase Dashboard > Storage:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-pdfs', 'invoice-pdfs', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('ai-scans', 'ai-scans', false);


-- ============================================================
-- SEED DATA
-- ============================================================

-- ============================================================
-- FineX OS – Seed Data
-- Run after schema.sql and rls-policies.sql
-- ============================================================

-- -------------------------
-- Default Expense Categories
-- (will be assigned per company via trigger or manually)
-- -------------------------

-- Create a function to seed categories for a company
CREATE OR REPLACE FUNCTION seed_company_categories(p_company_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO expense_categories (company_id, name, icon, color) VALUES
    (p_company_id, 'Furnizime & Materiale', '📦', '#a1a1aa'),
    (p_company_id, 'Transport & Udhëtime', '🚗', '#f59e0b'),
    (p_company_id, 'Qiraja & Prona', '🏢', '#3b82f6'),
    (p_company_id, 'Shërbime Komunale', '💡', '#f97316'),
    (p_company_id, 'Paga & HR', '👥', '#8b5cf6'),
    (p_company_id, 'Marketing & Reklamim', '📣', '#ec4899'),
    (p_company_id, 'Teknologji & Software', '💻', '#06b6d4'),
    (p_company_id, 'Ushqim & Konferenca', '🍽️', '#84cc16'),
    (p_company_id, 'Sigurimi', '🛡️', '#14b8a6'),
    (p_company_id, 'Tatimet & Tarifat', '📋', '#ef4444'),
    (p_company_id, 'Mirëmbajtja', '🔧', '#78716c'),
    (p_company_id, 'Tjera', '📌', '#6b7280')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------
-- Trigger: Auto-seed categories when company is created
-- -------------------------
CREATE OR REPLACE FUNCTION auto_seed_categories()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM seed_company_categories(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_company_created ON companies;
CREATE TRIGGER on_company_created
  AFTER INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION auto_seed_categories();

-- -------------------------
-- Demo Admin User Setup
-- Run this after creating your admin user via Supabase Auth Dashboard
-- Replace 'YOUR_ADMIN_USER_ID' with the actual UUID from auth.users
-- -------------------------

-- UPDATE users SET role = 'admin' WHERE email = 'admin@finexos.com';

-- -------------------------
-- Example test data (optional - comment out for production)
-- -------------------------

-- Example company (will be created via register flow)
-- INSERT INTO companies (id, name, email, invoice_prefix, default_tax_rate)
-- VALUES (gen_random_uuid(), 'Demo Kompania SH.P.K', 'demo@kompania.com', 'DK', 18);
