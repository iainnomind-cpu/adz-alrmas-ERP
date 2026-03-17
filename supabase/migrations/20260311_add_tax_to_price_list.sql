-- =====================================================
-- SISTEMA DE IVA EN LISTA DE PRECIOS
-- Fecha: 2026-03-11
-- Descripción: Agregar campos booleanos y de tasa para IVA en price_list
-- =====================================================

-- 1. AGREGAR CAMPOS A LA TABLA price_list
ALTER TABLE public.price_list
ADD COLUMN IF NOT EXISTS has_tax boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS tax_rate numeric(5, 2) NOT NULL DEFAULT 16.00,
ADD COLUMN IF NOT EXISTS price_with_tax_mxn numeric(12, 2) DEFAULT 0;

-- 2. ACTUALIZAR TRIGGER PARA CALCULAR price_with_tax_mxn
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
  
  -- Calcular el IVA
  IF NEW.has_tax = true THEN
    NEW.price_with_tax_mxn = NEW.base_price_mxn * (1 + (NEW.tax_rate / 100));
  ELSE
    NEW.price_with_tax_mxn = NEW.base_price_mxn;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. CALCULAR LOS VALORES INICIALES PARA LOS PRECIOS EXISTENTES
UPDATE public.price_list
SET price_with_tax_mxn = base_price_mxn * (1 + (tax_rate / 100))
WHERE has_tax = true;

UPDATE public.price_list
SET price_with_tax_mxn = base_price_mxn
WHERE has_tax = false;
