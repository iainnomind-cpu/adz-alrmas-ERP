-- Migration: Add Red field to customers table
-- Apply via Supabase SQL Editor or: supabase db push

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS red_details jsonb;

COMMENT ON COLUMN customers.red_details IS
  'JSON object with red (network) sub-sections: switch, switch_poe, ruteador, access_point, extensor_red, sistema_mesh, enlace_ptp, starlink';
