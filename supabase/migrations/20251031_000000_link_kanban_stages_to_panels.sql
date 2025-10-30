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
--   Before running this migration, backup your kanban_stages and panels tables:
--   pg_dump -h <host> -U <user> -d <database> -t public.kanban_stages -t public.panels > backup_kanban_panels.sql
--
-- PLACEHOLDER REPLACEMENT:
--   This migration uses a placeholder UUID for fallback mappings.
--   You MUST replace 'REPLACE_WITH_FALLBACK_PANEL_UUID' with an actual panel UUID
--   before running this migration. Example panel UUID: '3aef6ba3-a770-4dba-813f-9284b161f39f'
--
-- IDEMPOTENCY:
--   This migration is idempotent. Running it multiple times will not create duplicate updates.
--   Only stages with NULL panel_id will be updated.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DIAGNOSTIC QUERIES (Commented - uncomment to preview before running)
-- ----------------------------------------------------------------------------
-- -- Current stages with panel assignment:
-- SELECT ks.id, ks.name, ks.position, ks.panel_id, p.name AS panel_name
-- FROM public.kanban_stages ks
-- LEFT JOIN public.panels p ON p.id = ks.panel_id
-- ORDER BY ks.position;
--
-- -- Panels overview:
-- SELECT id, name, slug, is_active FROM public.panels ORDER BY name;
--
-- -- Stages that would match exactly by name (case-insensitive), only unique panel names considered:
-- SELECT ks.name AS stage_name, p.name AS panel_name, p.id AS panel_id
-- FROM public.kanban_stages ks
-- JOIN (
--   SELECT id, lower(trim(name)) AS normalized_name
--   FROM public.panels
--   WHERE lower(trim(name)) IN (
--     SELECT lower(trim(name))
--     FROM public.panels
--     GROUP BY lower(trim(name))
--     HAVING count(*) = 1
--   )
-- ) p ON lower(trim(ks.name)) = p.normalized_name
-- WHERE ks.panel_id IS NULL
-- ORDER BY ks.name;
--
-- -- Stages that would match by fallback keywords:
-- SELECT ks.id, ks.name
-- FROM public.kanban_stages ks
-- WHERE ks.panel_id IS NULL
--   AND (
--     lower(trim(ks.name)) LIKE '%check%' OR
--     lower(trim(ks.name)) LIKE '%check-in%' OR
--     lower(trim(ks.name)) LIKE '%recep%' OR
--     lower(trim(ks.name)) LIKE '%recepção%' OR
--     lower(trim(ks.name)) LIKE '%chamada%'
--   )
-- ORDER BY ks.position;
-- ----------------------------------------------------------------------------

BEGIN;

DO $$
DECLARE
  v_fallback_panel_uuid_text TEXT := 'REPLACE_WITH_FALLBACK_PANEL_UUID';
  v_fallback_panel_uuid UUID;
  v_exact_match_count INT := 0;
  v_fallback_match_count INT := 0;
  v_total_stages INT := 0;
  v_linked_stages INT := 0;
  v_unlinked_stages INT := 0;
  v_pct_linked NUMERIC := 0;
  v_pct_unlinked NUMERIC := 0;
