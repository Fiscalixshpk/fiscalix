-- ============================================================================
-- Fiscalix — Migrimi për certifikimin SEF (ATK)
-- E sigurt për t'u ekzekutuar disa herë. Supabase → SQL Editor → Run.
-- ============================================================================

-- ── 1. Kompania: statusi TVSH ────────────────────────────────────────────────
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_vat_registered boolean NOT NULL DEFAULT true;

-- ── 2. Pajisja: sinkronizimi i orës ──────────────────────────────────────────
ALTER TABLE pos_devices ADD COLUMN IF NOT EXISTS clock_offset_ms  integer NOT NULL DEFAULT 0;
ALTER TABLE pos_devices ADD COLUMN IF NOT EXISTS clock_synced_at  timestamptz;

-- ── 3. Shitjet ───────────────────────────────────────────────────────────────
ALTER TABLE sales ADD COLUMN IF NOT EXISTS verification_no  text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payments         jsonb NOT NULL DEFAULT '[]';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_groups       jsonb NOT NULL DEFAULT '[]';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tendered_amount  bigint;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS change_amount    bigint NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS previous_hash    text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS hash_chain       text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS integrity_check  text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cashier_name     text;
-- TransactionNo i ATK është uint64 → text (bigint i PostgreSQL është signed)
ALTER TABLE sales ALTER COLUMN atk_transaction_id TYPE text USING atk_transaction_id::text;
CREATE INDEX IF NOT EXISTS idx_sales_reference ON sales (company_id, reference_no) WHERE reference_no > 0;

-- ── 4. Artikujt: 4 decimale në sasi + gjurmimi i kthimeve ────────────────────
ALTER TABLE sale_items ALTER COLUMN quantity TYPE numeric(14,4);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS original_unit_price bigint;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount            bigint NOT NULL DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS source_item_id      uuid REFERENCES sale_items(id);
CREATE INDEX IF NOT EXISTS idx_sale_items_source ON sale_items (source_item_id) WHERE source_item_id IS NOT NULL;

-- ── 5. Numri i kuponit: atomik (next_coupon_id i vjetër = MAX+1 → dublikata) ─
CREATE TABLE IF NOT EXISTS atk_coupon_counters (
  company_id  uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  last_value  bigint NOT NULL
);
ALTER TABLE atk_coupon_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION atk_next_coupon_id(p_company_id uuid)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v bigint;
BEGIN
  IF p_company_id IS DISTINCT FROM (SELECT company_id FROM users WHERE id = auth.uid())
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  INSERT INTO atk_coupon_counters (company_id, last_value)
  VALUES (p_company_id, COALESCE((SELECT MAX(coupon_id) FROM sales WHERE company_id = p_company_id), 0) + 1)
  ON CONFLICT (company_id) DO UPDATE SET last_value = atk_coupon_counters.last_value + 1
  RETURNING last_value INTO v;
  RETURN v;
END; $$;
GRANT EXECUTE ON FUNCTION atk_next_coupon_id(uuid) TO authenticated;

-- ── 6. Llogat ATK: payload + nënshkrim + hash chain (append-only) ────────────
CREATE TABLE IF NOT EXISTS atk_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid        NOT NULL REFERENCES companies(id),
  pos_device_id    uuid        NOT NULL REFERENCES pos_devices(id),
  sale_id          uuid        REFERENCES sales(id),
  chain_seq        bigint      NOT NULL,
  coupon_id        bigint      NOT NULL,
  coupon_type      text        NOT NULL CHECK (coupon_type IN ('SALE','CANCEL','RETURN')),
  reference_no     bigint      NOT NULL DEFAULT 0,
  coupon_time      bigint      NOT NULL,           -- Unix (fusha Time e kuponit)
  verification_no  text        NOT NULL,
  environment      text        NOT NULL CHECK (environment IN ('TEST','PROD')),
  payload_base64   text        NOT NULL,           -- PosCoupon (details)
  signature        text        NOT NULL,
  qr_code          text        NOT NULL,           -- CitizenCoupon|signature
  previous_hash    text        NOT NULL,
  current_hash     text        NOT NULL,
  integrity_check  text        NOT NULL,
  clock_offset_ms  integer     NOT NULL DEFAULT 0,
  status           text        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','accepted','rejected','offline')),
  attempts         integer     NOT NULL DEFAULT 0,
  http_status      integer,
  response_body    text,
  transaction_id   text,
  error            text,
  duration_ms      integer,
  deadline_at      timestamptz NOT NULL,
  last_attempt_at  timestamptz,
  accepted_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pos_device_id, chain_seq),
  UNIQUE (pos_device_id, previous_hash),             -- zinxhir linear: s'ka degëzime
  UNIQUE (company_id, coupon_id)
);
CREATE INDEX IF NOT EXISTS idx_atk_logs_pending ON atk_logs (pos_device_id, chain_seq) WHERE status IN ('pending','offline');
CREATE INDEX IF NOT EXISTS idx_atk_logs_sale    ON atk_logs (sale_id);

