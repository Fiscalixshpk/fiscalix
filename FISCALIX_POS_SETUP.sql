-- ============================================================
-- FISCALIX POS — SQL SETUP I PLOTË
-- Ekzekuto VETËM NJËHERË te Supabase SQL Editor
-- ============================================================
-- REND:
--   1. Alter companies (shto kolona të reja)
--   2. Tabela pos_devices
--   3. Tabela pos_products  
--   4. Tabela sales
--   5. Tabela sale_items
--   6. Tabela pos_offline_queue
--   7. RLS policies
--   8. Indexes
--   9. Helper functions
-- ============================================================


-- ── STEP 1: EXTEND companies ─────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS pos_enabled      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS nui              text,
  ADD COLUMN IF NOT EXISTS vat_number_atk   text,
  ADD COLUMN IF NOT EXISTS branch_id        bigint  DEFAULT 1,
  ADD COLUMN IF NOT EXISTS location_city    text,
  ADD COLUMN IF NOT EXISTS atk_registered   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_vat_threshold_check timestamptz;

-- business_type ekziston tashmë, vetëm shton CHECK nëse mungon
DO $$
BEGIN
  BEGIN
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'services';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;


-- ── STEP 2: pos_devices ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_devices (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  pos_id           bigint      NOT NULL DEFAULT 1,
  branch_id        bigint      NOT NULL DEFAULT 1,
  application_id   bigint,
  device_name      text        NOT NULL DEFAULT 'Arka 1',
  cashier_name     text,
  private_key_enc  text,
  certificate_pem  text,
  environment      text        NOT NULL DEFAULT 'TEST'
    CHECK (environment IN ('TEST','PROD')),
  status           text        NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending','onboarded','active','suspended')),
  last_sync_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, pos_id, branch_id)
);


-- ── STEP 3: pos_products ─────────────────────────────────────
-- çmimi: €0.0001 units (€1.50 = 15000)
CREATE TABLE IF NOT EXISTS pos_products (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text    NOT NULL,
  price       bigint  NOT NULL CHECK (price >= 0),
  category    text,
  emoji       text    DEFAULT '📦',
  tax_rate    text    NOT NULL DEFAULT 'E'
    CHECK (tax_rate IN ('A','C','D','E')),
  unit        text    NOT NULL DEFAULT 'cope',
  stock       integer,
  barcode     text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);


-- ── STEP 4: sales ────────────────────────────────────────────
-- total_amount: CENT (€1.50 = 150)
CREATE TABLE IF NOT EXISTS sales (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid        NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  pos_device_id       uuid        REFERENCES pos_devices(id),
  cashier_id          uuid        REFERENCES users(id),
  coupon_id           bigint      NOT NULL DEFAULT 1,
  coupon_type         text        NOT NULL DEFAULT 'SALE'
    CHECK (coupon_type IN ('SALE','CANCEL','RETURN')),
  reference_no        bigint      NOT NULL DEFAULT 0,
  total_amount        bigint      NOT NULL DEFAULT 0,
  total_tax           bigint      NOT NULL DEFAULT 0,
  total_no_tax        bigint      NOT NULL DEFAULT 0,
  total_discount      bigint      NOT NULL DEFAULT 0,
  payment_method      text        NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash','card','split','insurance','voucher','other')),
  status              text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','fiscalized','offline','failed','cancelled')),
  atk_transaction_id  bigint,
  qr_code_data        text,
  receipt_number      text        UNIQUE,
  atk_error           text,
  source              text        NOT NULL DEFAULT 'pos',
  location_city       text,
  operator_id         text,
  notes               text,
  issued_at           timestamptz NOT NULL DEFAULT now(),
  fiscalized_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, coupon_id)
);


