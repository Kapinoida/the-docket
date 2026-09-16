# Hermes ↔ OpenCode Handoff

## Purpose

Hermes acts as the product strategist, investigator, reviewer, and planning partner for The Docket. OpenCode acts as the implementer.

Hermes should not directly modify application code. Hermes investigates the current project, identifies root causes and opportunities, and leaves precise markdown instructions for OpenCode.

OpenCode reads the handoff and project documentation, implements the agreed changes, runs verification, and updates the project log.

## Source Documents

Read these before starting work:

1. `AGENTS.md` — project conventions and deployment rules
2. `ROADMAP.md` — active and planned work
3. `BUGS.md` — known issues and investigation notes
4. `DOCKET-IMPROVEMENT-SYNOPSIS.md` — product direction and planning improvements
5. `DEVLOG.md` — recent implementation history
6. `v2-architecture-doc.md` — context-based architecture

## Hermes Responsibilities

When Dave asks Hermes to inspect, improve, or rethink The Docket:

1. Inspect the actual current code and database model.
2. Compare the implementation against the requested behavior and the improvement synopsis.
3. Separate observations into:
   - Confirmed bugs
   - UX friction
   - Product opportunities
   - Architectural risks
   - Open questions
4. Add confirmed bugs and implementation-ready investigations to `BUGS.md`.
5. Add agreed feature work to `ROADMAP.md`.
6. Create or update this handoff file with a focused implementation brief.
7. Do not edit `.ts`, `.tsx`, `.sql`, or deployment files unless Dave explicitly changes the division of labor.

## OpenCode Responsibilities

When Dave starts OpenCode for a Docket task:

1. Read this file and the source documents above.
2. Treat confirmed findings as requirements, not vague suggestions.
3. Inspect the relevant code before editing.
4. Implement the smallest coherent vertical slice.
5. Add or update tests for the behavior.
6. Run lint, type-check, tests, and build as appropriate.
7. Update `DEVLOG.md`, `ROADMAP.md`, and `BUGS.md` when relevant.
8. Commit with a descriptive conventional commit.
9. Deploy only after verification, using the project’s documented deployment path.
10. Report changed files, verification results, and any remaining risks.

## Recommended Hermes Prompt

Use this in the Hermes Matrix room:

> Inspect the current The Docket project against `DOCKET-IMPROVEMENT-SYNOPSIS.md`. Focus on [specific area]. Verify the actual code and schema, identify the highest-value improvements, and write an implementation-ready brief to `.hermes/OPENCODE-HANDOFF.md`. Add confirmed bugs to `BUGS.md` and agreed roadmap items to `ROADMAP.md`. Do not change application code.

## Recommended OpenCode Prompt

Use this from `/Users/dcplaskett/MyServer/the-docket`:

> Read `AGENTS.md`, `DOCKET-IMPROVEMENT-SYNOPSIS.md`, `ROADMAP.md`, `BUGS.md`, and `.hermes/OPENCODE-HANDOFF.md`. Implement the current handoff as a complete vertical slice. Inspect the existing code and schema first. Follow the project conventions, add tests, run verification, update project documentation, commit the change, and deploy only if verification passes. Do not implement speculative items that are not part of the current handoff.

## Handoff Template

### Current Objective

Dave wants the radio front-and-center in The Docket (from The Lyre / localhost-radio room, 2026-09-15). **Slices 1-2 complete:** Radio mini-player in the app shell with Now Playing data plumbing + adaptive mini-player, and dedicated `/radio` page with station cards, now playing panel, and song history. Next: volume control and calendar improvements.

### Radio mini-player slice (this pass)

