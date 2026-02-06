-- =====================================================
-- SCRIPT DE EMERGENCIA: REPARAR PERMISOS (Fix 403)
-- Ejecutar este script para desbloquear la tabla
-- =====================================================

-- 1. Asegurar que RLS esté habilitado
ALTER TABLE IF EXISTS price_list ENABLE ROW LEVEL SECURITY;

-- 2. OTORGAR PERMISOS BÁSICOS A ROLES (A veces necesario además de RLS)
GRANT SELECT ON price_list TO anon;         -- Permitir a usuarios públicos ver
GRANT SELECT ON price_list TO authenticated; -- Permitir a usuarios logueados ver
GRANT ALL ON price_list TO authenticated;    -- Permitir a usuarios logueados editar
GRANT ALL ON price_list TO service_role;     -- Permitir al servidor todo

-- 3. REINICIAR POLÍTICAS (Borrar y volver a crear para asegurar que estén limpias)
DROP POLICY IF EXISTS "Ver lista de precios" ON price_list;
DROP POLICY IF EXISTS "Gestionar lista de precios" ON price_list;
DROP POLICY IF EXISTS "Política de lectura pública" ON price_list;
DROP POLICY IF EXISTS "Política de escritura autenticada" ON price_list;

-- Política de LECTURA (Pública)
CREATE POLICY "Política de lectura pública" ON price_list
  FOR SELECT 
  TO public 
  USING (true);

-- Política de ESCRITURA (Autenticada)
CREATE POLICY "Política de escritura autenticada" ON price_list
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- 4. CONFIRMACIÓN
DO $$
BEGIN
  RAISE NOTICE 'Permisos reparados exitosamente para price_list';
END $$;
