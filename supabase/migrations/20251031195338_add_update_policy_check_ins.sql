-- Add UPDATE policy on public.check_ins to allow upsert operations
-- This matches the open model already used for SELECT and INSERT policies

CREATE POLICY "Anyone can update check_ins"
ON public.check_ins
FOR UPDATE
USING (true)
WITH CHECK (true);