-- ── STEP 5: sale_items ───────────────────────────────────────
-- price dhe total: €0.0001 units (€1.50 = 15000)
CREATE TABLE IF NOT EXISTS sale_items (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     uuid    NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  company_id  uuid    NOT NULL REFERENCES companies(id),
  name        text    NOT NULL,
  price       bigint  NOT NULL,
  unit        text    NOT NULL DEFAULT 'cope',
  quantity    numeric(10,3) NOT NULL DEFAULT 1,
  total       bigint  NOT NULL,
  tax_rate    text    NOT NULL DEFAULT 'E'
    CHECK (tax_rate IN ('A','C','D','E')),
  item_type   text    NOT NULL DEFAULT 'TT',
  product_id  uuid    REFERENCES pos_products(id),
  sort_order  integer DEFAULT 0
);


-- ── STEP 6: pos_offline_queue ────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_offline_queue (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid        NOT NULL REFERENCES companies(id),
  sale_id         uuid        NOT NULL REFERENCES sales(id),
  pos_device_id   uuid        REFERENCES pos_devices(id),
  payload_json    jsonb       NOT NULL,
  attempts        integer     NOT NULL DEFAULT 0,
  last_error      text,
  deadline_at     timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  synced_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);


-- ── STEP 7: RLS ──────────────────────────────────────────────
ALTER TABLE pos_devices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_offline_queue ENABLE ROW LEVEL SECURITY;

-- pos_devices
DROP POLICY IF EXISTS "user_sees_own_devices"          ON pos_devices;
DROP POLICY IF EXISTS "accountant_sees_client_devices" ON pos_devices;
CREATE POLICY "user_sees_own_devices" ON pos_devices FOR ALL USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "accountant_sees_client_devices" ON pos_devices FOR SELECT USING (
  company_id IN (SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid())
);

-- pos_products
DROP POLICY IF EXISTS "user_sees_own_products"          ON pos_products;
DROP POLICY IF EXISTS "accountant_sees_client_products" ON pos_products;
CREATE POLICY "user_sees_own_products" ON pos_products FOR ALL USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "accountant_sees_client_products" ON pos_products FOR SELECT USING (
  company_id IN (SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid())
);

-- sales
DROP POLICY IF EXISTS "user_sees_own_sales"          ON sales;
DROP POLICY IF EXISTS "accountant_sees_client_sales" ON sales;
CREATE POLICY "user_sees_own_sales" ON sales FOR ALL USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "accountant_sees_client_sales" ON sales FOR SELECT USING (
  company_id IN (SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid())
);

-- sale_items
DROP POLICY IF EXISTS "user_sees_own_sale_items"          ON sale_items;
DROP POLICY IF EXISTS "accountant_sees_client_sale_items" ON sale_items;
CREATE POLICY "user_sees_own_sale_items" ON sale_items FOR ALL USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "accountant_sees_client_sale_items" ON sale_items FOR SELECT USING (
  company_id IN (SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid())
);

-- offline queue
DROP POLICY IF EXISTS "user_manages_own_queue" ON pos_offline_queue;
CREATE POLICY "user_manages_own_queue" ON pos_offline_queue FOR ALL USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);


