/*
  Multi-Location Inventory System
  ================================
  Adds location-based stock tracking to the existing inventory.
  
  New tables:
    - inventory_locations: Physical locations (warehouse, vehicles, partner)
    - inventory_location_stock: Stock per product per location
  
  Modified tables:
    - inventory_transactions: Added from_location_id, to_location_id, performed_by
  
  New trigger:
    - update_location_stock: Auto-updates location stock on transaction insert
*/

-- =====================================================
-- 1. INVENTORY LOCATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'warehouse', -- warehouse, vehicle, partner, personal
  description text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- for vehicles: which technician
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver ubicaciones" ON inventory_locations;
CREATE POLICY "Ver ubicaciones" ON inventory_locations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gestionar ubicaciones" ON inventory_locations;
CREATE POLICY "Gestionar ubicaciones" ON inventory_locations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Pre-populate with Jorge's locations
INSERT INTO inventory_locations (name, type, description) VALUES
  ('Almacén Central', 'warehouse', 'Almacén principal de la empresa'),
  ('La Partner', 'partner', 'Ubicación en La Partner'),
  ('Camioneta Kia', 'vehicle', 'Vehículo Kia de servicio'),
  ('Camioneta Polo', 'vehicle', 'Vehículo Polo de servicio'),
  ('Inventario Jorge', 'personal', 'Material personal de Jorge')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. INVENTORY LOCATION STOCK TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_location_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES price_list(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (product_id, location_id)
);

-- Enable RLS
ALTER TABLE inventory_location_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver stock por ubicación" ON inventory_location_stock;
CREATE POLICY "Ver stock por ubicación" ON inventory_location_stock
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gestionar stock por ubicación" ON inventory_location_stock;
CREATE POLICY "Gestionar stock por ubicación" ON inventory_location_stock
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_location_stock_product ON inventory_location_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_location_stock_location ON inventory_location_stock(location_id);

-- =====================================================
-- 3. ADD COLUMNS TO INVENTORY_TRANSACTIONS
-- =====================================================
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS from_location_id uuid REFERENCES inventory_locations(id) ON DELETE SET NULL;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS to_location_id uuid REFERENCES inventory_locations(id) ON DELETE SET NULL;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_transactions_from_location ON inventory_transactions(from_location_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_location ON inventory_transactions(to_location_id);
CREATE INDEX IF NOT EXISTS idx_transactions_performed_by ON inventory_transactions(performed_by);

-- Allow updates on transactions (needed for the trigger and general management)
DROP POLICY IF EXISTS "Actualizar movimientos" ON inventory_transactions;
CREATE POLICY "Actualizar movimientos" ON inventory_transactions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- 4. MIGRATE EXISTING STOCK TO ALMACÉN CENTRAL
-- =====================================================
-- Move all existing stock_quantity from price_list into location_stock
-- assigned to Almacén Central
INSERT INTO inventory_location_stock (product_id, location_id, quantity)
SELECT 
  pl.id,
  (SELECT id FROM inventory_locations WHERE name = 'Almacén Central' LIMIT 1),
  COALESCE(pl.stock_quantity, 0)
FROM price_list pl
WHERE pl.is_active = true
  AND COALESCE(pl.stock_quantity, 0) > 0
ON CONFLICT (product_id, location_id) 
DO UPDATE SET quantity = EXCLUDED.quantity;

-- =====================================================
-- 5. TRIGGER: AUTO-UPDATE LOCATION STOCK ON TRANSACTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_location_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Subtract from source location
  IF NEW.from_location_id IS NOT NULL THEN
    INSERT INTO inventory_location_stock (product_id, location_id, quantity)
    VALUES (NEW.product_id, NEW.from_location_id, 0)
    ON CONFLICT (product_id, location_id) DO NOTHING;

    UPDATE inventory_location_stock
    SET quantity = GREATEST(0, quantity - NEW.quantity),
        updated_at = now()
    WHERE product_id = NEW.product_id 
      AND location_id = NEW.from_location_id;
  END IF;

  -- Add to destination location
  IF NEW.to_location_id IS NOT NULL THEN
    INSERT INTO inventory_location_stock (product_id, location_id, quantity)
    VALUES (NEW.product_id, NEW.to_location_id, NEW.quantity)
    ON CONFLICT (product_id, location_id) 
    DO UPDATE SET quantity = inventory_location_stock.quantity + NEW.quantity,
                  updated_at = now();
  END IF;

  -- Keep price_list.stock_quantity in sync (total across all locations)
  UPDATE price_list
  SET stock_quantity = COALESCE((
    SELECT SUM(quantity) FROM inventory_location_stock
    WHERE product_id = NEW.product_id
  ), 0)
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists, create new one
DROP TRIGGER IF EXISTS trigger_update_location_stock ON inventory_transactions;
CREATE TRIGGER trigger_update_location_stock
AFTER INSERT ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION update_location_stock();

-- =====================================================
-- 6. CONFIRMATION
-- =====================================================
DO $$
DECLARE
  loc_count integer;
  stock_count integer;
BEGIN
  SELECT count(*) INTO loc_count FROM inventory_locations;
  SELECT count(*) INTO stock_count FROM inventory_location_stock;
  RAISE NOTICE 'Multi-location inventory ready. Locations: %, Stock entries: %', loc_count, stock_count;
END $$;
