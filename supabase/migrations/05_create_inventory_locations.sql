-- 1. Crear la tabla de Ubicaciones de Almacenes (inventory_locations)
CREATE TABLE IF NOT EXISTS public.inventory_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('warehouse', 'vehicle', 'partner', 'personal')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar la seguridad a nivel de fila (Row Level Security)
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas de Seguridad
-- Política para SELECCIONAR (Leer)
CREATE POLICY "Permitir a usuarios autenticados leer inventory_locations"
ON public.inventory_locations
FOR SELECT
TO authenticated
USING (true);

-- Política para INSERTAR (Escribir nueva ubicación)
CREATE POLICY "Permitir a usuarios autenticados crear inventory_locations"
ON public.inventory_locations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para ACTUALIZAR (Editar ubicación existente)
CREATE POLICY "Permitir a usuarios autenticados actualizar inventory_locations"
ON public.inventory_locations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para ELIMINAR (Borrar ubicación)
CREATE POLICY "Permitir a usuarios autenticados eliminar inventory_locations"
ON public.inventory_locations
FOR DELETE
TO authenticated
USING (true);

-- 4. Trigger Automático para actualizar la fecha (updated_at)
CREATE OR REPLACE FUNCTION set_updated_at_inventory_locations()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_updated_at_inventory_locations ON public.inventory_locations;
CREATE TRIGGER trigger_set_updated_at_inventory_locations
BEFORE UPDATE ON public.inventory_locations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_inventory_locations();
