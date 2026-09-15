-- Add 'pause' and 'cancel' permissions for service_orders
INSERT INTO permissions (module, action, description) 
VALUES 
  ('service_orders', 'pause', 'Pausar órdenes de servicio'),
  ('service_orders', 'cancel', 'Cancelar órdenes de servicio')
ON CONFLICT (module, action) DO NOTHING;

-- Grant to admin role automatically
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin' AND p.module = 'service_orders' AND p.action IN ('pause', 'cancel')
ON CONFLICT DO NOTHING;
