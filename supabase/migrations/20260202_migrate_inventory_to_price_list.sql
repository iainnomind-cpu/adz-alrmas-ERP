-- =====================================================
-- MIGRACIÓN COMPLETA (V5): INVENTORY -> PRICE_LIST
-- Fecha: 2026-02-02
-- Descripción: Solución definitiva + PERMISOS (Fix 403 Forbidden).
-- =====================================================

-- 0. CORRECCIÓN DE ESTRUCTURA
CREATE TABLE IF NOT EXISTS price_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Asegurar columnas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='price_list' AND column_name='code') THEN
        ALTER TABLE price_list ADD COLUMN code text;
        ALTER TABLE price_list ADD CONSTRAINT price_list_code_unique UNIQUE (code);
    END IF;
END $$;

ALTER TABLE price_list ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS category text DEFAULT 'dispositivo';
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS currency text DEFAULT 'MXN';
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS base_price_mxn numeric(12, 2) DEFAULT 0;
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS cost_price_mxn numeric(12, 2);
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0;
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS min_stock_level integer DEFAULT 5;
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS exchange_rate numeric(8, 2) DEFAULT 21.00;
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS supplier_discount_percentage numeric(5, 2) DEFAULT 0;
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 1. SEGURIDAD (RLS) - FIX ERROR 403
-- Habilitar RLS
ALTER TABLE price_list ENABLE ROW LEVEL SECURITY;

-- Crear políticas (Policies)
-- Política de LECTURA: Permitir a todos (autenticados y anónimos) ver los precios
DROP POLICY IF EXISTS "Ver lista de precios" ON price_list;
CREATE POLICY "Ver lista de precios" ON price_list
  FOR SELECT USING (true);

-- Política de ESCRITURA: Permitir solo a usuarios autenticados gestión total
DROP POLICY IF EXISTS "Gestionar lista de precios" ON price_list;
CREATE POLICY "Gestionar lista de precios" ON price_list
  FOR ALL USING (auth.role() = 'authenticated');

-- 2. LIMPIEZA PREVIA (CRÍTICO)
-- Eliminar materiales zombies
DELETE FROM service_order_materials
WHERE inventory_item_id NOT IN (SELECT id FROM inventory_products);

-- Resolver conflictos de SKU
UPDATE inventory_products
SET sku = sku || '-OLD-' || substring(id::text, 1, 4)
WHERE sku IN (SELECT code FROM price_list)
AND id NOT IN (SELECT id FROM price_list);

-- 3. RESPALDO
CREATE TABLE IF NOT EXISTS inventory_products_backup AS SELECT * FROM inventory_products;

-- 4. MIGRAR DATOS
INSERT INTO price_list (
  id,
  code,
  name,
  description,
  brand,
  model,
  category,
  cost_price_mxn,
  base_price_mxn,
  stock_quantity,
  min_stock_level,
  is_active
)
SELECT
  ip.id,
  ip.sku,
  ip.name,
  ip.description,
  ip.brand,
  ip.model,
  CASE 
    WHEN ic.name ILIKE '%sensor%' THEN 'sensor'
    WHEN ic.name ILIKE '%contact%' THEN 'sensor'
    WHEN ic.name ILIKE '%panel%' THEN 'dispositivo'
    WHEN ic.name ILIKE '%teclado%' THEN 'dispositivo'
    WHEN ic.name ILIKE '%sirena%' THEN 'dispositivo'
    WHEN ic.name ILIKE '%bateria%' THEN 'accesorio'
    WHEN ic.name ILIKE '%cable%' THEN 'material'
    ELSE 'dispositivo'
  END,
  ip.unit_cost,
  ip.unit_cost,
  COALESCE(s.quantity_available, 0),
  COALESCE(ip.min_stock_level, 5),
  ip.is_active
FROM inventory_products ip
LEFT JOIN inventory_stock s ON s.product_id = ip.id
LEFT JOIN inventory_categories ic ON ip.category_id = ic.id
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  stock_quantity = EXCLUDED.stock_quantity,
  base_price_mxn = EXCLUDED.base_price_mxn;

-- 5. LIMPIEZA POST-MIGRACIÓN
DELETE FROM service_order_materials
WHERE inventory_item_id NOT IN (SELECT id FROM price_list);

-- 6. ACTUALIZAR CLAVES FORÁNEAS
ALTER TABLE service_order_materials 
  DROP CONSTRAINT IF EXISTS service_order_materials_inventory_item_id_fkey;

ALTER TABLE service_order_materials
  ADD CONSTRAINT service_order_materials_inventory_item_id_fkey
  FOREIGN KEY (inventory_item_id)
  REFERENCES price_list(id);

-- 7. CONFIRMACIÓN
DO $$
DECLARE
  count_new integer;
BEGIN
  SELECT count(*) INTO count_new FROM price_list;
  RAISE NOTICE 'Migración Exitosa + Permisos Corregidos. Total items: %', count_new;
END $$;
