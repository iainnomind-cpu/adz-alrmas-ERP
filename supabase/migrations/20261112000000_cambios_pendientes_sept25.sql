-- =====================================================================
-- Cambios pendientes (sesiones del 25 de septiembre de 2026)
-- Ejecutar completo en el Editor SQL de Supabase. Es idempotente:
-- se puede correr más de una vez sin duplicar ni romper nada.
-- No borra datos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CLIENTES: permitir los 9 tipos de sistema
--    Antes el trigger/constraint solo aceptaba 6 tipos. GPS Personal,
--    GPS Vehicular y Domótica se convertían en "alarma" (por eso no
--    aparecían en su módulo) o fallaban con "error al guardar".
-- ---------------------------------------------------------------------
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_system_type_check;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS system_type_check_v2;

CREATE OR REPLACE FUNCTION enforce_system_type()
RETURNS trigger AS $$
DECLARE
  v text;
BEGIN
  IF NEW.system_type IS NULL OR TRIM(NEW.system_type) = '' THEN
    NEW.system_type := 'alarma';
    RETURN NEW;
  END IF;

  v := LOWER(TRIM(NEW.system_type));
  v := REPLACE(v, 'ó', 'o');

  IF v LIKE '%acceso%' THEN
    NEW.system_type := 'control_acceso';
  ELSIF v LIKE '%asistencia%' THEN
    NEW.system_type := 'control_asistencia';
  ELSIF v LIKE '%video%portero%' OR v IN ('videoportero', 'vp') THEN
    NEW.system_type := 'video_portero';
  ELSIF v LIKE '%gps%vehic%' OR v = 'gps_v' THEN
    NEW.system_type := 'gps_vehicular';
  ELSIF v LIKE '%gps%pers%' OR v = 'gps_p' THEN
    NEW.system_type := 'gps_personal';
  ELSIF v LIKE '%domotica%' THEN
    NEW.system_type := 'domotica';
  ELSIF v IN ('red', 'redes') THEN
    NEW.system_type := 'red';
  ELSIF v = 'cctv' THEN
    NEW.system_type := 'cctv';
  ELSE
    NEW.system_type := 'alarma';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_system_type ON customers;
CREATE TRIGGER trg_enforce_system_type
BEFORE INSERT OR UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION enforce_system_type();

-- Normaliza valores antiguos ("Alarma", "Control de Acceso", etc.) pasando por el trigger
UPDATE customers SET system_type = system_type
WHERE system_type IS NULL
   OR system_type NOT IN ('alarma', 'cctv', 'control_acceso', 'control_asistencia', 'domotica',
                          'gps_personal', 'gps_vehicular', 'red', 'video_portero');

ALTER TABLE customers
ADD CONSTRAINT customers_system_type_check
CHECK (system_type IN (
  'alarma', 'cctv', 'control_acceso', 'control_asistencia', 'domotica',
  'gps_personal', 'gps_vehicular', 'red', 'video_portero'
));

-- El formulario guarda "Normal", "Maestra", "Consolidada", "Demo", "Gratis".
-- Este constraint antiguo solo aceptaba valores en inglés.
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_account_type_check;

-- Columnas que usa el formulario de clientes (varias migraciones anteriores
-- se guardaron con codificación UTF-16 y pudieron no aplicarse).
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS cfdi text,
  ADD COLUMN IF NOT EXISTS resumption_date text,
  ADD COLUMN IF NOT EXISTS annuity_month integer,
  ADD COLUMN IF NOT EXISTS dvr_channels integer,
  ADD COLUMN IF NOT EXISTS cameras_details jsonb,
  ADD COLUMN IF NOT EXISTS access_control_details jsonb,
  ADD COLUMN IF NOT EXISTS attendance_control_details jsonb,
  ADD COLUMN IF NOT EXISTS gps_personal_details jsonb,
  ADD COLUMN IF NOT EXISTS gps_vehicular_details jsonb,
  ADD COLUMN IF NOT EXISTS red_details jsonb,
  ADD COLUMN IF NOT EXISTS video_portero_details jsonb;

-- Políticas RLS de clientes (SELECT, INSERT, UPDATE, DELETE)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select_authenticated" ON customers;
CREATE POLICY "customers_select_authenticated" ON customers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "customers_insert_authenticated" ON customers;
CREATE POLICY "customers_insert_authenticated" ON customers
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "customers_update_authenticated" ON customers;
CREATE POLICY "customers_update_authenticated" ON customers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "customers_delete_authenticated" ON customers;
CREATE POLICY "customers_delete_authenticated" ON customers
  FOR DELETE TO authenticated USING (true);

