/*
  # Add Sample Data for ERP System
  
  1. Sample Data Created
    - 8 sample customers (mix of casa, comercio, banco types)
    - 10 assets (alarm systems) linked to customers
    - 15 inventory items across all categories
    - 8 service orders using existing technician user IDs
    - 10 invoices with various payment states
    - Material usage records linking inventory to service orders
  
  2. Data Characteristics
    - Spanish business names and addresses
    - Realistic alarm system models and configurations
    - Varied service order priorities and statuses
    - Mix of paid, pending, and overdue invoices
    - Proper foreign key relationships maintained
  
  3. Important Notes
    - Uses existing auth.users IDs for technician references
    - All data uses proper UUID generation
    - Timestamps use realistic dates
    - Prices and costs are in reasonable ranges for alarm business
*/

-- First, let's get an existing user ID from auth.users to use as technician
DO $$
DECLARE
  v_tech_id uuid;
  v_customer_ids uuid[];
  v_asset_ids uuid[];
  v_inventory_ids uuid[];
  v_service_order_ids uuid[];
  v_invoice_ids uuid[];
BEGIN
  -- Get the first available user ID from auth.users
  SELECT id INTO v_tech_id FROM auth.users LIMIT 1;
  
  -- If no users exist, we'll skip service orders (they require a valid technician)
  IF v_tech_id IS NULL THEN
    RAISE NOTICE 'No users found in auth.users. Skipping service orders that require technician assignment.';
  END IF;

  -- Insert sample customers
  WITH inserted_customers AS (
    INSERT INTO customers (
      name, owner_name, email, phone, address,
      customer_type, communication_tech, monitoring_plan, status
    ) VALUES
      ('Banco Nacional de México', 'Carlos Rodríguez', 'seguridad@bancomex.com', '55-1234-5678', 
       'Av. Reforma 500, Ciudad de México', 'banco', 'dual', 'Premium 24/7', 'active'),
      ('Ferretería El Martillo', 'José García', 'contacto@elmartillo.com', '55-2345-6789',
       'Calle Juárez 123, Guadalajara', 'comercio', 'celular', 'Standard', 'active'),
      ('Residencia Gómez', 'María Gómez', 'maria.gomez@email.com', '55-3456-7890',
       'Privada Los Pinos 45, Monterrey', 'casa', 'telefono', 'Basic', 'active'),
      ('Supermercado La Esperanza', 'Pedro Martínez', 'gerencia@laesperanza.com', '55-4567-8901',
       'Boulevard Morelos 789, Puebla', 'comercio', 'dual', 'Premium', 'active'),
      ('Residencia Hernández', 'Ana Hernández', 'ana.h@email.com', '55-5678-9012',
       'Fraccionamiento Las Flores 12, Querétaro', 'casa', 'celular', 'Basic', 'active'),
      ('Farmacia San José', 'Luis Ramírez', 'farmacia@sanjose.com', '55-6789-0123',
       'Av. Hidalgo 234, Toluca', 'comercio', 'telefono', 'Standard', 'active'),
      ('Joyería Brillante', 'Carmen López', 'info@brillante.com', '55-7890-1234',
       'Centro Histórico 567, Guadalajara', 'comercio', 'dual', 'Premium 24/7', 'suspended'),
      ('Residencia Torres', 'Roberto Torres', 'roberto.t@email.com', '55-8901-2345',
       'Colonia Jardines 89, Ciudad de México', 'casa', 'telefono', 'Standard', 'inactive')
    RETURNING id
  )
  SELECT array_agg(id) INTO v_customer_ids FROM inserted_customers;

  -- Insert sample assets (alarm systems)
  WITH inserted_assets AS (
    INSERT INTO assets (
      customer_id, alarm_model, keyboard_model, communicator_model,
      serial_number, installation_date, is_eol, status
    ) VALUES
      (v_customer_ids[1], 'DSC PowerSeries PC1864', 'DSC PK5500', 'DSC TL2803G',
       'SN-2024-001-BMX', '2023-01-15', false, 'active'),
      (v_customer_ids[2], 'Honeywell VISTA-20P', 'Honeywell 6160', 'AlarmNet 7847i',
       'SN-2024-002-FEM', '2023-03-20', false, 'active'),
      (v_customer_ids[3], 'DSC Alexor PC9155', 'DSC WT5500', 'DSC 3G2080',
       'SN-2024-003-RGO', '2023-05-10', false, 'active'),
      (v_customer_ids[4], 'Paradox MG5050', 'Paradox K32LED', 'Paradox GPRS14',
       'SN-2024-004-SLE', '2022-08-25', false, 'active'),
      (v_customer_ids[5], 'DSC PC1616', 'DSC LCD5500Z', 'DSC GSM3505',
       'SN-2024-005-RHE', '2023-07-12', false, 'active'),
      (v_customer_ids[6], 'Honeywell VISTA-15P', 'Honeywell 6150', 'AlarmNet 7845GSM',
       'SN-2024-006-FSJ', '2023-09-05', false, 'active'),
      (v_customer_ids[7], 'DSC PC1555', 'DSC LED5511', 'DSC 3G2060',
       'SN-2023-007-JBR', '2020-11-18', true, 'active'),
      (v_customer_ids[8], 'Paradox SP6000', 'Paradox K10H', 'Paradox PCS250',
       'SN-2024-008-RTO', '2023-12-01', false, 'inactive'),
      (v_customer_ids[1], 'DSC NEO HS2016', 'DSC HS2LED', 'DSC 3G2080-RES',
       'SN-2024-009-BMX2', '2024-02-14', false, 'active'),
      (v_customer_ids[4], 'Honeywell VISTA-48LA', 'Honeywell 6160RF', 'AlarmNet 7847i',
       'SN-2024-010-SLE2', '2024-03-22', false, 'active')
    RETURNING id
  )
  SELECT array_agg(id) INTO v_asset_ids FROM inserted_assets;

  -- Insert sample inventory items
  WITH inserted_inventory AS (
    INSERT INTO inventory_items (
      sku, name, category, unit_cost, quantity_available, min_stock_level
    ) VALUES
      ('SEN-PIR-001', 'Sensor de Movimiento PIR Dual', 'sensor', 45.00, 25, 10),
      ('SEN-MAG-001', 'Contacto Magnético Empotrar', 'sensor', 12.50, 50, 20),
      ('SEN-VIB-001', 'Detector de Vibración Vidrio', 'sensor', 38.00, 15, 8),
      ('SIR-INT-001', 'Sirena Interior 120dB', 'sirena', 85.00, 12, 5),
      ('SIR-EXT-001', 'Sirena Exterior Strobo', 'sirena', 125.00, 8, 4),
      ('TEC-LCD-001', 'Teclado LCD Alfanumérico', 'teclado', 95.00, 10, 5),
      ('TEC-LED-001', 'Teclado LED Básico', 'teclado', 55.00, 18, 8),
      ('COM-GSM-001', 'Comunicador GSM 3G/4G', 'comunicador', 180.00, 6, 3),
      ('COM-ETH-001', 'Comunicador Ethernet/WiFi', 'comunicador', 145.00, 8, 4),
      ('PWR-BAT-001', 'Batería Respaldo 12V 7Ah', 'fuente', 35.00, 30, 15),
      ('PWR-TRF-001', 'Transformador 16.5VAC 40VA', 'fuente', 28.00, 20, 10),
      ('CAB-4C-001', 'Cable 4 Conductores Cal 22 (rollo 100m)', 'cable', 120.00, 5, 2),
      ('CAB-2C-001', 'Cable 2 Conductores Cal 18 (rollo 100m)', 'cable', 85.00, 8, 3),
      ('PAN-DSC-001', 'Panel DSC PowerSeries PC1864', 'panel', 320.00, 4, 2),
      ('PAN-HON-001', 'Panel Honeywell VISTA-20P', 'panel', 380.00, 3, 2)
    RETURNING id
  )
  SELECT array_agg(id) INTO v_inventory_ids FROM inserted_inventory;

  -- Insert service orders only if we have a valid technician ID
  IF v_tech_id IS NOT NULL THEN
    WITH inserted_service_orders AS (
      INSERT INTO service_orders (
        customer_id, asset_id, technician_id, order_number, description,
        priority, service_type, status, estimated_duration_minutes,
        labor_cost, materials_cost, total_cost, check_in_time, check_out_time,
        total_time_minutes
      ) VALUES
        (v_customer_ids[1], v_asset_ids[1], v_tech_id, 'SO-2024-001',
         'Instalación completa de sistema de alarma en sucursal nueva',
         'high', 'installation', 'completed', 240, 800.00, 450.00, 1250.00,
         '2024-01-15 09:00:00', '2024-01-15 13:30:00', 270),
        (v_customer_ids[2], v_asset_ids[2], v_tech_id, 'SO-2024-002',
         'Mantenimiento preventivo anual del sistema',
         'medium', 'preventive', 'completed', 120, 200.00, 85.00, 285.00,
         '2024-02-10 10:00:00', '2024-02-10 12:15:00', 135),
        (v_customer_ids[3], v_asset_ids[3], v_tech_id, 'SO-2024-003',
         'Reparación de sensor de movimiento zona sala',
         'urgent', 'corrective', 'completed', 60, 150.00, 45.00, 195.00,
         '2024-02-20 14:00:00', '2024-02-20 15:30:00', 90),
        (v_customer_ids[4], v_asset_ids[4], v_tech_id, 'SO-2024-004',
         'Upgrade de comunicador a 4G y batería de respaldo',
         'medium', 'upgrade', 'completed', 90, 250.00, 215.00, 465.00,
         '2024-03-05 11:00:00', '2024-03-05 13:00:00', 120),
        (v_customer_ids[5], v_asset_ids[5], v_tech_id, 'SO-2024-005',
         'Falsa alarma recurrente - revisión de zona cocina',
         'high', 'reactive', 'in_progress', 45, 100.00, 0.00, 100.00,
         '2024-11-24 09:30:00', NULL, NULL),
        (v_customer_ids[6], v_asset_ids[6], v_tech_id, 'SO-2024-006',
         'Instalación de sirena adicional en área de bodega',
         'medium', 'installation', 'assigned', 60, 0.00, 0.00, 0.00,
         NULL, NULL, NULL),
        (v_customer_ids[7], v_asset_ids[7], v_tech_id, 'SO-2024-007',
         'Reemplazo completo de panel EOL por modelo actual',
         'critical', 'upgrade', 'requested', 180, 0.00, 0.00, 0.00,
         NULL, NULL, NULL),
        (v_customer_ids[4], v_asset_ids[10], v_tech_id, 'SO-2024-008',
         'Mantenimiento preventivo trimestral',
         'low', 'preventive', 'completed', 90, 180.00, 35.00, 215.00,
         '2024-03-20 08:00:00', '2024-03-20 10:00:00', 120)
      RETURNING id
    )
    SELECT array_agg(id) INTO v_service_order_ids FROM inserted_service_orders;

    -- Link materials to completed service orders
    IF array_length(v_service_order_ids, 1) >= 4 THEN
      -- SO-2024-001 (Installation) materials
      INSERT INTO service_order_materials (service_order_id, inventory_item_id, quantity_used, unit_cost, total_cost)
      VALUES
        (v_service_order_ids[1], v_inventory_ids[1], 6, 45.00, 270.00),
        (v_service_order_ids[1], v_inventory_ids[2], 8, 12.50, 100.00),
        (v_service_order_ids[1], v_inventory_ids[4], 1, 85.00, 85.00);

      -- SO-2024-002 (Preventive) materials  
      INSERT INTO service_order_materials (service_order_id, inventory_item_id, quantity_used, unit_cost, total_cost)
      VALUES
        (v_service_order_ids[2], v_inventory_ids[10], 1, 35.00, 35.00),
        (v_service_order_ids[2], v_inventory_ids[12], 0.5, 85.00, 42.50);

      -- SO-2024-003 (Corrective) materials
      INSERT INTO service_order_materials (service_order_id, inventory_item_id, quantity_used, unit_cost, total_cost)
      VALUES
        (v_service_order_ids[3], v_inventory_ids[1], 1, 45.00, 45.00);

      -- SO-2024-004 (Upgrade) materials
      INSERT INTO service_order_materials (service_order_id, inventory_item_id, quantity_used, unit_cost, total_cost)
      VALUES
        (v_service_order_ids[4], v_inventory_ids[8], 1, 180.00, 180.00),
        (v_service_order_ids[4], v_inventory_ids[10], 1, 35.00, 35.00);
    END IF;

    -- Insert invoices for completed service orders
    IF array_length(v_service_order_ids, 1) >= 4 THEN
      WITH inserted_invoices AS (
        INSERT INTO invoices (
          customer_id, service_order_id, invoice_number, invoice_type,
          payment_type, amount, tax_amount, total_amount, due_date, paid_date,
          status, days_overdue
        ) VALUES
          (v_customer_ids[1], v_service_order_ids[1], 'INV-2024-001', 'installation',
           'credit', 1250.00, 200.00, 1450.00, '2024-02-14', '2024-02-10', 'paid', 0),
          (v_customer_ids[2], v_service_order_ids[2], 'INV-2024-002', 'preventive',
           'cash', 285.00, 45.60, 330.60, '2024-02-10', '2024-02-10', 'paid', 0),
          (v_customer_ids[3], v_service_order_ids[3], 'INV-2024-003', 'corrective',
           'cash', 195.00, 31.20, 226.20, '2024-02-20', '2024-02-20', 'paid', 0),
          (v_customer_ids[4], v_service_order_ids[4], 'INV-2024-004', 'upgrade',
           'credit', 465.00, 74.40, 539.40, '2024-04-04', '2024-04-02', 'paid', 0),
          (v_customer_ids[4], v_service_order_ids[8], 'INV-2024-005', 'preventive',
           'credit', 215.00, 34.40, 249.40, '2024-04-19', NULL, 'pending', 0),
          (v_customer_ids[5], NULL, 'INV-2024-006', 'monitoring',
           'credit', 350.00, 56.00, 406.00, '2024-10-15', NULL, 'overdue', 40),
          (v_customer_ids[6], NULL, 'INV-2024-007', 'monitoring',
           'credit', 450.00, 72.00, 522.00, '2024-09-01', NULL, 'overdue', 84),
          (v_customer_ids[7], NULL, 'INV-2024-008', 'monitoring',
           'credit', 650.00, 104.00, 754.00, '2024-08-15', NULL, 'overdue', 101),
          (v_customer_ids[1], NULL, 'INV-2024-009', 'monitoring',
           'credit', 800.00, 128.00, 928.00, '2024-11-15', NULL, 'pending', 0),
          (v_customer_ids[4], NULL, 'INV-2024-010', 'monitoring',
           'credit', 600.00, 96.00, 696.00, '2024-11-20', NULL, 'pending', 0)
        RETURNING id
      )
      SELECT array_agg(id) INTO v_invoice_ids FROM inserted_invoices;
    END IF;
  END IF;

  RAISE NOTICE 'Sample data insertion completed successfully!';
  RAISE NOTICE 'Customers: %', array_length(v_customer_ids, 1);
  RAISE NOTICE 'Assets: %', array_length(v_asset_ids, 1);
  RAISE NOTICE 'Inventory Items: %', array_length(v_inventory_ids, 1);
  IF v_tech_id IS NOT NULL THEN
    RAISE NOTICE 'Service Orders: %', array_length(v_service_order_ids, 1);
    RAISE NOTICE 'Invoices: %', array_length(v_invoice_ids, 1);
  ELSE
    RAISE NOTICE 'Service Orders: Skipped (no technician users available)';
    RAISE NOTICE 'Invoices: Skipped (no service orders created)';
  END IF;
END $$;