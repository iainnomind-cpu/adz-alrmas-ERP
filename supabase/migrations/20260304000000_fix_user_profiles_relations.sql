/*
  Fix relation between user_roles and user_profiles so that PostgREST 
  can correctly detect the join path when querying from user_profiles.
*/

-- Drop the direct reference to auth.users if it exists (usually named user_roles_user_id_fkey)
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Add reference to user_profiles instead
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
