-- Migration: Add CCTV and Access Control fields to customers table
-- Apply on your Supabase project via: supabase db push  OR  SQL Editor

-- CCTV fields
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS dvr_channels integer,
  ADD COLUMN IF NOT EXISTS cameras_details jsonb;

-- Access Control fields (stored as structured JSONB containing all sub-sections)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS access_control_details jsonb;

-- Comments
COMMENT ON COLUMN customers.dvr_channels IS 'Number of DVR/NVR channels (4, 8, 16, 32)';
COMMENT ON COLUMN customers.cameras_details IS 'JSON array of camera objects {type, location} for CCTV customers';
COMMENT ON COLUMN customers.access_control_details IS 'JSON object containing all access control sub-sections: aparato, fuente, teclado, chapa, llaveros, tarjetas, tags, lectoras, barreras';