-- DIAGNÓSTICO (solo lectura): clientes que quedaron como "alarma" pero cuyo
-- número de cuenta está en el rango de otro módulo. Revisar con Jorge antes
-- de corregirlos a mano.
--   SELECT id, name, account_number, system_type FROM customers
--   WHERE system_type = 'alarma' AND account_number >= 50000
--   ORDER BY account_number;

-- ---------------------------------------------------------------------
-- 2. CALENDARIO: error al asignar técnico / guardar cambios
--    calendar_concepts.assigned_to apuntaba a auth.users, pero la app
--    guarda ahí el id de la tabla technicians. Si el técnico no tiene
--    el mismo id que su usuario, el guardado fallaba por clave foránea.
-- ---------------------------------------------------------------------
ALTER TABLE calendar_concepts DROP CONSTRAINT IF EXISTS calendar_concepts_assigned_to_fkey;

DROP POLICY IF EXISTS "calendar_concepts_insert_authenticated" ON calendar_concepts;
CREATE POLICY "calendar_concepts_insert_authenticated" ON calendar_concepts
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "calendar_concepts_update_authenticated" ON calendar_concepts;
CREATE POLICY "calendar_concepts_update_authenticated" ON calendar_concepts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "calendar_concepts_delete_authenticated" ON calendar_concepts;
CREATE POLICY "calendar_concepts_delete_authenticated" ON calendar_concepts
  FOR DELETE TO authenticated USING (true);

-- La migración 07 reemplazó la política general de service_orders por una
-- solo de lectura. Sin política de UPDATE, los cambios desde el calendario
-- no se guardan.
DROP POLICY IF EXISTS "service_orders_insert_authenticated" ON service_orders;
CREATE POLICY "service_orders_insert_authenticated" ON service_orders
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "service_orders_update_authenticated" ON service_orders;
CREATE POLICY "service_orders_update_authenticated" ON service_orders
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_orders_delete_authenticated" ON service_orders;
CREATE POLICY "service_orders_delete_authenticated" ON service_orders
  FOR DELETE TO authenticated USING (true);

ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS travel_zone text;

-- ---------------------------------------------------------------------
-- 3. UBICACIONES / ALMACENES
-- ---------------------------------------------------------------------
ALTER TABLE inventory_locations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE inventory_locations ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE inventory_locations ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_locations_select_authenticated" ON inventory_locations;
CREATE POLICY "inventory_locations_select_authenticated" ON inventory_locations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "inventory_locations_insert_authenticated" ON inventory_locations;
CREATE POLICY "inventory_locations_insert_authenticated" ON inventory_locations
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_locations_update_authenticated" ON inventory_locations;
CREATE POLICY "inventory_locations_update_authenticated" ON inventory_locations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_locations_delete_authenticated" ON inventory_locations;
CREATE POLICY "inventory_locations_delete_authenticated" ON inventory_locations
  FOR DELETE TO authenticated USING (true);

-- ---------------------------------------------------------------------
-- 4. PLANES DE MONITOREO (leyenda de colores y formulario de clientes)
--    Ramos puede agregar o desactivar planes directamente en esta tabla.
--    (Tabla nueva: monitoring_plans ya existe como catálogo de suscripciones
--    con otras columnas y no se modifica.)
--    Colores disponibles: orange, blue, rose, cyan, violet, teal, lime,
--    fuchsia, amber, green, red, gray.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_plan_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT 'gray',
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_plan_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_plan_options_select_authenticated" ON customer_plan_options;
CREATE POLICY "customer_plan_options_select_authenticated" ON customer_plan_options
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "customer_plan_options_manage_authenticated" ON customer_plan_options;
CREATE POLICY "customer_plan_options_manage_authenticated" ON customer_plan_options
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO customer_plan_options (name, color, sort_order) VALUES
  ('Clásico', 'orange', 1),
  ('Plus', 'blue', 2),
  ('Plus con 15', 'cyan', 3),
  ('Plus con 20', 'violet', 4),
  ('Medical', 'rose', 5),
  ('App', 'teal', 6),
  ('GPS', 'lime', 7),
  ('Driver', 'fuchsia', 8)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. TASA DE IVA CONFIGURABLE
--    Se edita en Configuración → Sistema. Valor en porcentaje (16 = 16%).
-- ---------------------------------------------------------------------
INSERT INTO system_settings (setting_key, setting_value, description, category)
VALUES ('iva_rate', '16'::jsonb, 'Tasa de IVA en porcentaje (16 = 16%). Se usa en todos los cálculos.', 'facturacion')
ON CONFLICT (setting_key) DO NOTHING;

-- ---------------------------------------------------------------------
-- 6. PRODUCTOS: IVA en 0% en productos que sí causan IVA
-- ---------------------------------------------------------------------
UPDATE price_list
SET tax_rate = 16
WHERE has_tax = true AND (tax_rate IS NULL OR tax_rate = 0);
