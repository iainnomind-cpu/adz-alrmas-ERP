/*
  # Sistema de Notificaciones, Suspensiones e Historial

  1. Nuevas Tablas
    - `notification_templates` - Plantillas de correos automáticos
    - `notification_queue` - Cola de notificaciones pendientes
    - `notification_history` - Historial de notificaciones enviadas
    - `customer_observations` - Observaciones y notas por cliente
    - `customer_account_history` - Historial de cambios de cuenta
    - `notification_config` - Configuración de envíos automáticos
    
  2. Actualizaciones a Tabla Existente
    - `customers` - Agregar campos de suspensión, señales y motivo de baja
    
  3. Security
    - Enable RLS en todas las tablas
    - Políticas restrictivas por rol
*/

-- Agregar campos a tabla customers para suspensiones y tracking
DO $$ 
BEGIN
  -- Campos de suspensión
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'suspension_start_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN suspension_start_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'suspension_end_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN suspension_end_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'is_suspended'
  ) THEN
    ALTER TABLE customers ADD COLUMN is_suspended boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'suspension_reason'
  ) THEN
    ALTER TABLE customers ADD COLUMN suspension_reason text;
  END IF;

  -- Campos de tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'last_signal_received'
  ) THEN
    ALTER TABLE customers ADD COLUMN last_signal_received timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE customers ADD COLUMN cancellation_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'cancellation_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN cancellation_date timestamptz;
  END IF;

  -- Campo de fecha de nacimiento si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN birth_date date;
  END IF;

  -- Campo de fecha de anualidad
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'annual_fee_due_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN annual_fee_due_date date;
  END IF;
END $$;

-- Tabla de plantillas de notificaciones
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('birthday', 'payment_reminder', 'service_completed', 'annual_fee_due', 'suspension_notice', 'custom')),
  subject text NOT NULL,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification templates"
  ON notification_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Tabla de configuración de notificaciones automáticas
CREATE TABLE IF NOT EXISTS notification_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL UNIQUE,
  is_enabled boolean DEFAULT true,
  trigger_condition jsonb NOT NULL,
  template_id uuid REFERENCES notification_templates(id) ON DELETE SET NULL,
  send_time time DEFAULT '09:00:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification config"
  ON notification_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Tabla de cola de notificaciones
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  template_id uuid REFERENCES notification_templates(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  body text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_for timestamptz DEFAULT now(),
  sent_at timestamptz,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification queue"
  ON notification_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'customer_service')
    )
  );

CREATE POLICY "System can manage notification queue"
  ON notification_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Tabla de historial de notificaciones enviadas
CREATE TABLE IF NOT EXISTS notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'bounced')),
  sent_at timestamptz DEFAULT now(),
  error_message text,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification history"
  ON notification_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'customer_service')
    )
  );

-- Tabla de observaciones de clientes
CREATE TABLE IF NOT EXISTS customer_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  observation_type text NOT NULL CHECK (observation_type IN ('general', 'technical', 'billing', 'service', 'complaint', 'other')),
  title text NOT NULL,
  description text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_visible_to_technicians boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view observations"
  ON customer_observations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and customer service can manage observations"
  ON customer_observations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'customer_service')
    )
  );

