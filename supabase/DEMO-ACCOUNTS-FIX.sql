-- ══════════════════════════════════════════════════════════════
-- DEMO ACCOUNTS FIX — Ekzekuto pas krijimit të users
-- ══════════════════════════════════════════════════════════════

-- HAPI 1: Krijo kompanitë demo me UUID të vlefshëm
INSERT INTO companies (name, email, phone, address, vat_number, iban, bank_name, invoice_counter, is_active)
VALUES ('Kompania Demo SH.P.K.', 'demo@fiscalix.com', '+383 44 000 001', 'Rr. Nëna Terezë, Prishtinë', '811111111', 'XK05 1234 0000 0000 0000 1', 'ProCredit Bank', 5, true)
ON CONFLICT DO NOTHING;

INSERT INTO companies (name, email, phone, address, is_active)
VALUES ('Zyra Kontabilitetit Demo', 'kontabilist@fiscalix.com', '+383 44 000 002', 'Rr. Agim Ramadani, Prishtinë', true)
ON CONFLICT DO NOTHING;

-- HAPI 2: Lidhje demo user me kompaninë
UPDATE users SET 
  role = 'business_owner',
  full_name = 'Demo Biznesi',
  company_id = (SELECT id FROM companies WHERE email = 'demo@fiscalix.com' LIMIT 1)
WHERE email = 'demo@fiscalix.com';

UPDATE users SET 
  role = 'accountant',
  full_name = 'Demo Kontabilist',
  company_id = (SELECT id FROM companies WHERE email = 'kontabilist@fiscalix.com' LIMIT 1)
WHERE email = 'kontabilist@fiscalix.com';

-- HAPI 3: Krijo subscription advanced për demo biznesi
INSERT INTO subscriptions (company_id, plan, status, current_period_start, current_period_end)
SELECT id, 'advanced', 'active', NOW(), NOW() + INTERVAL '365 days'
FROM companies WHERE email = 'demo@fiscalix.com'
ON CONFLICT DO NOTHING;

-- HAPI 4: Disable RLS për tabelat accountant
ALTER TABLE accountant_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE accountant_subscriptions DISABLE ROW LEVEL SECURITY;

-- HAPI 5: Krijo fatura demo për biznesin
WITH demo_company AS (SELECT id FROM companies WHERE email = 'demo@fiscalix.com' LIMIT 1),
     demo_user AS (SELECT id FROM users WHERE email = 'demo@fiscalix.com' LIMIT 1)
INSERT INTO invoices (company_id, invoice_number, client_name, client_email, issue_date, due_date, subtotal, tax_rate, tax_amount, total, total_amount, status, currency, payment_method, created_by)
SELECT 
  (SELECT id FROM demo_company),
  inv_num, client_name, 'info@klient.com',
  CURRENT_DATE - (gen_random_uuid()::text)::bytea::int % 30,
  CURRENT_DATE + 30,
  subt, 18, subt * 0.18, subt * 1.18, subt * 1.18,
  status, 'EUR', 'Bank Transfer',
  (SELECT id FROM demo_user)
FROM (VALUES
  ('INV-0001', 'Tech Solutions SH.P.K.', 1000.00, 'paid'),
  ('INV-0002', 'Studio Media', 800.00, 'pending'),
  ('INV-0003', 'Agjensi Digjitale', 2000.00, 'overdue'),
  ('INV-0004', 'Restoranti Besa', 450.00, 'paid'),
  ('INV-0005', 'Ndërtim Pro', 3500.00, 'pending')
) AS t(inv_num, client_name, subt, status)
ON CONFLICT DO NOTHING;

-- Verifikim
SELECT 
  u.email, u.role, u.full_name, u.company_id, c.name as company_name
FROM users u
LEFT JOIN companies c ON c.id = u.company_id
WHERE u.email IN ('demo@fiscalix.com', 'kontabilist@fiscalix.com');
