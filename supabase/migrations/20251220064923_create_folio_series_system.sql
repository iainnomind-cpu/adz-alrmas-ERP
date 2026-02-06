/*
  # Sistema de Series y Numeración Consecutiva para Órdenes de Servicio

  Este migración implementa un sistema completo de series y numeración consecutiva
  para las órdenes de servicio, permitiendo mantener folios únicos y consecutivos
  por serie/ubicación.

  ## 1. Nueva Tabla: folio_series
  
  Tabla principal que almacena las diferentes series de folios disponibles:
  - `id` (uuid): Identificador único de la serie
  - `series_code` (text): Código único de la serie (ej: "CTL-GDL", "SUC-MTY")
  - `series_name` (text): Nombre descriptivo de la serie
  - `prefix` (text): Prefijo que se usa en los folios generados
  - `current_number` (integer): Número consecutivo actual (se incrementa con cada folio)
  - `location_type` (text): Tipo de ubicación ('central', 'sucursal', 'area')
  - `is_active` (boolean): Indica si la serie está activa y puede usarse
  - `created_at` (timestamptz): Fecha de creación
  - `updated_at` (timestamptz): Fecha de última actualización

  ## 2. Modificaciones a service_orders
  
  Se agregan tres campos nuevos:
  - `folio_series_id` (uuid): Referencia a la serie utilizada
  - `folio_number` (integer): Número consecutivo asignado dentro de la serie
  - `full_folio` (text): Folio completo generado (ej: "SO-CTL-GDL-000001")

  ## 3. Índices para Optimización
  
  Se crean 6 índices para búsquedas rápidas:
  - Índice único en series_code
  - Índice parcial para series activas
  - Índice en location_type
  - Índice único en full_folio (para búsquedas de órdenes)
  - Índice compuesto único en (folio_series_id, folio_number)
  - Índice en folio_series_id para búsquedas por serie

  ## 4. Row Level Security (RLS)
  
  Políticas implementadas:
  - SELECT: Usuarios autenticados pueden ver todas las series activas
  - INSERT: Usuarios autenticados pueden crear nuevas series
  - UPDATE: Usuarios autenticados pueden actualizar series
  
  ## 5. Función generate_next_folio()
  
  Función auxiliar que genera el siguiente número de folio de forma atómica:
  - Usa FOR UPDATE para evitar condiciones de carrera
  - Valida que la serie esté activa
  - Incrementa el número consecutivo
  - Retorna el número asignado y el folio completo formateado
  
  ## 6. Datos de Ejemplo
  
  Se insertan 5 series de ejemplo para diferentes ubicaciones
*/

-- ============================================================================
-- 1. CREAR TABLA folio_series
-- ============================================================================

CREATE TABLE IF NOT EXISTS folio_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_code text UNIQUE NOT NULL,
  series_name text NOT NULL,
  prefix text NOT NULL,
  current_number integer NOT NULL DEFAULT 0,
  location_type text NOT NULL DEFAULT 'central',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Validaciones
  CONSTRAINT folio_series_location_type_check 
    CHECK (location_type IN ('central', 'sucursal', 'area')),
  CONSTRAINT folio_series_current_number_check 
    CHECK (current_number >= 0)
);

-- ============================================================================
-- 2. MODIFICAR TABLA service_orders
-- ============================================================================

-- Agregar columnas para el sistema de folios
DO $$
BEGIN
  -- folio_series_id: referencia a la serie utilizada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_orders' AND column_name = 'folio_series_id'
  ) THEN
    ALTER TABLE service_orders 
      ADD COLUMN folio_series_id uuid REFERENCES folio_series(id);
  END IF;

  -- folio_number: número consecutivo dentro de la serie
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_orders' AND column_name = 'folio_number'
  ) THEN
    ALTER TABLE service_orders 
      ADD COLUMN folio_number integer;
  END IF;

  -- full_folio: folio completo generado (ej: "SO-CTL-GDL-000001")
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_orders' AND column_name = 'full_folio'
  ) THEN
    ALTER TABLE service_orders 
      ADD COLUMN full_folio text;
  END IF;
END $$;

-- ============================================================================
-- 3. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================================

-- Índice único en series_code para búsquedas rápidas
CREATE UNIQUE INDEX IF NOT EXISTS idx_folio_series_code 
  ON folio_series(series_code);