BEGIN
  -- Ensure required tables exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'kanban_stages'
  ) THEN
    RAISE EXCEPTION 'Table public.kanban_stages does not exist. Abort migration.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'panels'
  ) THEN
    RAISE EXCEPTION 'Table public.panels does not exist. Abort migration.';
  END IF;

  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'Starting Kanban Stages to Panels linking migration...';
  RAISE NOTICE '==================================================================';

  -- ----------------------------------------------------------------------------
  -- STRATEGY 1: Exact case-insensitive name matching
  -- ----------------------------------------------------------------------------
  RAISE NOTICE 'Step 1: Applying exact case-insensitive name matches...';

  WITH unique_panels AS (
    SELECT id, lower(trim(name)) AS normalized_name
    FROM public.panels
    WHERE lower(trim(name)) IN (
      SELECT lower(trim(name))
      FROM public.panels
      GROUP BY lower(trim(name))
      HAVING count(*) = 1
    )
  ),
  exact_matches AS (
    UPDATE public.kanban_stages ks
    SET panel_id = up.id
    FROM unique_panels up
    WHERE ks.panel_id IS NULL
      AND lower(trim(ks.name)) = up.normalized_name
    RETURNING ks.id
  )
  SELECT count(*) INTO v_exact_match_count FROM exact_matches;

  RAISE NOTICE '  ✓ Updated % stages via exact name matching', v_exact_match_count;

  -- ----------------------------------------------------------------------------
  -- STRATEGY 2: Fallback keyword-based mapping
  -- ----------------------------------------------------------------------------
  RAISE NOTICE 'Step 2: Applying fallback keyword-based mappings...';

  -- Validate placeholder replacement
  IF v_fallback_panel_uuid_text = 'REPLACE_WITH_FALLBACK_PANEL_UUID' THEN
    RAISE EXCEPTION 'PLACEHOLDER NOT REPLACED: Replace REPLACE_WITH_FALLBACK_PANEL_UUID with an actual panel UUID before running.';
  END IF;

  -- Cast to UUID after validation
  v_fallback_panel_uuid := v_fallback_panel_uuid_text::UUID;

  -- Ensure fallback panel exists
  IF NOT EXISTS (SELECT 1 FROM public.panels WHERE id = v_fallback_panel_uuid) THEN
    RAISE EXCEPTION 'INVALID FALLBACK PANEL UUID: Panel with UUID % does not exist.', v_fallback_panel_uuid;
  END IF;

  WITH fallback_matches AS (
    UPDATE public.kanban_stages
    SET panel_id = v_fallback_panel_uuid
    WHERE panel_id IS NULL
      AND (
        lower(trim(name)) LIKE '%check%' OR
        lower(trim(name)) LIKE '%check-in%' OR
        lower(trim(name)) LIKE '%recep%' OR
        lower(trim(name)) LIKE '%recepção%' OR
        lower(trim(name)) LIKE '%chamada%'
      )
    RETURNING id
  )
  SELECT count(*) INTO v_fallback_match_count FROM fallback_matches;

  RAISE NOTICE '  ✓ Updated % stages via fallback keyword matching', v_fallback_match_count;

  -- ----------------------------------------------------------------------------
  -- Summary
  -- ----------------------------------------------------------------------------
  SELECT count(*) INTO v_total_stages FROM public.kanban_stages;
  SELECT count(*) INTO v_linked_stages FROM public.kanban_stages WHERE panel_id IS NOT NULL;
  SELECT count(*) INTO v_unlinked_stages FROM public.kanban_stages WHERE panel_id IS NULL;

  v_pct_linked := CASE WHEN v_total_stages > 0 THEN round((100.0 * v_linked_stages / v_total_stages)::numeric, 1) ELSE 0 END;
  v_pct_unlinked := CASE WHEN v_total_stages > 0 THEN round((100.0 * v_unlinked_stages / v_total_stages)::numeric, 1) ELSE 0 END;

  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Total stages updated: % (exact: %, fallback: %)',
    (v_exact_match_count + v_fallback_match_count),
    v_exact_match_count,
    v_fallback_match_count;
  RAISE NOTICE 'Final Status:';
  RAISE NOTICE '  Total stages: %', v_total_stages;
  RAISE NOTICE '  Linked stages: % (%% %)', v_linked_stages, v_pct_linked;
  RAISE NOTICE '  Unlinked stages: % (%% %)', v_unlinked_stages, v_pct_unlinked;
  RAISE NOTICE '==================================================================';

END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION (run separately after migration completes)
-- ============================================================================
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

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (run manually only if needed)
-- ============================================================================
-- BEGIN;
-- DO $$
-- DECLARE
--   v_fallback_panel_uuid_text TEXT := 'REPLACE_WITH_FALLBACK_PANEL_UUID'; -- use the SAME UUID as in the main migration
--   v_fallback_panel_uuid UUID;
-- BEGIN
--   IF v_fallback_panel_uuid_text = 'REPLACE_WITH_FALLBACK_PANEL_UUID' THEN
--     RAISE EXCEPTION 'PLACEHOLDER NOT REPLACED: Replace with the SAME UUID used in the main migration.';
--   END IF;
--   v_fallback_panel_uuid := v_fallback_panel_uuid_text::UUID;
--
--   -- Clear panel_id for stages updated by this migration (either strategy)
--   UPDATE public.kanban_stages ks
--   SET panel_id = NULL
--   WHERE ks.panel_id IS NOT NULL
--     AND (
--       -- Stages matched via exact name matching
--       EXISTS (
--         SELECT 1
--         FROM public.panels p
--         WHERE p.id = ks.panel_id
--           AND lower(trim(p.name)) = lower(trim(ks.name))
--       )
--       OR
--       -- Stages matched via fallback keywords to the fallback UUID
--       (
--         ks.panel_id = v_fallback_panel_uuid
--         AND (
--           lower(trim(ks.name)) LIKE '%check%' OR
--           lower(trim(ks.name)) LIKE '%check-in%' OR
--           lower(trim(ks.name)) LIKE '%recep%' OR
--           lower(trim(ks.name)) LIKE '%recepção%' OR
--           lower(trim(ks.name)) LIKE '%chamada%'
--         )
--       )
--     );
-- END $$;
-- COMMIT;