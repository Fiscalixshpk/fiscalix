-- ============================================================
-- FineX OS – Seed Data
-- Run after schema.sql and rls-policies.sql
-- ============================================================

-- -------------------------
-- Default Expense Categories
-- (will be assigned per company via trigger or manually)
-- -------------------------

-- Create a function to seed categories for a company
CREATE OR REPLACE FUNCTION seed_company_categories(p_company_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO expense_categories (company_id, name, icon, color) VALUES
    (p_company_id, 'Furnizime & Materiale', '📦', '#a1a1aa'),
    (p_company_id, 'Transport & Udhëtime', '🚗', '#f59e0b'),
    (p_company_id, 'Qiraja & Prona', '🏢', '#3b82f6'),
    (p_company_id, 'Shërbime Komunale', '💡', '#f97316'),
    (p_company_id, 'Paga & HR', '👥', '#8b5cf6'),
    (p_company_id, 'Marketing & Reklamim', '📣', '#ec4899'),
    (p_company_id, 'Teknologji & Software', '💻', '#06b6d4'),
    (p_company_id, 'Ushqim & Konferenca', '🍽️', '#84cc16'),
    (p_company_id, 'Sigurimi', '🛡️', '#14b8a6'),
    (p_company_id, 'Tatimet & Tarifat', '📋', '#ef4444'),
    (p_company_id, 'Mirëmbajtja', '🔧', '#78716c'),
    (p_company_id, 'Tjera', '📌', '#6b7280')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------
-- Trigger: Auto-seed categories when company is created
-- -------------------------
CREATE OR REPLACE FUNCTION auto_seed_categories()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM seed_company_categories(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_company_created ON companies;
CREATE TRIGGER on_company_created
  AFTER INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION auto_seed_categories();

-- -------------------------
-- Demo Admin User Setup
-- Run this after creating your admin user via Supabase Auth Dashboard
-- Replace 'YOUR_ADMIN_USER_ID' with the actual UUID from auth.users
-- -------------------------

-- UPDATE users SET role = 'admin' WHERE email = 'admin@finexos.com';

-- -------------------------
-- Example test data (optional - comment out for production)
-- -------------------------

-- Example company (will be created via register flow)
-- INSERT INTO companies (id, name, email, invoice_prefix, default_tax_rate)
-- VALUES (gen_random_uuid(), 'Demo Kompania SH.P.K', 'demo@kompania.com', 'DK', 18);
