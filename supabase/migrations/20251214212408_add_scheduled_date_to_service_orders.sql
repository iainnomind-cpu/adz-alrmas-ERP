/*
  # Agregar campo scheduled_date a service_orders

  1. Cambios en la tabla service_orders
    - Agregar columna `scheduled_date` (timestamptz, nullable)
    - Agregar índice para búsquedas por fecha programada
  
  2. Notas
    - El campo es nullable para compatibilidad con registros existentes
    - Se usa para la funcionalidad de calendario drag & drop
    - Permite programar órdenes de servicio en fechas futuras
*/

-- Agregar columna scheduled_date si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_orders' AND column_name = 'scheduled_date'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN scheduled_date timestamptz;
  END IF;
END $$;

-- Agregar índice para scheduled_date
CREATE INDEX IF NOT EXISTS idx_service_orders_scheduled_date 
ON service_orders(scheduled_date) 
WHERE scheduled_date IS NOT NULL;

-- Comentario en la columna
COMMENT ON COLUMN service_orders.scheduled_date IS 'Fecha y hora programada para realizar el servicio (usado en calendario)';
