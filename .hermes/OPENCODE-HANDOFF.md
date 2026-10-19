# Hermes ↔ OpenCode Handoff

## Current Objective

**Retire the Radio and Recordings surfaces from The Docket UI. Keep Sportarr and the DVR pipeline running untouched.**

Dave's clarifications (2026-10-19):
- Sportarr works perfectly with its current settings. Dave found a reliable torrent source for replays of missed recordings. The recording logic (scheduling, preemption) is in good shape and Sportarr catches the rest. **Do not touch Sportarr, the Sports Scheduler cron, or the DVR pipeline.**
- The Recordings section and the Radio section must be removed from the Docket UI.
- The small global sound player stays alive — it is the foundation for a future soundscape idea. Strip the live radio/channel/station logic from it, keep procedural ambience (rain, snow, brown noise, orbit, pentatonic), volume control, and stop control.

## Files to read first

1. `AGENTS.md` — identity, conventions, deployment
2. `ROADMAP.md` — product direction
3. `BUGS.md` — bug tracker
4. `DEVLOG.md` — recent changes context
5. `.hermes/plans/2026-10-19-audio-recordings-retirement.md` — full staged plan and current verified state
6. `.hermes/OPENCODE-HANDOFF.md` — this file (for operating rhythm)

### Operating Rhythm

Hermes investigates and writes focused handoffs. OpenCode implements, verifies, documents, commits, and deploys.

> Read `AGENTS.md`, `ROADMAP.md`, `BUGS.md`, `DEVLOG.md`, and this handoff. Implement only the current handoff as a complete vertical slice. Inspect the existing code first, add tests, run verification, update docs, commit, and deploy only if verification passes.

## Scope: what to change

### 1. Remove the Radio product surface

- Delete `src/app/radio/page.tsx` and `src/components/radio/` (RadioView, StationCard, NowPlayingPanel, SongHistory + tests).
- Remove the `Radio` nav item from `src/components/v2/Sidebar.tsx` (currently line ~318: `NavItem href="/radio" ...`).
- Remove radio-only libs and hooks: `src/lib/azuracast.ts`, `src/lib/radioStations.ts`, `src/types/azuracast.ts`, `src/hooks/useNowPlaying.ts` + tests.
- In `src/hooks/useAmbience.ts`: remove the AzuraCast stream path (`startStream`, `stopStream`, `getStationStreamUrl` usage, stream audio element) and the `runtime_loop` / `warm_boot` music sources. Keep procedural ambience (rain, snow, brown-noise, orbit) and the `pentatonic` music source. Keep the master `GainNode` + volume control.
- In `src/contexts/SoundContext.tsx`, `src/components/focus/SoundDropdown.tsx`, `src/components/focus/SidebarSoundPanel.tsx`, `src/components/focus/FloatingSoundIndicator.tsx`: remove the radio/station/channel UI and stream branches. Keep ambience, volume, play/stop, and the small player so the future soundscape has a home.
- Remove related radio tests (`useNowPlaying.test.ts`, radio component tests, stream-related `useAmbience` tests) and update the rest.

### 2. Remove the Recordings product surface

- Delete `src/app/recordings/page.tsx` and `src/components/recordings/` (RecordingDashboard, RecordingCard, StatusBadge, ConflictPanel, TimelineView, Filters, DashboardSkeleton, EmptyState + tests).
- Remove the `Recordings` nav item from `src/components/v2/Sidebar.tsx` (currently line ~319).
- Delete the recordings API routes: `src/pages/api/v2/recordings/` (index, [id], conflicts) + tests at `src/__tests__/api/v2/recordings/`.
- Remove recording types from `src/types/index.ts` (RecordingSchedule, CreateRecordingInput, UpdateRecordingInput, ConflictPair, RecordingStatus, RecordingSource) and recording data-access functions from `src/lib/db.ts` (createRecording, getRecording, getRecordings, updateRecording, deleteRecording, getConflicts, upsertRecordingBySportarrId).
- **Keep the `recording_schedules` table/data in Postgres** — no migration to drop it. It is the audit history for the DVR. Remove only the app-level surface. Verify no other UI imports recording types before deleting.

### 3. What to keep

