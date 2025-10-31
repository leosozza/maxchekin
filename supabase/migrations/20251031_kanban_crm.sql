-- ============================================================================
-- Idempotent Kanban CRM Migration
-- Date: 2025-10-31
-- Description: Complete Kanban CRM system integrated with call panels
-- Features:
--   - Kanban stages, cards, events, stage_users tables with RLS and realtime
--   - Seed data for initial stages
--   - Trigger to auto-create cards on check-in
--   - Integration with panels for calling leads
-- ============================================================================

-- Enable required extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: kanban_stages
-- ============================================================================
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS public.kanban_stages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    position int NOT NULL DEFAULT 0,
    panel_id uuid NULL REFERENCES public.panels(id) ON DELETE SET NULL,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Add columns if they don't exist (idempotent)
DO $$ BEGIN
  ALTER TABLE public.kanban_stages ADD COLUMN IF NOT EXISTS panel_id uuid REFERENCES public.panels(id) ON DELETE SET NULL;
  ALTER TABLE public.kanban_stages ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;
  ALTER TABLE public.kanban_stages ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- TABLE: kanban_cards
-- ============================================================================
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS public.kanban_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id text NOT NULL,
    model_name text,
    responsible text,
    stage_id uuid NOT NULL REFERENCES public.kanban_stages(id) ON DELETE CASCADE,
    position int NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_kanban_cards_stage_id ON public.kanban_cards(stage_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_lead_id ON public.kanban_cards(lead_id);

-- ============================================================================
-- TABLE: kanban_events (audit trail)
-- ============================================================================
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS public.kanban_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id text NOT NULL,
    from_stage_id uuid NULL REFERENCES public.kanban_stages(id) ON DELETE SET NULL,
    to_stage_id uuid NULL REFERENCES public.kanban_stages(id) ON DELETE SET NULL,
    method text NOT NULL CHECK (method IN ('kanban','checkin')),
    by_user uuid NULL,
    created_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_kanban_events_lead_id ON public.kanban_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_kanban_events_created_at ON public.kanban_events(created_at DESC);

-- ============================================================================
-- TABLE: kanban_stage_users (user-stage permissions)
-- ============================================================================
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS public.kanban_stage_users (
    stage_id uuid REFERENCES public.kanban_stages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (stage_id, user_id)
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================================
-- SEED DATA: Default stages (idempotent - only insert if empty)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.kanban_stages LIMIT 1) THEN
    INSERT INTO public.kanban_stages (name, position, is_default)
    VALUES
      ('Check-in realizado', 0, true),
      ('Atendimento Produtor', 1, false),
      ('Produção de Moda', 2, false),
      ('Maquiagem', 3, false),
      ('Fotografia', 4, false),
      ('Entrega de Material', 5, false);
    RAISE NOTICE 'Kanban stages seed data inserted';
  ELSE
    RAISE NOTICE 'Kanban stages already exist, skipping seed';
  END IF;
END $$;

-- ============================================================================
-- REALTIME: Enable realtime for all kanban tables
-- ============================================================================
DO $$
BEGIN
  -- Check if tables are already in realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'kanban_stages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_stages;
    RAISE NOTICE 'Added kanban_stages to realtime';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'kanban_cards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_cards;
    RAISE NOTICE 'Added kanban_cards to realtime';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'kanban_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_events;
    RAISE NOTICE 'Added kanban_events to realtime';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'kanban_stage_users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_stage_users;
    RAISE NOTICE 'Added kanban_stage_users to realtime';
  END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables (idempotent)
ALTER TABLE public.kanban_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_stage_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-creation)
DROP POLICY IF EXISTS "auth can read stages" ON public.kanban_stages;
DROP POLICY IF EXISTS "admins manage stages" ON public.kanban_stages;
DROP POLICY IF EXISTS "auth can read cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "operators update cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "operators insert cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "operators delete cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "auth can read events" ON public.kanban_events;
DROP POLICY IF EXISTS "operators insert events" ON public.kanban_events;
DROP POLICY IF EXISTS "auth read stage_users" ON public.kanban_stage_users;
DROP POLICY IF EXISTS "admins manage stage_users" ON public.kanban_stage_users;

-- Create policies
-- STAGES: Authenticated users can read, admins can manage
CREATE POLICY "auth can read stages" ON public.kanban_stages
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "admins manage stages" ON public.kanban_stages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CARDS: Authenticated can read, operators and admins can manage
CREATE POLICY "auth can read cards" ON public.kanban_cards
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "operators update cards" ON public.kanban_cards
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

CREATE POLICY "operators insert cards" ON public.kanban_cards
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

CREATE POLICY "operators delete cards" ON public.kanban_cards
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

-- EVENTS: Authenticated can read, operators can insert
CREATE POLICY "auth can read events" ON public.kanban_events
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "operators insert events" ON public.kanban_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

-- STAGE_USERS: Authenticated can read, admins can manage
CREATE POLICY "auth read stage_users" ON public.kanban_stage_users
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "admins manage stage_users" ON public.kanban_stage_users
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- TRIGGER: Auto-create card on check-in
-- ============================================================================

-- Drop and recreate function for clean update
DROP FUNCTION IF EXISTS public.trg_kanban_add_card_on_checkin() CASCADE;

CREATE OR REPLACE FUNCTION public.trg_kanban_add_card_on_checkin()
RETURNS TRIGGER AS $$
DECLARE
  default_stage_id uuid;
  existing_card_count int;
BEGIN
  -- Find the default stage (first stage where is_default = true)
  SELECT id INTO default_stage_id 
  FROM public.kanban_stages 
  WHERE is_default = true 
  ORDER BY position 
  LIMIT 1;
  
  IF default_stage_id IS NULL THEN
    -- If no default stage, use the first stage by position
    SELECT id INTO default_stage_id 
    FROM public.kanban_stages 
    ORDER BY position 
    LIMIT 1;
  END IF;
  
  IF default_stage_id IS NULL THEN
    RAISE EXCEPTION 'No kanban stage found to create card';
  END IF;

  -- Check if card already exists for this lead
  SELECT count(*) INTO existing_card_count 
  FROM public.kanban_cards 
  WHERE lead_id = NEW.lead_id;
  
  IF existing_card_count = 0 THEN
    -- Create card in default stage
    INSERT INTO public.kanban_cards (lead_id, model_name, responsible, stage_id, position)
    VALUES (NEW.lead_id, NEW.model_name, NEW.responsible, default_stage_id, 0);
    
    RAISE NOTICE 'Kanban card created for lead %', NEW.lead_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop if exists for clean re-creation)
DROP TRIGGER IF EXISTS trg_kanban_add_card_on_checkin ON public.check_ins;

CREATE TRIGGER trg_kanban_add_card_on_checkin
  AFTER INSERT ON public.check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_kanban_add_card_on_checkin();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Kanban CRM migration completed successfully!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Tables created/updated:';
  RAISE NOTICE '  - kanban_stages (with panel integration)';
  RAISE NOTICE '  - kanban_cards (linked to leads and stages)';
  RAISE NOTICE '  - kanban_events (audit trail)';
  RAISE NOTICE '  - kanban_stage_users (user permissions)';
  RAISE NOTICE 'Features enabled:';
  RAISE NOTICE '  - RLS policies for security';
  RAISE NOTICE '  - Realtime subscriptions';
  RAISE NOTICE '  - Auto card creation on check-in';
  RAISE NOTICE '  - Panel integration for calling leads';
  RAISE NOTICE '============================================================';
END $$;
