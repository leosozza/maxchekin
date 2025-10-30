-- ============================================================================
-- Migration: Link Kanban Stages to Panels
-- Date: 2025-10-31
-- Description: Links existing kanban_stages to panels using two strategies:
--              1) Exact case-insensitive name match
--              2) Fallback keyword mapping for specific stages
--
-- ⚠️  IMPORTANT - READ BEFORE RUNNING ⚠️
-- 
-- BACKUP RECOMMENDATION:
--   Before running this migration, backup your kanban_stages table:
--   pg_dump -h <host> -U <user> -d <database> -t public.kanban_stages > kanban_stages_backup.sql
--
-- PLACEHOLDER REPLACEMENT:
--   This migration uses a placeholder UUID for fallback mappings.
--   You MUST replace 'REPLACE_WITH_FALLBACK_PANEL_UUID' with an actual panel UUID
--   before running this migration. Example panel UUID: '3aef6ba3-a770-4dba-813f-9284b161f39f'
--
-- IDEMPOTENCY:
--   This migration is idempotent. Running it multiple times will not
--   create duplicate updates. Only stages with NULL panel_id will be updated.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DIAGNOSTIC QUERY (Commented - uncomment to preview before running)
-- ----------------------------------------------------------------------------
-- This query shows what changes would be made without executing them:
--
-- SELECT 
--   ks.id as stage_id,
--   ks.name as stage_name,
--   ks.panel_id as current_panel_id,
--   p.id as matched_panel_id,
--   p.name as matched_panel_name,
--   CASE
--     WHEN p.id IS NOT NULL THEN 'exact_match'
--     WHEN lower(trim(ks.name)) LIKE '%check%' OR 
--          lower(trim(ks.name)) LIKE '%check-in%' OR
--          lower(trim(ks.name)) LIKE '%recep%' OR
--          lower(trim(ks.name)) LIKE '%recepção%' OR
--          lower(trim(ks.name)) LIKE '%chamada%' THEN 'fallback_keyword_match'
--     ELSE 'no_match'
--   END as match_type
-- FROM public.kanban_stages ks
-- LEFT JOIN (
--   SELECT id, name
--   FROM public.panels
--   WHERE lower(trim(name)) IN (
--     SELECT lower(trim(name))
--     FROM public.panels
--     GROUP BY lower(trim(name))
--     HAVING count(*) = 1
--   )
-- ) p ON lower(trim(p.name)) = lower(trim(ks.name))
-- WHERE ks.panel_id IS NULL
-- ORDER BY ks.position;
-- ----------------------------------------------------------------------------

BEGIN;

-- Define the fallback panel UUID placeholder
-- ⚠️  OPERATOR: Replace this UUID with your actual fallback panel UUID before running
DO $$
DECLARE
  v_fallback_panel_uuid_text TEXT := 'REPLACE_WITH_FALLBACK_PANEL_UUID';
  v_fallback_panel_uuid UUID;
  v_exact_match_count INT := 0;
  v_fallback_match_count INT := 0;
BEGIN
  
  -- Validation: Check if placeholder was replaced
  IF v_fallback_panel_uuid_text = 'REPLACE_WITH_FALLBACK_PANEL_UUID' THEN
    RAISE EXCEPTION 'PLACEHOLDER NOT REPLACED: You must replace REPLACE_WITH_FALLBACK_PANEL_UUID with an actual panel UUID before running this migration.';
  END IF;
  
  -- Cast to UUID after validation
  v_fallback_panel_uuid := v_fallback_panel_uuid_text::UUID;

  -- Validation: Check if fallback panel exists
  IF NOT EXISTS (SELECT 1 FROM public.panels WHERE id = v_fallback_panel_uuid) THEN
    RAISE EXCEPTION 'INVALID FALLBACK PANEL UUID: Panel with UUID % does not exist.', v_fallback_panel_uuid;
  END IF;

  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'Starting Kanban Stages to Panels linking migration...';
  RAISE NOTICE 'Fallback Panel UUID: %', v_fallback_panel_uuid;
  RAISE NOTICE '==================================================================';

  -- ----------------------------------------------------------------------------
  -- STRATEGY 1: Exact case-insensitive name matching
  -- ----------------------------------------------------------------------------
  -- Update stages where there is exactly one panel with matching name
  -- (case-insensitive, trimmed)
  RAISE NOTICE 'Step 1: Applying exact case-insensitive name matches...';
  
  WITH exact_matches AS (
    UPDATE public.kanban_stages ks
    SET panel_id = p.id
    FROM (
      -- Find panels with unique lowercase trimmed names
      SELECT p1.id, lower(trim(p1.name)) as normalized_name
      FROM public.panels p1
      WHERE lower(trim(p1.name)) IN (
        SELECT lower(trim(name))
        FROM public.panels
        GROUP BY lower(trim(name))
        HAVING count(*) = 1  -- Only unique names
      )
    ) p
    WHERE lower(trim(ks.name)) = p.normalized_name
      AND ks.panel_id IS NULL  -- Only update NULL panel_ids (idempotency)
    RETURNING ks.id, ks.name, ks.panel_id
  )
  SELECT count(*) INTO v_exact_match_count FROM exact_matches;
  
  RAISE NOTICE '  ✓ Updated % stages via exact name matching', v_exact_match_count;

  -- ----------------------------------------------------------------------------
  -- STRATEGY 2: Fallback keyword-based mapping
  -- ----------------------------------------------------------------------------
  -- Update stages containing specific keywords to the fallback panel
  RAISE NOTICE 'Step 2: Applying fallback keyword-based mappings...';
  
  WITH fallback_matches AS (
    UPDATE public.kanban_stages
    SET panel_id = v_fallback_panel_uuid
    WHERE panel_id IS NULL  -- Only update stages not yet linked (idempotency)
      AND (
        lower(trim(name)) LIKE '%check%' OR
        lower(trim(name)) LIKE '%check-in%' OR
        lower(trim(name)) LIKE '%recep%' OR
        lower(trim(name)) LIKE '%recepção%' OR
        lower(trim(name)) LIKE '%chamada%'
      )
    RETURNING id, name, panel_id
  )
  SELECT count(*) INTO v_fallback_match_count FROM fallback_matches;
  
  RAISE NOTICE '  ✓ Updated % stages via fallback keyword matching', v_fallback_match_count;

  -- ----------------------------------------------------------------------------
  -- Summary
  -- ----------------------------------------------------------------------------
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Total stages updated: % (% exact, % fallback)', 
    v_exact_match_count + v_fallback_match_count,
    v_exact_match_count,
    v_fallback_match_count;
  RAISE NOTICE '==================================================================';

