-- Criar tabela para gerenciamento de APK
CREATE TABLE public.apk_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version text NOT NULL,
  download_url text NOT NULL,
  file_size bigint,
  release_notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apk_config ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Public can view active APK config"
  ON public.apk_config
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage APK config"
  ON public.apk_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_apk_config_updated_at
  BEFORE UPDATE ON public.apk_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();