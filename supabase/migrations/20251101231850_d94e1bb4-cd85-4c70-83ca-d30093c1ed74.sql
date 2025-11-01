-- Add UPDATE policy to check_ins table to allow upsert operations
-- This enables operators to confirm check-in multiple times for the same lead_id
-- without violating RLS policies

-- Create UPDATE policy for check_ins
CREATE POLICY "Anyone can update check_ins"
ON public.check_ins
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Add comment explaining the policy
COMMENT ON POLICY "Anyone can update check_ins" ON public.check_ins IS 
'Allows upsert operations on check_ins table. This enables updating check-in data when confirming check-in multiple times for the same lead_id. The unique constraint on lead_id prevents duplicates.';