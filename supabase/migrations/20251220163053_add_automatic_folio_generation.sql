/*
  # Sistema de Generación Automática de Folios para Órdenes de Servicio

  Esta migración implementa la generación automática de folios cuando se insertan
  nuevas órdenes de servicio.

  ## 1. Función: generate_service_order_folio
  
  Genera el siguiente folio de forma atómica y segura para concurrencia:
  - Usa FOR UPDATE para bloquear la fila y evitar condiciones de carrera
  - Valida que la serie esté activa
  - Incrementa el número consecutivo
  - Retorna: folio_number, full_folio, series_code
  - Formato de folio: [prefix]-[número con 6 dígitos] (ej: "SO-CTL-GDL-000001")

  ## 2. Función de Trigger: auto_generate_service_order_folio
  
  Se ejecuta automáticamente ANTES de insertar una nueva orden:
  - Si la orden tiene folio_series_id pero no tiene full_folio asignado
  - Llama a generate_service_order_folio para obtener el siguiente folio
  - Asigna automáticamente folio_number y full_folio a la nueva orden

  ## 3. Trigger: trigger_auto_generate_service_order_folio
  
  Trigger BEFORE INSERT que invoca la función de generación automática

  ## Seguridad en Concurrencia
  
  El uso de FOR UPDATE garantiza que múltiples inserciones simultáneas
  no generen folios duplicados, bloqueando la fila de la serie durante
  la actualización del número consecutivo.
*/

-- ============================================================================
-- 1. FUNCIÓN PARA GENERAR FOLIO (CON SERIES_CODE)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_service_order_folio(series_id uuid)
RETURNS TABLE(folio_number integer, full_folio text, series_code text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_number integer;
  v_prefix text;
  v_full_folio text;
  v_series_code text;
  v_is_active boolean;
BEGIN
  -- Bloquear la fila para actualización (evita condiciones de carrera)
  SELECT 
    fs.is_active, 
    fs.prefix,
    fs.series_code,
    fs.current_number + 1
  INTO 
    v_is_active, 
    v_prefix,
    v_series_code,
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

  -- Generar el folio completo formateado con 6 dígitos
  v_full_folio := v_prefix || '-' || LPAD(v_next_number::text, 6, '0');

  -- Retornar el número, el folio completo y el código de serie
  RETURN QUERY SELECT v_next_number, v_full_folio, v_series_code;
END;
$$;

-- ============================================================================
-- 2. FUNCIÓN DE TRIGGER PARA GENERACIÓN AUTOMÁTICA
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_generate_service_order_folio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_generated_folio record;
BEGIN
  -- Si se proporciona folio_series_id pero no hay folio asignado
  -- generar automáticamente el folio
  IF NEW.folio_series_id IS NOT NULL AND NEW.full_folio IS NULL THEN
    
    -- Llamar a la función para generar el siguiente folio
    SELECT * INTO v_generated_folio
    FROM generate_service_order_folio(NEW.folio_series_id);
    
    -- Asignar el folio generado a la nueva orden
    NEW.folio_number := v_generated_folio.folio_number;
    NEW.full_folio := v_generated_folio.full_folio;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. CREAR TRIGGER BEFORE INSERT
-- ============================================================================

-- Eliminar el trigger si ya existe
DROP TRIGGER IF EXISTS trigger_auto_generate_service_order_folio ON service_orders;

-- Crear el trigger que se ejecuta ANTES de insertar una nueva orden
CREATE TRIGGER trigger_auto_generate_service_order_folio
  BEFORE INSERT ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_service_order_folio();