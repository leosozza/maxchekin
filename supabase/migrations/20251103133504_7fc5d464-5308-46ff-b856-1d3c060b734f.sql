-- Adicionar campo para opções de lista em custom_fields
ALTER TABLE public.custom_fields 
ADD COLUMN field_options jsonb DEFAULT '[]'::jsonb;

-- Adicionar campo para vincular campos customizados a etapas
CREATE TABLE IF NOT EXISTS public.kanban_stage_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES public.kanban_stages(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  is_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stage_id, field_id)
);

-- RLS policies para kanban_stage_fields
ALTER TABLE public.kanban_stage_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stage fields"
ON public.kanban_stage_fields
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage stage fields"
ON public.kanban_stage_fields
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar campo para armazenar valores de campos customizados nos cards
ALTER TABLE public.kanban_cards
ADD COLUMN custom_field_values jsonb DEFAULT '{}'::jsonb;