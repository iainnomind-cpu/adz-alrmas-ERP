/*
  # Corrección de Referencia de Técnicos en Service Orders
  
  1. Cambios
    - Actualizar la foreign key de service_orders.technician_id para apuntar a technicians(id)
    - Mantener compatibilidad con datos existentes
    
  2. Seguridad
    - No se pierden datos
    - La referencia a auth.users se mantiene a través de technicians
*/

-- Eliminar la constraint existente si existe
ALTER TABLE service_orders 
  DROP CONSTRAINT IF EXISTS service_orders_technician_id_fkey;

-- Agregar la nueva constraint apuntando a technicians
ALTER TABLE service_orders 
  ADD CONSTRAINT service_orders_technician_id_fkey 
  FOREIGN KEY (technician_id) 
  REFERENCES technicians(id) 
  ON DELETE RESTRICT;

-- Agregar campos faltantes en service_orders que están en el código
DO $$ 
BEGIN
  -- service_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN service_type text DEFAULT 'reactive';
  END IF;
  
  -- estimated_duration_minutes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'estimated_duration_minutes'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN estimated_duration_minutes integer DEFAULT 60;
  END IF;
  
  -- labor_cost
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'labor_cost'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN labor_cost decimal(10,2) DEFAULT 0;
  END IF;
  
  -- materials_cost
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'materials_cost'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN materials_cost decimal(10,2) DEFAULT 0;
  END IF;
  
  -- payment_method
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN payment_method text;
  END IF;
  
  -- payment_terms
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'payment_terms'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN payment_terms text;
  END IF;
END $$;

-- Actualizar el status default a 'requested' en lugar de 'pending'
ALTER TABLE service_orders ALTER COLUMN status SET DEFAULT 'requested';

-- Agregar columnas faltantes en customers para sincronización completa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'business_name'
  ) THEN
    ALTER TABLE customers ADD COLUMN business_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'gps_latitude'
  ) THEN
    ALTER TABLE customers ADD COLUMN gps_latitude decimal(10,7);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'gps_longitude'
  ) THEN
    ALTER TABLE customers ADD COLUMN gps_longitude decimal(10,7);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'property_type'
  ) THEN
    ALTER TABLE customers ADD COLUMN property_type text DEFAULT 'casa';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'credit_classification'
  ) THEN
    ALTER TABLE customers ADD COLUMN credit_classification text DEFAULT 'puntual';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE customers ADD COLUMN account_type text DEFAULT 'individual';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'billing_preference'
  ) THEN
    ALTER TABLE customers ADD COLUMN billing_preference text DEFAULT 'electronic';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'billing_cycle'
  ) THEN
    ALTER TABLE customers ADD COLUMN billing_cycle text DEFAULT 'monthly';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'consolidation_parent_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN consolidation_parent_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;
