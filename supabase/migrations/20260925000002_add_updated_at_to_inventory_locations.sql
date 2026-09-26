-- Añadir la columna updated_at a la tabla inventory_locations
ALTER TABLE inventory_locations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
