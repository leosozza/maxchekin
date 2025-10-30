-- Create table for lead creation default field values
CREATE TABLE IF NOT EXISTS public.lead_creation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL UNIQUE,
  field_value TEXT,
  field_type TEXT DEFAULT 'text',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add standard project fields
INSERT INTO public.lead_creation_config (field_name, field_value, field_type, description, is_active)
VALUES 
  ('PARENT_ID_1120', '', 'text', 'Projetos Comerciais - ID do projeto pai', true),
  ('UF_CRM_1741215746', '', 'text', 'Campo customizado - Projeto relacionado', true),
  ('UF_CRM_1744900570916', '', 'text', 'Campo customizado - Nome', true),
  ('UF_CRM_LEAD_1732627097745', '', 'text', 'Campo customizado - Nome do Modelo', true)
ON CONFLICT (field_name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.lead_creation_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view lead creation config"
ON public.lead_creation_config
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage lead creation config"
ON public.lead_creation_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_lead_creation_config_updated_at
  BEFORE UPDATE ON public.lead_creation_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.lead_creation_config IS 'Configuration for default field values when creating new leads in Bitrix';
COMMENT ON COLUMN public.lead_creation_config.field_name IS 'Bitrix field name (e.g., PARENT_ID_1120)';
COMMENT ON COLUMN public.lead_creation_config.field_value IS 'Default value to use when creating leads';
COMMENT ON COLUMN public.lead_creation_config.field_type IS 'Type of field (text, number, select, etc.)';
