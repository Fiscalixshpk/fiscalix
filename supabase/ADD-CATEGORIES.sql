-- Run this to add default categories for your company
-- Replace the company_id with yours from: SELECT id FROM companies;

DO $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Get your company ID automatically
  SELECT id INTO v_company_id FROM companies LIMIT 1;
  
  IF v_company_id IS NOT NULL THEN
    INSERT INTO expense_categories (company_id, name, icon, color) VALUES
      (v_company_id, 'Furnizime & Materiale', '📦', '#a1a1aa'),
      (v_company_id, 'Transport & Udhëtime', '🚗', '#f59e0b'),
      (v_company_id, 'Qiraja & Prona', '🏢', '#3b82f6'),
      (v_company_id, 'Shërbime Komunale', '💡', '#f97316'),
      (v_company_id, 'Paga & HR', '👥', '#8b5cf6'),
      (v_company_id, 'Marketing & Reklamim', '📣', '#ec4899'),
      (v_company_id, 'Teknologji & Software', '💻', '#06b6d4'),
      (v_company_id, 'Ushqim & Konferenca', '🍽️', '#84cc16'),
      (v_company_id, 'Sigurimi', '🛡️', '#14b8a6'),
      (v_company_id, 'Tatimet & Tarifat', '📋', '#ef4444'),
      (v_company_id, 'Mirëmbajtja', '🔧', '#78716c'),
      (v_company_id, 'Tjera', '📌', '#6b7280')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'U shtuan 12 kategori për kompaninë: %', v_company_id;
  END IF;
END $$;
