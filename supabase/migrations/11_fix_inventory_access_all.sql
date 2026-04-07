-- Script to fix 'Permission Denied' (42501) for inventory tables and enforce strict Role-Based access
-- Includes existence checks to avoid "relation does not exist" errors on legacy/missing tables

-- Grant usage on schema just in case
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;

DO $$ 
DECLARE
  tb text;
  -- Full list of all possible inventory tables
  all_tables text[] := ARRAY[
    'inventory_categories', 'inventory_products', 'inventory_stock', 
    'inventory_suppliers', 'inventory_transactions', 'inventory_alerts', 
    'inventory_purchase_orders', 'inventory_purchase_order_items', 
    'inventory_locations', 'inventory_location_stock', 
    'inventory_material_requests', 'inventory_material_request_items', 
    'inventory_notifications', 'price_list'
  ];
  
  -- Tables where Technicians have SELECT permission (they need this to fill out requests)
  tech_read_tables text[] := ARRAY[
    'inventory_categories', 'price_list', 'inventory_locations', 
    'inventory_material_requests', 'inventory_material_request_items'
  ];
  
  -- Tables where Technicians can INSERT/UPDATE (Material requests)
  tech_write_tables text[] := ARRAY[
    'inventory_material_requests', 'inventory_material_request_items'
  ];
BEGIN
  -- 1. General Setup, Grants, and Cleanup for ALL existing tables
  FOREACH tb IN ARRAY all_tables LOOP
    -- Only process if the table actually exists in the database
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tb) THEN
      
      -- Grant explicit Postgres privileges
      EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO authenticated, service_role', tb);
      
      -- Enable Row Level Security (RLS)
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tb);
      
      -- Cleanup any existing generic or legacy policies to avoid conflict
      EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I', tb);
      EXECUTE format('DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.%I', tb);
      EXECUTE format('DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.%I', tb);
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view %s" ON public.%I', tb, tb);
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can insert %s" ON public.%I', tb, tb);
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update %s" ON public.%I', tb, tb);
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can delete %s" ON public.%I', tb, tb);
      EXECUTE format('DROP POLICY IF EXISTS "%s_select_policy" ON public.%I', tb, tb);
      EXECUTE format('DROP POLICY IF EXISTS "%s_insert_policy" ON public.%I', tb, tb);
      EXECUTE format('DROP POLICY IF EXISTS "%s_update_policy" ON public.%I', tb, tb);
      EXECUTE format('DROP POLICY IF EXISTS "%s_delete_policy" ON public.%I', tb, tb);
      EXECUTE format('DROP POLICY IF EXISTS "role_select_%s" ON public.%I', tb, tb);
      EXECUTE format('DROP POLICY IF EXISTS "role_insert_%s" ON public.%I', tb, tb);
      EXECUTE format('DROP POLICY IF EXISTS "role_update_%s" ON public.%I', tb, tb);
      EXECUTE format('DROP POLICY IF EXISTS "role_delete_%s" ON public.%I', tb, tb);

      -------------------------------------------------------
      -- 2. APPLY ROLE-BASED POLICIES
      -------------------------------------------------------
      
      -- SELECT POLICY (Read)
      IF tb = ANY(tech_read_tables) THEN
        -- Technicians and Admins can read these core catalog / request tables
        EXECUTE format('CREATE POLICY "role_select_%s" ON public.%I FOR SELECT TO authenticated USING (true)', tb, tb);
      ELSE
        -- Strict Admin-only read for sensitive backend-only tables
        EXECUTE format('CREATE POLICY "role_select_%s" ON public.%I FOR SELECT TO authenticated USING (public.is_admin())', tb, tb);
      END IF;

      -- INSERT POLICY (Create)
      IF tb = ANY(tech_write_tables) THEN
        -- Technicians and Admins can create material requests
        EXECUTE format('CREATE POLICY "role_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', tb, tb);
      ELSE
        -- Admin only insert
        EXECUTE format('CREATE POLICY "role_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())', tb, tb);
      END IF;

      -- UPDATE POLICY (Modify)
      IF tb = 'inventory_material_requests' THEN
        -- Technicians and Admins can update material requests (to add notes, change status, etc)
        EXECUTE format('CREATE POLICY "role_update_%s" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', tb, tb);
      ELSE
        -- Admin only update
        EXECUTE format('CREATE POLICY "role_update_%s" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', tb, tb);
      END IF;

      -- DELETE POLICY (Remove)
      -- Nobody but Admin can delete ANYTHING in the inventory/requests natively
      EXECUTE format('CREATE POLICY "role_delete_%s" ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', tb, tb);

    END IF;
  END LOOP;
END $$;
