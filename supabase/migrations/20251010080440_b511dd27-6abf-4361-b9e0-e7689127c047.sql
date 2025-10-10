-- Create custom_fields table
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key TEXT UNIQUE NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'image', 'boolean')),
  bitrix_field_name TEXT,
  is_active BOOLEAN DEFAULT true,
  show_in_checkin BOOLEAN DEFAULT true,
  show_in_panels BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view custom fields"
  ON public.custom_fields
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage custom fields"
  ON public.custom_fields
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default fields
INSERT INTO public.custom_fields (field_key, field_label, field_type, bitrix_field_name, sort_order) VALUES
  ('model_name', 'Nome do Modelo', 'text', 'NAME', 1),
  ('model_photo', 'Foto', 'image', 'PHOTO', 2),
  ('responsible', 'Responsável', 'text', 'ASSIGNED_BY_NAME', 3),
  ('room', 'Sala', 'text', 'UF_CRM_ROOM', 4)
ON CONFLICT (field_key) DO NOTHING;

-- Add custom_data JSONB column to calls table
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}';

-- Create panel_config table
CREATE TABLE IF NOT EXISTS public.panel_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID REFERENCES public.panels(id) ON DELETE CASCADE,
  bitrix_webhook_url TEXT,
  notify_on_call BOOLEAN DEFAULT true,
  auto_advance BOOLEAN DEFAULT false,
  auto_advance_seconds INTEGER DEFAULT 30,
  visible_fields JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(panel_id)
);

-- Enable RLS
ALTER TABLE public.panel_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view panel configs"
  ON public.panel_config
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage panel configs"
  ON public.panel_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add update trigger for panel_config
CREATE TRIGGER update_panel_config_updated_at
  BEFORE UPDATE ON public.panel_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();