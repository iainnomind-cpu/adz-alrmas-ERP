/*
  # Sistema de Cuentas Maestras y Consolidadas

  1. Modificaciones a customers
    - is_master_account: Indica si es cuenta maestra
    - master_account_id: Referencia a la cuenta maestra (si es cuenta vinculada)
    - is_consolidated: Indica si usa facturación consolidada
    - service_count: Contador de servicios activos
    - first_service_date: Fecha del primer servicio contratado
    - account_type: Tipo de cuenta (standard, master, linked, consolidated)
    - billing_consolidation: Configuración de consolidación

  2. Nueva Tabla: account_relationships
    - Relaciones entre cuentas maestras y vinculadas
    - Historial de vinculaciones
    - Información de sucursales/ubicaciones

  3. Nueva Tabla: service_locations
    - Ubicaciones/sucursales de servicios
    - Vinculación con cuenta maestra
    - Información de instalación

  4. Funciones Automáticas
    - Promoción automática a cuenta maestra (2+ servicios)
    - Actualización de contadores
    - Consolidación de facturación

  5. Vistas
    - master_accounts_summary: Resumen de cuentas maestras
    - consolidated_billing_view: Vista de facturación consolidada

  6. RLS habilitado para todas las tablas
*/

-- Agregar columnas a customers para cuentas maestras
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'is_master_account'
  ) THEN
    ALTER TABLE customers ADD COLUMN is_master_account boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'master_account_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN master_account_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'is_consolidated'
  ) THEN
    ALTER TABLE customers ADD COLUMN is_consolidated boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'service_count'
  ) THEN
    ALTER TABLE customers ADD COLUMN service_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'first_service_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN first_service_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE customers ADD COLUMN account_type text DEFAULT 'standard' CHECK (account_type IN ('standard', 'master', 'linked', 'consolidated'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'billing_consolidation'
  ) THEN
    ALTER TABLE customers ADD COLUMN billing_consolidation jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Crear tabla de relaciones entre cuentas
CREATE TABLE IF NOT EXISTS account_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_account_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  linked_account_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Información de la relación
  relationship_type text NOT NULL DEFAULT 'service_location' CHECK (relationship_type IN (
    'service_location',
    'branch',
    'subsidiary',
    'additional_service',
    'other'
  )),
  
  -- Descripción de la ubicación/sucursal
  location_name text,
  location_type text CHECK (location_type IN ('casa', 'negocio', 'sucursal', 'oficina', 'bodega', 'otro')),
  
  -- Dirección de la ubicación
  street_address text,
  neighborhood text,
  city text,
  state text,
  postal_code text,
  
  -- Información de servicios
  services_provided text[],
  service_start_date date,
  service_status text DEFAULT 'active' CHECK (service_status IN ('active', 'suspended', 'cancelled', 'pending')),
  
  -- Consolidación
  include_in_consolidated_billing boolean DEFAULT true,
  billing_notes text,
  
  -- Orden de prioridad (la primera es la maestra)
  priority_order integer DEFAULT 0,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Restricción: no puede ser su propia cuenta maestra
  CONSTRAINT no_self_reference CHECK (master_account_id != linked_account_id),
  
  -- Restricción: combinación única de cuentas
  CONSTRAINT unique_account_relationship UNIQUE (master_account_id, linked_account_id)
);

-- Crear tabla de ubicaciones de servicio
CREATE TABLE IF NOT EXISTS service_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  master_account_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Información de la ubicación
  location_name text NOT NULL,
  location_type text NOT NULL DEFAULT 'otro' CHECK (location_type IN ('casa', 'negocio', 'sucursal', 'oficina', 'bodega', 'otro')),
  is_primary boolean DEFAULT false,
  
  -- Dirección completa
  street_address text NOT NULL,
  neighborhood text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text,
  
  -- Coordenadas (opcional)
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  
  -- Información de contacto en ubicación
  contact_name text,
  contact_phone text,
  contact_email text,
  
  -- Servicios en esta ubicación
  active_services text[],
  service_orders_count integer DEFAULT 0,
  
  -- Estado
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Notas
  notes text,
  access_instructions text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Función para actualizar contador de servicios
