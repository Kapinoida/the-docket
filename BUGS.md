# Known Bugs

## BUG-023 — Service worker threw "Failed to convert value to 'Response'"

**Status:** ✅ Fixed
**Reported:** 2026-10-19 (via Hermes, from Dave)
**Area:** `public/sw.js`, `src/__tests__/service-worker.test.ts`

### User-visible symptom

After the mobile capture deploy, the browser console showed on every page load:

```
sw.js:1 Uncaught (in promise) TypeError: Failed to convert value to 'Response'.
```

The app still rendered (the browser retried the request without the service worker), but the worker was failing its own fetch events, so offline caching and the always-fresh `/capture` rule were unreliable.

### Investigation (Hermes, 2026-10-19)

1. `public/sw.js` handled the network-first routes with `fetch(event.request).catch(() => caches.match(event.request))`. `caches.match()` resolves to `undefined` on a cache miss, so an offline (or otherwise failed) network request on an uncached route handed `event.respondWith()` an `undefined`.
2. `event.respondWith()` requires a `Response` (or a promise resolving to one). Resolving with `undefined` makes the browser reject the fetch event with `TypeError: Failed to convert value to 'Response'`.
3. The stale-while-revalidate branch had the same latent defect: `return cached || fetchPromise` where `fetchPromise` fell back to `.catch(() => cached)` — again `undefined` when both the network and the cache missed.

### Implementation

1. **Never hand `respondWith()` an `undefined`** — a module-scope `offlineResponse()` returns a minimal plain-text `Response` with status `503` (`Content-Type: text/plain; charset=utf-8`). The status is deliberately non-2xx so an offline failure can never be mistaken for a rendered app page (which could mask authentication failures).
2. **`cacheMatch()` helper** wraps `caches.match()` so a cache lookup can neither reject nor yield a non-Response value; every branch ends in `cached || offlineResponse()`.
3. **Behavior preserved** — API and Next.js asset requests are still untouched; `/capture` and `/page/{id}` remain network-first with a cache fallback; app-shell routes remain stale-while-revalidate; the push and notification-click handlers are unchanged.
4. **Cache version bumped** `docket-v5` → `docket-v6` so clients install the corrected worker and re-precache the app shell; stale caches are still removed on activate.

### Acceptance criteria

- [x] `/capture` with a failed network request and no cached copy resolves to a `Response`
- [x] `/page/{id}` with a failed network request and no cached copy resolves to a `Response`
- [x] An app-shell route with a failed network request and no cached copy resolves to a `Response`
- [x] A cached copy is still served when the network fails
- [x] The offline fallback is a non-2xx plain-text response, not a fabricated app page
- [x] The offline fallback is never written into the app-shell cache
- [x] The cache version is bumped and stale caches are deleted on activate
- [x] Push, notification-click, auth, and capture behavior unchanged
- [x] `npm test` (594), `npx tsc --noEmit` (4 pre-existing `.next/types` errors only), and `npm run build` all clean

### Fixed files

- `public/sw.js` (offline fallback, `cacheMatch()` helper, cache version bump)
- `src/__tests__/service-worker.test.ts` (8 new regression tests)

**Commit:** `0ae48e7` — fix: return valid responses from service worker

---

## BUG-022 — Push reminders never reached the phone (cron trigger unauthorized)

**Status:** ✅ Fixed
**Reported:** 2026-10-19 (via Hermes, from Dave)
**Area:** `src/pages/api/push/send.ts`, `src/middleware.ts`, `~/.hermes/scripts/docket_push.sh`

### User-visible symptom

Timed task reminders never arrived on the Android phone. The Hermes cron job `docket-push-reminders` (`d525f7185ca7`) reported `ok` every minute, but nothing was ever pushed.

### Investigation (Hermes, 2026-10-19)

1. `~/.hermes/scripts/docket_push.sh` POSTed to `http://localhost:8088/api/push/send` with no credentials and ignored the HTTP status, so the cron always reported success.
2. `src/pages/api/push/send.ts` was wrapped in `withAuth`, and `/api/push/send` is not in the middleware public allowlist — every live POST returned `401 Unauthorized` (confirmed in the cron output logs).
3. The route recorded a row in `push_notifications` for every task it attempted, even when every `web-push` delivery failed, so a task could be marked as notified without the device ever receiving anything.

### Implementation

