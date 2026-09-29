-- Script para asegurar que todas las columnas de la tabla customers existan en Supabase
-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase si alguna columna llegara a faltar

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS exterior_number text,
ADD COLUMN IF NOT EXISTS interior_number text,
ADD COLUMN IF NOT EXISTS neighborhood text,
ADD COLUMN IF NOT EXISTS city text DEFAULT 'Ciudad',
ADD COLUMN IF NOT EXISTS state text DEFAULT 'Estado',
ADD COLUMN IF NOT EXISTS zip_code text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS branch_name text,
ADD COLUMN IF NOT EXISTS is_single_branch boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS master_account_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pricing_tier integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS annuity_month integer,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS property_type text DEFAULT 'casa',
ADD COLUMN IF NOT EXISTS credit_classification text DEFAULT 'puntual',
ADD COLUMN IF NOT EXISTS billing_preference text DEFAULT 'electronic',
ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS business_name text,
ADD COLUMN IF NOT EXISTS owner_name text,
ADD COLUMN IF NOT EXISTS system_type text DEFAULT 'alarma',
ADD COLUMN IF NOT EXISTS communication_tech text DEFAULT 'telefono',
ADD COLUMN IF NOT EXISTS monitoring_plan text,
ADD COLUMN IF NOT EXISTS cfdi text,
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspension_start_date date,
ADD COLUMN IF NOT EXISTS suspension_end_date date,
ADD COLUMN IF NOT EXISTS suspension_reason text,
ADD COLUMN IF NOT EXISTS alta_date date,
ADD COLUMN IF NOT EXISTS reactivation_date date,
ADD COLUMN IF NOT EXISTS cancellation_date date,
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS gps_latitude double precision,
ADD COLUMN IF NOT EXISTS gps_longitude double precision;

-- Índices recomendados para optimizar búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON public.customers(account_number);
CREATE INDEX IF NOT EXISTS idx_customers_system_type ON public.customers(system_type);
CREATE INDEX IF NOT EXISTS idx_customers_master_account_id ON public.customers(master_account_id);
CREATE INDEX IF NOT EXISTS idx_customers_pricing_tier ON public.customers(pricing_tier);
