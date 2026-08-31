-- ══════════════════════════════════════════════
-- B2B MODULES MIGRATION
-- ══════════════════════════════════════════════

-- 1. QUOTES (Ofertat)
CREATE TABLE IF NOT EXISTS quotes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid REFERENCES companies(id) ON DELETE CASCADE,
  quote_number  text NOT NULL,
  client_id     uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name   text,
  client_email  text,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired','converted')),
  valid_until   date,
  notes         text,
  total         numeric(12,2) DEFAULT 0,
  tax_total     numeric(12,2) DEFAULT 0,
  currency      text DEFAULT 'EUR',
  converted_to_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    uuid REFERENCES quotes(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  quantity    numeric(10,3) DEFAULT 1,
  unit_price  numeric(12,2) DEFAULT 0,
  tax_rate    numeric(5,2) DEFAULT 18,
  total       numeric(12,2) DEFAULT 0,
  sort_order  int DEFAULT 0
);

-- 2. CONTRACTS (Kontrata)
CREATE TABLE IF NOT EXISTS contracts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid REFERENCES companies(id) ON DELETE CASCADE,
  contract_number text NOT NULL,
  client_id     uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name   text NOT NULL,
  title         text NOT NULL,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','expired','terminated')),
  start_date    date,
  end_date      date,
  value         numeric(12,2),
  currency      text DEFAULT 'EUR',
  payment_terms text DEFAULT 'net30',
  notes         text,
  file_url      text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 3. RECURRING INVOICES (Fatura periodike)
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES companies(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name     text NOT NULL,
  title           text NOT NULL,
  frequency       text NOT NULL CHECK (frequency IN ('monthly','quarterly','yearly')),
  next_date       date NOT NULL,
  end_date        date,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','ended')),
  payment_terms   text DEFAULT 'net30',
  notes           text,
  total           numeric(12,2) DEFAULT 0,
  currency        text DEFAULT 'EUR',
  auto_send       boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recurring_invoice_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id uuid REFERENCES recurring_invoices(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  quantity    numeric(10,3) DEFAULT 1,
  unit_price  numeric(12,2) DEFAULT 0,
  tax_rate    numeric(5,2) DEFAULT 18,
  total       numeric(12,2) DEFAULT 0,
  sort_order  int DEFAULT 0
);

-- 4. PAYMENT TERMS — kolona te invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'net30';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS po_number text;

-- 5. PURCHASE ORDERS (Porositë e blerjes)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid REFERENCES companies(id) ON DELETE CASCADE,
  po_number     text NOT NULL,
  client_id     uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name   text NOT NULL,
  status        text NOT NULL DEFAULT 'received' CHECK (status IN ('received','confirmed','invoiced','cancelled')),
  received_date date DEFAULT CURRENT_DATE,
  notes         text,
  total         numeric(12,2) DEFAULT 0,
  currency      text DEFAULT 'EUR',
  linked_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id       uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  name        text NOT NULL,
  quantity    numeric(10,3) DEFAULT 1,
  unit_price  numeric(12,2) DEFAULT 0,
  total       numeric(12,2) DEFAULT 0,
  sort_order  int DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_company ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_company ON recurring_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_po_company ON purchase_orders(company_id);