1. **Dedicated trigger credential** — new `PUSH_TRIGGER_TOKEN` env var, presented as the `X-Push-Trigger-Token` request header. `src/lib/pushTrigger.ts` (new) holds the pure, unit-tested helpers (constant-time comparison, header extraction). The route accepts either the trigger credential or a normal session cookie; it is never unauthenticated and `/api/push/send` was **not** added to the middleware public allowlist.
2. **Targeted middleware bypass** — `src/middleware.ts` lets `/api/push/send` through only when the trigger header validates. Every other route still requires a session cookie.
3. **Accurate accounting** — `push_notifications` is written only when at least one subscription delivery succeeded for that task; a task that failed to deliver stays eligible for a later retry. Expired subscriptions (404/410) are still deleted. The response reports `sent` (tasks notified), `delivered`, `failed`, `removed`, and `tasks`; the server log reports a per-status-code failure histogram with no endpoints or subscription keys.
4. **Cron script** — `~/.hermes/scripts/docket_push.sh` (outside git) sends the credential, resolves it from `$PUSH_TRIGGER_TOKEN`, `~/.hermes/.docket_push_token` (0600), or the Docket's `.env.local`, and exits non-zero on any non-2xx response. It stays silent on a successful no-op.
5. **Test path** — `POST /api/push/test-notification` (session authenticated) plus a "Send test notification" button in Settings. The endpoint must already be a known subscription, so a session cannot be used to push to arbitrary endpoints.

### Acceptance criteria

- [x] `POST /api/push/send` without the trigger credential returns `401`
- [x] `POST /api/push/send` with the trigger credential is accepted and returns delivery counts
- [x] `/api/push/send` is not in the middleware public allowlist
- [x] A notification is recorded only when at least one delivery succeeds
- [x] Subscriptions returning 404/410 are removed; other failures are counted, not removed
- [x] Failure reports never contain endpoints, `p256dh`, or `auth` values
- [x] Automated tests cover unauthorized trigger, authorized trigger, no subscribers, successful delivery, all-deliveries-failed, expired subscription cleanup, and the middleware bypass
- [x] The cron script exits non-zero for unauthorized requests and zero for authorized no-ops
- [x] No live task created and no real phone notification sent during verification
- [x] `npm test` (568), `npx tsc --noEmit`, and `npm run build` all clean

### Fixed files

- `src/lib/pushTrigger.ts` (new), `src/middleware.ts`, `src/pages/api/push/send.ts`
- `src/pages/api/push/test-notification.ts` (new), `src/lib/db.ts`, `src/components/NotificationToggle.tsx`
- `.env.example` (new), `docker-compose.yml`, `jest.setup.ts`
- External: `~/.hermes/scripts/docket_push.sh`, `~/.hermes/.docket_push_token`

---

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

## BUG-021 — Media sync route has no concurrency guard and runs synchronously across four remote services

**Status:** ✅ Fixed  
**Priority:** Medium  
**Reported:** 2026-10-15  
**Area:** `src/app/api/v2/media/sync/route.ts`, `src/app/api/v2/media/route.ts`

### User-visible symptom

Calling `POST /api/v2/media/sync` runs Audiobookshelf, Radarr, Sonarr (including per-series episode fetches), and Plex history sequentially in a single request handler. There is no lock, so concurrent invocations (from multiple browser tabs, or from the media page UI being clicked rapidly) all run simultaneously, potentially causing database write contention and redundant upstream API calls. Additionally, media API routes rely solely on middleware for authentication, and there is a duplicate database pool and redundant `await` keywords.

### Investigation (Hermes, 2026-10-15)

1. The sync route at `src/app/api/v2/media/sync/route.ts` has no concurrency guard. It calls all four external services in series in a single POST handler.
2. The aggregate endpoint is also exposed without explicit authentication (relies on middleware).
3. `src/app/api/v2/media/route.ts` lines 13, 14, and 73 use `await await` (redundant double-await).
4. `src/media/lib/database.ts` creates its own `new Pool(...)` despite a comment claiming it uses the shared pool.
5. Low risk in single-user mode, but risk increases if multiple tabs or automated sync scripts hit the endpoint concurrently.

### Required action (Daedalus)

1. **Concurrency guard**: Use PostgreSQL advisory lock to reject concurrent sync requests with `409 Conflict`.
2. **Explicit authentication**: Add explicit auth checks to App Router media routes (don't rely solely on middleware).
3. **Pool unification**: Import pool from `src/lib/db.ts` instead of creating a duplicate.
4. **Remove double-await**: Clean up redundant `await` keywords.
5. **Tests**: Add tests for concurrent rejection and authentication.

### Acceptance criteria

- [x] Concurrent `POST /api/v2/media/sync` requests are rejected with `409 Conflict`
- [x] Single sequential syncs continue to work
- [x] All media API routes have explicit authentication
- [x] Duplicate pool removed from `src/media/lib/database.ts`
- [x] Double-await removed from `src/app/api/v2/media/route.ts`
- [x] Sync log entries still correctly track started/completed boundaries
- [x] All existing tests pass
- [x] TypeScript clean, no new lint errors

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