CREATE OR REPLACE FUNCTION update_service_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar contador de servicios del cliente
  UPDATE customers
  SET service_count = (
    SELECT COUNT(*)
    FROM service_locations
    WHERE customer_id = NEW.customer_id
    AND status = 'active'
  )
  WHERE id = NEW.customer_id;
  
  -- Si es primera ubicación, establecer fecha del primer servicio
  UPDATE customers
  SET first_service_date = COALESCE(first_service_date, CURRENT_DATE)
  WHERE id = NEW.customer_id AND first_service_date IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_service_count ON service_locations;
CREATE TRIGGER trigger_update_service_count
  AFTER INSERT OR UPDATE OR DELETE ON service_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_service_count();

-- Función para promover a cuenta maestra automáticamente
CREATE OR REPLACE FUNCTION check_and_promote_to_master()
RETURNS TRIGGER AS $$
DECLARE
  current_service_count integer;
BEGIN
  -- Contar servicios activos
  SELECT service_count INTO current_service_count
  FROM customers
  WHERE id = NEW.customer_id;
  
  -- Si tiene 2 o más servicios y no es cuenta maestra, promover
  IF current_service_count >= 2 THEN
    UPDATE customers
    SET is_master_account = true,
        account_type = 'master',
        is_consolidated = true
    WHERE id = NEW.customer_id
    AND is_master_account = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_and_promote_to_master ON service_locations;
CREATE TRIGGER trigger_check_and_promote_to_master
  AFTER INSERT OR UPDATE ON service_locations
  FOR EACH ROW
  EXECUTE FUNCTION check_and_promote_to_master();

-- Función para vincular cuentas automáticamente
CREATE OR REPLACE FUNCTION link_accounts_to_master(
  p_customer_id uuid
)
RETURNS void AS $$
DECLARE
  location_record RECORD;
  priority integer := 1;
BEGIN
  -- Marcar cliente como cuenta maestra
  UPDATE customers
  SET is_master_account = true,
      account_type = 'master',
      is_consolidated = true
  WHERE id = p_customer_id;
  
  -- Vincular todas las ubicaciones como relaciones
  FOR location_record IN
    SELECT * FROM service_locations
    WHERE customer_id = p_customer_id
    AND status = 'active'
    ORDER BY is_primary DESC, created_at ASC
  LOOP
    -- Crear relación si no existe
    INSERT INTO account_relationships (
      master_account_id,
      linked_account_id,
      relationship_type,
      location_name,
      location_type,
      street_address,
      neighborhood,
      city,
      state,
      postal_code,
      service_start_date,
      priority_order
    ) VALUES (
      p_customer_id,
      p_customer_id,
      'service_location',
      location_record.location_name,
      location_record.location_type,
      location_record.street_address,
      location_record.neighborhood,
      location_record.city,
      location_record.state,
      location_record.postal_code,
      location_record.created_at::date,
      priority
    )
    ON CONFLICT (master_account_id, linked_account_id) DO NOTHING;
    
    priority := priority + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Vista de resumen de cuentas maestras
CREATE OR REPLACE VIEW master_accounts_summary AS
SELECT
  c.id,
  c.account_number,
  c.name,
  c.business_name,
  c.email,
  c.phone,
  c.service_count,
  c.first_service_date,
  c.is_master_account,
  c.account_type,
  COUNT(DISTINCT ar.linked_account_id) as linked_accounts_count,
  COUNT(DISTINCT sl.id) as total_locations,
  ARRAY_AGG(DISTINCT sl.location_name) FILTER (WHERE sl.location_name IS NOT NULL) as location_names,
  ARRAY_AGG(DISTINCT sl.location_type) FILTER (WHERE sl.location_type IS NOT NULL) as location_types,
  SUM(COALESCE(bd.balance, 0)) as total_balance,
  COUNT(DISTINCT bd.id) FILTER (WHERE bd.payment_status IN ('pending', 'overdue', 'partial')) as pending_documents_count
