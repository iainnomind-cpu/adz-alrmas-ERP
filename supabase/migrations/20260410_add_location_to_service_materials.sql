-- Migration script to add location_id to service_order_materials

ALTER TABLE public.service_order_materials
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_order_materials_location ON public.service_order_materials(location_id);

-- Opcional: si existe stock global, las asignamos al Almacén Central de forma retroactiva (si se requiere)
-- Para mantener la integridad, setearemos location_id basándonos en la ubicación principal
DO $$
DECLARE
    central_loc UUID;
BEGIN
    SELECT id INTO central_loc FROM public.inventory_locations WHERE name = 'Almacén Central' LIMIT 1;
    IF central_loc IS NOT NULL THEN
        UPDATE public.service_order_materials 
        SET location_id = central_loc 
        WHERE location_id IS NULL;
    END IF;
END $$;
