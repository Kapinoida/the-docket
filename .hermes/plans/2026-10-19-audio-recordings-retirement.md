# Audio and Recording Surface Retirement Plan

**Status:** Staged for implementation, no application or infrastructure changes made yet.

## Goal

Remove the obsolete Recordings and Radio product surfaces from The Docket, preserve the small soundscape player as the future audio entry point, and keep the Sportarr recording engine fully operational.

## Dave's decision (2026-10-19)

- **Sportarr stays running as-is.** It uses working settings, a reliable torrent source for replays of missed recordings, and the existing scheduling/preemption logic. No Sportarr changes, no DVR automation changes.
- The Sportarr DVR is self-sufficient; Dave does not need to review recordings in The Docket.
- What goes away: the Recordings and Radio sections **in the Docket UI**, plus the radio background automation that burns CPU/streams.

## Current verified state

- The Docket sidebar still exposes `/radio` and `/recordings`.
- Radio implementation is spread across:
  - `src/app/radio/page.tsx`
  - `src/components/radio/`
  - `src/lib/azuracast.ts`
  - `src/lib/radioStations.ts`
  - `src/hooks/useNowPlaying.ts`
  - radio branches in `useAmbience.ts`, `SoundContext.tsx`, `SoundDropdown.tsx`, `SidebarSoundPanel.tsx`, and `FloatingSoundIndicator.tsx`
- The small global sound control is already part of the app shell and should remain, but its station/channel choices should be removed. Keep procedural ambience and the future soundscape slot.
- The Recordings UI/API/database module exists under `src/app/recordings/`, `src/components/recordings/`, `src/pages/api/v2/recordings/`, recording types/helpers, and migrations. The UI link is in `src/components/v2/Sidebar.tsx`.
- The mobile `BottomTabBar` does not currently expose Radio or Recordings.
- No `azuracast` container is currently present. The scheduled `azuracast-backup` job is still enabled and currently fails because the container no longer exists.
- `sportarr` is running from `/Users/dcplaskett/MyServer/sports`; the `Sports Scheduler` cron is enabled, and `Sportarr → Docket recording sync` is enabled. The old standalone `Recording Runner` cron is already paused.
- The repository was clean when inspected; no uncommitted changes were present.

## Staged implementation phases

### Phase 1 — Application surface cleanup

Use OpenCode/Daedalus for code changes.

1. Remove Radio and Recordings navigation from `src/components/v2/Sidebar.tsx`.
2. Preserve the global small sound player, but remove live radio station/channel selection and AzuraCast now-playing polling from the sound UI.
3. Keep the soundscape foundation: procedural ambience, volume, stop control, and a clean extension point for future soundscape content.
4. Remove or archive the dedicated `/radio` and `/recordings` pages and their component trees only after checking for imports/tests.
5. Remove dead radio-only types, hooks, API clients, and tests. Do not remove shared audio code that still serves ambience/soundscape playback.
6. Remove the obsolete recording API/types/db surface (the app no longer uses it). Keep the `recording_schedules` table and data in Postgres untouched — no migration to drop it.
7. Add/update tests for the remaining sound player and navigation. Run `npm test`, `npx tsc --noEmit`, and `npm run build`.

### Phase 2 — Automation hygiene (minimal)

Sportarr, the Sports Scheduler, and the Sportarr → Docket sync stay enabled per Dave's decision. Only genuinely dead automation is cleaned up.

1. Disable the failing `azuracast-backup` cron (`2c7af5a004b7`) — its target container is already absent and it errors weekly.
2. Leave `sportarr`, the Sports Scheduler cron, and `Sportarr → Docket recording sync` entirely untouched. The sync cron may keep writing to the retained `recording_schedules` table for history; revisit only if Dave asks.

### Phase 3 — Documentation cleanup

- Update `AGENTS.md` so it no longer presents Radio or Recording Schedule as active product modules.
- Update `ROADMAP.md` with a retirement entry and a future Soundscape direction.
- Add a DEVLOG entry after implementation/deployment, not during this staging pass.
- `.hermes/OPENCODE-HANDOFF.md` has been updated with the implementation handoff reflecting Dave's decision.

## Acceptance criteria

- Sidebar has no Radio or Recordings entries.
- `/radio` and `/recordings` are no longer reachable as active product pages, with intentional 404/redirect behavior.
- The small sound control remains available and can start/stop the retained soundscape/ambience functionality.
- No browser code polls `radio.dcplaskett.com` or exposes station/channel choices.
- No AzuraCast backup job remains enabled for a nonexistent container.
- `sportarr` and the DVR pipeline (Sports Scheduler, Sportarr → Docket sync) remain fully untouched and enabled.
- Tests, typecheck, production build, and deployed app health all pass.

## Not included in this staging pass

- Deleting historical recordings from storage.
- Purging `recording_schedules` rows.
- Deleting the AzuraCast data volume.
- Deleting Sportarr configuration or media.
- Designing the final soundscape catalog.

## Next action

Send the handoff to OpenCode for the application slice (Radio + Recordings UI/API removal, soundscape player preserved), then disable the dead `azuracast-backup` cron. Sportarr and the DVR pipeline stay untouched.