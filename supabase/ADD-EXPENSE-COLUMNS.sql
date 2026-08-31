-- Run this in Supabase SQL Editor to add missing expense columns
ALTER TABLE expenses 
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS reference_number VARCHAR(255);
