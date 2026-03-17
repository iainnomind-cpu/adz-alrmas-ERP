/*
  Add Low Stock Notification Trigger
  ==================================
  Sends an in-app notification to all Admin users whenever a product's
  stock drops below or equals its minimum stock level.
*/

CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_ids uuid[];
BEGIN
  -- Solo disparar si el stock NUEVO es menor o igual al mínimo Y ANTES el stock era mayor al mínimo
  -- (Esto previene que se mande spam en cada descuento de stock si ya estaba bajo)
  IF (NEW.stock_quantity <= NEW.min_stock_level) AND (OLD.stock_quantity > OLD.min_stock_level OR OLD.stock_quantity IS NULL) THEN
    
    -- Obtener todos los IDs de administradores
    SELECT ARRAY_AGG(ur.user_id) INTO v_admin_ids
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE r.name = 'admin';

    IF v_admin_ids IS NOT NULL AND array_length(v_admin_ids, 1) > 0 THEN
      INSERT INTO inventory_notifications (
        target_user_id,
        notification_type,
        title,
        message,
        priority,
        reference_type,
        reference_id
      )
      SELECT
        unnest(v_admin_ids),
        'low_stock',
        CASE WHEN NEW.stock_quantity = 0 THEN 'Producto Agotado' ELSE 'Alerta de Stock Bajo' END,
        'El producto "' || NEW.name || '" (' || NEW.code || ') ha alcanzado su nivel mínimo. Stock actual: ' || NEW.stock_quantity || ' (Mínimo: ' || NEW.min_stock_level || ').',
        CASE WHEN NEW.stock_quantity <= 0 THEN 'critical' ELSE 'high' END,
        'product',
        NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Quitar el trigger si existe y volverlo a crear
DROP TRIGGER IF EXISTS trigger_notify_low_stock ON price_list;
CREATE TRIGGER trigger_notify_low_stock
AFTER UPDATE ON price_list
FOR EACH ROW
WHEN (NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity OR NEW.min_stock_level IS DISTINCT FROM OLD.min_stock_level)
EXECUTE FUNCTION notify_low_stock();

DO $$
BEGIN
  RAISE NOTICE 'Trigger trigger_notify_low_stock successfully created on price_list.';
END $$;
