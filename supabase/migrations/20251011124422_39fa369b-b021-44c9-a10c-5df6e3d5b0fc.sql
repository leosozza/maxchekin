-- ============================================================================
-- Migration: Restrict Access to Sensitive Tables with Row Level Security
-- ============================================================================
-- Purpose: Enable proper Row Level Security (RLS) on all sensitive tables
-- requiring authentication for all SELECT, INSERT, UPDATE, and DELETE operations.
-- This migration implements Supabase Auth-based access control using auth.uid()
-- and restricts configuration table modifications to users with the 'admin' role.
--
-- Tables affected:
--   - check_ins: Check-in tracking data
--   - calls: Call queue management
--   - activity_logs: System activity logs
--   - check_in_config: Check-in screen configuration
--   - panel_config: Panel-specific configuration
--   - custom_fields: Custom field definitions
--   - panel_layouts: Panel UI layout configuration
--
-- References:
--   - https://supabase.com/docs/guides/auth/row-level-security
--   - https://supabase.com/docs/guides/auth/row-level-security#policies
-- ============================================================================

-- ============================================================================
-- 1. RESTRICT ACCESS TO check_ins TABLE
-- ============================================================================
-- The check_ins table stores sensitive check-in data and must only be 
-- accessible to authenticated users.

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view check_ins" ON public.check_ins;
DROP POLICY IF EXISTS "Anyone can create check_ins" ON public.check_ins;

-- Create authenticated-only policy for all operations
CREATE POLICY "Authenticated users can access check_ins"
ON public.check_ins
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 2. RESTRICT ACCESS TO calls TABLE
-- ============================================================================
-- The calls table manages the call queue and contains sensitive lead information.

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view calls" ON public.calls;
DROP POLICY IF EXISTS "Anyone can create calls" ON public.calls;
DROP POLICY IF EXISTS "Anyone can update calls" ON public.calls;

-- Create authenticated-only policy for all operations
CREATE POLICY "Authenticated users can access calls"
ON public.calls
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 3. RESTRICT ACCESS TO activity_logs TABLE
-- ============================================================================
-- Activity logs contain sensitive system events and user actions.

-- Drop existing policies that allow any authenticated user
DROP POLICY IF EXISTS "Anyone can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;

-- Recreate with explicit authentication check
CREATE POLICY "Authenticated users can view activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Admin policy remains unchanged (already properly secured)
-- "Admins can manage activity logs" policy already exists

-- ============================================================================
-- 4. RESTRICT ACCESS TO check_in_config TABLE
-- ============================================================================
-- Check-in configuration should only be viewable and modifiable by authenticated users.
-- Modifications are restricted to admins only.

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view check-in config" ON public.check_in_config;
DROP POLICY IF EXISTS "Admins can update check-in config" ON public.check_in_config;

-- Authenticated users can view configuration
CREATE POLICY "Authenticated users can view check-in config"
ON public.check_in_config
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Only admins can modify configuration
CREATE POLICY "Admins can manage check-in config"
ON public.check_in_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 5. RESTRICT ACCESS TO panel_config TABLE
-- ============================================================================
-- Panel configuration contains webhook URLs and other sensitive settings.

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view panel configs" ON public.panel_config;
DROP POLICY IF EXISTS "Admins can manage panel configs" ON public.panel_config;

-- Authenticated users can view configuration
CREATE POLICY "Authenticated users can view panel configs"
ON public.panel_config
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Only admins can modify configuration
CREATE POLICY "Admins can manage panel configs"
ON public.panel_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 6. RESTRICT ACCESS TO custom_fields TABLE
-- ============================================================================
-- Custom field definitions should be protected from unauthorized access.

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view custom fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Admins can manage custom fields" ON public.custom_fields;

-- Authenticated users can view custom fields
CREATE POLICY "Authenticated users can view custom fields"
ON public.custom_fields
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Only admins can manage custom fields
CREATE POLICY "Admins can manage custom fields"
ON public.custom_fields
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 7. RESTRICT ACCESS TO panel_layouts TABLE
-- ============================================================================
-- Panel layouts contain UI configuration and should be protected.

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view panel layouts" ON public.panel_layouts;
DROP POLICY IF EXISTS "Admins can manage panel layouts" ON public.panel_layouts;

-- Authenticated users can view panel layouts
CREATE POLICY "Authenticated users can view panel layouts"
ON public.panel_layouts
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Only admins can manage panel layouts
CREATE POLICY "Admins can manage panel layouts"
ON public.panel_layouts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
-- This migration has successfully:
-- 1. Restricted check_ins table to authenticated users only
-- 2. Restricted calls table to authenticated users only
-- 3. Ensured activity_logs requires authentication for all operations
-- 4. Updated check_in_config to require authentication for viewing
-- 5. Updated panel_config to require authentication for viewing
-- 6. Updated custom_fields to require authentication for viewing
-- 7. Updated panel_layouts to require authentication for viewing
-- 8. Maintained admin-only access for modifications to configuration tables
--
-- All tables now require authentication (auth.uid() IS NOT NULL) for access,
-- and configuration tables require the 'admin' role for modifications.
-- ============================================================================
