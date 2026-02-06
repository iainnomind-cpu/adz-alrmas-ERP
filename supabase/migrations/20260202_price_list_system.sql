-- =====================================================
-- SISTEMA DE GESTIÓN DE LISTA DE PRECIOS
-- Fecha: 2026-02-02
-- Descripción: Tabla para gestión de precios con soporte USD/MXN,
--              niveles de descuento y control de inventario
-- =====================================================

-- 1. CREAR TABLA PRINCIPAL price_list
CREATE TABLE IF NOT EXISTS price_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  brand text,
  model text,
  
  -- Categoría (dispositivo, sensor, accesorio, material, servicio, mano_obra)
  category text NOT NULL DEFAULT 'dispositivo',
  CONSTRAINT price_list_category_check 
    CHECK (category IN ('dispositivo', 'sensor', 'accesorio', 'material', 'servicio', 'mano_obra')),
  
  -- Clasificación técnica
  technology text DEFAULT 'n/a',
  CONSTRAINT price_list_technology_check 
    CHECK (technology IN ('cableado', 'inalambrico', 'dual', 'n/a')),
  
  battery_type text DEFAULT 'n/a',
  CONSTRAINT price_list_battery_type_check 
    CHECK (battery_type IN ('recargable', 'litio', 'alkalina', 'n/a')),
  
  -- Moneda
  currency text NOT NULL DEFAULT 'MXN',
  CONSTRAINT price_list_currency_check 
    CHECK (currency IN ('USD', 'MXN')),
  
  -- Precios
  cost_price_usd numeric(12, 2),
  cost_price_mxn numeric(12, 2),
  supplier_list_price numeric(12, 2),
  supplier_discount_percentage numeric(5, 2) NOT NULL DEFAULT 0,
  
  -- Factor de conversión
  exchange_rate numeric(8, 2) NOT NULL DEFAULT 21.00,
  
  -- Precio base calculado en MXN
  base_price_mxn numeric(12, 2) NOT NULL DEFAULT 0,
  
  -- 5 niveles de descuento para clientes (0-30%)
  discount_tier_1 numeric(5, 2) NOT NULL DEFAULT 10,
  discount_tier_2 numeric(5, 2) NOT NULL DEFAULT 15,
  discount_tier_3 numeric(5, 2) NOT NULL DEFAULT 20,
  discount_tier_4 numeric(5, 2) NOT NULL DEFAULT 25,
  discount_tier_5 numeric(5, 2) NOT NULL DEFAULT 30,
  
  CONSTRAINT price_list_discount_tier_1_check CHECK (discount_tier_1 >= 0 AND discount_tier_1 <= 30),
  CONSTRAINT price_list_discount_tier_2_check CHECK (discount_tier_2 >= 0 AND discount_tier_2 <= 30),
  CONSTRAINT price_list_discount_tier_3_check CHECK (discount_tier_3 >= 0 AND discount_tier_3 <= 30),
  CONSTRAINT price_list_discount_tier_4_check CHECK (discount_tier_4 >= 0 AND discount_tier_4 <= 30),
  CONSTRAINT price_list_discount_tier_5_check CHECK (discount_tier_5 >= 0 AND discount_tier_5 <= 30),
  
  -- Control
  is_active boolean NOT NULL DEFAULT true,
  is_kit boolean NOT NULL DEFAULT false,
  stock_quantity integer NOT NULL DEFAULT 0,
  min_stock_level integer NOT NULL DEFAULT 5,
  
  -- Notas
  supplier_notes text,
  internal_notes text,
  
  -- Auditoría
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  
  -- Restricción: kits no permitidos
  CONSTRAINT price_list_no_kits CHECK (is_kit = false)
);

-- 2. CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_price_list_code ON price_list(code);
CREATE INDEX IF NOT EXISTS idx_price_list_category ON price_list(category);
CREATE INDEX IF NOT EXISTS idx_price_list_currency ON price_list(currency);
CREATE INDEX IF NOT EXISTS idx_price_list_is_active ON price_list(is_active);
CREATE INDEX IF NOT EXISTS idx_price_list_name ON price_list(name);
CREATE INDEX IF NOT EXISTS idx_price_list_brand ON price_list(brand);
CREATE INDEX IF NOT EXISTS idx_price_list_model ON price_list(model);
CREATE INDEX IF NOT EXISTS idx_price_list_technology ON price_list(technology);

-- 3. TRIGGER PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_price_list_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_price_list_updated_at ON price_list;
CREATE TRIGGER trigger_price_list_updated_at
  BEFORE UPDATE ON price_list
  FOR EACH ROW
  EXECUTE FUNCTION update_price_list_updated_at();

-- 4. TRIGGER PARA CALCULAR base_price_mxn AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION calculate_base_price_mxn()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el precio es en USD, convertir a MXN
  IF NEW.currency = 'USD' THEN
    -- cost_price_usd ya tiene el descuento del proveedor aplicado
    IF NEW.cost_price_usd IS NOT NULL THEN
      NEW.base_price_mxn = NEW.cost_price_usd * NEW.exchange_rate;
    ELSE
      NEW.base_price_mxn = 0;
    END IF;
  ELSE
    -- Si es MXN, usar directamente cost_price_mxn
    IF NEW.cost_price_mxn IS NOT NULL THEN
      NEW.base_price_mxn = NEW.cost_price_mxn;
    ELSE
      NEW.base_price_mxn = 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_base_price ON price_list;
