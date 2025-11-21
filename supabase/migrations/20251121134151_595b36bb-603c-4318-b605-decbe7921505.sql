-- Fix RLS policy for system_settings table
-- This allows authenticated users (dashboard admins) to save AI prompts

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "auth_all_system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admin full access to system_settings" ON public.system_settings;

-- Create new comprehensive policy that allows all operations
CREATE POLICY "allow_authenticated_all_system_settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled for security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;