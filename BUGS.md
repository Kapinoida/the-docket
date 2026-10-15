# Known Bugs

## BUG-018 — Media tracker migration missing source links and incorrect TV completion

**Status:** ✅ Fixed  
**Reported:** 2026-10-01  
**Area:** `/media`, `src/media/lib/database.ts`, `src/app/api/v2/media/sync/route.ts`

### User-visible symptom

Media tracker showed 878 items instead of 937 (matching standalone). TV shows appeared as "completed" when they had only been downloaded, not watched.

### Investigation

1. **Missing source links**: 59 Audiobookshelf items had no source links in `media_item_sources` table. The `getAllMedia()` query filters for items with at least one active source link, so these 59 items were hidden from the UI.
2. **TV completion bug**: The Sonarr sync in `src/app/api/v2/media/sync/route.ts:79` was treating `hasFile` (downloaded/owned) as watched state, setting `watched_at` and `progress = 1.0` for all downloaded episodes. This caused 1996 episodes to appear watched when they were only downloaded.
3. **Database sequence issues**: `sync_log` and other sequences were out of sync, causing "duplicate key value violates unique constraint" errors during syncs.

### Implementation

1. **Fixed missing source links**: Inserted 59 missing source links for Audiobookshelf items:
   ```sql
   INSERT INTO media_item_sources (media_item_id, source, source_id, metadata, created_at, updated_at)
   SELECT mi.id, 'audiobookshelf', mi.external_id, COALESCE(mi.metadata, '{}'::jsonb), NOW(), NOW()
   FROM media_items mi
   WHERE mi.external_source = 'audiobookshelf'
     AND NOT EXISTS (SELECT 1 FROM media_item_sources mis WHERE mis.media_item_id = mi.id AND mis.source = 'audiobookshelf')
   ```

2. **Fixed Sonarr sync**: Removed the logic that set `watched_at` and `progress` based on `hasFile` in `src/app/api/v2/media/sync/route.ts:78-102`. Episodes now only track download status via metadata, not watched state.

3. **Cleared incorrect watched state**: Reset all 1996 episodes that had incorrectly set `watched_at`:
   ```sql
   UPDATE episodes SET watched_at = NULL, progress = 0.0
   WHERE watched_at IS NOT NULL
     AND id NOT IN (SELECT episode_id FROM plex_history WHERE episode_id IS NOT NULL)
   ```

4. **Reset database sequences**: Updated sequences to prevent future conflicts:
   ```sql
   SELECT setval('sync_log_id_seq', (SELECT MAX(id) FROM sync_log));
   SELECT setval('media_item_sources_id_seq', (SELECT MAX(id) FROM media_item_sources));
   SELECT setval('media_items_id_seq', (SELECT MAX(id) FROM media_items));
   SELECT setval('episodes_id_seq', (SELECT MAX(id) FROM episodes));
   ```

### Acceptance criteria

- Media tracker shows 937 active items (matching standalone)
- All 268 Audiobookshelf items have source links
- TV shows show as "owned" until watched via Plex
- No sync_log sequence conflicts
- All 569 tests pass
- TypeScript clean, no new lint errors

### Fixed files

- `src/app/api/v2/media/sync/route.ts` (removed hasFile → watched_at logic)
- Database: inserted 59 missing source links, cleared 1996 incorrect watched_at values, reset sequences

### Related code

- `src/media/lib/database.ts:157` — `getAllMedia()` filters for active source links
- `src/media/lib/database.ts:432` — `getStats()` filters for active source links
- Plex sync properly sets `watched_at` from actual watch history

---

## BUG-020 — TypeScript build failure: test files under `src/pages/api/` treated as route modules

**Status:** ✅ Fixed  
**Reported:** 2026-10-15  
**Area:** Build, TypeScript, `src/pages/api/**/__tests__/`

### User-visible symptom

`npx tsc --noEmit` failed with 9 TypeScript errors. Next.js Pages Router auto-discovered Jest test files placed in `__tests__` directories under `src/pages/api/` and treated them as route handlers. The tests don't export a `default` handler function, so the generated validator rejected them.

### Investigation

1. Next.js Pages Router auto-discovers route modules by scanning `src/pages/api/**/*.ts`. Jest test files placed in `__tests__` directories under that tree were picked up as route handlers.
2. The tests themselves passed fine (`npm test` — 40 suites, 569 tests, all passing). This was purely a type-checking/build-time issue.
3. This blocked `npx tsc --noEmit` as a pre-commit/CI gate.

### Implementation

Moved all test files from `src/pages/api/**/__tests__/` to `src/__tests__/api/` to remove them from the Pages Router tree:

