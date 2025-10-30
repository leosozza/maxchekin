-- Migration: link kanban_stages to panels
-- File: supabase/migrations/20251031_000000_link_kanban_stages_to_panels.sql
-- PURPOSE:
--  - Link existing kanban_stages.panel_id to panels based on name matching (case-insensitive).
--  - Provide a safe fallback mapping for stages whose name contains configured keywords.
--  - Idempotent and safe for production.
--
-- IMPORTANT (read before running):
-- 1) Backup the affected tables before running:
--      SELECT pg_dump -- or use your Supabase backup/export workflow
--      Recommended: export public.kanban_stages and public.panels (and keep a copy).
-- 2) This migration uses a FALLBACK_PANEL_UUID placeholder below.
--    Replace 'FALLBACK_PANEL_UUID' with an actual panel UUID from your panels table before running.
--    Example: SELECT id, name FROM public.panels; -- to see available panels
--    Then replace FALLBACK_PANEL_UUID with something like 'fee7d3ad-e0d4-4193-b474-c1a36be5db42'
-- 3) This migration is idempotent - it can be run multiple times safely.
-- 4) The migration is transactional - if any error occurs, all changes are rolled back.
--
-- ROLLBACK INSTRUCTIONS (if needed after running):
-- To revert all changes made by this migration, run:
--   BEGIN;
--   UPDATE public.kanban_stages SET panel_id = NULL WHERE panel_id IS NOT NULL;
--   COMMIT;
--
-- DIAGNOSTIC QUERIES (uncomment and run separately to inspect data before/after):
-- -- View all current kanban_stages with their panel assignments:
-- SELECT ks.id, ks.name, ks.panel_id, p.name as panel_name
-- FROM public.kanban_stages ks
-- LEFT JOIN public.panels p ON ks.panel_id = p.id
-- ORDER BY ks.position;
--
-- -- View all panels:
-- SELECT id, name, slug, is_active FROM public.panels ORDER BY name;
--
-- -- View stages that will be matched by exact name:
-- SELECT ks.name as stage_name, p.name as panel_name, p.id as panel_id
-- FROM public.kanban_stages ks
-- CROSS JOIN public.panels p
-- WHERE LOWER(ks.name) = LOWER(p.name)
-- AND ks.panel_id IS NULL;
--
-- -- View stages that contain keywords (check, check-in, recep, recepção, chamada):
-- SELECT ks.name as stage_name, ks.id
-- FROM public.kanban_stages ks
-- WHERE ks.panel_id IS NULL
-- AND (
--   LOWER(ks.name) LIKE '%check%'
--   OR LOWER(ks.name) LIKE '%recep%'
--   OR LOWER(ks.name) LIKE '%chamada%'
-- );

BEGIN;

-- Step 1: Update kanban_stages.panel_id based on EXACT case-insensitive name match
-- Only update if exactly ONE panel matches the stage name
DO $$
DECLARE
  stage_record RECORD;
  matching_panel_id uuid;
  match_count int;
  updated_count int := 0;
BEGIN
  -- Loop through all stages that don't have a panel_id yet
  FOR stage_record IN
    SELECT id, name
    FROM public.kanban_stages
    WHERE panel_id IS NULL
  LOOP
    -- Count how many panels match this stage name (case-insensitive)
    SELECT COUNT(*), MAX(id)
    INTO match_count, matching_panel_id
    FROM public.panels
    WHERE LOWER(name) = LOWER(stage_record.name);
    
    -- Only update if exactly one panel matches
    IF match_count = 1 THEN
      UPDATE public.kanban_stages
      SET panel_id = matching_panel_id
      WHERE id = stage_record.id;
      
      updated_count := updated_count + 1;
      
      RAISE NOTICE 'Matched stage "%" to panel ID %', stage_record.name, matching_panel_id;
    ELSIF match_count > 1 THEN
      RAISE NOTICE 'Stage "%" has multiple panel matches (%), skipping for safety', stage_record.name, match_count;
    ELSE
      RAISE NOTICE 'Stage "%" has no exact panel match, will check fallback keywords', stage_record.name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Step 1 complete: Updated % stages with exact name matches', updated_count;
