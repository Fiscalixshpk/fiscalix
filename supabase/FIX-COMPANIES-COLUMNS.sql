-- Add missing columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iban VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_tax_rate DECIMAL(5,2) DEFAULT 18.00;

-- Also add total_amount to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0;
UPDATE invoices SET total_amount = total WHERE total_amount = 0 OR total_amount IS NULL;

CREATE OR REPLACE FUNCTION sync_total_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total IS NOT NULL THEN
    NEW.total_amount = NEW.total;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_total_amount_trigger ON invoices;
CREATE TRIGGER sync_total_amount_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION sync_total_amount();

SELECT 'All columns added successfully!' as status;