-- Índice parcial para series activas (las más consultadas)
CREATE INDEX IF NOT EXISTS idx_folio_series_active 
  ON folio_series(is_active) 
  WHERE is_active = true;

-- Índice en location_type para filtros por ubicación
CREATE INDEX IF NOT EXISTS idx_folio_series_location_type 
  ON folio_series(location_type);

-- Índice único en full_folio para búsquedas rápidas de órdenes
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_orders_full_folio 
  ON service_orders(full_folio) 
  WHERE full_folio IS NOT NULL;

-- Índice compuesto único para garantizar que no se repitan números dentro de una serie
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_orders_series_number 
  ON service_orders(folio_series_id, folio_number) 
  WHERE folio_series_id IS NOT NULL AND folio_number IS NOT NULL;

-- Índice para búsquedas por serie
CREATE INDEX IF NOT EXISTS idx_service_orders_folio_series 
  ON service_orders(folio_series_id) 
  WHERE folio_series_id IS NOT NULL;

-- ============================================================================
-- 4. HABILITAR ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE folio_series ENABLE ROW LEVEL SECURITY;

-- Política de SELECT: Usuarios autenticados pueden ver todas las series
CREATE POLICY "Usuarios autenticados pueden ver series"
  ON folio_series
  FOR SELECT
  TO authenticated
  USING (true);

-- Política de INSERT: Usuarios autenticados pueden crear series
CREATE POLICY "Usuarios autenticados pueden crear series"
  ON folio_series
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política de UPDATE: Usuarios autenticados pueden actualizar series
CREATE POLICY "Usuarios autenticados pueden actualizar series"
  ON folio_series
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- NOTA: No se crea política de DELETE para mayor seguridad.
-- Las series con órdenes asociadas no deben eliminarse.
-- Si se requiere "eliminar" una serie, se debe desactivar (is_active = false).

-- ============================================================================
-- 5. FUNCIÓN PARA GENERAR SIGUIENTE FOLIO (ATÓMICA)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_next_folio(series_id uuid)
RETURNS TABLE(folio_number integer, full_folio text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_number integer;
  v_prefix text;
  v_full_folio text;
  v_is_active boolean;
BEGIN
  -- Bloquear la fila para actualización (evita condiciones de carrera)
  SELECT 
    fs.is_active, 
    fs.prefix, 
    fs.current_number + 1
  INTO 
    v_is_active, 
    v_prefix, 
    v_next_number
  FROM folio_series fs
  WHERE fs.id = series_id
  FOR UPDATE;

  -- Validar que la serie existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serie de folios no encontrada: %', series_id;
  END IF;

  -- Validar que la serie está activa
  IF NOT v_is_active THEN
    RAISE EXCEPTION 'La serie de folios está inactiva: %', series_id;
  END IF;

  -- Actualizar el número consecutivo en la serie
  UPDATE folio_series
  SET current_number = v_next_number,
      updated_at = now()
  WHERE id = series_id;

  -- Generar el folio completo formateado
  v_full_folio := v_prefix || '-' || LPAD(v_next_number::text, 6, '0');

  -- Retornar el número y el folio completo
  RETURN QUERY SELECT v_next_number, v_full_folio;
END;
$$;

-- ============================================================================
-- 6. TRIGGER PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_folio_series_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_folio_series_updated_at ON folio_series;

CREATE TRIGGER trigger_folio_series_updated_at
  BEFORE UPDATE ON folio_series
  FOR EACH ROW
  EXECUTE FUNCTION update_folio_series_updated_at();

-- ============================================================================
-- 7. INSERTAR DATOS DE EJEMPLO
-- ============================================================================

-- Insertar series de ejemplo para diferentes ubicaciones
INSERT INTO folio_series (series_code, series_name, prefix, current_number, location_type, is_active)
VALUES 
  ('CTL-GDL', 'Central Guadalajara', 'SO-CTL-GDL', 0, 'central', true),
  ('SUC-MTY', 'Sucursal Monterrey', 'SO-SUC-MTY', 0, 'sucursal', true),
  ('SUC-CDMX', 'Sucursal Ciudad de México', 'SO-SUC-CDMX', 0, 'sucursal', true),
  ('AREA-NORTE', 'Área Norte', 'SO-NORTE', 0, 'area', true),
  ('AREA-SUR', 'Área Sur', 'SO-SUR', 0, 'area', true)
ON CONFLICT (series_code) DO NOTHING;