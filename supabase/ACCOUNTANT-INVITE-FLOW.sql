-- ═══════════════════════════════════════════════════════════
-- ACCOUNTANT INVITE FLOW
-- Kontabilisti fton klientin me email → biznesi pranon/refuzon
-- Ekzekuto në Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Shto kolonën status te accountant_clients (pending → active → rejected)
ALTER TABLE accountant_clients
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
  -- 'pending'  = kontabilisti dërgoi ftesën, biznesi s'ka vendosur ende
  -- 'active'   = biznesi pranoi → qasja lejohet (is_active duhet true)
  -- 'rejected' = biznesi refuzoi

-- Backfill: rreshtat ekzistues (krijuar para kësaj veçorie) konsiderohen të pranuar tashmë
UPDATE accountant_clients SET status = 'active' WHERE status IS NULL OR status = '';

CREATE INDEX IF NOT EXISTS idx_accountant_clients_status ON accountant_clients(company_id, status);

-- 2. Shto tipin e ri të njoftimit (nëse 'type' është VARCHAR, s'ka nevojë për ALTER ENUM)
-- notifications.type është VARCHAR(50) tashmë, kështu që 'accountant_invite' funksionon direkt.

SELECT 'Accountant Invite Flow — migrim i plotë!' as status;