END $$;

-- Step 2: Fallback mapping for stages with specific keywords
-- These stages contain keywords like: check, check-in, recep, recepção, chamada
-- IMPORTANT: Replace FALLBACK_PANEL_UUID with an actual panel UUID before running!
DO $$
DECLARE
  fallback_panel_id uuid := 'FALLBACK_PANEL_UUID'::uuid;  -- ⚠️ REPLACE THIS BEFORE RUNNING!
  stage_record RECORD;
  fallback_count int := 0;
BEGIN
  -- Check if the fallback panel UUID was replaced
  IF fallback_panel_id::text = 'FALLBACK_PANEL_UUID' THEN
    RAISE EXCEPTION 'FALLBACK_PANEL_UUID placeholder must be replaced with an actual panel UUID before running this migration. See migration file comments for instructions.';
  END IF;
  
  -- Verify the fallback panel exists
  IF NOT EXISTS (SELECT 1 FROM public.panels WHERE id = fallback_panel_id) THEN
    RAISE EXCEPTION 'Fallback panel UUID % does not exist in public.panels', fallback_panel_id;
  END IF;
  
  -- Loop through stages that still don't have a panel_id and contain keywords
  FOR stage_record IN
    SELECT id, name
    FROM public.kanban_stages
    WHERE panel_id IS NULL
    AND (
      LOWER(name) LIKE '%check%'
      OR LOWER(name) LIKE '%recep%'
      OR LOWER(name) LIKE '%chamada%'
    )
  LOOP
    UPDATE public.kanban_stages
    SET panel_id = fallback_panel_id
    WHERE id = stage_record.id;
    
    fallback_count := fallback_count + 1;
    
    RAISE NOTICE 'Applied fallback mapping for stage "%" to panel ID %', stage_record.name, fallback_panel_id;
  END LOOP;
  
  RAISE NOTICE 'Step 2 complete: Applied fallback mapping to % stages', fallback_count;
END $$;

-- Final summary: Report updated row counts
DO $$
DECLARE
  total_stages int;
  stages_with_panel int;
  stages_without_panel int;
BEGIN
  SELECT COUNT(*) INTO total_stages FROM public.kanban_stages;
  SELECT COUNT(*) INTO stages_with_panel FROM public.kanban_stages WHERE panel_id IS NOT NULL;
  SELECT COUNT(*) INTO stages_without_panel FROM public.kanban_stages WHERE panel_id IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION SUMMARY:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total kanban_stages: %', total_stages;
  RAISE NOTICE 'Stages with panel_id: %', stages_with_panel;
  RAISE NOTICE 'Stages without panel_id: %', stages_without_panel;
  RAISE NOTICE '========================================';
  
  IF stages_without_panel > 0 THEN
    RAISE NOTICE 'WARNING: % stage(s) still have no panel_id assigned', stages_without_panel;
    RAISE NOTICE 'Review these stages manually:';
    
    FOR stage_record IN
      SELECT id, name, position
      FROM public.kanban_stages
      WHERE panel_id IS NULL
      ORDER BY position
    LOOP
      RAISE NOTICE '  - Stage "%", ID: %', stage_record.name, stage_record.id;
    END LOOP;
  END IF;
END $$;

COMMIT;

-- Post-migration verification query (run this separately after migration completes):
-- SELECT
--   ks.id,
--   ks.name AS stage_name,
--   ks.position,
--   ks.panel_id,
--   p.name AS panel_name,
--   p.slug AS panel_slug
-- FROM public.kanban_stages ks
-- LEFT JOIN public.panels p ON ks.panel_id = p.id
-- ORDER BY ks.position;
