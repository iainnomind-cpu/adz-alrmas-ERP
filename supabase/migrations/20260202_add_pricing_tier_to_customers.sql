-- =====================================================
-- MIGRACIÓN: AGREGAR NIVEL DE PRECIOS A CLIENTES
-- Fecha: 2026-02-02
-- Descripción: Agrega el campo pricing_tier a la tabla customers para automatizar descuentos
-- =====================================================

-- 1. Agregar columna pricing_tier con valor por defecto 1 (Precio Lista / Mortal)
ALTER TABLE customers
ADD COLUMN pricing_tier smallint NOT NULL DEFAULT 1;

-- 2. Agregar restricción para asegurar que solo sea del 1 al 5
ALTER TABLE customers
ADD CONSTRAINT customers_pricing_tier_check CHECK (pricing_tier BETWEEN 1 AND 5);

-- 3. Comentario explicativo
COMMENT ON COLUMN customers.pricing_tier IS 'Nivel de precio asignado (1-5) para cálculo automático de descuentos en órdenes de servicio';
