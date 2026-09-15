-- Migration: Add GPS Vehicular field to customers table
-- Apply via Supabase SQL Editor or: supabase db push

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS gps_vehicular_details jsonb;

COMMENT ON COLUMN customers.gps_vehicular_details IS
  'JSON for GPS Vehicular customers: gps info (marca/modelo/serie/factura/tipo_cambio), sim_type (celular|datos), SIM fields, and vehicle info (marca, modelo, anio, color, serie/NIV, num_motor, placas)';