-- Tabla de historial de cambios de cuenta
CREATE TABLE IF NOT EXISTS customer_account_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('migration', 'status_change', 'plan_change', 'billing_change', 'suspension', 'reactivation', 'cancellation', 'other')),
  field_changed text,
  old_value text,
  new_value text,
  description text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_account_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view account history"
  ON customer_account_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage account history"
  ON customer_account_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_customer ON notification_queue(customer_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_customer ON notification_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_customer_observations_customer ON customer_observations(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_observations_type ON customer_observations(observation_type);
CREATE INDEX IF NOT EXISTS idx_customer_account_history_customer ON customer_account_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_account_history_created ON customer_account_history(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_suspension ON customers(is_suspended);
CREATE INDEX IF NOT EXISTS idx_customers_birth_date ON customers(birth_date);
CREATE INDEX IF NOT EXISTS idx_customers_annual_fee_due ON customers(annual_fee_due_date);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_config_updated_at ON notification_config;
CREATE TRIGGER update_notification_config_updated_at
  BEFORE UPDATE ON notification_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_observations_updated_at ON customer_observations;
CREATE TRIGGER update_customer_observations_updated_at
  BEFORE UPDATE ON customer_observations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar estado de suspensión automáticamente
CREATE OR REPLACE FUNCTION update_customer_suspension_status()
RETURNS void AS $$
BEGIN
  UPDATE customers
  SET is_suspended = false
  WHERE is_suspended = true
    AND suspension_end_date IS NOT NULL
    AND suspension_end_date < now();
END;
$$ LANGUAGE plpgsql;

-- Insertar plantillas de notificación por defecto
INSERT INTO notification_templates (name, type, subject, body, variables) VALUES
  (
    'Felicitación de Cumpleaños',
    'birthday',
    '¡Feliz Cumpleaños {{customer_name}}!',
    'Estimado/a {{customer_name}},

¡Desde todo el equipo de {{company_name}} queremos desearte un muy feliz cumpleaños!

Esperamos que tengas un día maravilloso rodeado de tus seres queridos.

Gracias por confiar en nuestros servicios.

Saludos cordiales,
Equipo de {{company_name}}',
    '["customer_name", "company_name"]'::jsonb
  ),
  (
    'Recordatorio de Pago',
    'payment_reminder',
    'Recordatorio de Pago Pendiente - Cuenta {{account_number}}',
    'Estimado/a {{customer_name}},

Le recordamos que tiene un saldo pendiente de ${{amount}} correspondiente a {{months_overdue}} mes(es) de servicio.

Número de Cuenta: {{account_number}}
Saldo Pendiente: ${{amount}}
Último Pago: {{last_payment_date}}

Por favor, regularice su situación para continuar disfrutando de nuestros servicios sin interrupciones.

Para realizar su pago, puede comunicarse con nosotros o visitar nuestras oficinas.

Atentamente,
Equipo de {{company_name}}',
    '["customer_name", "account_number", "amount", "months_overdue", "last_payment_date", "company_name"]'::jsonb
  ),
  (
    'Orden de Servicio Completada',
    'service_completed',
    'Servicio Completado - Orden #{{order_number}}',
    'Estimado/a {{customer_name}},

Le informamos que la orden de servicio #{{order_number}} ha sido completada exitosamente.

Detalles del Servicio:
- Técnico: {{technician_name}}
- Fecha: {{completion_date}}
- Descripción: {{service_description}}

{{#if materials_used}}
Materiales Utilizados: {{materials_used}}
{{/if}}

Gracias por su confianza.

Saludos,
Equipo de {{company_name}}',
    '["customer_name", "order_number", "technician_name", "completion_date", "service_description", "materials_used", "company_name"]'::jsonb
  ),
  (
    'Vencimiento de Anualidad',
    'annual_fee_due',
    'Renovación de Anualidad - Cuenta {{account_number}}',
    'Estimado/a {{customer_name}},

Le recordamos que su anualidad está próxima a vencer.

Número de Cuenta: {{account_number}}
Fecha de Vencimiento: {{due_date}}
Monto: ${{amount}}

Por favor, realice el pago correspondiente para mantener activo su servicio.

Puede realizar su pago en nuestras oficinas o contactarnos para más opciones.

Atentamente,
Equipo de {{company_name}}',
    '["customer_name", "account_number", "due_date", "amount", "company_name"]'::jsonb
  ),
  (
    'Aviso de Suspensión',
    'suspension_notice',
    'Aviso de Suspensión de Servicio - Cuenta {{account_number}}',
    'Estimado/a {{customer_name}},

Le informamos que su servicio ha sido suspendido.

Número de Cuenta: {{account_number}}
Fecha de Suspensión: {{suspension_date}}
Motivo: {{reason}}
{{#if end_date}}
Fecha de Reactivación: {{end_date}}
{{/if}}

Para más información, por favor contáctenos.

Atentamente,
Equipo de {{company_name}}',
    '["customer_name", "account_number", "suspension_date", "reason", "end_date", "company_name"]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- Insertar configuraciones de notificaciones automáticas
INSERT INTO notification_config (notification_type, is_enabled, trigger_condition, send_time)
SELECT 
  'birthday',
  true,
  '{"days_before": 0, "send_on_exact_date": true}'::jsonb,
  '09:00:00'
WHERE NOT EXISTS (SELECT 1 FROM notification_config WHERE notification_type = 'birthday');

INSERT INTO notification_config (notification_type, is_enabled, trigger_condition, send_time)
SELECT 
  'payment_reminder',
  true,
  '{"months_overdue": 2, "repeat_every_days": 15}'::jsonb,
  '10:00:00'
WHERE NOT EXISTS (SELECT 1 FROM notification_config WHERE notification_type = 'payment_reminder');

INSERT INTO notification_config (notification_type, is_enabled, trigger_condition, send_time)
SELECT 
  'annual_fee_due',
  true,
  '{"days_before": 30}'::jsonb,
  '09:00:00'
WHERE NOT EXISTS (SELECT 1 FROM notification_config WHERE notification_type = 'annual_fee_due');
