/*
  # Tabla de Conceptos para Calendario

  1. Nueva Tabla: calendar_concepts
    - Almacena conceptos sin programar (citas, cotizaciones, visitas)
    - Los usuarios pueden arrastrarlos al calendario para programarlos
    - Se convierten en eventos cuando se programan

  2. Columnas principales
    - id: UUID único
    - concept_type: 'appointment' | 'quote' | 'visit' | 'consultation' | 'follow_up'
    - title: Título del concepto
    - description: Descripción detallada
    - duration_minutes: Duración estimada en minutos (default 60)
    - customer_id: Cliente asociado (opcional)
    - assigned_to: Usuario/técnico preferido (opcional)
    - estimated_amount: Importe estimado
    - priority: Prioridad del concepto
    - notes: Notas adicionales
    - is_scheduled: Si ya está programado en calendario
    - scheduled_date: Fecha y hora programada
    - service_order_id: Si se convirtió en orden de servicio
    - created_by: Usuario que creó el concepto
    - created_at: Fecha de creación
    - updated_at: Fecha de actualización

  3. RLS habilitado
    - Usuarios autenticados pueden ver todos los conceptos
    - Usuarios autenticados pueden crear conceptos
    - Usuarios autenticados pueden actualizar conceptos
    - Usuarios autenticados pueden eliminar sus propios conceptos

  Notas:
    - Los conceptos sin programar aparecen en un sidebar
    - Se pueden arrastrar al calendario para programarlos
    - Una vez programados, is_scheduled = true y se crea un evento
*/

CREATE TABLE IF NOT EXISTS calendar_concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_type text NOT NULL CHECK (concept_type IN ('appointment', 'quote', 'visit', 'consultation', 'follow_up')),
  title text NOT NULL,
  description text,
  duration_minutes integer DEFAULT 60 NOT NULL CHECK (duration_minutes > 0),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  estimated_amount decimal(10,2) DEFAULT 0,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'critical')),
  notes text,
  is_scheduled boolean DEFAULT false,
  scheduled_date timestamptz,
  service_order_id uuid REFERENCES service_orders(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concepts_is_scheduled ON calendar_concepts(is_scheduled);
CREATE INDEX IF NOT EXISTS idx_concepts_customer_id ON calendar_concepts(customer_id);
CREATE INDEX IF NOT EXISTS idx_concepts_assigned_to ON calendar_concepts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_concepts_created_by ON calendar_concepts(created_by);
CREATE INDEX IF NOT EXISTS idx_concepts_scheduled_date ON calendar_concepts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_concepts_type ON calendar_concepts(concept_type);

ALTER TABLE calendar_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver conceptos"
  ON calendar_concepts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear conceptos"
  ON calendar_concepts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Usuarios autenticados pueden actualizar conceptos"
  ON calendar_concepts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden eliminar sus propios conceptos"
  ON calendar_concepts FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

COMMENT ON TABLE calendar_concepts IS 'Conceptos sin programar que se pueden arrastrar al calendario';
COMMENT ON COLUMN calendar_concepts.concept_type IS 'Tipo de concepto: cita, cotización, visita, consulta, seguimiento';
COMMENT ON COLUMN calendar_concepts.duration_minutes IS 'Duración estimada del concepto en minutos';
COMMENT ON COLUMN calendar_concepts.is_scheduled IS 'Indica si el concepto ya está programado en el calendario';
COMMENT ON COLUMN calendar_concepts.scheduled_date IS 'Fecha y hora cuando fue programado en el calendario';
