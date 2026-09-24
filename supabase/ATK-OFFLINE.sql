-- ============================================================================
-- Fiscalix — Modaliteti OFFLINE (Neni 26.12, 28.6)
-- E sigurt për t'u ekzekutuar disa herë. Supabase → SQL Editor → Run.
-- ============================================================================

-- Blloqe numrash kuponi të rezervuara për çdo arkë.
-- Arka merr numrat me radhë nga blloku i vet (online DHE offline) → kronologjia ruhet pa përplasje.
CREATE TABLE IF NOT EXISTS atk_coupon_blocks (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  pos_device_id uuid        NOT NULL REFERENCES pos_devices(id) ON DELETE CASCADE,
  start_no      bigint      NOT NULL,
  end_no        bigint      NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (end_no >= start_no)
);
CREATE INDEX IF NOT EXISTS idx_atk_coupon_blocks_device ON atk_coupon_blocks (pos_device_id, start_no);
ALTER TABLE atk_coupon_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS atk_coupon_blocks_select ON atk_coupon_blocks;
CREATE POLICY atk_coupon_blocks_select ON atk_coupon_blocks FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Rezervon N numra me radhë nga numëruesi i kompanisë, për një arkë
CREATE OR REPLACE FUNCTION atk_reserve_coupon_block(p_company_id uuid, p_device_id uuid, p_count integer)
RETURNS TABLE (start_no bigint, end_no bigint) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_end bigint;
BEGIN
  IF auth.role() <> 'service_role' AND p_company_id IS DISTINCT FROM (SELECT company_id FROM users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pos_devices WHERE id = p_device_id AND company_id = p_company_id) THEN
    RAISE EXCEPTION 'device not in company';
  END IF;
  IF p_count < 1 OR p_count > 1000 THEN RAISE EXCEPTION 'invalid count'; END IF;

  INSERT INTO atk_coupon_counters (company_id, last_value)
  VALUES (p_company_id, COALESCE((SELECT MAX(coupon_id) FROM sales WHERE company_id = p_company_id), 0) + p_count)
  ON CONFLICT (company_id) DO UPDATE SET last_value = atk_coupon_counters.last_value + p_count
  RETURNING last_value INTO v_end;

  INSERT INTO atk_coupon_blocks (company_id, pos_device_id, start_no, end_no)
  VALUES (p_company_id, p_device_id, v_end - p_count + 1, v_end);

  RETURN QUERY SELECT v_end - p_count + 1, v_end;
END; $$;
GRANT EXECUTE ON FUNCTION atk_reserve_coupon_block(uuid, uuid, integer) TO authenticated;

-- Vendos numrin ditor nga arka (offline) — numëruesi nuk kthehet kurrë mbrapa
CREATE OR REPLACE FUNCTION atk_set_daily_no(p_device_id uuid, p_day date, p_value integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v integer;
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM pos_devices d WHERE d.id = p_device_id
      AND d.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  ) THEN RAISE EXCEPTION 'not allowed'; END IF;
  INSERT INTO atk_daily_counters (pos_device_id, day, last_value) VALUES (p_device_id, p_day, p_value)
  ON CONFLICT (pos_device_id, day) DO UPDATE SET last_value = GREATEST(atk_daily_counters.last_value, EXCLUDED.last_value)
  RETURNING last_value INTO v;
  RETURN v;
END; $$;
GRANT EXECUTE ON FUNCTION atk_set_daily_no(uuid, date, integer) TO authenticated;

-- Numri ditor aktual (pa e rritur) — arka e merr kur shkarkon kit-in offline
CREATE OR REPLACE FUNCTION atk_current_daily_no(p_device_id uuid, p_day date)
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT last_value FROM atk_daily_counters WHERE pos_device_id = p_device_id AND day = p_day), 0)
  WHERE auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM pos_devices d WHERE d.id = p_device_id AND d.company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
$$;
GRANT EXECUTE ON FUNCTION atk_current_daily_no(uuid, date) TO authenticated;
