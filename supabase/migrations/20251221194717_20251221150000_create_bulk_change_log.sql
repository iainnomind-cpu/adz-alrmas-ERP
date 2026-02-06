/*
  # Tabla de Auditoría para Cambios Masivos

  1. Nueva Tabla: bulk_change_log
    - Almacena registro de cambios masivos de eventos
    - Campos: id, action, event_ids, event_count, target_date, mode, created_at
    - Permite auditoría y trazabilidad de operaciones masivas

  2. Índices optimizados
    - Búsqueda por fecha de creación
    - Búsqueda por acción
    - Búsqueda por evento (para queries de historial)

  3. RLS habilitado
    - Políticas para usuarios autenticados lectura/escritura

  Notas:
    - La tabla almacena IDs de eventos para poder rastrear qué se movió
    - Útil para auditoría, debugging y recuperación de cambios
*/

CREATE TABLE IF NOT EXISTS bulk_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  event_ids text[] NOT NULL,
  event_count integer NOT NULL,
  target_date timestamptz NOT NULL,
  mode text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulk_change_log_created_at ON bulk_change_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_change_log_action ON bulk_change_log(action);
CREATE INDEX IF NOT EXISTS idx_bulk_change_log_target_date ON bulk_change_log(target_date);

ALTER TABLE bulk_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver cambios"
  ON bulk_change_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar cambios"
  ON bulk_change_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE bulk_change_log IS 'Auditoría de cambios masivos en eventos del calendario';
COMMENT ON COLUMN bulk_change_log.action IS 'Tipo de acción: reschedule, reassign, etc.';
COMMENT ON COLUMN bulk_change_log.mode IS 'Modo de aplicación: same-time, by-technician, distribute';
