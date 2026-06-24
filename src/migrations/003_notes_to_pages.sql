-- Up migration
-- One-time data migration: converts legacy 'notes' table rows into 'pages' with TipTap JSON.
-- Conditional: only runs if the notes table exists. Idempotent: only migrates notes
-- whose title doesn't already exist as a page (prevents duplicates on re-run).
-- Down migration: no-op (cannot safely reverse a data backfill).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notes'
  ) THEN
    INSERT INTO pages (title, content, folder_id, created_at, updated_at)
    SELECT
      n.title,
      jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'content', jsonb_build_array(
              jsonb_build_object(
                'type', 'text',
                'text', COALESCE(n.content, '')
              )
            )
          )
        )
      ),
      n.folder_id,
      n.created_at,
      COALESCE(n.updated_at, NOW())
    FROM notes n
    WHERE NOT EXISTS (
      SELECT 1 FROM pages p WHERE p.title = n.title
    );

    RAISE NOTICE 'Notes to pages migration completed.';
  ELSE
    RAISE NOTICE 'Notes table does not exist — skipping migration.';
  END IF;
END $$;

-- Down migration
-- No-op: cannot safely reverse a data backfill.