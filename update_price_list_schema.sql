-- Agrega columnas faltantes a la tabla price_list
-- Corre este script en el Editor SQL de Supabase para habilitar todas las funcionalidades completas de inventario

-- Agregar columnas de tecnología y batería
ALTER TABLE public.price_list
ADD COLUMN IF NOT EXISTS technology text DEFAULT 'n/a',
ADD COLUMN IF NOT EXISTS battery_type text DEFAULT 'n/a';

-- Agregar restricciones CHECK si no existen (opcional, para integridad)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'price_list_technology_check') THEN
        ALTER TABLE public.price_list ADD CONSTRAINT price_list_technology_check CHECK (technology IN ('cableado', 'inalambrico', 'dual', 'n/a'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'price_list_battery_type_check') THEN
        ALTER TABLE public.price_list ADD CONSTRAINT price_list_battery_type_check CHECK (battery_type IN ('recargable', 'litio', 'alkalina', 'n/a'));
    END IF;
END $$;

-- Agregar columnas de costos y descuentos de proveedor
ALTER TABLE public.price_list
ADD COLUMN IF NOT EXISTS supplier_list_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplier_discount_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price_usd numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price_mxn numeric DEFAULT 0;

-- Agregar columnas para niveles de descuento personalizados (1-5)
ALTER TABLE public.price_list
ADD COLUMN IF NOT EXISTS discount_tier_1 numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS discount_tier_2 numeric DEFAULT 15,
ADD COLUMN IF NOT EXISTS discount_tier_3 numeric DEFAULT 20,
ADD COLUMN IF NOT EXISTS discount_tier_4 numeric DEFAULT 25,
ADD COLUMN IF NOT EXISTS discount_tier_5 numeric DEFAULT 30;

-- Agregar columnas de notas y varios
ALTER TABLE public.price_list
ADD COLUMN IF NOT EXISTS supplier_notes text,
ADD COLUMN IF NOT EXISTS internal_notes text,
ADD COLUMN IF NOT EXISTS is_kit boolean DEFAULT false;

-- Comentario para confirmar ejecución
COMMENT ON TABLE public.price_list IS 'Tabla actualizada con columnas de costos y descuentos';
