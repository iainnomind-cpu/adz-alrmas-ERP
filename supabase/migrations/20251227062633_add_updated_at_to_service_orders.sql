/*
  # Agregar columna updated_at a service_orders

  1. Cambios
    - Agregar columna `updated_at` a la tabla `service_orders`
    - Establecer valor por defecto a `now()`
    - Actualizar registros existentes con la fecha de creación como valor inicial

  2. Notas
    - Esta columna es necesaria para el seguimiento de actualizaciones en órdenes de servicio
    - Permite rastrear cambios en fechas programadas y otros campos
*/

-- Agregar columna updated_at si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_orders' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN updated_at timestamptz DEFAULT now();
    
    -- Actualizar registros existentes para que updated_at = created_at
    UPDATE service_orders SET updated_at = created_at WHERE updated_at IS NULL;
  END IF;
END $$;