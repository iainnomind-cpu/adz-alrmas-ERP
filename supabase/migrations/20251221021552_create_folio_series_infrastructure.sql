/*
  # Sistema de Series de Folios para Órdenes de Servicio

  1. Nueva Tabla: folio_series
    - Almacena las series de folios disponibles
    - Campos: id, series_name, series_code, document_type, next_number, is_active, description
    - Índices optimizados para consultas frecuentes
    - Trigger para actualización automática de timestamps
    
  2. Modificaciones a service_orders
    - folio_series_id: Referencia a la serie asignada
    - folio_number: Número consecutivo dentro de la serie
    - full_folio: Folio completo generado (formato: CODE-NNNNNN)
    - Constraint de unicidad para full_folio
    
  3. Series Insertadas
    - Central Guzmán (SO-CTL-GZM): Serie principal
    - Sucursal Guzmán (SO-SUC-GZM): Serie para sucursales
    - Área Técnica (SO-TEC): Serie para área técnica
    
  4. Seguridad
    - RLS habilitado en folio_series
    - Políticas para usuarios autenticados
    
  Notas:
    - No se crean órdenes de ejemplo debido a constraint NOT NULL en technician_id
    - Sistema listo para asignar folios cuando se creen órdenes reales
*/

-- ====================
-- 1. CREAR TABLA folio_series
-- ====================

CREATE TABLE IF NOT EXISTS folio_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_name text NOT NULL,
  series_code text UNIQUE NOT NULL,
  document_type text NOT NULL DEFAULT 'service_order',
  next_number integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT check_next_number_positive CHECK (next_number > 0)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_folio_series_code ON folio_series(series_code);
CREATE INDEX IF NOT EXISTS idx_folio_series_active ON folio_series(is_active);
CREATE INDEX IF NOT EXISTS idx_folio_series_document_type ON folio_series(document_type);

-- Comentarios de documentación
COMMENT ON TABLE folio_series IS 'Series de folios para numeración consecutiva de documentos';
COMMENT ON COLUMN folio_series.series_code IS 'Código único de la serie (ej: SO-CTL-GZM)';
COMMENT ON COLUMN folio_series.next_number IS 'Próximo número consecutivo a asignar';
COMMENT ON COLUMN folio_series.is_active IS 'Indica si la serie está activa y puede asignar nuevos folios';

-- ====================
-- 2. TRIGGER PARA ACTUALIZACIÓN AUTOMÁTICA
-- ====================

CREATE OR REPLACE FUNCTION update_folio_series_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_folio_series_updated_at
  BEFORE UPDATE ON folio_series
  FOR EACH ROW
  EXECUTE FUNCTION update_folio_series_updated_at();

-- ====================
-- 3. ROW LEVEL SECURITY
-- ====================

ALTER TABLE folio_series ENABLE ROW LEVEL SECURITY;

-- Política de lectura: usuarios autenticados pueden ver series activas
CREATE POLICY "Usuarios autenticados pueden ver series activas"
  ON folio_series FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Política de inserción: usuarios autenticados pueden crear series
CREATE POLICY "Usuarios autenticados pueden insertar series"
  ON folio_series FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política de actualización: usuarios autenticados pueden actualizar series
CREATE POLICY "Usuarios autenticados pueden actualizar series"
  ON folio_series FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ====================
-- 4. AGREGAR COLUMNAS A service_orders
-- ====================

-- Agregar columnas para el sistema de folios
ALTER TABLE service_orders 
  ADD COLUMN IF NOT EXISTS folio_series_id uuid;

ALTER TABLE service_orders 
  ADD COLUMN IF NOT EXISTS folio_number integer;

ALTER TABLE service_orders 
  ADD COLUMN IF NOT EXISTS full_folio text;

-- Comentarios de documentación
COMMENT ON COLUMN service_orders.folio_series_id IS 'Referencia a la serie de folio asignada';
COMMENT ON COLUMN service_orders.folio_number IS 'Número consecutivo dentro de la serie';
COMMENT ON COLUMN service_orders.full_folio IS 'Folio completo generado (ej: SO-CTL-GZM-000001)';

-- ====================
-- 5. CONSTRAINTS Y FOREIGN KEYS
-- ====================

-- Foreign key hacia folio_series
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_service_orders_folio_series'
  ) THEN
    ALTER TABLE service_orders
      ADD CONSTRAINT fk_service_orders_folio_series
      FOREIGN KEY (folio_series_id)
      REFERENCES folio_series(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Constraint de unicidad para full_folio
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_full_folio'
  ) THEN
    ALTER TABLE service_orders
      ADD CONSTRAINT unique_full_folio
      UNIQUE (full_folio);
  END IF;
END $$;

-- ====================
-- 6. ÍNDICES EN service_orders
-- ====================

CREATE INDEX IF NOT EXISTS idx_service_orders_folio_series 
  ON service_orders(folio_series_id);

CREATE INDEX IF NOT EXISTS idx_service_orders_full_folio 
  ON service_orders(full_folio);

CREATE INDEX IF NOT EXISTS idx_service_orders_folio_number 
  ON service_orders(folio_number);

-- ====================
-- 7. INSERTAR LAS 3 SERIES DE FOLIOS
-- ====================

INSERT INTO folio_series (series_name, series_code, document_type, next_number, is_active, description)
VALUES 
  (
    'Central Guzmán',
    'SO-CTL-GZM',
    'service_order',
    1,
    true,
    'Serie principal para órdenes de servicio de la Central Guzmán. Utilizada para el flujo estándar de órdenes generadas desde la oficina central.'
  ),
  (
    'Sucursal Guzmán',
    'SO-SUC-GZM',
    'service_order',
    1,
    true,
    'Serie específica para órdenes de servicio generadas en las sucursales de Guzmán. Permite diferenciar y rastrear órdenes por ubicación.'
  ),
  (
    'Área Técnica',
    'SO-TEC',
    'service_order',
    1,
    true,
    'Serie dedicada para órdenes de servicio del área técnica especializada. Utilizada para servicios de alta complejidad o mantenimientos especializados.'
  )
ON CONFLICT (series_code) DO NOTHING;
