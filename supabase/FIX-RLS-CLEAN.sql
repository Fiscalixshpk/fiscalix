ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;
CREATE POLICY "companies_select" ON companies FOR SELECT USING (true);
CREATE POLICY "companies_insert" ON companies FOR INSERT WITH CHECK (true);
CREATE POLICY "companies_update" ON companies FOR UPDATE USING (true);
CREATE POLICY "companies_delete" ON companies FOR DELETE USING (true);
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_slug_key;
ALTER TABLE companies DROP COLUMN IF EXISTS slug;

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (true);
CREATE POLICY "users_delete" ON users FOR DELETE USING (true);

ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subs_select" ON subscriptions;
DROP POLICY IF EXISTS "subs_insert" ON subscriptions;
DROP POLICY IF EXISTS "subs_update" ON subscriptions;
DROP POLICY IF EXISTS "subs_delete" ON subscriptions;
CREATE POLICY "subs_select" ON subscriptions FOR SELECT USING (true);
CREATE POLICY "subs_insert" ON subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "subs_update" ON subscriptions FOR UPDATE USING (true);
CREATE POLICY "subs_delete" ON subscriptions FOR DELETE USING (true);

ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_select" ON payments;
DROP POLICY IF EXISTS "payments_insert" ON payments;
DROP POLICY IF EXISTS "payments_update" ON payments;
DROP POLICY IF EXISTS "payments_delete" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT USING (true);
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "payments_update" ON payments FOR UPDATE USING (true);
CREATE POLICY "payments_delete" ON payments FOR DELETE USING (true);

ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_select" ON notifications;
DROP POLICY IF EXISTS "notif_insert" ON notifications;
DROP POLICY IF EXISTS "notif_update" ON notifications;
DROP POLICY IF EXISTS "notif_delete" ON notifications;
CREATE POLICY "notif_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notif_delete" ON notifications FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;
CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (true);
CREATE POLICY "invoices_insert" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "invoices_update" ON invoices FOR UPDATE USING (true);
CREATE POLICY "invoices_delete" ON invoices FOR DELETE USING (true);

ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inv_items_all" ON invoice_items;
CREATE POLICY "inv_items_all" ON invoice_items FOR ALL USING (true);

ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT USING (true);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "expenses_update" ON expenses FOR UPDATE USING (true);
CREATE POLICY "expenses_delete" ON expenses FOR DELETE USING (true);

ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logs_select" ON activity_logs;
DROP POLICY IF EXISTS "logs_insert" ON activity_logs;
DROP POLICY IF EXISTS "logs_delete" ON activity_logs;
CREATE POLICY "logs_select" ON activity_logs FOR SELECT USING (true);
CREATE POLICY "logs_insert" ON activity_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "logs_delete" ON activity_logs FOR DELETE USING (true);

ALTER TABLE accountant_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE accountant_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acc_clients_select" ON accountant_clients;
DROP POLICY IF EXISTS "acc_clients_insert" ON accountant_clients;
DROP POLICY IF EXISTS "acc_clients_update" ON accountant_clients;
DROP POLICY IF EXISTS "acc_clients_delete" ON accountant_clients;
CREATE POLICY "acc_clients_select" ON accountant_clients FOR SELECT USING (true);
CREATE POLICY "acc_clients_insert" ON accountant_clients FOR INSERT WITH CHECK (true);
CREATE POLICY "acc_clients_update" ON accountant_clients FOR UPDATE USING (true);
CREATE POLICY "acc_clients_delete" ON accountant_clients FOR DELETE USING (true);

ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quotes_all" ON quotes;
CREATE POLICY "quotes_all" ON quotes FOR ALL USING (true);

ALTER TABLE quote_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quote_items_all" ON quote_items;
CREATE POLICY "quote_items_all" ON quote_items FOR ALL USING (true);

ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emp_select" ON employees;
DROP POLICY IF EXISTS "emp_all" ON employees;
CREATE POLICY "emp_all" ON employees FOR ALL USING (true);

ALTER TABLE withholding_tax DISABLE ROW LEVEL SECURITY;
ALTER TABLE withholding_tax ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wht_select" ON withholding_tax;
DROP POLICY IF EXISTS "wht_all" ON withholding_tax;
CREATE POLICY "wht_all" ON withholding_tax FOR ALL USING (true);

ALTER TABLE payroll_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_select" ON payroll_records;
DROP POLICY IF EXISTS "payroll_all" ON payroll_records;
CREATE POLICY "payroll_all" ON payroll_records FOR ALL USING (true);

ALTER TABLE bank_reconciliation DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recon_select" ON bank_reconciliation;
DROP POLICY IF EXISTS "recon_all" ON bank_reconciliation;
CREATE POLICY "recon_all" ON bank_reconciliation FOR ALL USING (true);

ALTER TABLE lightweight_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE lightweight_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lw_clients_all" ON lightweight_clients;
CREATE POLICY "lw_clients_all" ON lightweight_clients FOR ALL USING (true);

ALTER TABLE lightweight_sales_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE lightweight_sales_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lw_sales_all" ON lightweight_sales_entries;
CREATE POLICY "lw_sales_all" ON lightweight_sales_entries FOR ALL USING (true);

ALTER TABLE lightweight_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE lightweight_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lw_expenses_all" ON lightweight_expenses;
CREATE POLICY "lw_expenses_all" ON lightweight_expenses FOR ALL USING (true);

DELETE FROM accountant_clients WHERE company_id NOT IN (SELECT id FROM companies);
