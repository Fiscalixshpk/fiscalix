-- Punonjësit per kompani
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  personal_id TEXT,
  position TEXT,
  gross_salary NUMERIC(12,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listëpagesa mujore
CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  gross_salary NUMERIC(12,2) NOT NULL,
  tax_income NUMERIC(12,2) DEFAULT 0,        -- TAP (tatimi në paga)
  pension_employee NUMERIC(12,2) DEFAULT 0,   -- 5% punonjësi
  pension_employer NUMERIC(12,2) DEFAULT 0,   -- 5% punëdhënësi
  net_salary NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tatimi në Burim
CREATE TABLE IF NOT EXISTS withholding_tax (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  service_description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 9,
  tax_amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE withholding_tax DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_company_period ON payroll_records(company_id, year, month);
CREATE INDEX IF NOT EXISTS idx_withholding_company ON withholding_tax(company_id, year, month);

-- Raportet (P&L, Cash Flow, Trial Balance janë computed nga API, nuk duhen tabela)
-- Reklamat e tatimit ne burim jane te plota me tabelen withholding_tax

-- Index shtesë për performance
CREATE INDEX IF NOT EXISTS idx_invoices_company_date ON invoices(company_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_expenses_company_date ON expenses(company_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_cash_bank_company_date ON cash_bank_entries(company_id, entry_date);

-- Rakordim Bankar
CREATE TABLE IF NOT EXISTS bank_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_entry_id UUID REFERENCES cash_bank_entries(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'matched' CHECK (status IN ('matched','unmatched','manual')),
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  matched_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bank_reconciliation DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_reconciliation_company ON bank_reconciliation(company_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_entry ON bank_reconciliation(bank_entry_id);

-- ═══ SIGURIA: RLS për notifications ═══
-- KRITIKE: Çdo user duhet të shohë vetëm njoftime e veta
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;

CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── OFERTAT (QUOTES) ────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_address TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','converted')),
  subtotal NUMERIC(12,2) DEFAULT 0,
  vat_rate NUMERIC(5,2) DEFAULT 18,
  vat_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  converted_to_invoice_id UUID REFERENCES invoices(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_quotes_company ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

-- ─── SERVICES (Katalog Shërbimesh) ───────────────────────
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) DEFAULT 0,
  unit TEXT DEFAULT 'copë',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_services_company ON services(company_id);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_all" ON services FOR ALL USING (true);

-- ─── PATIENTS (Pacientet per mjeket) ─────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('M', 'F', 'other')),
  birth_year INTEGER,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patients_company ON patients(company_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(company_id, full_name);
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_all" ON patients FOR ALL USING (true);

-- Lidh faturën me pacientin
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS diagnosis TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS patient_gender TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS patient_birth_year INTEGER;
