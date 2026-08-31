-- Add total_amount column that mirrors total
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0;

-- Copy existing data
UPDATE invoices SET total_amount = total WHERE total_amount = 0 OR total_amount IS NULL;

-- Create trigger to keep in sync
CREATE OR REPLACE FUNCTION sync_total_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount = NEW.total;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_total_amount_trigger ON invoices;
CREATE TRIGGER sync_total_amount_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION sync_total_amount();

SELECT 'total_amount column added and synced!' as status;
