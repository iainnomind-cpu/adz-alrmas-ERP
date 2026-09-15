-- Migration: Add Attendance Control field to customers table
-- Apply via Supabase SQL Editor or: supabase db push

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS attendance_control_details jsonb;

COMMENT ON COLUMN customers.attendance_control_details IS
  'JSON object with all attendance control sub-sections: aparato (marca/modelo/serie/usuario_adz*/pwd_adz*), fuente, teclado, chapa, llaveros, tarjetas, tags, lectoras';
