-- Este script solventa el error de Postgres 42501 (Permission Denied) para inventory_locations

-- 1. Asegurar que los roles integrados de Supabase tengan acceso real y total a la tabla original (GRANTs base)
GRANT ALL ON TABLE public.inventory_locations TO authenticated;
GRANT ALL ON TABLE public.inventory_locations TO anon;
GRANT ALL ON TABLE public.inventory_locations TO service_role;

-- Dar uso y privilegios a las secuencias si aplican (por sanidad de RLS, aunque se usa UUID)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;

-- 2. Habilitar forzosamente (y de nuevo) el RLS
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;

-- 3. Borrar limpiamente cualquier política conflictiva pre-existente para la tabla (sin importar cómo se llamen, las de default que hicimos)
DROP POLICY IF EXISTS "Permitir a usuarios autenticados leer inventory_locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "Permitir a usuarios autenticados crear inventory_locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "Permitir a usuarios autenticados actualizar inventory_locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "Permitir a usuarios autenticados eliminar inventory_locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "Allow insert inventory locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "Allow read inventory locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "Allow update inventory locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "Allow delete inventory locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.inventory_locations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.inventory_locations;

-- 4. Inyectar políticas universales robustas pero simples para el Módulo

-- 4a. SELECT (Visualización de tabla / lista)
CREATE POLICY "inventory_locations_select_policy"
ON public.inventory_locations
FOR SELECT
TO authenticated
USING (true);

-- 4b. INSERT (Creación del Formulario Nueva Ubicación)
CREATE POLICY "inventory_locations_insert_policy"
ON public.inventory_locations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4c. UPDATE (Edición / Habilitar Inactivar)
CREATE POLICY "inventory_locations_update_policy"
ON public.inventory_locations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4d. DELETE (Eliminar fila por si acaso)
CREATE POLICY "inventory_locations_delete_policy"
ON public.inventory_locations
FOR DELETE
TO authenticated
USING (true);
