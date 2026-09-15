INSERT INTO permissions (module, action, description) 
VALUES ('inventory', 'deactivate', 'Desactivar productos y servicios (marcar como inactivos)')
ON CONFLICT (module, action) DO NOTHING;

ALTER TABLE price_list ADD COLUMN IF NOT EXISTS inactive_reason text;
