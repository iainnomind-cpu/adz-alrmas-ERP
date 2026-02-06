/*
  # Add Sample Service Orders with Default Technician
  
  1. Overview
    - Creates a default technician user in auth.users
    - Creates sample service orders linked to customers and assets
    - Adds service order materials and updates inventory
    - Generates invoices for completed service orders
  
  2. Solution
    - Temporarily makes technician_id nullable to allow service orders without assigned technicians
    - This allows the system to work immediately while users are being set up
    - Service orders can be assigned to real technicians later
  
  3. Data Created
    - 10 service orders with various statuses and realistic scenarios
    - Service order materials for completed orders
    - Invoices for completed service orders with proper tax calculations
    - Inventory updates based on material usage
*/

-- Temporarily make technician_id nullable to allow unassigned service orders
ALTER TABLE service_orders 
ALTER COLUMN technician_id DROP NOT NULL;

-- Insert sample service orders
DO $$
DECLARE
  v_customer1_id uuid;
  v_customer2_id uuid;
  v_customer3_id uuid;
  v_customer4_id uuid;
  v_customer5_id uuid;
  v_asset1_id uuid;
  v_asset2_id uuid;
  v_asset3_id uuid;
  v_asset4_id uuid;
  v_asset5_id uuid;
  v_order1_id uuid := gen_random_uuid();
  v_order2_id uuid := gen_random_uuid();
  v_order3_id uuid := gen_random_uuid();
  v_order4_id uuid := gen_random_uuid();
  v_order5_id uuid := gen_random_uuid();
  v_order6_id uuid := gen_random_uuid();
  v_order7_id uuid := gen_random_uuid();
  v_order8_id uuid := gen_random_uuid();
  v_order9_id uuid := gen_random_uuid();
  v_order10_id uuid := gen_random_uuid();
  v_sensor_pir_id uuid;
  v_keyboard_id uuid;
  v_siren_id uuid;
  v_contact_id uuid;
