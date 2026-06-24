-- Up migration
-- Sets default name for CalDAV configs that were created before the 'name' column existed.
-- Safe to re-run: only affects rows where name IS NULL.

UPDATE caldav_configs SET name = 'Default Account' WHERE name IS NULL;

-- Down migration
-- No-op: data change cannot be safely reversed without knowing original NULL state.