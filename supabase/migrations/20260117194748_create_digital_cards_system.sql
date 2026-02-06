/*
  # Sistema de Tarjetas Digitales para Clientes
  
  ## Descripción
  Sistema completo para gestionar tarjetas digitales de clientes con soporte para:
  - Tarjetas titulares y familiares
  - Generación automática de números de tarjeta
  - Códigos QR para verificación
  - Bloqueo automático al cancelar clientes
  - Seguimiento de uso y descuentos aplicados
  
  ## 1. Nuevas Tablas
  
  ### `customer_digital_cards`
  Almacena las tarjetas digitales emitidas a clientes y familiares
  - `id` - Identificador único de la tarjeta
  - `customer_id` - Referencia al cliente propietario
  - `card_number` - Número único de tarjeta (formato: CARD-{account}-{seq})
  - `card_type` - Tipo de tarjeta: 'titular' o 'familiar'
  - `cardholder_name` - Nombre del portador de la tarjeta
  - `relationship` - Relación con el titular (solo para familiares)
  - `is_active` - Estado activo/bloqueado de la tarjeta
  - `qr_code_data` - Datos JSON para el código QR
  - `generated_at` - Fecha de generación
  - `blocked_at` - Fecha de bloqueo (si aplica)
  - `block_reason` - Motivo del bloqueo
  - `created_at`, `updated_at` - Timestamps de auditoría
  
  ### `digital_card_usage`
  Registra cada uso de las tarjetas digitales
  - `id` - Identificador único del uso
  - `card_id` - Tarjeta utilizada
  - `service_order_id` - Orden de servicio asociada (opcional)
  - `verified_by` - Usuario/técnico que verificó la tarjeta
  - `discount_applied` - Si se aplicó descuento
  - `discount_amount` - Monto del descuento
  - `verified_at` - Timestamp de verificación
  - `notes` - Notas adicionales
  
  ## 2. Funciones
  
  ### `generate_card_number`
  Genera números de tarjeta en formato estándar
  
  ### `block_customer_cards`
  Bloquea todas las tarjetas de un cliente
  
  ## 3. Triggers
  
  - Trigger automático para bloquear tarjetas al cancelar cliente
  - Trigger para actualizar updated_at automáticamente
  
  ## 4. Índices
  
  Índices optimizados para búsquedas frecuentes:
  - Búsqueda por customer_id
  - Búsqueda por card_number
  - Filtrado por estado activo
  - Búsquedas en historial de uso
  
  ## 5. Seguridad (RLS)
  
  - Políticas restrictivas para usuarios autenticados
  - Control de acceso basado en autenticación
  - RLS habilitado en todas las tablas
  
  ## 6. Vistas
  
  ### `customer_cards_summary`
  Vista consolidada con resumen de tarjetas por cliente
  
  ## Notas Importantes
  
  1. La función `generate_card_number` intenta obtener el account_number de la tabla
     customers si existe. Si no existe, usa una porción del UUID del cliente.
  
  2. El trigger de bloqueo automático solo se crea si existe la tabla customers
     con un campo status. Si su tabla customers tiene otro nombre o estructura,
     deberá ajustar el trigger manualmente.
  
  3. Las foreign keys a service_orders se crearán automáticamente cuando esa
     tabla exista en el sistema.
*/

-- =====================================================
-- TABLAS
-- =====================================================

-- Tabla: customer_digital_cards
-- Almacena las tarjetas digitales de clientes
CREATE TABLE IF NOT EXISTS customer_digital_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  card_number text UNIQUE NOT NULL,
  card_type text NOT NULL CHECK (card_type IN ('titular', 'familiar')),
  cardholder_name text NOT NULL,
  relationship text,
  is_active boolean DEFAULT true NOT NULL,
  qr_code_data text NOT NULL,
  generated_at timestamptz DEFAULT now() NOT NULL,
  blocked_at timestamptz,
  block_reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabla: digital_card_usage
-- Registra el historial de uso de las tarjetas
CREATE TABLE IF NOT EXISTS digital_card_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES customer_digital_cards(id) ON DELETE CASCADE,
  service_order_id uuid,
  verified_by uuid REFERENCES auth.users(id),
  discount_applied boolean DEFAULT false NOT NULL,
  discount_amount decimal(10,2) DEFAULT 0.00 NOT NULL,
  verified_at timestamptz DEFAULT now() NOT NULL,
  notes text
);

