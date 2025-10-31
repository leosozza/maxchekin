-- ==========================================
-- MIGRATION: Complete Kanban CRM Setup
-- ==========================================
-- Creates kanban tables, adds missing fields, triggers, and RLS policies

-- 1. CREATE KANBAN TABLES
-- ==========================================

-- Kanban Stages (etapas do processo)
CREATE TABLE IF NOT EXISTS public.kanban_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  panel_id UUID REFERENCES public.panels(id) ON DELETE SET NULL,
  is_default BOOLEAN DEFAULT false,
  auto_call BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kanban Cards (leads no processo)
CREATE TABLE IF NOT EXISTS public.kanban_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL,
  model_name TEXT,
  responsible TEXT,
  room TEXT,
  stage_id UUID REFERENCES public.kanban_stages(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kanban Events (auditoria de movimentações)
CREATE TABLE IF NOT EXISTS public.kanban_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL,
  from_stage_id UUID REFERENCES public.kanban_stages(id) ON DELETE SET NULL,
  to_stage_id UUID REFERENCES public.kanban_stages(id) ON DELETE SET NULL,
  method TEXT CHECK (method IN ('kanban', 'checkin')),
  by_user UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kanban Stage Users (usuários por etapa)
CREATE TABLE IF NOT EXISTS public.kanban_stage_users (
  stage_id UUID REFERENCES public.kanban_stages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  PRIMARY KEY (stage_id, user_id)
);

-- 2. ADD MISSING FIELDS TO EXISTING TABLES
-- ==========================================

-- Add fields to check_in_config
DO $$ 
BEGIN
  ALTER TABLE public.check_in_config 
    ADD COLUMN IF NOT EXISTS display_duration_seconds INTEGER DEFAULT 5;
  ALTER TABLE public.check_in_config 
    ADD COLUMN IF NOT EXISTS show_responsible BOOLEAN DEFAULT true;
  ALTER TABLE public.check_in_config 
    ADD COLUMN IF NOT EXISTS show_lead_id BOOLEAN DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Ensure calls table has source field
DO $$ 
BEGIN
  ALTER TABLE public.calls 
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 3. CREATE INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_kanban_cards_stage_id ON public.kanban_cards(stage_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_lead_id ON public.kanban_cards(lead_id);
CREATE INDEX IF NOT EXISTS idx_kanban_events_lead_id ON public.kanban_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_kanban_events_created_at ON public.kanban_events(created_at DESC);

-- 4. CREATE TRIGGER FOR AUTO-CARD ON CHECK-IN
-- ==========================================

CREATE OR REPLACE FUNCTION public.fn_kanban_add_card_on_checkin()
RETURNS TRIGGER AS $$
DECLARE
  default_stage_id UUID;
BEGIN
  -- Encontrar a etapa padrão
  SELECT id INTO default_stage_id
  FROM public.kanban_stages
  WHERE is_default = true
  LIMIT 1;

  -- Se não encontrar etapa padrão, pegar a primeira
  IF default_stage_id IS NULL THEN
    SELECT id INTO default_stage_id
    FROM public.kanban_stages
    ORDER BY position
    LIMIT 1;
  END IF;

  -- Criar card apenas se encontrou uma etapa
  IF default_stage_id IS NOT NULL THEN
    -- Inserir card
    INSERT INTO public.kanban_cards (
      lead_id,
      model_name,
      responsible,
      room,
      stage_id,
      position
    ) VALUES (
      NEW.lead_id,
      NEW.model_name,
      NEW.responsible,
      NULL, -- room será preenchido depois
      default_stage_id,
      COALESCE((
        SELECT MAX(position) + 1
        FROM public.kanban_cards
        WHERE stage_id = default_stage_id
      ), 0)
    );

    -- Registrar evento
    INSERT INTO public.kanban_events (
      lead_id,
      from_stage_id,
      to_stage_id,
      method
    ) VALUES (
      NEW.lead_id,
      NULL,
      default_stage_id,
      'checkin'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger se não existir
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trigger_kanban_card_on_checkin ON public.check_ins;
  CREATE TRIGGER trigger_kanban_card_on_checkin
    AFTER INSERT ON public.check_ins
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_kanban_add_card_on_checkin();
END $$;

-- 5. ENABLE ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.kanban_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_stage_users ENABLE ROW LEVEL SECURITY;

-- 6. CREATE RLS POLICIES
-- ==========================================

-- kanban_stages: authenticated users can select
DROP POLICY IF EXISTS "Authenticated users can view kanban stages" ON public.kanban_stages;
CREATE POLICY "Authenticated users can view kanban stages"
  ON public.kanban_stages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage kanban stages" ON public.kanban_stages;
CREATE POLICY "Admins can manage kanban stages"
  ON public.kanban_stages FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- kanban_cards: authenticated users can select
DROP POLICY IF EXISTS "Authenticated users can view kanban cards" ON public.kanban_cards;
CREATE POLICY "Authenticated users can view kanban cards"
  ON public.kanban_cards FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and operators can manage kanban cards" ON public.kanban_cards;
CREATE POLICY "Admins and operators can manage kanban cards"
  ON public.kanban_cards FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'operator'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'operator'::app_role)
  );

-- kanban_events: authenticated users can select and insert
DROP POLICY IF EXISTS "Authenticated users can view kanban events" ON public.kanban_events;
CREATE POLICY "Authenticated users can view kanban events"
  ON public.kanban_events FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert kanban events" ON public.kanban_events;
CREATE POLICY "Authenticated users can insert kanban events"
  ON public.kanban_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- kanban_stage_users: admins only
DROP POLICY IF EXISTS "Admins can manage stage users" ON public.kanban_stage_users;
CREATE POLICY "Admins can manage stage users"
  ON public.kanban_stage_users FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7. SEED DEFAULT STAGES (only if empty)
-- ==========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.kanban_stages LIMIT 1) THEN
    INSERT INTO public.kanban_stages (name, position, is_default, auto_call)
    VALUES
      ('Check-in Realizado', 0, true, false),
      ('Atendimento Produtor', 1, false, false),
      ('Produção de Moda', 2, false, false),
      ('Maquiagem', 3, false, false),
      ('Estúdio (Fotografia)', 4, false, false),
      ('Entrega de Material', 5, false, false);
  END IF;
END $$;

-- 8. ENABLE REALTIME
-- ==========================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_stages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_events;

-- 9. CREATE UPDATED_AT TRIGGERS
-- ==========================================

DROP TRIGGER IF EXISTS update_kanban_stages_updated_at ON public.kanban_stages;
CREATE TRIGGER update_kanban_stages_updated_at
  BEFORE UPDATE ON public.kanban_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_kanban_cards_updated_at ON public.kanban_cards;
CREATE TRIGGER update_kanban_cards_updated_at
  BEFORE UPDATE ON public.kanban_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();