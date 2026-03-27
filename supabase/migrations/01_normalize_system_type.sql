-- 01_normalize_system_type.sql
-- Solución definitiva para evitar errores de restricción (Check constraint violation)

-- 1. Eliminar cualquier constraint previo problemático
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_system_type_check;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS system_type_check_v2;

-- 2. Limpiar y normalizar todos los datos existentes agresivamente
UPDATE customers
SET system_type = 
  CASE 
    WHEN LOWER(TRIM(system_type)) = 'alarma' THEN 'alarma'
    WHEN LOWER(TRIM(system_type)) = 'cctv' THEN 'cctv'
    WHEN LOWER(TRIM(system_type)) LIKE '%acceso%' THEN 'control_acceso'
    WHEN LOWER(TRIM(system_type)) LIKE '%asistencia%' THEN 'control_asistencia'
    WHEN LOWER(TRIM(system_type)) LIKE '%video%portero%' THEN 'video_portero'
    WHEN LOWER(TRIM(system_type)) = 'red' THEN 'red'
    ELSE 'alarma'
  END
WHERE system_type IS NOT NULL;

-- Reemplazar nulos o vacíos
UPDATE customers SET system_type = 'alarma' WHERE system_type IS NULL OR TRIM(system_type) = '';

-- 3. Crear una función interceptora (Trigger)
-- Esta intercepta la inserción *ANTES* de la validación y transforma lo que sea
-- que mande el frontend hacia un valor perfecto, evitando errores catastróficos.
CREATE OR REPLACE FUNCTION enforce_system_type()
RETURNS trigger AS $$
BEGIN
  -- Si envían null o vacío, forzar alarma
  IF NEW.system_type IS NULL OR TRIM(NEW.system_type) = '' THEN
    NEW.system_type := 'alarma';
  ELSE
    NEW.system_type := LOWER(TRIM(NEW.system_type));
    
    -- Mapeo seguro
    IF NEW.system_type LIKE '%acceso%' THEN 
      NEW.system_type := 'control_acceso';
    ELSIF NEW.system_type LIKE '%asistencia%' THEN 
      NEW.system_type := 'control_asistencia';
    ELSIF NEW.system_type LIKE '%video%portero%' THEN 
      NEW.system_type := 'video_portero';
    ELSIF NEW.system_type NOT IN ('alarma', 'cctv', 'control_acceso', 'control_asistencia', 'video_portero', 'red') THEN
      NEW.system_type := 'alarma'; -- Fallback blindado
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Aplicar el interceptor (Trigger)
DROP TRIGGER IF EXISTS trg_enforce_system_type ON customers;
CREATE TRIGGER trg_enforce_system_type
BEFORE INSERT OR UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION enforce_system_type();

-- 5. Finalmente, añadir el constraint seguro
ALTER TABLE customers
ADD CONSTRAINT customers_system_type_check
CHECK (system_type IN (
  'alarma',
  'cctv',
  'control_acceso',
  'control_asistencia',
  'video_portero',
  'red'
));
