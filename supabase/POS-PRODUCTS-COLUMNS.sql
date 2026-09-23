-- Kolonat që përdor POS (pos/page.tsx + /api/pos/products) por mungojnë në FISCALIX_POS_SETUP.sql
-- E sigurt për t'u ekzekutuar disa herë.
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS buy_price   bigint CHECK (buy_price IS NULL OR buy_price >= 0);
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS discount    numeric(5,2) NOT NULL DEFAULT 0 CHECK (discount BETWEEN 0 AND 100);
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS expiry_date date;
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS image_url   text;
