-- ═══════════════════════════════════════════════
-- ACCOUNTANT ROLE MIGRATION
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- 1. Add accountant to user role enum (if not exists)
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accountant';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create accountant_clients table
CREATE TABLE IF NOT EXISTS accountant_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accountant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(accountant_id, company_id)
);

-- 3. Create accountant_subscriptions table
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
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_accountant_clients_accountant ON accountant_clients(accountant_id);
CREATE INDEX IF NOT EXISTS idx_accountant_clients_company ON accountant_clients(company_id);
CREATE INDEX IF NOT EXISTS idx_accountant_subs_user ON accountant_subscriptions(user_id);

-- 5. Disable RLS for now
ALTER TABLE accountant_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE accountant_subscriptions DISABLE ROW LEVEL SECURITY;

SELECT 'Accountant migration done!' as status;
