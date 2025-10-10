-- Create panels table for managing different display screens
CREATE TABLE public.panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  bitrix_stage_id TEXT,
  default_layout TEXT DEFAULT 'clean',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create calls table for queue management
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID REFERENCES public.panels(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_photo TEXT,
  responsible TEXT,
  room TEXT,
  status TEXT DEFAULT 'waiting',
  called_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create media table for videos and photos
CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID REFERENCES public.panels(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('video', 'photo')),
  url TEXT NOT NULL,
  title TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create check_ins table for tracking
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL UNIQUE,
  model_name TEXT NOT NULL,
  model_photo TEXT,
  responsible TEXT,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  bitrix_updated BOOLEAN DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Public read access for panels (TVs need to see them)
CREATE POLICY "Anyone can view active panels"
ON public.panels FOR SELECT
USING (is_active = true);

-- Public read access for calls (TVs need to see queue)
CREATE POLICY "Anyone can view calls"
ON public.calls FOR SELECT
USING (true);

-- Public read access for media
CREATE POLICY "Anyone can view active media"
ON public.media FOR SELECT
USING (is_active = true);

-- Public read access for check_ins
CREATE POLICY "Anyone can view check_ins"
ON public.check_ins FOR SELECT
USING (true);

-- Public insert for check_ins (check-in screen needs to create)
CREATE POLICY "Anyone can create check_ins"
ON public.check_ins FOR INSERT
WITH CHECK (true);

-- Public insert for calls (webhook needs to create)
CREATE POLICY "Anyone can create calls"
ON public.calls FOR INSERT
WITH CHECK (true);

-- Public update for calls
CREATE POLICY "Anyone can update calls"
ON public.calls FOR UPDATE
USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for panels
CREATE TRIGGER update_panels_updated_at
BEFORE UPDATE ON public.panels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for calls table
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;

-- Insert default panels
INSERT INTO public.panels (name, slug, description, icon, bitrix_stage_id, default_layout) VALUES
('Recepção', 'recepcao', 'Painel de entrada e boas-vindas', 'UserCheck', 'RECEPCAO', 'clean'),
('Estúdio A', 'estudio-a', 'Chamadas para o estúdio principal', 'Camera', 'ESTUDIO_A', 'video'),
('Estúdio B', 'estudio-b', 'Chamadas para o estúdio secundário', 'Video', 'ESTUDIO_B', 'gallery'),
('Sala de Espera', 'sala-espera', 'Fila de aguardo', 'Users', 'WAITING', 'split');