-- Up migration
-- Health-check migration: strips dead v2Task nodes from page content (BUG-010).
--
-- Removes two categories of dead nodes from pages.content JSONB:
--   1. v2Task nodes with taskId: null AND no text content (ghost checkboxes left by
--      the editor input rule when the user typed '- [ ] ' but never added content)
--   2. v2Task nodes whose taskId references a task that no longer exists in the tasks
--      table (orphaned references from deletion paths that bypassed cleanup)
--
-- Idempotent: only strips dead nodes; safe to re-run. Live nodes are untouched.
-- Down migration: no-op (cannot safely reverse a content cleanup).

-- Temporary recursive function that walks a TipTap JSON tree and strips dead v2Task nodes.
CREATE OR REPLACE FUNCTION _clean_v2task_tree(node jsonb) RETURNS jsonb AS $$
DECLARE
  child jsonb;
  kept jsonb[] := ARRAY[]::jsonb[];
  task_id_text text;
  task_exists boolean;
  has_text boolean;
BEGIN
  IF node IS NULL THEN RETURN NULL; END IF;
  IF jsonb_typeof(node) <> 'object' THEN RETURN node; END IF;

  IF node ? 'content' AND jsonb_typeof(node->'content') = 'array' THEN
    FOR child IN SELECT jsonb_array_elements(node->'content') LOOP
      IF child->>'type' = 'v2Task' THEN
        task_id_text := child->'attrs'->>'taskId';

        IF task_id_text IS NULL THEN
          -- taskId is null: strip only if there is no text content
          has_text := EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(child->'content', '[]'::jsonb)) c
            WHERE c->>'text' IS NOT NULL AND btrim(c->>'text') <> ''
          );
          IF NOT has_text THEN
            CONTINUE;
          END IF;
        ELSIF task_id_text ~ '^[0-9]+$' THEN
          -- Numeric taskId: strip if the task no longer exists
          SELECT EXISTS(SELECT 1 FROM tasks WHERE id = task_id_text::bigint) INTO task_exists;
          IF NOT task_exists THEN
            CONTINUE;
          END IF;
        END IF;
      END IF;

      kept := array_append(kept, _clean_v2task_tree(child));
    END LOOP;

    IF array_length(kept, 1) IS NOT NULL THEN
      RETURN jsonb_set(node, '{content}', to_jsonb(kept));
    ELSE
      RETURN node - 'content';
    END IF;
  END IF;

  RETURN node;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  page_row RECORD;
  cleaned jsonb;
  changed_count integer := 0;
BEGIN
  FOR page_row IN SELECT id, content FROM pages WHERE content IS NOT NULL LOOP
    cleaned := _clean_v2task_tree(page_row.content);
    IF cleaned IS DISTINCT FROM page_row.content THEN
      UPDATE pages SET content = cleaned, updated_at = NOW() WHERE id = page_row.id;
      changed_count := changed_count + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'Cleaned v2Task nodes from % page(s).', changed_count;
END $$;

DROP FUNCTION _clean_v2task_tree(jsonb);

-- Down migration
-- No-op: cannot safely reverse a content cleanup.