-- ── STEP 8: INDEXES ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_company_id  ON sales (company_id);
CREATE INDEX IF NOT EXISTS idx_sales_issued_at   ON sales (issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status      ON sales (status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale   ON sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_products_company  ON pos_products (company_id);
CREATE INDEX IF NOT EXISTS idx_products_active   ON pos_products (company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_queue_deadline    ON pos_offline_queue (deadline_at) WHERE synced_at IS NULL;


-- ── STEP 9: HELPER FUNCTIONS ─────────────────────────────────
CREATE OR REPLACE FUNCTION next_coupon_id(p_company_id uuid)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_next bigint;
BEGIN
  SELECT COALESCE(MAX(coupon_id), 0) + 1 INTO v_next
  FROM sales WHERE company_id = p_company_id;
  RETURN v_next;
END; $$;

CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_quantity numeric)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE pos_products
  SET stock = GREATEST(0, stock - p_quantity), updated_at = now()
  WHERE id = p_product_id AND stock IS NOT NULL;
END; $$;

-- Supabase Realtime — aktivizo për sales
-- SHKO: Dashboard → Database → Replication → tabela sales → INSERT ✓


-- ── STEP 10: SEED PRODUKTET (zëvendëso UUID) ─────────────────
-- Gjej company UUID me:
-- SELECT id, name, business_type FROM companies WHERE pos_enabled = true LIMIT 5;
-- 
-- Pastaj aktivizo njërin nga bllqet DO $$ më poshtë:

/*
-- RESTAURANT
DO $$
DECLARE v uuid := 'VENDOS-COMPANY-UUID-KETU';
BEGIN
  UPDATE companies SET pos_enabled = true, nui = '810948231', location_city = 'Pejë' WHERE id = v;
  INSERT INTO pos_devices (company_id, pos_id, branch_id, device_name, cashier_name, environment, status)
  VALUES (v, 1, 1, 'Arka 1', 'Ariana K.', 'TEST', 'active')
  ON CONFLICT (company_id, pos_id, branch_id) DO NOTHING;
  INSERT INTO pos_products (company_id, name, price, category, emoji, tax_rate, unit, stock, sort_order) VALUES
    (v, 'Espresso',       15000, 'Kafe',   '☕', 'E', 'cope', NULL, 1),
    (v, 'Cappuccino',     22000, 'Kafe',   '☕', 'E', 'cope', NULL, 2),
    (v, 'Coca-Cola 0.5L', 15000, 'Pije',   '🥤', 'E', 'cope', NULL, 10),
    (v, 'Ujë Rugove',      8000, 'Pije',   '💧', 'E', 'cope', NULL, 11),
    (v, 'Sanduiç Pule',   35000, 'Ushqim', '🥪', 'D', 'cope', NULL, 20),
    (v, 'Pica Margarita', 60000, 'Ushqim', '🍕', 'D', 'cope', NULL, 21),
    (v, 'Birra Peja',     25000, 'Alkool', '🍺', 'E', 'cope', NULL, 30),
    (v, 'Torte Tiramisu', 35000, 'Ëmbëlsira','🍰','E', 'cope', NULL, 40);
END $$;
*/

/*
-- MARKET
DO $$
DECLARE v uuid := 'VENDOS-COMPANY-UUID-KETU';
BEGIN
  UPDATE companies SET pos_enabled = true, nui = '810948231', location_city = 'Pejë', business_type = 'market' WHERE id = v;
  INSERT INTO pos_devices (company_id, pos_id, branch_id, device_name, environment, status)
  VALUES (v, 1, 1, 'Arka 1', 'TEST', 'active')
  ON CONFLICT (company_id, pos_id, branch_id) DO NOTHING;
  INSERT INTO pos_products (company_id, name, price, category, emoji, tax_rate, unit, stock, sort_order) VALUES
    (v, 'Bukë Integrale',  11000, 'Furra',  '🍞', 'D', 'cope', 30, 1),
    (v, 'Mish Viçi 1kg',   85000, 'Mish',   '🥩', 'D', 'kg',   15, 10),
    (v, 'Vezë x10',        23000, 'Bulmet', '🥚', 'D', 'pako', 40, 20),
    (v, 'Coca-Cola 0.5L',  12000, 'Pije',   '🥤', 'E', 'cope', 80, 30),
    (v, 'Ujë Rugove 0.5L',  6000, 'Pije',   '💧', 'E', 'cope',120, 31),
    (v, 'Domate 1kg',       12000, 'Perime', '🍅', 'D', 'kg',   25, 40),
    (v, 'Shampo 250ml',    42000, 'Higjienë','🧴', 'E', 'cope',  8, 50),
    (v, 'Çantë Plastike',   1000, 'Tjetër', '🛍️', 'E', 'cope', 500, 99);
END $$;
*/

-- ============================================================
-- DONE ✓
-- Pas ekzekutimit:
--   1. Hiq komentet /* */ nga blloku i dëshiruar (restaurant/market)
--   2. Zëvendëso 'VENDOS-COMPANY-UUID-KETU' me UUID real
--   3. Ekzekuto sërisht vetëm atë bllok
-- ============================================================
