/*
  # Sistema Completo de Gestión de Clientes

  1. Expansión de Tabla customers (40+ columnas)
    - Sistema de numeración de cuenta reutilizable
    - Información de contacto extendida
    - Dirección detallada (calle, colonia, ciudad, estado, CP, referencias)
    - Información de servicio (plan, tecnología, velocidad)
    - Información de facturación (RFC, razón social, tipo)
    - Estado de pago y clasificación
    - Contactos adicionales
    - Fechas de alta/baja y migración
    - Notas y observaciones

  2. Nueva Tabla: customer_account_numbers
    - Sistema de numeración reutilizable
    - Permite reasignar números cuando se da de baja un cliente
    - Historial de asignaciones

  3. Índices para búsqueda rápida
    - Por nombre, negocio, domicilio, teléfono
    - Por colonia, ciudad, estado
    - Por tecnología, plan, estado de pago
    - Por fechas de alta/baja

  4. RLS habilitado
    - Usuarios autenticados pueden ver y gestionar clientes
*/

-- Agregar columnas adicionales a customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_number integer UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS secondary_phone text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_email text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp text;

-- Dirección detallada
ALTER TABLE customers ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS exterior_number text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS interior_number text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city text DEFAULT 'Ciudad';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state text DEFAULT 'Estado';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_references text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS latitude decimal(10, 8);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS longitude decimal(11, 8);