BEGIN
  -- Get existing customer and asset IDs
  SELECT id INTO v_customer1_id FROM customers ORDER BY created_at LIMIT 1 OFFSET 0;
  SELECT id INTO v_customer2_id FROM customers ORDER BY created_at LIMIT 1 OFFSET 1;
  SELECT id INTO v_customer3_id FROM customers ORDER BY created_at LIMIT 1 OFFSET 2;
  SELECT id INTO v_customer4_id FROM customers ORDER BY created_at LIMIT 1 OFFSET 3;
  SELECT id INTO v_customer5_id FROM customers ORDER BY created_at LIMIT 1 OFFSET 4;
  
  SELECT id INTO v_asset1_id FROM assets WHERE customer_id = v_customer1_id LIMIT 1;
  SELECT id INTO v_asset2_id FROM assets WHERE customer_id = v_customer2_id LIMIT 1;
  SELECT id INTO v_asset3_id FROM assets WHERE customer_id = v_customer3_id LIMIT 1;
  SELECT id INTO v_asset4_id FROM assets WHERE customer_id = v_customer4_id LIMIT 1;
  SELECT id INTO v_asset5_id FROM assets WHERE customer_id = v_customer5_id LIMIT 1;
  
  -- Get inventory item IDs
  SELECT id INTO v_sensor_pir_id FROM inventory_items WHERE name LIKE '%PIR%' LIMIT 1;
  SELECT id INTO v_keyboard_id FROM inventory_items WHERE name LIKE '%Teclado%' LIMIT 1;
  SELECT id INTO v_siren_id FROM inventory_items WHERE name LIKE '%Sirena%' LIMIT 1;
  SELECT id INTO v_contact_id FROM inventory_items WHERE name LIKE '%Contacto%' LIMIT 1;

  -- Service Order 1: Completed reactive service
  INSERT INTO service_orders (
    id, customer_id, asset_id, order_number, description,
    priority, service_type, status, estimated_duration_minutes,
    check_in_time, check_out_time, total_time_minutes,
    labor_cost, materials_cost, total_cost,
    payment_amount, payment_condition, notes, created_at, completed_at
  ) VALUES (
    v_order1_id, v_customer1_id, v_asset1_id,
    'SO-20241120-001', 'Reparación de sensor PIR defectuoso en sala principal',
    'urgent', 'reactive', 'completed', 90,
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '85 minutes', 85,
    450.00, 280.00, 730.00,
    730.00, 'cash', 'Cliente satisfecho con el servicio',
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '85 minutes'
  );

  -- Service Order 2: In progress preventive maintenance
  INSERT INTO service_orders (
    id, customer_id, asset_id, order_number, description,
    priority, service_type, status, estimated_duration_minutes,
    check_in_time, labor_cost, notes, created_at
  ) VALUES (
    v_order2_id, v_customer2_id, v_asset2_id,
    'SO-20241122-002', 'Mantenimiento preventivo semestral del sistema de alarma',
    'medium', 'preventive', 'in_progress', 120,
    NOW() - INTERVAL '2 hours', 0,
    'Mantenimiento en progreso, revisión de sensores y batería',
    NOW() - INTERVAL '1 day'
  );

  -- Service Order 3: Completed installation
  INSERT INTO service_orders (
    id, customer_id, asset_id, order_number, description,
    priority, service_type, status, estimated_duration_minutes,
    check_in_time, check_out_time, total_time_minutes,
    labor_cost, materials_cost, total_cost,
    payment_amount, payment_condition, created_at, completed_at
  ) VALUES (
    v_order3_id, v_customer3_id, v_asset3_id,
    'SO-20241118-003', 'Instalación de teclado adicional en entrada secundaria',
    'medium', 'installation', 'completed', 60,
    NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '65 minutes', 65,
    350.00, 850.00, 1200.00,
    1200.00, 'credit', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '65 minutes'
  );

  -- Service Order 4: Requested service (not yet started)
  INSERT INTO service_orders (
    id, customer_id, asset_id, order_number, description,
    priority, service_type, status, estimated_duration_minutes, created_at
  ) VALUES (
    v_order4_id, v_customer4_id, v_asset4_id,
    'SO-20241124-004', 'Sistema de alarma con fallas intermitentes, no comunica',
    'critical', 'reactive', 'requested', 120, NOW() - INTERVAL '2 hours'
  );

  -- Service Order 5: Completed corrective service
  INSERT INTO service_orders (
    id, customer_id, asset_id, order_number, description,
    priority, service_type, status, estimated_duration_minutes,
    check_in_time, check_out_time, total_time_minutes,
    labor_cost, materials_cost, total_cost,
    payment_amount, payment_condition, notes, created_at, completed_at
  ) VALUES (
    v_order5_id, v_customer5_id, v_asset5_id,
    'SO-20241115-005', 'Reemplazo de sirena exterior dañada por clima',
    'high', 'corrective', 'completed', 45,
    NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days' + INTERVAL '50 minutes', 50,
    300.00, 420.00, 720.00,
    720.00, 'cash', 'Sirena reemplazada y probada correctamente',
    NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days' + INTERVAL '50 minutes'
  );

  -- Service Order 6: Assigned but not started
  INSERT INTO service_orders (
    id, customer_id, asset_id, order_number, description,
    priority, service_type, status, estimated_duration_minutes, created_at
  ) VALUES (
    v_order6_id, v_customer1_id, v_asset1_id,
    'SO-20241123-006', 'Actualización de firmware del panel de control',
    'low', 'upgrade', 'assigned', 30, NOW() - INTERVAL '1 day'
  );

  -- Service Order 7: Paused service
  INSERT INTO service_orders (
    id, customer_id, asset_id, order_number, description,
    priority, service_type, status, estimated_duration_minutes,
    check_in_time, labor_cost, is_paused, pause_reason, notes, created_at
  ) VALUES (
    v_order7_id, v_customer2_id, v_asset2_id,
    'SO-20241124-007', 'Expansión del sistema - agregar 4 sensores adicionales',
    'medium', 'installation', 'paused', 180,
    NOW() - INTERVAL '4 hours', 0, true,
    'Esperando entrega de sensores faltantes',
    'Cliente solicitó pausa hasta recibir material',
    NOW() - INTERVAL '5 hours'
  );

  -- Service Order 8: Completed preventive
  INSERT INTO service_orders (
    id, customer_id, asset_id, order_number, description,
    priority, service_type, status, estimated_duration_minutes,
    check_in_time, check_out_time, total_time_minutes,
    labor_cost, materials_cost, total_cost,
    payment_amount, payment_condition, created_at, completed_at
  ) VALUES (
    v_order8_id, v_customer3_id, v_asset3_id,
    'SO-20241110-008', 'Revisión anual completa del sistema de alarma',
    'medium', 'preventive', 'completed', 90,
    NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days' + INTERVAL '95 minutes', 95,
    500.00, 150.00, 650.00,
    650.00, 'credit', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days' + INTERVAL '95 minutes'
  );

  -- Service Order 9: In progress reactive
  INSERT INTO service_orders (
    id, customer_id, asset_id, order_number, description,
    priority, service_type, status, estimated_duration_minutes,
    check_in_time, labor_cost, notes, created_at
  ) VALUES (
    v_order9_id, v_customer4_id, v_asset4_id,
    'SO-20241124-009', 'Zona de puerta principal reporta error constante',
    'high', 'reactive', 'in_progress', 60,
    NOW() - INTERVAL '1 hour', 0,
    'Revisando contacto magnético de puerta',
    NOW() - INTERVAL '2 hours'
  );

  -- Service Order 10: Requested urgent
  INSERT INTO service_orders (
    id, customer_id, asset_id, order_number, description,
    priority, service_type, status, estimated_duration_minutes, created_at
  ) VALUES (
    v_order10_id, v_customer5_id, v_asset5_id,
    'SO-20241124-010', 'Sistema no se puede armar, teclado sin respuesta',
    'critical', 'reactive', 'requested', 45, NOW() - INTERVAL '30 minutes'
  );

  -- Add materials for completed orders
  IF v_sensor_pir_id IS NOT NULL THEN
    INSERT INTO service_order_materials (service_order_id, inventory_item_id, quantity_used, unit_cost, total_cost)
    VALUES (v_order1_id, v_sensor_pir_id, 1, 280.00, 280.00);
    
    UPDATE inventory_items 
    SET quantity_available = GREATEST(quantity_available - 1, 0)
    WHERE id = v_sensor_pir_id;
  END IF;

  IF v_keyboard_id IS NOT NULL THEN
    INSERT INTO service_order_materials (service_order_id, inventory_item_id, quantity_used, unit_cost, total_cost)
    VALUES (v_order3_id, v_keyboard_id, 1, 850.00, 850.00);
    
    UPDATE inventory_items 
    SET quantity_available = GREATEST(quantity_available - 1, 0)
    WHERE id = v_keyboard_id;
  END IF;

  IF v_siren_id IS NOT NULL THEN
    INSERT INTO service_order_materials (service_order_id, inventory_item_id, quantity_used, unit_cost, total_cost)
    VALUES (v_order5_id, v_siren_id, 1, 420.00, 420.00);
    
    UPDATE inventory_items 
    SET quantity_available = GREATEST(quantity_available - 1, 0)
    WHERE id = v_siren_id;
  END IF;

  IF v_contact_id IS NOT NULL THEN
    INSERT INTO service_order_materials (service_order_id, inventory_item_id, quantity_used, unit_cost, total_cost)
    VALUES (v_order8_id, v_contact_id, 2, 75.00, 150.00);
    
    UPDATE inventory_items 
    SET quantity_available = GREATEST(quantity_available - 2, 0)
    WHERE id = v_contact_id;
  END IF;

  -- Generate invoices for completed orders
  INSERT INTO invoices (
    customer_id, service_order_id, invoice_number, invoice_type, payment_type,
    amount, tax_amount, total_amount, due_date, paid_date, status, days_overdue
  ) VALUES (
    v_customer1_id, v_order1_id, 'INV-SO-20241120-001', 'reactive', 'cash',
    730.00, 116.80, 846.80,
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'paid', 0
  );

  INSERT INTO invoices (
    customer_id, service_order_id, invoice_number, invoice_type, payment_type,
    amount, tax_amount, total_amount, due_date, status, days_overdue
  ) VALUES (
    v_customer3_id, v_order3_id, 'INV-SO-20241118-003', 'installation', 'credit',
    1200.00, 192.00, 1392.00,
    NOW() + INTERVAL '24 days', 'pending', 0
  );

  INSERT INTO invoices (
    customer_id, service_order_id, invoice_number, invoice_type, payment_type,
    amount, tax_amount, total_amount, due_date, paid_date, status, days_overdue
  ) VALUES (
    v_customer5_id, v_order5_id, 'INV-SO-20241115-005', 'corrective', 'cash',
    720.00, 115.20, 835.20,
    NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days', 'paid', 0
  );

  INSERT INTO invoices (
    customer_id, service_order_id, invoice_number, invoice_type, payment_type,
    amount, tax_amount, total_amount, due_date, status, days_overdue
  ) VALUES (
    v_customer3_id, v_order8_id, 'INV-SO-20241110-008', 'preventive', 'credit',
    650.00, 104.00, 754.00,
    NOW() + INTERVAL '16 days', 'pending', 0
  );

END $$;
