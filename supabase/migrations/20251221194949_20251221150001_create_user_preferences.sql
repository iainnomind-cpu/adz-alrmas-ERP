/*
  # Tabla de Preferencias de Usuario para Calendario

  1. Nueva Tabla: user_preferences
    - Almacena configuración personalizada por usuario
    - Campos: user_id, visible_fields, active_filters, saved_views, color_scheme, theme

  2. Columnas principales
    - user_id: Referencia al usuario autenticado
    - visible_fields: JSON con campos visibles en eventos
    - active_filters: JSON con filtros activos
    - saved_views: JSON con vistas guardadas
    - color_scheme: JSON con colores personalizados
    - theme: dark/light
    - updated_at: Timestamp de última actualización

  3. RLS habilitado
    - Usuarios solo ven sus propias preferencias
    - Usuarios solo pueden modificar las suyas

  Notas:
    - JSON permite flexibilidad para futuras expansiones
    - Índice en user_id para búsquedas rápidas
    - Default values para preferencias estándar
*/

CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  visible_fields jsonb DEFAULT '{
    "startTime": true,
    "endTime": true,
    "technicianName": true,
    "customerName": true,
    "estimatedAmount": false,
    "materials": false,
    "customerAcceptance": false,
    "paymentStatus": false,
    "address": false,
    "internalNotes": false
  }'::jsonb,
  active_filters jsonb DEFAULT '{
    "technicians": [],
    "serviceTypes": [],
    "statuses": [],
    "priorities": [],
    "customers": [],
    "priceRange": [0, 999999]
  }'::jsonb,
  saved_views jsonb DEFAULT '[]'::jsonb,
  color_scheme jsonb DEFAULT '{
    "critical": "#DC2626",
    "urgent": "#F97316",
    "high": "#EAB308",
    "medium": "#3B82F6",
    "low": "#10B981"
  }'::jsonb,
  theme text DEFAULT 'light',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propias preferencias"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus propias preferencias"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios insertan sus propias preferencias"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE user_preferences IS 'Preferencias de visualización y filtros del usuario para el calendario';
COMMENT ON COLUMN user_preferences.visible_fields IS 'JSON con campos que el usuario desea ver en los eventos';
COMMENT ON COLUMN user_preferences.active_filters IS 'JSON con filtros activos del usuario';
COMMENT ON COLUMN user_preferences.saved_views IS 'JSON con vistas guardadas (nombre + filtros)';
COMMENT ON COLUMN user_preferences.color_scheme IS 'JSON con colores personalizados por prioridad';