1. **AzuraCast client** — `src/lib/azuracast.ts` with `fetchNowPlaying()`. The endpoint is public, no auth, CORS `*` (verified 2026-09-15) — call it directly from the browser, no server proxy. Timeout + `null` on failure. Types in `src/types/azuracast.ts`.
2. **`src/hooks/useNowPlaying.ts`** — 30s polling; pause when the tab is hidden (`document.visibilityState`); stations keyed by shortcode; offline flag.
3. **Station registry** — `src/lib/radioStations.ts` (shortcode → display name + listen URL). Refactor `useAmbience.ts`'s hardcoded `STREAM_URLS` to import from it so station list lives in one place.
4. **Rework `FloatingSoundIndicator.tsx`** into the adaptive mini-player:
   - Idle (nothing playing): slim selector pill (radio icon → popover with today's ambience + music options).
   - Stream playing: album art thumbnail, station name, live track ("artist — title"), play/pause (pause → `stopAll()` + source `'none'`; play → re-select station), station switch (Warm Boot ↔ Runtime Loop), stop (X).
   - Ambience/pentatonic only: keep today's label pill behavior.
   - AzuraCast unreachable: pill persists in a muted "off air" state — no crash.
5. **Tests** — hook test (mocked fetch: success / failure / malformed shape) + component test (mocked `useSound` + API; idle / playing / offline states).

### User Problem

The radio is buried. To play a station Dave opens Focus → Sound settings → picks a station; while playing, the only visible surface is a small pill bottom-left showing just the source name ("Warm Boot") — no track, no art, no quick switching, and nothing at all when idle. He wants the radio visible and controllable from anywhere in the app, plus a proper main page for it.

### Confirmed Current Behavior

- `SoundProvider` (`src/contexts/SoundContext.tsx`) is app-wide, mounted in `src/components/ProvidersWrapper.tsx`; `FloatingSoundIndicator` (`src/components/focus/FloatingSoundIndicator.tsx`) renders fixed bottom-left `z-50` and returns `null` when `isPlaying` is false.
- Pill shows only joined labels (`AMBIENCE_LABELS` / `MUSIC_LABELS`, e.g. "Warm Boot" or "Brown Noise + Warm Boot") plus an X stop button; its popover duplicates Focus's `SoundDropdown` (5 ambience + 4 music options).
- Audio engine `src/hooks/useAmbience.ts`: `startStream(url)` = `<audio>` + `MediaElementSource` with 3s fade-in / 2s fade-out; `STREAM_URLS` hardcodes `https://radio.dcplaskett.com/listen/{warm_boot|runtime_loop}/radio.mp3`; `MusicSource = 'pentatonic' | 'runtime_loop' | 'warm_boot' | 'none'`.
- AzuraCast `GET https://radio.dcplaskett.com/api/nowplaying` — public, no auth, `access-control-allow-origin: *`. Per station: shortcode, listen_url, listeners (total/unique/current), now_playing.song (art / artist / title / text), playing_next, song_history. Art URLs are absolute and CORS-open.

### Scope (this pass)

- **In:** `azuracast.ts` client + types; `useNowPlaying` hook; `radioStations.ts` registry (+ `useAmbience.ts` refactor); `FloatingSoundIndicator` rework; tests.
- **Out (queued separately):** `/radio` page (Slice 2), volume control (nice-to-have; needs gain-node exposure from `useAmbience`), Plexamp / Plex library integration (out entirely — copyright concerns + Plexamp already covers personal radio), any DB/migration (AzuraCast API is the source of truth), localhost-radio artist/diorama work.

### Likely Files

- New: `src/lib/azuracast.ts`, `src/types/azuracast.ts`, `src/lib/radioStations.ts`, `src/hooks/useNowPlaying.ts`, `src/hooks/__tests__/useNowPlaying.test.ts`, `src/components/focus/__tests__/FloatingSoundIndicator.test.tsx`
- Edited: `src/components/focus/FloatingSoundIndicator.tsx`, `src/hooks/useAmbience.ts` (`STREAM_URLS` → `radioStations.ts`)

### Acceptance Criteria

- [x] Stream playing → mini-player shows art + station + live track, updates on song change, visible from any page
- [x] Idle → slim selector pill; playing → full mini-player; switch/stop work app-wide (not just Focus)
- [x] AzuraCast down → degraded "off air" pill, no crash, no unhandled errors
- [x] All existing tests pass; new tests for hook + component; `npx tsc --noEmit` + lint clean
- [x] DEVLOG.md + ROADMAP.md updated; committed; deployed via `update.sh`

### Verification

- [x] Unit tests: `useNowPlaying` (fetch mock: success, failure, malformed shape)
- [x] Component tests: `FloatingSoundIndicator` idle / playing / offline states; play/pause/switch/stop handlers
- [x] `npm test`, `npx tsc --noEmit`, lint
- [ ] Manual: docket.dcplaskett.com → Focus → start Warm Boot → check pill on `/today` shows art + track → switch to Runtime Loop → stop → confirm idle selector
- [x] Update `DEVLOG.md` + `ROADMAP.md`; commit; deploy

### Queued Next Slices

1. ~~**Radio volume control**~~ ✅ Complete (2026-09-16) — master GainNode, volume slider in SidebarSoundPanel, persisted in localStorage.
2. ~~**Calendar improvements: reliability and presentation pass**~~ ✅ Complete (2026-09-16) — fixed event drag persistence, clickable +N more, multi-day events, EventCard opacity fix, 15 new tests.
3. ~~**Holidays in the calendar**~~ ✅ Complete (2026-09-16) — US holidays in all calendar views, non-interactive red-tinted markers, 17 new tests.
4. ~~**Workday/holiday-aware recurrence**~~ ✅ Complete (2026-09-16) — recurring tasks shift to next workday when landing on weekends/holidays, 11 new tests.
5. ~~**Data-update UX**~~ ✅ Complete (2026-09-16) — loading states for Sidebar and FolderTree, optimistic updates for page/folder mutations, quick-add feedback.
6. **Recording page** — styling/feel pass + pull recordings from **Sportarr**.

## Operating Rhythm

The useful loop is:

```text
Dave describes friction in Matrix
        ↓
Hermes investigates the live project
        ↓
Hermes writes a focused handoff
        ↓
Dave runs OpenCode
        ↓
OpenCode implements, tests, documents, and deploys
        ↓
Dave verifies the result
        ↓
Hermes audits the next gap
```

The key rule: **one handoff should describe one coherent outcome**. Do not feed OpenCode the entire improvement synopsis as one giant undifferentiated mission. Use the synopsis as the product compass, then let Hermes turn one slice into a precise brief.
