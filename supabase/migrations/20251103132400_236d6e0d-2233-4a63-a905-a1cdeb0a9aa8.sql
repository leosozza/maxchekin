-- Adicionar campo webhook_url na tabela kanban_stages
ALTER TABLE public.kanban_stages 
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_on_enter BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_on_exit BOOLEAN DEFAULT false;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.kanban_stages.webhook_url IS 
'URL do webhook a ser chamado quando um lead entra ou sai desta etapa';

COMMENT ON COLUMN public.kanban_stages.webhook_on_enter IS 
'Se true, chama o webhook quando um lead ENTRA nesta etapa';

COMMENT ON COLUMN public.kanban_stages.webhook_on_exit IS 
'Se true, chama o webhook quando um lead SAI desta etapa';