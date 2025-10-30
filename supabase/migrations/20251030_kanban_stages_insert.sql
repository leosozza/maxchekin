-- Insert Kanban stages with panel links
-- This migration adds specific stages linked to existing panels
-- and sets Checkin as the default stage

-- Insert stages only if they don't already exist (idempotent)
-- Using DO $$ block to check existence before inserting
DO $$
BEGIN
  -- Insert Checkin stage
  IF NOT EXISTS (SELECT 1 FROM public.kanban_stages WHERE name = 'Checkin') THEN
    INSERT INTO public.kanban_stages (name, position, is_default, panel_id)
    VALUES ('Checkin', 0, true, NULL);
  END IF;

  -- Insert Produtor stage
  IF NOT EXISTS (SELECT 1 FROM public.kanban_stages WHERE name = 'Produtor') THEN
    INSERT INTO public.kanban_stages (name, position, is_default, panel_id)
    VALUES ('Produtor', 1, false, 'fee7d3ad-e0d4-4193-b474-c1a36be5db42'::uuid);
  END IF;

  -- Insert Moda stage
  IF NOT EXISTS (SELECT 1 FROM public.kanban_stages WHERE name = 'Moda') THEN
    INSERT INTO public.kanban_stages (name, position, is_default, panel_id)
    VALUES ('Moda', 2, false, '4dcd273a-bd59-4fa8-95bd-00ae7beb6d41'::uuid);
  END IF;

  -- Insert Maquiagem stage
  IF NOT EXISTS (SELECT 1 FROM public.kanban_stages WHERE name = 'Maquiagem') THEN
    INSERT INTO public.kanban_stages (name, position, is_default, panel_id)
    VALUES ('Maquiagem', 3, false, 'e3a01fe1-2303-450b-8172-d5b090da714c'::uuid);
  END IF;

  -- Insert Estudio 1 stage
  IF NOT EXISTS (SELECT 1 FROM public.kanban_stages WHERE name = 'Estudio 1') THEN
    INSERT INTO public.kanban_stages (name, position, is_default, panel_id)
    VALUES ('Estudio 1', 4, false, '1d51c68d-1b50-4204-8709-e03dde0de782'::uuid);
  END IF;

  -- Insert Sala de espera stage
  IF NOT EXISTS (SELECT 1 FROM public.kanban_stages WHERE name = 'Sala de espera') THEN
    INSERT INTO public.kanban_stages (name, position, is_default, panel_id)
    VALUES ('Sala de espera', 5, false, '3aef6ba3-a770-4dba-813f-9284b161f39f'::uuid);
  END IF;

  -- Ensure only Checkin is marked as default
  -- Update any other stages that might have is_default = true
  UPDATE public.kanban_stages
  SET is_default = false
  WHERE name != 'Checkin' AND is_default = true;
END $$;