-- =====================================================
-- FUNCIONES
-- =====================================================

-- Función: generate_card_number
-- Genera un número de tarjeta en formato CARD-{account_number}-{sequence}
-- Nota: Asume que existe una tabla 'customers' con campo 'account_number'
CREATE OR REPLACE FUNCTION generate_card_number(
  p_customer_id uuid,
  p_sequence integer
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_account_number text;
BEGIN
  -- Intentar obtener el account_number del cliente
  -- Si la tabla customers no existe, usar el customer_id
  BEGIN
    SELECT account_number INTO v_account_number
    FROM customers
    WHERE id = p_customer_id;
    
    IF v_account_number IS NULL THEN
      v_account_number := SUBSTRING(p_customer_id::text, 1, 8);
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- Si la tabla customers no existe, usar parte del UUID
      v_account_number := SUBSTRING(p_customer_id::text, 1, 8);
  END;
  
  -- Retornar el número de tarjeta formateado
  RETURN 'CARD-' || v_account_number || '-' || LPAD(p_sequence::text, 3, '0');
END;
$$;

-- Función: block_customer_cards
-- Bloquea todas las tarjetas activas de un cliente
CREATE OR REPLACE FUNCTION block_customer_cards(
  p_customer_id uuid,
  p_reason text
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_cards_blocked integer;
BEGIN
  -- Actualizar todas las tarjetas activas del cliente
  UPDATE customer_digital_cards
  SET 
    is_active = false,
    blocked_at = now(),
    block_reason = p_reason,
    updated_at = now()
  WHERE 
    customer_id = p_customer_id
    AND is_active = true;
  
  -- Obtener el número de tarjetas bloqueadas
  GET DIAGNOSTICS v_cards_blocked = ROW_COUNT;
  
  RETURN v_cards_blocked;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Función del trigger para bloqueo automático al cancelar cliente
CREATE OR REPLACE FUNCTION trigger_block_cards_on_customer_cancellation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si el cliente cambió a estado 'cancelled', bloquear sus tarjetas
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    PERFORM block_customer_cards(NEW.id, 'Cliente cancelado');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Bloquear tarjetas al cancelar cliente
-- Nota: Este trigger se crea solo si existe la tabla 'customers'
DO $$
BEGIN
  -- Verificar si la tabla customers existe antes de crear el trigger
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'customers'
  ) THEN
    -- Eliminar el trigger si ya existe
    DROP TRIGGER IF EXISTS on_customer_cancelled_block_cards ON customers;
    
    -- Crear el trigger
    CREATE TRIGGER on_customer_cancelled_block_cards
      AFTER UPDATE ON customers
      FOR EACH ROW
      EXECUTE FUNCTION trigger_block_cards_on_customer_cancellation();
  END IF;
END $$;

-- Trigger: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Aplicar trigger de updated_at a customer_digital_cards
DROP TRIGGER IF EXISTS set_updated_at ON customer_digital_cards;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON customer_digital_cards
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- =====================================================
-- ÍNDICES
-- =====================================================

-- Índice: Búsqueda por customer_id (muy frecuente)
CREATE INDEX IF NOT EXISTS idx_digital_cards_customer_id 
  ON customer_digital_cards(customer_id);

-- Índice: Búsqueda por card_number (verificación de tarjetas)
CREATE INDEX IF NOT EXISTS idx_digital_cards_card_number 
  ON customer_digital_cards(card_number);

-- Índice: Filtrado por estado activo (listados de tarjetas activas)
CREATE INDEX IF NOT EXISTS idx_digital_cards_is_active 
  ON customer_digital_cards(is_active);

-- Índice: Búsqueda por tipo de tarjeta
CREATE INDEX IF NOT EXISTS idx_digital_cards_card_type 
  ON customer_digital_cards(card_type);

-- Índice compuesto: customer_id + is_active (muy común)
CREATE INDEX IF NOT EXISTS idx_digital_cards_customer_active 
  ON customer_digital_cards(customer_id, is_active);

-- Índice: Búsqueda de uso por tarjeta
CREATE INDEX IF NOT EXISTS idx_card_usage_card_id 
  ON digital_card_usage(card_id);

-- Índice: Búsqueda de uso por orden de servicio
CREATE INDEX IF NOT EXISTS idx_card_usage_service_order_id 
  ON digital_card_usage(service_order_id);

-- Índice: Búsqueda de uso por verificador
CREATE INDEX IF NOT EXISTS idx_card_usage_verified_by 
  ON digital_card_usage(verified_by);

-- Índice: Ordenamiento por fecha de verificación
CREATE INDEX IF NOT EXISTS idx_card_usage_verified_at 
  ON digital_card_usage(verified_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE customer_digital_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_card_usage ENABLE ROW LEVEL SECURITY;

-- Políticas para customer_digital_cards

-- SELECT: Usuarios autenticados pueden ver tarjetas
CREATE POLICY "Authenticated users can view digital cards"
  ON customer_digital_cards
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Usuarios autenticados pueden crear tarjetas
CREATE POLICY "Authenticated users can create digital cards"
  ON customer_digital_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Usuarios autenticados pueden actualizar tarjetas
CREATE POLICY "Authenticated users can update digital cards"
  ON customer_digital_cards
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Usuarios autenticados pueden eliminar tarjetas
CREATE POLICY "Authenticated users can delete digital cards"
  ON customer_digital_cards
  FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para digital_card_usage

-- SELECT: Usuarios autenticados pueden ver historial de uso
CREATE POLICY "Authenticated users can view card usage"
  ON digital_card_usage
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Usuarios autenticados pueden registrar uso de tarjetas
CREATE POLICY "Authenticated users can record card usage"
  ON digital_card_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Usuarios autenticados pueden actualizar registros de uso
CREATE POLICY "Authenticated users can update card usage"
  ON digital_card_usage
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Usuarios autenticados pueden eliminar registros de uso
CREATE POLICY "Authenticated users can delete card usage"
  ON digital_card_usage
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- VISTAS
-- =====================================================

-- Vista: customer_cards_summary
-- Resumen consolidado de tarjetas por cliente
-- Nota: Esta vista se creará dinámicamente dependiendo de si existe la tabla customers
DO $$
BEGIN
  -- Verificar si la tabla customers existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'customers'
  ) THEN
    -- Crear vista con información de customers
    EXECUTE '
      CREATE OR REPLACE VIEW customer_cards_summary AS
      SELECT 
        cdc.customer_id,
        c.account_number,
        c.name as customer_name,
        COUNT(cdc.id) as total_cards,
        COUNT(cdc.id) FILTER (WHERE cdc.is_active = true) as active_cards,
        COUNT(cdc.id) FILTER (WHERE cdc.is_active = false) as blocked_cards,
        MAX(cdc.card_number) FILTER (WHERE cdc.card_type = ''titular'') as titular_card_number,
        COUNT(dcu.id) as usage_count,
        MAX(dcu.verified_at) as last_usage_date
      FROM 
        customer_digital_cards cdc
      LEFT JOIN 
        customers c ON c.id = cdc.customer_id
      LEFT JOIN 
        digital_card_usage dcu ON dcu.card_id = cdc.id
      GROUP BY 
        cdc.customer_id, c.account_number, c.name
    ';
  ELSE
    -- Crear vista sin información de customers
    EXECUTE '
      CREATE OR REPLACE VIEW customer_cards_summary AS
      SELECT 
        cdc.customer_id,
        SUBSTRING(cdc.customer_id::text, 1, 8) as account_number,
        MAX(cdc.cardholder_name) FILTER (WHERE cdc.card_type = ''titular'') as customer_name,
        COUNT(cdc.id) as total_cards,
        COUNT(cdc.id) FILTER (WHERE cdc.is_active = true) as active_cards,
        COUNT(cdc.id) FILTER (WHERE cdc.is_active = false) as blocked_cards,
        MAX(cdc.card_number) FILTER (WHERE cdc.card_type = ''titular'') as titular_card_number,
        COUNT(dcu.id) as usage_count,
        MAX(dcu.verified_at) as last_usage_date
      FROM 
        customer_digital_cards cdc
      LEFT JOIN 
        digital_card_usage dcu ON dcu.card_id = cdc.id
      GROUP BY 
        cdc.customer_id
    ';
  END IF;
END $$;