-- ============================================================
-- FISCALIX — Market (multi-arka) + Restaurant (tavolina)
-- Ekzekuto te Supabase SQL Editor pas FISCALIX_POS_SETUP.sql
-- ============================================================

-- ── 1. POS SESSIONS (multi-arka per market) ──────────────────
-- Çdo arkë ka sesion të veçantë — mund të jenë aktive njëkohësisht
CREATE TABLE IF NOT EXISTS pos_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  pos_device_id uuid        REFERENCES pos_devices(id),
  cashier_id    uuid        REFERENCES users(id),
  cashier_name  text,
  register_no   int         NOT NULL DEFAULT 1,  -- B1, B2, B3...
  status        text        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','closed')),
  opened_at     timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz,
  opening_cash  bigint      NOT NULL DEFAULT 0,   -- cash fillestar (cent)
  closing_cash  bigint,
  total_sales   bigint      NOT NULL DEFAULT 0,   -- cent
  total_cash    bigint      NOT NULL DEFAULT 0,
  total_card    bigint      NOT NULL DEFAULT 0,
  sale_count    int         NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_sees_own_sessions" ON pos_sessions;
CREATE POLICY "user_sees_own_sessions" ON pos_sessions FOR ALL USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Add session reference to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES pos_sessions(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS register_no int DEFAULT 1;

-- ── 2. RESTAURANT TABLES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  table_number int     NOT NULL,
  label        text    NOT NULL DEFAULT 'T1',   -- emri i shfaqur
  seats        int     NOT NULL DEFAULT 4,
  pos_x        float   NOT NULL DEFAULT 0,     -- pozicioni X (%) në map
  pos_y        float   NOT NULL DEFAULT 0,     -- pozicioni Y (%)
  width        float   NOT NULL DEFAULT 80,    -- px
  height       float   NOT NULL DEFAULT 80,    -- px
  shape        text    NOT NULL DEFAULT 'rect'
    CHECK (shape IN ('rect','round')),
  section      text    DEFAULT 'Salla',        -- Salla, Terraca, Bar...
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   int     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 3. TABLE ORDERS (porositë aktive per tavolinë) ──────────
CREATE TABLE IF NOT EXISTS table_orders (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  table_id        uuid        NOT NULL REFERENCES restaurant_tables(id),
  cashier_id      uuid        REFERENCES users(id),
  cashier_name    text,
  status          text        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','paying','closed')),
  guests          int         DEFAULT 1,
  notes           text,
  opened_at       timestamptz NOT NULL DEFAULT now(),
  closed_at       timestamptz,
  sale_id         uuid        REFERENCES sales(id)  -- kur paguhet
);

-- ── 4. TABLE ORDER ITEMS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS table_order_items (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid    NOT NULL REFERENCES table_orders(id) ON DELETE CASCADE,
  company_id   uuid    NOT NULL REFERENCES companies(id),
  product_id   uuid    REFERENCES pos_products(id),
  name         text    NOT NULL,
  price        bigint  NOT NULL,        -- €0.0001
  unit         text    NOT NULL DEFAULT 'cope',
  quantity     numeric(10,3) NOT NULL DEFAULT 1,
  total        bigint  NOT NULL,        -- €0.0001
  tax_rate     text    NOT NULL DEFAULT 'E',
  notes        text,                    -- "pa kripë", "extra djathë"
  status       text    NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','preparing','ready','served')),
  added_at     timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE restaurant_tables  ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_order_items   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_sees_own_tables"       ON restaurant_tables;
DROP POLICY IF EXISTS "user_sees_own_orders"       ON table_orders;
DROP POLICY IF EXISTS "user_sees_own_order_items"  ON table_order_items;

CREATE POLICY "user_sees_own_tables" ON restaurant_tables FOR ALL USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "user_sees_own_orders" ON table_orders FOR ALL USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "user_sees_own_order_items" ON table_order_items FOR ALL USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_table_orders_table    ON table_orders (table_id, status);
CREATE INDEX IF NOT EXISTS idx_table_orders_company  ON table_orders (company_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order     ON table_order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_sessions_company      ON pos_sessions (company_id, status);

-- ── 5. SEED TAVOLINAT (restaurant test) ─────────────────────
-- Zëvendëso UUID pas ekzekutimit
/*
DO $$
DECLARE v uuid := 'VENDOS-RESTAURANT-COMPANY-UUID';
BEGIN
  INSERT INTO restaurant_tables (company_id, table_number, label, seats, pos_x, pos_y, section) VALUES
    (v, 1,  'T1',  4, 10, 10, 'Salla'),
    (v, 2,  'T2',  4, 25, 10, 'Salla'),
    (v, 3,  'T3',  4, 40, 10, 'Salla'),
    (v, 4,  'T4',  4, 55, 10, 'Salla'),
    (v, 5,  'T5',  6, 10, 40, 'Salla'),
    (v, 6,  'T6',  6, 30, 40, 'Salla'),
    (v, 7,  'T7',  2, 55, 40, 'Bar'),
    (v, 8,  'T8',  2, 70, 40, 'Bar'),
    (v, 9,  'T9',  4, 10, 70, 'Terraca'),
    (v, 10, 'T10', 4, 30, 70, 'Terraca');
END $$;
*/
