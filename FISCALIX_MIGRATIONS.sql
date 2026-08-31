-- ── MIGRATION: Shto kolonat që mungojnë ──────────────────────
-- Ekzekuto te Supabase SQL Editor

-- register_no te sales (për multi-arka statistika)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS register_no integer DEFAULT 1;

-- Indeks për statistika per arkë
CREATE INDEX IF NOT EXISTS idx_sales_register ON sales (company_id, register_no, issued_at);

-- Foto produktesh
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS image_url text;

-- Kamarierët + PIN
CREATE TABLE IF NOT EXISTS pos_waiters (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text    NOT NULL,
  pin         text    NOT NULL,  -- 4-shifror, ruhet si hash
  color       text    NOT NULL DEFAULT '#9B5CF8',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pos_waiters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waiter_own" ON pos_waiters;
CREATE POLICY "waiter_own" ON pos_waiters FOR ALL USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Lidhja kamerier → porosi
ALTER TABLE table_orders ADD COLUMN IF NOT EXISTS waiter_id uuid REFERENCES pos_waiters(id);
ALTER TABLE table_orders ADD COLUMN IF NOT EXISTS waiter_name text;

-- Fix: hiq UNIQUE constraint nga receipt_number (ATK nuk e kërkon)
-- Kjo lejon retry-et pa duplicate key error
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_receipt_number_key;
-- Shto indeks normal (pa unique) për kërkim të shpejtë
CREATE INDEX IF NOT EXISTS idx_sales_receipt_number ON sales (company_id, receipt_number);

-- RFID support për kamarierët
ALTER TABLE pos_waiters ADD COLUMN IF NOT EXISTS rfid_tag text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_waiters_rfid ON pos_waiters (company_id, rfid_tag) WHERE rfid_tag IS NOT NULL;

-- KOT (Kitchen Order Tickets)
CREATE TABLE IF NOT EXISTS kot_tickets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id     uuid        NOT NULL REFERENCES table_orders(id) ON DELETE CASCADE,
  table_label  text        NOT NULL,
  waiter_name  text,
  items        jsonb       NOT NULL DEFAULT '[]',
  printed_at   timestamptz NOT NULL DEFAULT now(),
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','printed','done'))
);
ALTER TABLE kot_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kot_own" ON kot_tickets FOR ALL USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Furnitorët
CREATE TABLE IF NOT EXISTS suppliers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  contact_name text,
  phone       text,
  email       text,
  address     text,
  nipt        text,
  notes       text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);

-- Shto supplier_id te expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS invoice_date date;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vat_amount numeric(12,2);

-- Klientët e Jashtëm (pa llogari Fiscalix)
CREATE TABLE IF NOT EXISTS external_clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  vat_number    text,
  phone         text,
  email         text,
  notes         text,
  upload_token  text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at    timestamptz DEFAULT now()
);

-- Dokumentat e ngarkuara nga klienti
CREATE TABLE IF NOT EXISTS external_documents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_client_id uuid NOT NULL REFERENCES external_clients(id) ON DELETE CASCADE,
  file_name          text NOT NULL,
  file_url           text NOT NULL,
  file_size          integer,
  mime_type          text,
  description        text,
  uploaded_at        timestamptz DEFAULT now(),
  downloaded_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_external_clients_accountant ON external_clients(accountant_id);
CREATE INDEX IF NOT EXISTS idx_external_docs_client ON external_documents(external_client_id);
CREATE INDEX IF NOT EXISTS idx_external_clients_token ON external_clients(upload_token);

-- Storage bucket për dokumentat e jashtme
-- Ekzekuto te Supabase Dashboard → Storage:
-- 1. Krijo bucket "external-docs" (Public: true)
-- 2. Shto policy: INSERT për të gjithë (anon role)
-- 3. Shto policy: SELECT për të gjithë (anon role)

-- Owner PIN per POS
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_pin text DEFAULT '1234';

-- Kategoritë POS
CREATE TABLE IF NOT EXISTS pos_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Anulime porosish (log i brendshëm)
CREATE TABLE IF NOT EXISTS cancelled_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  table_label  text,
  waiter_name  text,
  items        jsonb,
  total_cents  integer DEFAULT 0,
  cancelled_by text,
  cancelled_at timestamptz DEFAULT now()
);
