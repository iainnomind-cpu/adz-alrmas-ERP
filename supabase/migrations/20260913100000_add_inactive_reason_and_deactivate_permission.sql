-- Add inactive_reason column to price_list for tracking why a product was deactivated
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS inactive_reason text;

-- Add new 'deactivate' permission for Inventory module
INSERT INTO permissions (module, action, description) 
VALUES ('inventory', 'deactivate', 'Desactivar productos y servicios (marcar como inactivos)')
ON CONFLICT (module, action) DO NOTHING;

-- Grant 'deactivate' permission to admin role automatically
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin' AND p.module = 'inventory' AND p.action = 'deactivate'
ON CONFLICT DO NOTHING;
