-- Agregar nuevos campos a la tabla assets para seguimiento detallado de equipos

ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS equipment_category text,
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS model text,
ADD COLUMN IF NOT EXISTS channel_count integer,
ADD COLUMN IF NOT EXISTS admin_user text,
ADD COLUMN IF NOT EXISTS admin_password text,
ADD COLUMN IF NOT EXISTS billing_date date,
ADD COLUMN IF NOT EXISTS equipment_invoice_number text,
ADD COLUMN IF NOT EXISTS related_ticket_numbers text,
ADD COLUMN IF NOT EXISTS observations text,
ADD COLUMN IF NOT EXISTS has_extended_warranty boolean DEFAULT false;
