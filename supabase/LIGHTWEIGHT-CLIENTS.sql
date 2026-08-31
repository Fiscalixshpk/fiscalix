-- ═══════════════════════════════════════════════════════════
-- KLIENTË TË THJESHTUAR (Lightweight Clients)
-- Për markete/restorante me arkë fiskale — pa llogari Fiscalix,
-- kontabilisti i menaxhon plotësisht vetë.
-- Ekzekuto në Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lightweight_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accountant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(50) DEFAULT 'market', -- market | restorant | tjeter
  vat_number VARCHAR(50),
  is_vat_registered BOOLEAN DEFAULT false,
  phone VARCHAR(50),
  address VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lw_clients_accountant ON lightweight_clients(accountant_id, is_active);

-- Hyrje e Shpejtë e Shitjeve — totale nga kuponi fiskal (jo fatura individuale)
CREATE TABLE IF NOT EXISTS lightweight_sales_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lightweight_client_id UUID NOT NULL REFERENCES lightweight_clients(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,     -- shitja bruto e ditës/periudhës
  vat_amount DECIMAL(10,2) DEFAULT 0,      -- TVSH e mbledhur (0 nëse jo në TVSH)
  source_note VARCHAR(255),                -- p.sh. "Kupon Fiskal #1234" ose "Raporti i ditës"
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lw_sales_client ON lightweight_sales_entries(lightweight_client_id, entry_date DESC);

-- Shpenzimet e klientit të thjeshtuar (furnitorë, qira, paga — fatura normale)
CREATE TABLE IF NOT EXISTS lightweight_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lightweight_client_id UUID NOT NULL REFERENCES lightweight_clients(id) ON DELETE CASCADE,
  vendor_name VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  expense_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lw_expenses_client ON lightweight_expenses(lightweight_client_id, expense_date DESC);

-- Checklist mujor (riperdor të njëjtën logjikë si checklist normal, por për klient të thjeshtuar)
CREATE TABLE IF NOT EXISTS lightweight_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lightweight_client_id UUID NOT NULL REFERENCES lightweight_clients(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lightweight_client_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS lightweight_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES lightweight_checklists(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  is_done BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  done_at TIMESTAMPTZ
);

-- Shënime private (riperdor konceptin e accountant_notes)
CREATE TABLE IF NOT EXISTS lightweight_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lightweight_client_id UUID NOT NULL REFERENCES lightweight_clients(id) ON DELETE CASCADE,
  accountant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lightweight_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE lightweight_sales_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE lightweight_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE lightweight_checklists DISABLE ROW LEVEL SECURITY;
ALTER TABLE lightweight_checklist_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE lightweight_notes DISABLE ROW LEVEL SECURITY;

SELECT 'Lightweight Clients — migrim i plotë!' as status;
