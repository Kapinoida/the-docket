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
