-- Add project_id column to appointments table for commercial project tracking
-- This field corresponds to PARENT_ID_1120 in Bitrix (Projeto Comercial)
-- Default value is 4 which represents the current commercial project

ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS project_id INTEGER DEFAULT 4;

-- Add comment to explain the field
COMMENT ON COLUMN public.appointments.project_id IS 
'Project ID corresponding to PARENT_ID_1120 in Bitrix. Default is 4 (Projeto Comercial)';

-- Create index for efficient querying by project
CREATE INDEX IF NOT EXISTS idx_appointments_project_id ON public.appointments(project_id);
