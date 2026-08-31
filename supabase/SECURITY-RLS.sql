-- ═══════════════════════════════════════════════════════
-- FISCALIX — SECURITY: Row Level Security (RLS)
-- Ekzekuto këtë MENJËHERË te Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- ─── NOTIFICATIONS ───────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_select" ON notifications;
DROP POLICY IF EXISTS "notif_insert" ON notifications;
DROP POLICY IF EXISTS "notif_update" ON notifications;
DROP POLICY IF EXISTS "notif_delete" ON notifications;

CREATE POLICY "notif_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notif_insert" ON notifications
  FOR INSERT WITH CHECK (true);  -- API-t i insertojnë me user_id të saktë

CREATE POLICY "notif_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notif_delete" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- ─── ACTIVITY_LOGS ───────────────────────────────────
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logs_select" ON activity_logs;
DROP POLICY IF EXISTS "logs_insert" ON activity_logs;

CREATE POLICY "logs_select" ON activity_logs
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "logs_insert" ON activity_logs
  FOR INSERT WITH CHECK (true);

-- ─── INVOICES ────────────────────────────────────────
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid() AND is_active = true
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid() AND is_active = true
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── EXPENSES ────────────────────────────────────────
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;

CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid() AND is_active = true
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid() AND is_active = true
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── SUBSCRIPTIONS ───────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subs_select" ON subscriptions;

CREATE POLICY "subs_select" ON subscriptions
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── COMPANIES ───────────────────────────────────────
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;

CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR id IN (SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "companies_update" ON companies
  FOR UPDATE USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── PAYMENTS ────────────────────────────────────────
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_select" ON payments;

CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── ACCOUNTANT_CLIENTS ───────────────────────────────
ALTER TABLE accountant_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acc_clients_select" ON accountant_clients;

CREATE POLICY "acc_clients_select" ON accountant_clients
  FOR SELECT USING (
    accountant_id = auth.uid()
    OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── USERS ───────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_update" ON users;

CREATE POLICY "users_select" ON users
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    OR id IN (
      SELECT accountant_id FROM accountant_clients 
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── WITHHOLDING_TAX ─────────────────────────────────
ALTER TABLE withholding_tax ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wht_select" ON withholding_tax;

CREATE POLICY "wht_select" ON withholding_tax
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── EMPLOYEES ────────────────────────────────────────
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emp_select" ON employees;

CREATE POLICY "emp_select" ON employees
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── PAYROLL_RECORDS ──────────────────────────────────
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_select" ON payroll_records;

CREATE POLICY "payroll_select" ON payroll_records
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── BANK_RECONCILIATION ──────────────────────────────
ALTER TABLE bank_reconciliation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recon_select" ON bank_reconciliation;

CREATE POLICY "recon_select" ON bank_reconciliation
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

