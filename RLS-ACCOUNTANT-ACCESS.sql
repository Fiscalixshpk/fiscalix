-- RLS Policies: Kontabilisti lexon të dhënat e klientëve të vet
-- Ekzekuto këtë në Supabase SQL Editor

-- Invoices: kontabilisti sheh faturat e klientëve të vet
DROP POLICY IF EXISTS "accountant_read_client_invoices" ON invoices;
CREATE POLICY "accountant_read_client_invoices" ON invoices
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM accountant_clients
      WHERE accountant_id = auth.uid() AND is_active = true
    )
    OR
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Expenses: kontabilisti sheh shpenzimet e klientëve
DROP POLICY IF EXISTS "accountant_read_client_expenses" ON expenses;
CREATE POLICY "accountant_read_client_expenses" ON expenses
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM accountant_clients
      WHERE accountant_id = auth.uid() AND is_active = true
    )
    OR
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Companies: kontabilisti sheh kompanitë e klientëve
DROP POLICY IF EXISTS "accountant_read_client_companies" ON companies;
CREATE POLICY "accountant_read_client_companies" ON companies
  FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM accountant_clients
      WHERE accountant_id = auth.uid() AND is_active = true
    )
    OR
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Employees: kontabilisti sheh punëtorët e klientëve
DROP POLICY IF EXISTS "accountant_read_client_employees" ON employees;
CREATE POLICY "accountant_read_client_employees" ON employees
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM accountant_clients
      WHERE accountant_id = auth.uid() AND is_active = true
    )
    OR
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
