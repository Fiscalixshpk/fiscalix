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
