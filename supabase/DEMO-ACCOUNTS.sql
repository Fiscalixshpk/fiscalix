-- ══════════════════════════════════════════════════════════════
-- DEMO ACCOUNTS SETUP — Ekzekuto në Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Krijo kompaninë demo
INSERT INTO companies (id, name, email, phone, address, vat_number, iban, bank_name, invoice_counter, is_active)
VALUES (
  'demo-company-001',
  'Kompania Demo SH.P.K.',
  'demo@fiscalix.com',
  '+383 44 000 001',
  'Rr. Nëna Terezë, Prishtinë',
  '811111111',
  'XK05 1234 0000 0000 0000 1',
  'ProCredit Bank',
  5,
  true
) ON CONFLICT (id) DO NOTHING;

-- 2. Kompania e kontabilistit demo (për accountant workspace)
INSERT INTO companies (id, name, email, phone, address, is_active)
VALUES (
  'demo-accountant-company',
  'Zyra Kontabilitetit Demo',
  'kontabilist@fiscalix.com',
  '+383 44 000 002',
  'Rr. Agim Ramadani, Prishtinë',
  true
) ON CONFLICT (id) DO NOTHING;

-- SHËNIM: Pas ekzekutimit të SQL:
-- 1. Shko te Supabase Dashboard → Authentication → Users
-- 2. Kliko "Add User"
-- 3. Shto: demo@fiscalix.com / Demo2026!
-- 4. Shto: kontabilist@fiscalix.com / Demo2026!
-- 5. Pastaj ekzekuto UPDATE-ët më poshtë me ID-të reale

-- Zëvendëso USER_ID_1 me ID-në e demo@fiscalix.com
-- Zëvendëso USER_ID_2 me ID-në e kontabilist@fiscalix.com

/*
UPDATE users SET 
  company_id = 'demo-company-001',
  role = 'business_owner',
  full_name = 'Demo Biznesi'
WHERE id = 'USER_ID_1';

UPDATE users SET 
  company_id = 'demo-accountant-company',
  role = 'accountant',
  full_name = 'Demo Kontabilist'
WHERE id = 'USER_ID_2';
*/

-- 3. Shto fatura demo për kompaninë
INSERT INTO invoices (company_id, invoice_number, client_name, client_email, issue_date, due_date, subtotal, tax_rate, tax_amount, total, total_amount, status, currency, payment_method, created_by)
SELECT 'demo-company-001', 'INV-0001', 'Tech Solutions SH.P.K.', 'info@tech.com', '2026-05-01', '2026-05-31', 1000, 18, 180, 1180, 1180, 'paid', 'EUR', 'Bank Transfer', id
FROM users WHERE email = 'demo@fiscalix.com' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO invoices (company_id, invoice_number, client_name, client_email, issue_date, due_date, subtotal, tax_rate, tax_amount, total, total_amount, status, currency, payment_method, created_by)
SELECT 'demo-company-001', 'INV-0002', 'Studio Media', 'studio@media.com', '2026-05-15', '2026-06-15', 800, 18, 144, 944, 944, 'pending', 'EUR', 'Bank Transfer', id
FROM users WHERE email = 'demo@fiscalix.com' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO invoices (company_id, invoice_number, client_name, client_email, issue_date, due_date, subtotal, tax_rate, tax_amount, total, total_amount, status, currency, payment_method, created_by)
SELECT 'demo-company-001', 'INV-0003', 'Agjensi Digjitale', 'info@agjensi.com', '2026-04-01', '2026-04-30', 2000, 18, 360, 2360, 2360, 'overdue', 'EUR', 'Bank Transfer', id
FROM users WHERE email = 'demo@fiscalix.com' LIMIT 1
ON CONFLICT DO NOTHING;

-- 4. Shto subscriptions demo
INSERT INTO subscriptions (company_id, plan, status, current_period_start, current_period_end)
VALUES 
  ('demo-company-001', 'advanced', 'active', NOW(), NOW() + INTERVAL '365 days'),
  ('demo-accountant-company', 'accountant', 'active', NOW(), NOW() + INTERVAL '365 days')
ON CONFLICT DO NOTHING;

-- 5. Disable RLS for demo tables
ALTER TABLE accountant_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE accountant_subscriptions DISABLE ROW LEVEL SECURITY;

SELECT 'Demo setup i plotësuar!' as status;
