-- =====================================================
-- MIGRACIÓN DE HISTORIAL (MOVIMIENTOS): INVENTORY_TRANSACTIONS
-- Fecha: 2026-02-02
-- Descripción: Redirecciona el historial de movimientos a la nueva lista de precios.
-- =====================================================

-- 1. Eliminar restricción antigua (Apuntaba a inventory_products)
ALTER TABLE inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_product_id_fkey;

-- 2. Limpiar huérfanos históricos (Opcional, pero recomendado para integridad)
-- Si hay transacciones de productos que ya no existen en price_list, las borramos o podríamos dejarlas NULL
-- Aquí optamos por borrarlas para mantener limpieza estricta
DELETE FROM inventory_transactions
WHERE product_id NOT IN (SELECT id FROM price_list);

-- 3. Crear nueva restricción hacia price_list
ALTER TABLE inventory_transactions
  ADD CONSTRAINT inventory_transactions_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES price_list(id);

-- 4. Permisos (Importante para que se vean en el frontend)
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON inventory_transactions TO authenticated;
GRANT INSERT ON inventory_transactions TO authenticated; -- Para futuros movimientos

-- Política de lectura
DROP POLICY IF EXISTS "Ver movimientos" ON inventory_transactions;
CREATE POLICY "Ver movimientos" ON inventory_transactions
  FOR SELECT
  TO authenticated
  USING (true);

-- Política de escritura (Para registrar nuevos movimientos)
DROP POLICY IF EXISTS "Registrar movimientos" ON inventory_transactions;
CREATE POLICY "Registrar movimientos" ON inventory_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Confirmación
DO $$
DECLARE
  count_tx integer;
BEGIN
  SELECT count(*) INTO count_tx FROM inventory_transactions;
  RAISE NOTICE 'Historial migrado correctamente. Total transacciones: %', count_tx;
END $$;
