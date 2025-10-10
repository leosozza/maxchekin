-- Criar tabela de configuração do Check-in
CREATE TABLE IF NOT EXISTS public.check_in_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  welcome_message text NOT NULL DEFAULT 'Seja bem-vinda',
  show_photo_placeholder boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.check_in_config (welcome_message) 
VALUES ('Seja bem-vinda');

-- RLS Policies
ALTER TABLE public.check_in_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view check-in config"
  ON public.check_in_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can update check-in config"
  ON public.check_in_config FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_check_in_config_updated_at
  BEFORE UPDATE ON public.check_in_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();