FROM customers c
LEFT JOIN account_relationships ar ON c.id = ar.master_account_id
LEFT JOIN service_locations sl ON c.id = sl.customer_id AND sl.status = 'active'
LEFT JOIN billing_documents bd ON c.id = bd.customer_id AND bd.payment_status != 'paid'
WHERE c.is_master_account = true
GROUP BY c.id, c.account_number, c.name, c.business_name, c.email, c.phone, 
         c.service_count, c.first_service_date, c.is_master_account, c.account_type;

-- Vista de facturación consolidada
CREATE OR REPLACE VIEW consolidated_billing_view AS
SELECT
  c.id as customer_id,
  c.account_number,
  c.name as customer_name,
  c.business_name,
  c.is_master_account,
  c.service_count,
  bd.id as document_id,
  bd.folio,
  bd.document_type,
  bd.issue_date,
  bd.due_date,
  bd.total,
  bd.paid_amount,
  bd.balance,
  bd.payment_status,
  sl.location_name,
  sl.location_type,
  CASE
    WHEN c.is_master_account THEN 'Cuenta Maestra'
    WHEN c.master_account_id IS NOT NULL THEN 'Cuenta Vinculada'
    ELSE 'Cuenta Individual'
  END as account_classification
FROM customers c
LEFT JOIN billing_documents bd ON c.id = bd.customer_id
LEFT JOIN service_locations sl ON c.id = sl.customer_id AND sl.is_primary = true
WHERE c.is_consolidated = true OR c.is_master_account = true
ORDER BY c.account_number, bd.issue_date DESC;

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_customers_master_account ON customers(is_master_account) WHERE is_master_account = true;
CREATE INDEX IF NOT EXISTS idx_customers_master_account_id ON customers(master_account_id) WHERE master_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_account_type ON customers(account_type);
CREATE INDEX IF NOT EXISTS idx_customers_service_count ON customers(service_count);
CREATE INDEX IF NOT EXISTS idx_account_relationships_master ON account_relationships(master_account_id);
CREATE INDEX IF NOT EXISTS idx_account_relationships_linked ON account_relationships(linked_account_id);
CREATE INDEX IF NOT EXISTS idx_service_locations_customer ON service_locations(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_locations_master ON service_locations(master_account_id);
CREATE INDEX IF NOT EXISTS idx_service_locations_status ON service_locations(status);

-- RLS para account_relationships
ALTER TABLE account_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver relaciones de cuentas"
  ON account_relationships FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear relaciones de cuentas"
  ON account_relationships FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar relaciones de cuentas"
  ON account_relationships FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar relaciones de cuentas"
  ON account_relationships FOR DELETE
  TO authenticated
  USING (true);

-- RLS para service_locations
ALTER TABLE service_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver ubicaciones"
  ON service_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear ubicaciones"
  ON service_locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar ubicaciones"
  ON service_locations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar ubicaciones"
  ON service_locations FOR DELETE
  TO authenticated
  USING (true);

-- Comentarios
COMMENT ON COLUMN customers.is_master_account IS 'Indica si la cuenta es maestra (2+ servicios)';
COMMENT ON COLUMN customers.master_account_id IS 'ID de la cuenta maestra si es cuenta vinculada';
COMMENT ON COLUMN customers.service_count IS 'Contador de servicios activos';
COMMENT ON COLUMN customers.first_service_date IS 'Fecha del primer servicio (determina cuenta maestra)';
COMMENT ON COLUMN customers.account_type IS 'Tipo: standard, master, linked, consolidated';

COMMENT ON TABLE account_relationships IS 'Relaciones entre cuentas maestras y vinculadas';
COMMENT ON TABLE service_locations IS 'Ubicaciones/sucursales de servicios por cliente';

COMMENT ON VIEW master_accounts_summary IS 'Resumen de cuentas maestras con estadísticas';
COMMENT ON VIEW consolidated_billing_view IS 'Vista consolidada de facturación';

COMMENT ON FUNCTION link_accounts_to_master IS 'Vincula ubicaciones de servicio a cuenta maestra';
COMMENT ON FUNCTION check_and_promote_to_master IS 'Promociona automáticamente a cuenta maestra con 2+ servicios';
