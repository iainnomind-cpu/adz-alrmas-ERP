-- Add system_type column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS system_type text DEFAULT 'Alarma';

-- Enforce allowed values
ALTER TABLE customers ADD CONSTRAINT customers_system_type_check CHECK (system_type IN ('Alarma', 'CCTV', 'Control de Acceso'));
