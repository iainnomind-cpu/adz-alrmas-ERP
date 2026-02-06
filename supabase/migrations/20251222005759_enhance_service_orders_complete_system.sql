/*
  # Sistema Completo de Órdenes de Servicio

  1. Actualizaciones a service_orders
    - Agregar campo para folio de central de monitoreo
    - Expandir estados (Levantada, Asignada, En proceso, Atendida, Cerrada)
    - Agregar campo de prioridad
    - Agregar campo de tiempo invertido
    - Agregar campos de pago (is_paid, payment_amount, payment_method)
    - Mejorar sistema de folio consecutivo

  2. Nueva Tabla: service_order_photos
    - Evidencias fotográficas
    - Descripción de cada foto
    - Orden y timestamp

  3. Nueva Tabla: service_order_comments
    - Comentarios y observaciones
    - Usuario y timestamp
    - Tipo de comentario

  4. Security
    - Enable RLS en todas las tablas nuevas
    - Políticas restrictivas por rol
*/

-- Agregar campos a service_orders
DO $$ 
BEGIN
  -- Campo para folio de central de monitoreo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'monitoring_center_folio'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN monitoring_center_folio text;
  END IF;

  -- Campo de prioridad
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'priority'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;

  -- Campo de tiempo invertido (en minutos)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'time_spent_minutes'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN time_spent_minutes integer DEFAULT 0;
  END IF;

  -- Campos de pago
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'is_paid'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN is_paid boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'payment_amount'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN payment_amount decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN payment_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN payment_date timestamptz;
  END IF;

  -- Fecha de cierre
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN closed_at timestamptz;
  END IF;

  -- Usuario que cerró
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'closed_by'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Email enviado
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'email_sent'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN email_sent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_orders' AND column_name = 'email_sent_at'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN email_sent_at timestamptz;
  END IF;
END $$;

-- Actualizar constraint de status para incluir todos los estados
ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check;
ALTER TABLE service_orders ADD CONSTRAINT service_orders_status_check 
  CHECK (status IN ('levantada', 'asignada', 'en_proceso', 'atendida', 'cerrada', 'pending', 'in_progress', 'completed', 'cancelled'));

-- Tabla de fotos de evidencia
CREATE TABLE IF NOT EXISTS service_order_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid REFERENCES service_orders(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  photo_description text,
  photo_type text DEFAULT 'evidence' CHECK (photo_type IN ('before', 'during', 'after', 'evidence', 'damage', 'repair', 'other')),
  display_order integer DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_order_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view service order photos"
  ON service_order_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can manage service order photos"
  ON service_order_photos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'technician', 'customer_service')
    )
  );

-- Tabla de comentarios
CREATE TABLE IF NOT EXISTS service_order_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid REFERENCES service_orders(id) ON DELETE CASCADE NOT NULL,
  comment_type text DEFAULT 'general' CHECK (comment_type IN ('general', 'technical', 'internal', 'customer', 'admin')),
  comment_text text NOT NULL,
  is_internal boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_order_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view service order comments"
  ON service_order_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can add service order comments"
  ON service_order_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_service_order_photos_order ON service_order_photos(service_order_id, display_order);
CREATE INDEX IF NOT EXISTS idx_service_order_comments_order ON service_order_comments(service_order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_service_orders_priority ON service_orders(priority);
CREATE INDEX IF NOT EXISTS idx_service_orders_payment ON service_orders(is_paid);
CREATE INDEX IF NOT EXISTS idx_service_orders_monitoring_folio ON service_orders(monitoring_center_folio);

-- Función para actualizar número de orden con el formato correcto
CREATE OR REPLACE FUNCTION generate_service_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  year_suffix TEXT;
  new_order_number TEXT;
BEGIN
  IF NEW.order_number IS NULL THEN
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    SELECT COALESCE(MAX(
      CAST(
        SUBSTRING(order_number FROM '(\d+)-' || year_suffix || '$') 
        AS INTEGER
      )
    ), 0) + 1
    INTO next_number
    FROM service_orders
    WHERE order_number LIKE '%-' || year_suffix;
    
    new_order_number := LPAD(next_number::TEXT, 6, '0') || '-' || year_suffix;
    NEW.order_number := new_order_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar número de orden automáticamente
DROP TRIGGER IF EXISTS generate_service_order_number_trigger ON service_orders;
CREATE TRIGGER generate_service_order_number_trigger
  BEFORE INSERT ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_service_order_number();

-- Función para enviar notificación cuando se cierra una orden
CREATE OR REPLACE FUNCTION notify_service_order_closed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cerrada' AND OLD.status != 'cerrada' THEN
    NEW.closed_at := now();
    
    IF NEW.closed_by IS NULL THEN
      NEW.closed_by := auth.uid();
    END IF;
    
    INSERT INTO notification_queue (
      customer_id,
      notification_type,
      recipient_email,
      recipient_name,
      subject,
      body,
      variables
    )
    SELECT 
      c.id,
      'service_completed',
      c.email,
      c.full_name,
      'Orden de Servicio Completada - #' || NEW.order_number,
      'Su orden de servicio #' || NEW.order_number || ' ha sido completada exitosamente.',
      jsonb_build_object(
        'order_number', NEW.order_number,
        'customer_name', c.full_name,
        'completion_date', NEW.closed_at
      )
    FROM customers c
    WHERE c.id = NEW.customer_id AND c.email IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para enviar notificación automáticamente
DROP TRIGGER IF EXISTS notify_service_order_closed_trigger ON service_orders;
CREATE TRIGGER notify_service_order_closed_trigger
  BEFORE UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_service_order_closed();

-- Insertar plantilla de correo para orden completada si no existe
INSERT INTO notification_templates (name, type, subject, body, variables, is_active)
SELECT
  'Orden de Servicio Completada',
  'service_completed',
  'Orden de Servicio #{{order_number}} - Completada',
  'Estimado/a {{customer_name}},

Le informamos que la orden de servicio #{{order_number}} ha sido completada exitosamente.

Detalles del Servicio:
- Número de Orden: {{order_number}}
- Fecha de Completación: {{completion_date}}
- Técnico Asignado: {{technician_name}}
- Descripción: {{service_description}}

{{#if materials_used}}
Materiales Utilizados:
{{materials_used}}
{{/if}}

{{#if time_spent}}
Tiempo Invertido: {{time_spent}}
{{/if}}

{{#if payment_info}}
Información de Pago:
{{payment_info}}
{{/if}}

Puede descargar la orden de servicio completa desde su panel de cliente.

Gracias por su confianza en nuestros servicios.

Atentamente,
{{company_name}}',
  '["order_number", "customer_name", "completion_date", "technician_name", "service_description", "materials_used", "time_spent", "payment_info", "company_name"]'::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates 
  WHERE type = 'service_completed' AND name = 'Orden de Servicio Completada'
);

-- Actualizar órdenes existentes con valores por defecto
UPDATE service_orders
SET priority = 'normal'
WHERE priority IS NULL;

UPDATE service_orders
SET is_paid = false
WHERE is_paid IS NULL;

UPDATE service_orders
SET payment_amount = 0
WHERE payment_amount IS NULL;

UPDATE service_orders
SET time_spent_minutes = 0
WHERE time_spent_minutes IS NULL;

UPDATE service_orders
SET email_sent = false
WHERE email_sent IS NULL;