-- Información de servicio
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_plan text DEFAULT 'basico' CHECK (service_plan IN ('basico', 'premium', 'empresarial', 'personalizado'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS connection_technology text DEFAULT 'telefono' CHECK (connection_technology IN ('telefono', 'ip', 'dual', 'celular', 'radio'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS connection_speed text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_count integer DEFAULT 1;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_master_account boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_consolidated_account boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS parent_account_id uuid REFERENCES customers(id) ON DELETE SET NULL;

-- Información de facturación
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'ticket' CHECK (billing_type IN ('ticket', 'factura', 'ambos'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rfc text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_regime text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cfdi_use text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_email text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'transferencia', 'cheque', 'tarjeta', 'otro'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_day integer;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_days integer DEFAULT 0;

-- Estado y clasificación
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'puntual' CHECK (payment_status IN ('puntual', 'tardado', 'moroso', 'suspendido'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cancellation_date date;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS migrated_to_company text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS migration_date date;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reactivation_date date;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alta_date date DEFAULT CURRENT_DATE;

-- Contactos adicionales
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS technical_contact_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS technical_contact_phone text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_contact_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_contact_phone text;

-- Notas y observaciones
ALTER TABLE customers ADD COLUMN IF NOT EXISTS general_notes text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_notes text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_notes text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS internal_notes text;

-- Campos adicionales
ALTER TABLE customers ADD COLUMN IF NOT EXISTS discount_percentage decimal(5, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS monthly_amount decimal(10, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS installation_date date;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contract_number text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contract_end_date date;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS equipment_serial text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS panel_code text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS panel_password text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS web_access_user text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS web_access_password text;

-- Crear tabla de numeración de cuentas reutilizable
CREATE TABLE IF NOT EXISTS customer_account_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number integer UNIQUE NOT NULL,
  is_available boolean DEFAULT true,
  current_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  assignment_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Función para obtener el siguiente número de cuenta disponible
CREATE OR REPLACE FUNCTION get_next_available_account_number()
RETURNS integer AS $$
DECLARE
  next_number integer;
BEGIN
  -- Buscar el primer número disponible
  SELECT account_number INTO next_number
  FROM customer_account_numbers
  WHERE is_available = true
  ORDER BY account_number
  LIMIT 1;
  
  -- Si no hay números disponibles, crear el siguiente
  IF next_number IS NULL THEN
    SELECT COALESCE(MAX(account_number), 0) + 1 INTO next_number
    FROM customer_account_numbers;
    
    INSERT INTO customer_account_numbers (account_number, is_available)
    VALUES (next_number, true);
  END IF;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Función para asignar número de cuenta a un cliente
CREATE OR REPLACE FUNCTION assign_account_number_to_customer(customer_id uuid)
RETURNS integer AS $$
DECLARE
  account_num integer;
  history_entry jsonb;
BEGIN
  -- Obtener siguiente número disponible
  SELECT get_next_available_account_number() INTO account_num;
  
  -- Marcar como no disponible y asignar a cliente
  UPDATE customer_account_numbers
  SET is_available = false,
      current_customer_id = customer_id,
      assignment_history = assignment_history || jsonb_build_object(
        'customer_id', customer_id,
        'assigned_at', now()
      ),
      updated_at = now()
  WHERE account_number = account_num;
  
  -- Actualizar cliente con número de cuenta
  UPDATE customers
  SET account_number = account_num
  WHERE id = customer_id;
  
  RETURN account_num;
END;
$$ LANGUAGE plpgsql;

-- Función para liberar número de cuenta cuando se da de baja
CREATE OR REPLACE FUNCTION release_account_number(customer_id uuid)
RETURNS void AS $$
DECLARE
  account_num integer;
BEGIN
  -- Obtener número de cuenta del cliente
  SELECT account_number INTO account_num
  FROM customers
  WHERE id = customer_id;
  
  IF account_num IS NOT NULL THEN
    -- Marcar como disponible
    UPDATE customer_account_numbers
    SET is_available = true,
        current_customer_id = NULL,
        assignment_history = assignment_history || jsonb_build_object(
          'customer_id', customer_id,
          'released_at', now()
        ),
        updated_at = now()
    WHERE account_number = account_num;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar número de cuenta automáticamente
CREATE OR REPLACE FUNCTION auto_assign_account_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.account_number IS NULL THEN
    NEW.account_number := assign_account_number_to_customer(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_assign_account_number ON customers;
CREATE TRIGGER trigger_auto_assign_account_number
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_account_number();

-- Trigger para liberar número cuando se da de baja
CREATE OR REPLACE FUNCTION auto_release_account_on_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    PERFORM release_account_number(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_release_account_on_cancellation ON customers;
CREATE TRIGGER trigger_release_account_on_cancellation
  AFTER UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION auto_release_account_on_cancellation();

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number);
CREATE INDEX IF NOT EXISTS idx_customers_business_name ON customers(business_name);
CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_customers_business_search ON customers USING gin(to_tsvector('spanish', COALESCE(business_name, '')));
CREATE INDEX IF NOT EXISTS idx_customers_neighborhood ON customers(neighborhood);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_state ON customers(state);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_connection_tech ON customers(connection_technology);
CREATE INDEX IF NOT EXISTS idx_customers_service_plan ON customers(service_plan);
CREATE INDEX IF NOT EXISTS idx_customers_payment_status ON customers(payment_status);
CREATE INDEX IF NOT EXISTS idx_customers_billing_type ON customers(billing_type);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_alta_date ON customers(alta_date);
CREATE INDEX IF NOT EXISTS idx_customers_cancellation_date ON customers(cancellation_date);
CREATE INDEX IF NOT EXISTS idx_customers_is_master ON customers(is_master_account);

-- RLS para customer_account_numbers
ALTER TABLE customer_account_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver números de cuenta"
  ON customer_account_numbers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar números"
  ON customer_account_numbers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comentarios
COMMENT ON COLUMN customers.account_number IS 'Número de cuenta reutilizable del cliente';
COMMENT ON COLUMN customers.service_count IS 'Número de servicios contratados';
COMMENT ON COLUMN customers.is_master_account IS 'Cuenta maestra (más de 2 servicios)';
COMMENT ON COLUMN customers.is_consolidated_account IS 'Cuenta consolidada de múltiples servicios';
COMMENT ON COLUMN customers.payment_status IS 'Estado de pago: puntual, tardado, moroso, suspendido';
COMMENT ON COLUMN customers.billing_type IS 'Tipo de facturación: ticket o factura';
COMMENT ON COLUMN customers.service_plan IS 'Plan de servicio: basico, premium, empresarial';
COMMENT ON COLUMN customers.connection_technology IS 'Tecnología de conexión: telefono, ip, dual, celular, radio';

COMMENT ON TABLE customer_account_numbers IS 'Sistema de numeración reutilizable de cuentas de clientes';
