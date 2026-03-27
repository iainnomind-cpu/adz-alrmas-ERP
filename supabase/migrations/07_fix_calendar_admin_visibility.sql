/*
  # Fix Calendar Role-Based Visibility
  
  1. Purpose
    - Allows 'Admin' users to view all `service_orders` and `calendar_concepts` in the calendar.
    - Resolves the bug where events were entirely invisible to administrators because the previous 
      RLS policies implicitly required `auth.uid() = technician_id` or `assigned_to` for viewing.

  2. Changes
    - Safely replaces the `SELECT` policy on `service_orders`
    - Safely replaces the `SELECT` policy on `calendar_concepts`
    - Preserves security so `technicians` can only see what they manage (if applied locally)
    - Admins defined via the `roles` and `user_roles` linking tables automatically gain bypass permission.
*/

-- 1. Helper function to check if the current user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Drop legacy SELECT policies from service_orders to avoid arbitrary logic collisions
DROP POLICY IF EXISTS "Authenticated users can view service orders" ON service_orders;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON service_orders;
DROP POLICY IF EXISTS "Technicians can manage service orders" ON service_orders;


-- 3. Install new Hybrid SELECT Policy for service_orders
CREATE POLICY "Role-based select on service_orders"
ON service_orders 
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  auth.uid() = technician_id
);


-- 4. Drop legacy SELECT policies from calendar_concepts
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver conceptos" ON calendar_concepts;
DROP POLICY IF EXISTS "Role-based select on calendar_concepts" ON calendar_concepts;

-- 5. Install new Hybrid SELECT Policy for calendar_concepts
CREATE POLICY "Role-based select on calendar_concepts"
ON calendar_concepts
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  auth.uid() = assigned_to OR 
  auth.uid() = created_by
);
