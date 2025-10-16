-- Create screensaver_config table
CREATE TABLE public.screensaver_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transition_type text NOT NULL DEFAULT 'random' CHECK (transition_type IN ('random', 'bloom-fade', 'chromatic-split', 'parallax-deep', 'vortex-spin', 'glass-morph', 'runway-walk')),
  slide_duration_seconds integer NOT NULL DEFAULT 8 CHECK (slide_duration_seconds >= 3 AND slide_duration_seconds <= 60),
  enable_particles boolean NOT NULL DEFAULT true,
  show_branding boolean NOT NULL DEFAULT true,
  show_qr_code boolean NOT NULL DEFAULT true,
  performance_mode text NOT NULL DEFAULT 'auto' CHECK (performance_mode IN ('auto', 'enhanced', 'lite')),
  tap_message text NOT NULL DEFAULT 'Toque para ativar',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.screensaver_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view screensaver config"
  ON public.screensaver_config
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update screensaver config"
  ON public.screensaver_config
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default config
INSERT INTO public.screensaver_config (id) VALUES ('00000000-0000-0000-0000-000000000001');

-- Trigger for updated_at
CREATE TRIGGER update_screensaver_config_updated_at
  BEFORE UPDATE ON public.screensaver_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();