-- Mbrojtja e integritetit: payload/hash s'ndryshojnë kurrë, rreshtat s'fshihen
CREATE OR REPLACE FUNCTION atk_logs_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'atk_logs është append-only'; END IF;
  IF (NEW.payload_base64, NEW.signature, NEW.qr_code, NEW.previous_hash, NEW.current_hash, NEW.integrity_check,
      NEW.chain_seq, NEW.coupon_id, NEW.coupon_time, NEW.pos_device_id, NEW.company_id, NEW.verification_no)
     IS DISTINCT FROM
     (OLD.payload_base64, OLD.signature, OLD.qr_code, OLD.previous_hash, OLD.current_hash, OLD.integrity_check,
      OLD.chain_seq, OLD.coupon_id, OLD.coupon_time, OLD.pos_device_id, OLD.company_id, OLD.verification_no) THEN
    RAISE EXCEPTION 'Fushat e nënshkruara të atk_logs nuk mund të ndryshohen';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_atk_logs_guard ON atk_logs;
CREATE TRIGGER trg_atk_logs_guard BEFORE UPDATE OR DELETE ON atk_logs FOR EACH ROW EXECUTE FUNCTION atk_logs_guard();

ALTER TABLE atk_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS atk_logs_select ON atk_logs;
DROP POLICY IF EXISTS atk_logs_insert ON atk_logs;
DROP POLICY IF EXISTS atk_logs_update ON atk_logs;
DROP POLICY IF EXISTS atk_logs_accountant ON atk_logs;
CREATE POLICY atk_logs_select ON atk_logs FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY atk_logs_insert ON atk_logs FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY atk_logs_update ON atk_logs FOR UPDATE USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY atk_logs_accountant ON atk_logs FOR SELECT USING (
  company_id IN (SELECT company_id FROM accountant_clients WHERE accountant_id = auth.uid())
);

-- ============================================================================
-- 7. Kuponi i printuar — Neni 25.18 dhe Shtojca "F"
-- ============================================================================

-- Njësia (ARBK) — "NR. IDENTIFIKUES I SEF" = [Numri i Njësisë]-[NUI]-[PosId]
ALTER TABLE pos_devices ADD COLUMN IF NOT EXISTS unit_number  text;   -- numri i njësisë nga ARBK
ALTER TABLE pos_devices ADD COLUMN IF NOT EXISTS unit_name    text;   -- "EMRI I NJËSISË"
ALTER TABLE pos_devices ADD COLUMN IF NOT EXISTS unit_address text;
ALTER TABLE pos_devices ADD COLUMN IF NOT EXISTS unit_city    text;
ALTER TABLE pos_devices ADD COLUMN IF NOT EXISTS unit_phone   text;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS receipt_footer text;   -- "TEKST I LIRË"

ALTER TABLE sales ADD COLUMN IF NOT EXISTS daily_no        integer;               -- KUPON FISKAL DITOR NR.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS issued_offline  boolean NOT NULL DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS subtotal        bigint;                -- NËNTOTALI
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_discount   jsonb;                 -- {kind, value, amount}
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancel_reason   text;                  -- ARSYEJA E ANULIMIT
ALTER TABLE sales ADD COLUMN IF NOT EXISTS operator_code   text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS printed_at      timestamptz;           -- pas kësaj: KOPJE E KUPONIT

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS gross_total    bigint;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS item_discount  bigint NOT NULL DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount_kind  text CHECK (discount_kind IN ('percent','amount'));
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount_value numeric(12,4);

-- Numri ditor i kuponit, për pajisje, rifillon çdo ditë
CREATE TABLE IF NOT EXISTS atk_daily_counters (
  pos_device_id uuid    NOT NULL REFERENCES pos_devices(id) ON DELETE CASCADE,
  day           date    NOT NULL,
  last_value    integer NOT NULL,
  PRIMARY KEY (pos_device_id, day)
);
ALTER TABLE atk_daily_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION atk_next_daily_no(p_device_id uuid, p_day date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v integer;
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM pos_devices d WHERE d.id = p_device_id
      AND d.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  INSERT INTO atk_daily_counters (pos_device_id, day, last_value) VALUES (p_device_id, p_day, 1)
  ON CONFLICT (pos_device_id, day) DO UPDATE SET last_value = atk_daily_counters.last_value + 1
  RETURNING last_value INTO v;
  RETURN v;
END; $$;
GRANT EXECUTE ON FUNCTION atk_next_daily_no(uuid, date) TO authenticated;

-- Kategoria ATK e artikullit (tabela "Kategoritë e mallrave dhe shërbimeve") → CouponItem.Type
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS atk_category text NOT NULL DEFAULT 'TT';
