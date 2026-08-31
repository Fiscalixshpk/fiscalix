-- ================================================================
-- FISCALIX — MIGRATION COMPLETË
-- Ekzekuto këtë SQL në Supabase SQL Editor
-- ================================================================

-- 1. Add total_amount to invoices (alias for total)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0;
UPDATE invoices SET total_amount = total WHERE total_amount IS NULL OR total_amount = 0;

-- Trigger to keep total_amount in sync with total
CREATE OR REPLACE FUNCTION sync_invoice_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount := NEW.total;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_invoice_total_trigger ON invoices;
CREATE TRIGGER sync_invoice_total_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_total();

-- 2. Add missing columns to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iban VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_tax_rate DECIMAL(5,2) DEFAULT 18.00;

-- 3. Add missing columns to expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reference_number VARCHAR(255);

-- 4. Add accountant tables (if not exist)
CREATE TABLE IF NOT EXISTS accountant_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accountant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(accountant_id, company_id)
);

CREATE TABLE IF NOT EXISTS accountant_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'accountant',
  status VARCHAR(50) DEFAULT 'active',
  price_monthly DECIMAL(10,2) DEFAULT 99.00,
  max_clients INTEGER DEFAULT 20,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  grace_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Disable RLS on accountant tables
ALTER TABLE accountant_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE accountant_subscriptions DISABLE ROW LEVEL SECURITY;

-- 6. Add accountant role if not exists
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accountant';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Add name column to expense_categories as alias
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS name VARCHAR(100);
UPDATE expense_categories SET name = name_sq WHERE name IS NULL;

-- 8. Storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public logos access" ON storage.objects;
  CREATE POLICY "Public logos access" ON storage.objects
    FOR ALL USING (bucket_id = 'logos');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 9. Set admin role
UPDATE users SET role = 'admin' WHERE email = 'liridonberisha228@gmail.com';

SELECT '✅ Migration komplet!' as status;

-- Add invoice_color column to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invoice_color VARCHAR(20) DEFAULT '#5A1FD6';

-- Add payment_split and invoice_color
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_split VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invoice_color VARCHAR(20) DEFAULT '#5A1FD6';