- Sportarr container, config, and data. **Do not modify.**
- Sports Scheduler cron (`2733c81afc1f`) — the DVR scheduling brain. **Do not disable.**
- `Sportarr → Docket recording sync` cron (`4613cb407355`) — keep enabled for now; it writes to the retained `recording_schedules` table for history. It is harmless with the UI gone. (Hermes will confirm with Dave whether to keep it once the app surface is gone.)
- `~/.hermes/scripts/recording_api.py`, `sports-scheduler.py`, `sportarr-docket-sync.py`, the `sports-recording-pipeline` skill, and everything in the DVR pipeline.
- Procedural sound system: `SoundContext`, `useAmbience` ambience modes, pentatonic music, volume, `FloatingSoundIndicator` / `SidebarSoundPanel` (minus radio).
- `/Volumes/storage24tb/Music` — unrelated to radio removal.

### 4. Housekeeping

- Disable the `azuracast-backup` cron (`2c7af5a004b7`) — its target container (`azuracast`) does not exist, so the job errors weekly. Hermes will handle this via cron tooling, not repo code.
- Update `AGENTS.md` — replace the "Recording Schedule Module" and radio sound-stream references with a short "Retired surfaces" note so OpenCode does not treat them as active.
- Add a ROADMAP entry under "Recently Completed" or an "Immediate" retirement section.
- Keep `DEVLOG.md` additions for after implementation.

## Verification checklist

- `npm test` — full suite passes after removals (tests were 623+; expect fewer after radio/recording test removal).
- `npx tsc --noEmit` — clean.
- `npm run build` — clean.
- No remaining references to `/radio`, `/recordings`, `azuracast`, `radioStations`, `useNowPlaying`, or `RADIO_STATIONS` in `src/` (grep before commit).
- Sidebar shows no Radio or Recordings entries.
- The sound control still appears in the app shell, ambience picks still work, volume works, `pentatonic` still plays, and no station/stream UI remains.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:8088/` returns 200 after deploy.

## Current Handoff: Repair Docket Push Notifications

Dave wants Hermes/OpenCode to repair the Docket's Android phone push notification path.

### Verified live findings

- `~/.hermes/scripts/docket_push.sh` runs every minute via Hermes cron job `d525f7185ca7`.
- The script currently POSTs to `http://localhost:8088/api/push/send` without authentication and does not fail on HTTP errors.
- Live POST currently returns `401 Unauthorized` because `src/pages/api/push/send.ts` is wrapped in `withAuth` and `/api/push/send` is not public in `src/middleware.ts`.
- The production database currently has 3 rows in `push_subscriptions`.
- `src/pages/api/push/send.ts` records a push notification after attempting every subscription, even when all sends fail for non-404/410 errors.
- `src/components/NotificationToggle.tsx` hardcodes the VAPID public key. Do not rotate VAPID keys or change the existing widget token in this task.
- `public/sw.js` already handles push display and click navigation. Preserve its existing behavior unless tests show a necessary correction.

### Required implementation

Implement a secure, verifiable server-to-server trigger for push reminders:

1. Add a dedicated environment variable such as `PUSH_TRIGGER_TOKEN` to the example/configuration documentation and use it in the push-send route or an equivalent internal-auth mechanism. Do not make `/api/push/send` broadly unauthenticated.
2. Update `~/.hermes/scripts/docket_push.sh` separately if needed so the cron sends the trigger credential and exits nonzero on non-2xx responses. Do not commit the real token.
3. Make push accounting accurate: record a notification only when at least one subscription delivery succeeds. Preserve removal of subscriptions returning HTTP 404/410. Log or report failure counts without exposing subscription secrets.
4. Add automated tests for unauthorized trigger, authorized trigger, no subscribers, successful delivery, all-deliveries-failed, and expired subscription cleanup. Mock `web-push` and database helpers as appropriate.
5. Add a test-notification path in Settings only if it can be implemented cleanly without weakening auth; otherwise leave UI for a follow-up.
6. Update `DEVLOG.md` and `ROADMAP.md` with the completed push-notification repair. Add a BUGS.md entry if the project's bug workflow requires one.

### Deployment and verification

- Run `npm test`, `npx tsc --noEmit`, and `npm run build`.
- Deploy with `bash update.sh` only after verification passes.
- Configure the real `PUSH_TRIGGER_TOKEN` in the live environment and update the local cron script outside git. Never commit secrets.
- Verify the live endpoint returns 401 without the trigger credential and 200 with it.
- Verify the cron script returns failure for unauthorized requests and success for authorized no-op requests.
- Verify the database push subscription count remains intact.
- Do not create a disposable task or send a real phone notification without Dave explicitly asking for that live test.

### What MUST NOT CHANGE

- Do not rotate or modify `WIDGET_TOKEN`.
- Do not rotate VAPID keys.
- Do not modify AIO Launcher integration in this handoff.
- Do not touch Sportarr, DVR, or recording pipeline code.
- Do not weaken user authentication for ordinary Docket routes.

