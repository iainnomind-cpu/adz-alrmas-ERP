/*
  Add Notification Trigger for Inventory Movements
  ================================================
  Sends a notification to all Admin users whenever there is an
  entry, exit or transfer in inventory_transactions.
*/

CREATE OR REPLACE FUNCTION notify_on_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name text;
  v_product_name text;
  v_from_loc_name text;
  v_to_loc_name text;
  v_admin_ids uuid[];
  v_message text;
  v_title text;
BEGIN
  -- 1. Get user name
  SELECT full_name INTO v_user_name
  FROM user_profiles WHERE id = NEW.performed_by;

  -- 2. Get product name
  SELECT name INTO v_product_name
  FROM price_list WHERE id = NEW.product_id;

  -- 3. Get location names
  IF NEW.from_location_id IS NOT NULL THEN
    SELECT name INTO v_from_loc_name FROM inventory_locations WHERE id = NEW.from_location_id;
  END IF;

  IF NEW.to_location_id IS NOT NULL THEN
    SELECT name INTO v_to_loc_name FROM inventory_locations WHERE id = NEW.to_location_id;
  END IF;

  -- 4. Get all admin user IDs
  SELECT ARRAY_AGG(ur.user_id) INTO v_admin_ids
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE r.name = 'admin';

  -- 5. Construct message based on transaction type
  IF NEW.transaction_type = 'entrada' THEN
    v_title := 'Entrada de Inventario';
    v_message := COALESCE(v_user_name, 'Un usuario') || ' ingresó ' || NEW.quantity || ' unidades de "' || COALESCE(v_product_name, 'Producto') || '" a ' || COALESCE(v_to_loc_name, 'una ubicación') || '.';
  ELSIF NEW.transaction_type = 'salida' THEN
    v_title := 'Salida de Inventario';
    v_message := COALESCE(v_user_name, 'Un usuario') || ' retiró ' || NEW.quantity || ' unidades de "' || COALESCE(v_product_name, 'Producto') || '" desde ' || COALESCE(v_from_loc_name, 'una ubicación') || '.';
  ELSIF NEW.transaction_type = 'transferencia' THEN
    v_title := 'Transferencia de Inventario';
    v_message := COALESCE(v_user_name, 'Un usuario') || ' transfirió ' || NEW.quantity || ' unidades de "' || COALESCE(v_product_name, 'Producto') || '" de ' || COALESCE(v_from_loc_name, 'origen') || ' hacia ' || COALESCE(v_to_loc_name, 'destino') || '.';
  ELSE
    v_title := 'Movimiento de Inventario';
    v_message := COALESCE(v_user_name, 'Un usuario') || ' realizó un movimiento de ' || NEW.quantity || ' unidades de "' || COALESCE(v_product_name, 'Producto') || '".';
  END IF;

  -- Append notes if any
  IF NEW.notes IS NOT NULL THEN
     v_message := v_message || ' Notas: ' || NEW.notes;
  END IF;

  -- 6. Insert notifications
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
      'movement',
      v_title,
      v_message,
      'medium',
      'inventory_transaction',
      NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_notify_inventory_movement ON inventory_transactions;
CREATE TRIGGER trigger_notify_inventory_movement
AFTER INSERT ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION notify_on_inventory_movement();

DO $$
BEGIN
  RAISE NOTICE 'Trigger trigger_notify_inventory_movement successfully created.';
END $$;
