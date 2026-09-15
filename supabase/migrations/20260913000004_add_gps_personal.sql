-- Migration: Add GPS Personal fields to customers table
-- Apply via Supabase SQL Editor or: supabase db push

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS gps_personal_details jsonb;

COMMENT ON COLUMN customers.gps_personal_details IS
  'JSON for GPS Personal customers: gps info (marca/modelo/serie/factura/tipo_cambio), sim_type (celular|datos), SIM fields, and medical info (padecimientos, alergias, medicamentos, seguro_gmm, etc.)';
