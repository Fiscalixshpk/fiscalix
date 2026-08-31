-- ═══════════════════════════════════════════════════════════
-- VAT REGISTRATION STATUS
-- Biznese që nuk janë në TVSH ende — faturat e tyre s'duhet të llogarisin TVSH
-- Ekzekuto në Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_vat_registered BOOLEAN NOT NULL DEFAULT true;
  -- true  = biznesi është në TVSH (default — shumica e bizneseve të regjistruara janë)
  -- false = biznesi NUK është në TVSH ende — faturat duhet të kenë tax_rate=0 dhe fusha TVSH e fshehur

SELECT 'VAT registration column added!' as status;
