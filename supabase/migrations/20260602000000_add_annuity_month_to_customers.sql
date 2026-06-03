-- Add annuity_month to customers table for annual billing cycle tracking
ALTER TABLE customers ADD COLUMN IF NOT EXISTS annuity_month integer;
