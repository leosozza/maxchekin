-- Add additional fields to check_in_config for welcome screen customization
ALTER TABLE public.check_in_config
ADD COLUMN IF NOT EXISTS display_duration_seconds INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS show_responsible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_lead_id BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.check_in_config.display_duration_seconds IS 'Duration in seconds to display the welcome screen after check-in';
COMMENT ON COLUMN public.check_in_config.show_responsible IS 'Whether to display the responsible person name';
COMMENT ON COLUMN public.check_in_config.show_lead_id IS 'Whether to display the lead ID on welcome screen';