END $$;

-- Final verification query - shows all stages with their panel assignments
DO $$
DECLARE
  v_total_stages INT;
  v_linked_stages INT;
  v_unlinked_stages INT;
BEGIN
  SELECT count(*) INTO v_total_stages FROM public.kanban_stages;
  SELECT count(*) INTO v_linked_stages FROM public.kanban_stages WHERE panel_id IS NOT NULL;
  SELECT count(*) INTO v_unlinked_stages FROM public.kanban_stages WHERE panel_id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Final Status:';
  RAISE NOTICE '  Total stages: %', v_total_stages;
  RAISE NOTICE '  Linked stages: % (%.1f%%)', v_linked_stages, (v_linked_stages::FLOAT / NULLIF(v_total_stages, 0) * 100);
  RAISE NOTICE '  Unlinked stages: % (%.1f%%)', v_unlinked_stages, (v_unlinked_stages::FLOAT / NULLIF(v_total_stages, 0) * 100);
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If you need to rollback this migration, run the following statement.
-- This will set panel_id back to NULL for all stages that were updated
-- by this migration (either through exact matching or fallback mapping).
--
-- ⚠️  WARNING: Only run this if you need to undo the migration!
--
-- BEGIN;
-- 
-- -- Define the fallback panel UUID used in the migration
-- -- ⚠️  OPERATOR: Replace this UUID with the same UUID you used in the main migration
-- DO $$
-- DECLARE
--   v_fallback_panel_uuid_text TEXT := 'REPLACE_WITH_FALLBACK_PANEL_UUID';
--   v_fallback_panel_uuid UUID;
-- BEGIN
--   -- Validate and cast to UUID
--   IF v_fallback_panel_uuid_text = 'REPLACE_WITH_FALLBACK_PANEL_UUID' THEN
--     RAISE EXCEPTION 'PLACEHOLDER NOT REPLACED: You must replace REPLACE_WITH_FALLBACK_PANEL_UUID with the same UUID used in the main migration.';
--   END IF;
--   v_fallback_panel_uuid := v_fallback_panel_uuid_text::UUID;
-- 
-- -- Rollback: Clear panel_id for stages updated by this migration
-- -- This targets stages that would have been matched by either strategy
-- UPDATE public.kanban_stages
-- SET panel_id = NULL
-- WHERE panel_id IS NOT NULL
--   AND (
--     -- Stages that were matched via exact name matching
--     EXISTS (
--       SELECT 1 
--       FROM public.panels p
--       WHERE p.id = kanban_stages.panel_id
--         AND lower(trim(p.name)) = lower(trim(kanban_stages.name))
--     )
--     OR
--     -- Stages that were matched via fallback keywords
--     (
--       panel_id = v_fallback_panel_uuid
--       AND (
--         lower(trim(name)) LIKE '%check%' OR
--         lower(trim(name)) LIKE '%check-in%' OR
--         lower(trim(name)) LIKE '%recep%' OR
--         lower(trim(name)) LIKE '%recepção%' OR
--         lower(trim(name)) LIKE '%chamada%'
--       )
--     )
--   );
--
-- END $$;
--
-- SELECT count(*) as rolled_back_stages 
-- FROM public.kanban_stages 
-- WHERE panel_id IS NULL;
--
-- COMMIT;
-- ============================================================================