CREATE TRIGGER trigger_calculate_base_price
  BEFORE INSERT OR UPDATE ON price_list
  FOR EACH ROW
  EXECUTE FUNCTION calculate_base_price_mxn();

-- 5. FUNCIÓN PARA CALCULAR PRECIO FINAL CON DESCUENTO
CREATE OR REPLACE FUNCTION calculate_final_price(
  item_id uuid,
  discount_percentage numeric DEFAULT 0
)
RETURNS numeric AS $$
DECLARE
  base_price numeric;
  final_price numeric;
BEGIN
  -- Obtener precio base
  SELECT base_price_mxn INTO base_price
  FROM price_list
  WHERE id = item_id AND is_active = true;
  
  IF base_price IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Validar descuento máximo 30%
  IF discount_percentage > 30 THEN
    discount_percentage := 30;
  END IF;
  
  IF discount_percentage < 0 THEN
    discount_percentage := 0;
  END IF;
  
  -- Calcular precio final
  final_price := base_price * (1 - (discount_percentage / 100));
  
  RETURN ROUND(final_price, 2);
END;
$$ LANGUAGE plpgsql;

-- 6. TABLA PARA HISTORIAL DE CAMBIOS DE PRECIO
CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid NOT NULL REFERENCES price_list(id) ON DELETE CASCADE,
  
  -- Precios anteriores
  old_cost_price_usd numeric(12, 2),
  old_cost_price_mxn numeric(12, 2),
  old_base_price_mxn numeric(12, 2),
  old_exchange_rate numeric(8, 2),
  
  -- Precios nuevos
  new_cost_price_usd numeric(12, 2),
  new_cost_price_mxn numeric(12, 2),
  new_base_price_mxn numeric(12, 2),
  new_exchange_rate numeric(8, 2),
  
  -- Metadata
  change_reason text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_price_history_price_list_id ON price_history(price_list_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON price_history(changed_at);

-- 7. TRIGGER PARA REGISTRAR HISTORIAL DE CAMBIOS DE PRECIO
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo registrar si hubo cambio en precios
  IF (OLD.cost_price_usd IS DISTINCT FROM NEW.cost_price_usd) OR
     (OLD.cost_price_mxn IS DISTINCT FROM NEW.cost_price_mxn) OR
     (OLD.exchange_rate IS DISTINCT FROM NEW.exchange_rate) THEN
    
    INSERT INTO price_history (
      price_list_id,
      old_cost_price_usd, old_cost_price_mxn, old_base_price_mxn, old_exchange_rate,
      new_cost_price_usd, new_cost_price_mxn, new_base_price_mxn, new_exchange_rate,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.cost_price_usd, OLD.cost_price_mxn, OLD.base_price_mxn, OLD.exchange_rate,
      NEW.cost_price_usd, NEW.cost_price_mxn, NEW.base_price_mxn, NEW.exchange_rate,
      NEW.updated_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_price_change ON price_list;
CREATE TRIGGER trigger_log_price_change
  AFTER UPDATE ON price_list
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();

-- 8. HABILITAR RLS
ALTER TABLE price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Políticas para price_list
DROP POLICY IF EXISTS "Allow authenticated users to read price_list" ON price_list;
CREATE POLICY "Allow authenticated users to read price_list"
  ON price_list FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert price_list" ON price_list;
CREATE POLICY "Allow authenticated users to insert price_list"
  ON price_list FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update price_list" ON price_list;
CREATE POLICY "Allow authenticated users to update price_list"
  ON price_list FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete price_list" ON price_list;
CREATE POLICY "Allow authenticated users to delete price_list"
  ON price_list FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para price_history
DROP POLICY IF EXISTS "Allow authenticated users to read price_history" ON price_history;
CREATE POLICY "Allow authenticated users to read price_history"
  ON price_history FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert price_history" ON price_history;
CREATE POLICY "Allow authenticated users to insert price_history"
  ON price_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 9. VISTA PARA ITEMS CON STOCK BAJO
CREATE OR REPLACE VIEW price_list_low_stock AS
SELECT 
  id,
  code,
  name,
  category,
  stock_quantity,
  min_stock_level,
  (min_stock_level - stock_quantity) as units_needed
FROM price_list
WHERE is_active = true
  AND category IN ('dispositivo', 'sensor', 'accesorio', 'material')
  AND stock_quantity < min_stock_level
ORDER BY (min_stock_level - stock_quantity) DESC;

-- 10. COMENTARIOS EN TABLAS
COMMENT ON TABLE price_list IS 'Lista de precios de productos con soporte USD/MXN y niveles de descuento';
COMMENT ON TABLE price_history IS 'Historial de cambios de precio para auditoría';
COMMENT ON COLUMN price_list.exchange_rate IS 'Tipo de cambio fijo para conversión USD a MXN, default 21.00';
COMMENT ON COLUMN price_list.base_price_mxn IS 'Precio base calculado en MXN (automático según moneda)';
COMMENT ON COLUMN price_list.is_kit IS 'Siempre false - kits no están permitidos en este sistema';