1. Created new test directory structure: `src/__tests__/api/v2/`, `src/__tests__/api/v2/decisions/`, `src/__tests__/api/v2/recordings/`
2. Moved 8 test files:
   - `src/pages/api/v2/__tests__/tasks.test.ts` → `src/__tests__/api/v2/tasks.test.ts`
   - `src/pages/api/v2/__tests__/tasks_cleanup.test.ts` → `src/__tests__/api/v2/tasks_cleanup.test.ts`
   - `src/pages/api/v2/__tests__/weekly-review.test.ts` → `src/__tests__/api/v2/weekly-review.test.ts`
   - `src/pages/api/v2/decisions/__tests__/create-task.test.ts` → `src/__tests__/api/v2/decisions/create-task.test.ts`
   - `src/pages/api/v2/decisions/__tests__/index.test.ts` → `src/__tests__/api/v2/decisions/index.test.ts`
   - `src/pages/api/v2/recordings/__tests__/[id].test.ts` → `src/__tests__/api/v2/recordings/[id].test.ts`
   - `src/pages/api/v2/recordings/__tests__/conflicts.test.ts` → `src/__tests__/api/v2/recordings/conflicts.test.ts`
   - `src/pages/api/v2/recordings/__tests__/index.test.ts` → `src/__tests__/api/v2/recordings/index.test.ts`
3. Updated relative imports to use `@/` prefix paths (e.g., `'../../../../lib/db'` → `'@/lib/db'`)
4. Deleted old `__tests__` directories from `src/pages/api/`
5. Cleared `.next` cache to remove stale validator references

### Acceptance criteria

- [x] `npx tsc --noEmit` returns 0 errors
- [x] `npm test` still passes (569 tests)
- [x] No functional changes to API route behavior
- [x] Test files use `@/` prefix imports for consistency

### Fixed files

- Moved 8 test files from `src/pages/api/**/__tests__/` to `src/__tests__/api/`
- Updated imports in moved files to use `@/` prefix paths

---

## BUG-019 — Production database backup committed to source control with plaintext secrets

**Status:** ✅ Fixed  
**Reported:** 2026-10-15  
**Area:** `the_docket_backup.sql`, `schema.v1_backup.sql`, Git history

### User-visible symptom

A full production database dump (`the_docket_backup.sql`, 2,253 lines, committed in `7518e18`) was tracked in the repository. It contained plaintext CalDAV passwords, calendar events with Zoom/Meet meeting links and passcodes, attendee email addresses, and historical work schedule data. `schema.v1_backup.sql` was also tracked in earlier history.

### Implementation

1. **Removed from Git history**: Used `git-filter-repo` to remove both backup files from all historical commits across all branches and tags. The repository history was rewritten and force-pushed to origin.
2. **Added gitignore patterns**: Added patterns to `.gitignore` to prevent future accidental commits of database dumps: `*backup.sql`, `*.dump`, `*.pgdump`, `*.sql.bak`, `pg_*.sql`.
3. **Deleted local copies**: Removed untracked backup files from working directory.

### Acceptance criteria

- [x] `.gitignore` contains `*backup.sql`, `*.dump`, and similar patterns
- [x] `the_docket_backup.sql` and `schema.v1_backup.sql` removed from Git history
- [x] `git log --all -- the_docket_backup.sql` returns no file additions
- [x] History rewrite force-pushed to origin
- [x] Local working copies of backup files deleted

### Fixed file

- `.gitignore` (added database backup/dump patterns)
- Git history (rewritten via `git-filter-repo`, force-pushed)

### Related action items

- **Dave must rotate all CalDAV credentials** that were exposed in the original dump (at minimum the `caldav_configs` table data from commit `7518e18`)
- All other repo users/forks should be notified of the history rewrite

---

## BUG-017 — Focus timer fog overlay too bright

**Status:** ✅ Fixed  
**Reported:** 2026-09-21  
**Area:** `/focus`, `src/components/focus/FocusVisualizer.tsx`

### User-visible symptom

The fog overlay behind the Focus timer controls created a visible glow around the controls, particularly noticeable in the outer region.

### Investigation

Confirmed in the live source:

- `FocusVisualizer.tsx:1064-1089` renders a radial gradient fog overlay for certain visualization modes.
- The outer fade used 0.8 opacity at 20% radius, creating a harsh glow.
- The fog included a light-mode branch, but the app is dark-only.
- The controls semicircle itself (`TimerControls.tsx:41`) uses `bg-bg-secondary` which is correct and should remain solid.

### Implementation

Simplified and reduced the fog overlay opacity:
- Removed the light-mode branch (app is dark-only)
- Reduced outer fade from 0.8 to 0.5 opacity at 20% radius
- Center remains opaque (1.0) to obscure canvas behind controls
- Edge remains transparent (0)

The fog now provides subtle obscuring without creating a harsh glow.

### Acceptance criteria

- The fog overlay is subtle in the outer region.
- No harsh glow around the controls.
- Play/pause, skip, reset, progress ring geometry, element id, and canvas alignment remain unchanged.
- Added 3 focused component tests.
- Ran `npm test`, `npx tsc --noEmit`, and lint before deployment.

### Fixed file

- `src/components/focus/FocusVisualizer.tsx` (fog overlay opacity, removed light-mode branch)

### Related code

- `src/components/focus/TimerControls.tsx` — controls semicircle (unchanged, correctly uses solid `bg-bg-secondary`)