## Current Handoff: Add Mobile Capture Page

Dave wants a low-friction personal task capture page that can be opened from an AIO Launcher shortcut. Build and deploy this as the next vertical slice.

### Product behavior

Add an authenticated route at `/capture` optimized for Android phone use:

- The page opens inside the normal Docket app shell and requires the existing session authentication.
- It presents one prominent text input or textarea immediately, with autofocus where mobile browsers permit it.
- The primary action is clearly labeled `Capture` or `Add to Inbox`.
- Submitting creates a plain Inbox task through the existing authenticated task creation path.
- Do not ask for a page, due date, priority, effort, project, or other metadata.
- On success, show a clear confirmation and reset/focus the input so another thought can be captured quickly.
- On failure, preserve the entered text and show an actionable error.
- Support normal Android keyboard voice dictation; do not build custom speech recognition.
- Include a link/button to Inbox for later processing.
- Respect the existing mobile layout conventions and safe-area/bottom-tab spacing. Do not use `h-screen`, `h-dvh`, or `min-h-screen` inside the app shell.

### AIO integration guidance

Do not modify the AIO Lua widget in this task. The intended launcher integration is a simple shortcut opening:

`https://docket.dcplaskett.com/capture`

The existing read-only Docket Today widget remains unchanged.

### Implementation requirements

- Inspect the existing ProvidersWrapper, LayoutWrapper, mobile navigation, API client, and task creation route before editing.
- Prefer a dedicated `src/app/capture/page.tsx` or equivalent route consistent with the current Next.js architecture.
- Use the existing `apiFetch` helper and existing `/api/v2/tasks` POST path, or a small server action only if that is clearly more consistent.
- Dispatch the existing `taskCreated` custom event or otherwise ensure task views can refresh after capture.
- Add component/page tests covering render, successful creation/reset, empty input validation, API failure, and authentication behavior as practical.
- Update `DEVLOG.md` and `ROADMAP.md`. Add a BUGS entry only if this exposes an existing bug.

### Verification and deployment

- Run `npm test`, `npx tsc --noEmit`, and `npm run build`.
- Deploy with `bash update.sh` only after verification passes.
- Verify `https://docket.dcplaskett.com/capture` returns the expected authenticated behavior after deployment.
- Do not create a real task on Dave's behalf during verification.

### What MUST NOT CHANGE

- Do not modify push notification behavior, tokens, or VAPID keys.
- Do not modify the existing AIO Lua widget.
- Do not rotate or modify `WIDGET_TOKEN`.
- Do not touch Sportarr, DVR, or recording pipeline code.

## Current Handoff: Fix Service Worker Response Conversion Error

Dave reports this browser error after the mobile capture deployment:

`sw.js:1 Uncaught (in promise) TypeError: Failed to convert value to 'Response'.`

### Root-cause evidence

`public/sw.js` handles `/capture` and `/page/*` with:

```js
fetch(event.request).catch(() => caches.match(event.request))
```

`caches.match()` can resolve to `undefined` when no cached response exists. `event.respondWith()` requires a `Response` (or a promise resolving to one), so an offline/network failure on an uncached route produces the reported conversion error. The stale-while-revalidate path has the same latent issue when both network and cache miss.

### Required fix

- Ensure every `event.respondWith()` branch resolves to an actual `Response`, never `undefined`.
- Preserve current behavior: API and Next.js assets remain untouched; `/capture` and `/page/*` prefer a fresh network response with cache fallback; app-shell routes remain stale-while-revalidate.
- For an uncached network failure, return a minimal valid offline `Response` (plain text or an appropriate cached shell fallback) rather than undefined. Do not fabricate a successful app page that could hide auth failures.
- Add regression tests that make fetch reject and caches.match return undefined for `/capture` and for a normal app-shell route, asserting the resulting value is a `Response`.
- Update the service worker cache version if needed so clients receive the corrected worker.
- Update DEVLOG.md and ROADMAP.md only if consistent with the project's conventions.

### Verification

Run the focused service-worker tests, `npm test`, `npx tsc --noEmit`, and `npm run build`. Deploy with `bash update.sh` after they pass. Verify the deployed `/capture` route remains authenticated and the new service worker is served.

### What MUST NOT CHANGE

- Do not modify push notification behavior, tokens, or VAPID keys.
- Do not modify AIO Launcher integration.
- Do not modify task capture behavior or API semantics.
- Do not touch Sportarr, DVR, or recording pipeline code.

## End

Do not treat this as a request to modify Sportarr or the DVR pipeline. Touch only the Docket app surface and its documentation.