-- 1. Crear función que verifique el estado del cliente apuntado
CREATE OR REPLACE FUNCTION validate_customer_active_for_card()
RETURNS trigger AS $$
DECLARE
  v_customer_status text;
  v_is_suspended boolean;
BEGIN
  -- Obtener el estado del cliente y su flag de suspensión
  SELECT status, is_suspended INTO v_customer_status, v_is_suspended
  FROM customers 
  WHERE id = NEW.customer_id;

  -- Checar si el flag de suspensión está activo O si el estado es diferente de activo
  IF v_is_suspended = true OR (LOWER(COALESCE(v_customer_status, '')) != 'active' AND LOWER(COALESCE(v_customer_status, '')) != 'activo') THEN
    RAISE EXCEPTION 'No se pueden asignar o generar tarjetas a clientes suspendidos o inactivos. Estado: % | is_suspended: %', v_customer_status, v_is_suspended;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Eliminar trigger si ya existiera para evitar errores al re-correr
DROP TRIGGER IF EXISTS check_customer_status_before_card_insert ON customer_digital_cards;

-- 3. Crear (o recrear) el trigger asociado a la tabla de tarjetas
CREATE TRIGGER check_customer_status_before_card_insert
BEFORE INSERT ON customer_digital_cards
FOR EACH ROW
EXECUTE FUNCTION validate_customer_active_for_card();
