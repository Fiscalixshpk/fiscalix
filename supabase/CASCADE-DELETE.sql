ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;
ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_company_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_company_id_fkey;
ALTER TABLE expenses ADD CONSTRAINT expenses_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_company_id_fkey;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_company_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_company_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_company_id_fkey;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE accountant_clients DROP CONSTRAINT IF EXISTS accountant_clients_company_id_fkey;
ALTER TABLE accountant_clients ADD CONSTRAINT accountant_clients_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_company_id_fkey;
ALTER TABLE quotes ADD CONSTRAINT quotes_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE quote_items DROP CONSTRAINT IF EXISTS quote_items_quote_id_fkey;
ALTER TABLE quote_items ADD CONSTRAINT quote_items_quote_id_fkey
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE;

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_company_id_fkey;
ALTER TABLE employees ADD CONSTRAINT employees_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE withholding_tax DROP CONSTRAINT IF EXISTS withholding_tax_company_id_fkey;
ALTER TABLE withholding_tax ADD CONSTRAINT withholding_tax_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE bank_reconciliation DROP CONSTRAINT IF EXISTS bank_reconciliation_company_id_fkey;
ALTER TABLE bank_reconciliation ADD CONSTRAINT bank_reconciliation_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE services DROP CONSTRAINT IF EXISTS services_company_id_fkey;
ALTER TABLE services ADD CONSTRAINT services_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE expense_categories DROP CONSTRAINT IF EXISTS expense_categories_company_id_fkey;
ALTER TABLE expense_categories ADD CONSTRAINT expense_categories_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_id_fkey;
ALTER TABLE users ADD CONSTRAINT users_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
