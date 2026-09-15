-- Migration: Add Video Portero field to customers table
-- Apply via Supabase SQL Editor or: supabase db push

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS video_portero_details jsonb;

COMMENT ON COLUMN customers.video_portero_details IS
  'JSON object for Video Portero: frente_calle, pantalla_principal, fuente_poder, pantallas_adicionales (array up to 8), chapa, llaveros';
