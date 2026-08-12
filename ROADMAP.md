# Docket Roadmap

A living plan for the Docket app. Items are ordered by priority within each time horizon.  
Statuses: `🔴 Not Started` | `🟡 In Progress` | `🟢 Complete` | `⛔ Blocked`

---

## ✅ Recently Completed

- [x] **Calendar Day View UX overhaul** 🟢
  Seven interconnected day view improvements now complete. (a) Full-screen scrollable day container — DayView now scrolls internally (`max-h: calc(100vh - 200/220px)`) instead of pushing whole-page scroll; sidebar scrolls independently. (b) Truncate off-hours — defaults to 6 AM–10 PM with a "24 hours" toggle pill (shows "{n} hidden" badge when clipping items); added `gridYToMinutes`/`minutesToGridY` helpers and fixed click/drop/touch math + current-time indicator to account for non-zero `HOUR_START`. (c) All-day section polish — dedicated "All-day" panel with section label, unified event/task pill cards, and "+N more" collapse/expand. (d) Time-blocking — tasks now carry an optional `end_time` (same-day absolute timestamp) so a task occupies a real time block; DayView renders the duration, drag-drop preserves it, the datepicker has a None/30m/1h/2h/Custom duration picker, and recurrence carries the duration forward. (e) Default to today — calendar always opens to `new Date()`; removed `cal_current_date` localStorage read + persistence. (f) Drag visualization — live 15-min snap ghost (dashed indigo line + time label) renders during `onDragOver` and touch-move; clears on drop/end/leave. (g) Drag to unschedule — floating "Drop here to remove date" zone (fixed bottom-center, `z-50`) on both mobile + desktop that PATCHes `due_date: null` + `end_time: null`; the desktop `UnscheduledTaskPanel` sidebar also accepts drops with a red ring hover state.
  *Completed: 2026-07-22 (Phase 1, items a,b,c,e,f,g) — 2026-08-10 (item d, time-blocking)*

- [x] **Page editor overhaul** 🟢
  Four-area editor polish: (A) Toolbar — visual grouping with separators, inline URL input replacing `window.prompt()`, deduplicated Markdown export, mobile popup repositioned, table controls fade transition. (B) Drag handle & block type switcher — scroll listener to hide on scroll, clears position on drag end, multi-fallback `posAtCoords` projection, aria accessibility attributes, `BlockTypePopover` now portals to `document.body` with viewport boundary detection + active state indicator + Escape dismissal, fixed subpage conversion bug. (C) Padding & spacing — reduced `pb-[80vh]`→`pb-[40vh]`, removed redundant wrapper padding, added focus-visible ring, fixed mobile-invisible date button, fixed edit button background clash. (D) Slash command — renamed `SlashCommand.ts`→`.tsx` with JSX, added groupings/descriptions/types, replaced image URL prompt with file picker upload, `allowSpaces: true`, fixed Toggle Block icon, added keyboard shortcut hints.
  *Completed: 2026-07-20*

- [x] **Persistent ambient audio across pages + floating sound indicator** 🟢
  Moved audio management from the Focus page into a global `SoundContext` provider at the root layout level. Sounds now play immediately on selection (no timer needed) and persist across SPA page navigation — the provider never unmounts. Added a `FloatingSoundIndicator` component (fixed bottom-left, `z-50`) that appears on all pages when audio is active, showing current ambience + music label with a full dropdown popover for quick controls and an X button to stop all. Fixed a bug where ambience persisted but music stopped on navigation (ambience had no cleanup effect, music did). `SoundContext` reads/restores saved selections from localStorage on mount but does not auto-play; cleanup is handled via `beforeunload` (tab close) only.
  *Completed: 2026-07-13*

- [x] **Focus page AzuraCast integration + sound system rework** 🟢
  Replaced binary ambience/music toggles with a `SoundDropdown` popover containing two sections — Ambience (Brown Noise, Rain, Snow, Orbit, Off) and Music (Pentatonic, Runtime Loop, Warm Boot, Off). Added `startStream(url)` / `stopStream()` to `useAmbience` for AzuraCast radio streaming via `<audio>` + Web Audio API `MediaElementSource`. Decoupled ambience from visualization mode — ambience is now an independent selector. Migrated `useFocusPreferences` from booleans (`isAmbienceEnabled`/`isMusicEnabled`) to string selectors (`ambienceMode`/`musicSource`) with backward-compatible localStorage migration. AzuraCast streams at `https://radio.dcplaskett.com/listen/{station}/radio.mp3` (192kbps MP3, discovered via `/api/stations`). 6 new tests added (137 total).
  *Completed: 2026-07-13*

- [x] **Fix BUG-015: flaky task timing + disable CalDAV task sync** 🟢
  Fixed `normalizeDateToNoon` and `parseLocalDateNode` in `dateUtils.ts` — they were normalizing ALL midnight-UTC values (including ISO timestamps with explicit times from the DB/calendar events) to local noon, clobbering intentional times that landed at 00:00 UTC (e.g., 7 PM CT = next-day 00:00 UTC → shifted 7 hours). Added a guard: strings containing `T` are preserved as-is; only bare date strings (`"2026-05-18"`) are noon-normalized. Disabled CalDAV **task** sync in `caldav.ts` (now returns empty `SyncResult`); event sync is retained. No-op'd `createTombstone` in `db.ts` and removed the `task_sync_meta` insert in `recurrence.ts`. DB tables left in place — no migration needed, no data loss. Tasks are now local-only.
  *Completed: 2026-07-09*

- [x] **Fix orphaned v2Task nodes after task deletion (BUG-010)** 🟢  
  Three-part fix: (1) Page deletion now calls `deleteTask()` per orphaned task instead of raw `DELETE FROM tasks`, ensuring CalDAV tombstones + v2Task node cleanup on other pages + `task_sync_meta` cleanup. (2) Removed 500ms debounce from the editor's v2Task creation effect so backing tasks are created immediately when content is typed — eliminates the race with page auto-save that left `taskId: null` ghost checkboxes. (3) PUT handler strips dead v2Task nodes (`taskId: null`, no text content) before persisting. Added `005_clean_orphaned_v2task_nodes.sql` migration to strip existing dead nodes from all pages.
  *Completed: 2026-06-30*

- [x] **Fix DatePickerPopover overflow on mobile + dynamic positioning (BUG-009 + BUG-011)** 🟢  
  Added `max-h-[85vh] overflow-y-auto` so the popover scrolls internally instead of overflowing the viewport. On mobile (`< 768px`), the popover renders as a centered overlay with a click-to-close backdrop. Replaced the hardcoded `380px` flip threshold with dynamic `ResizeObserver`-based height measurement, so the popover flips above/below based on its actual height (including when the recurrence editor expands).  
  *Completed: 2026-06-29*

- [x] **Fix useCalendarEvents re-fetch loop** 🟢  
  Wrapped `getDateRange()` in `useMemo` so `start`/`end` are stable references; changed `useCallback` deps from `.toISOString()` strings to `[start, end]` references. Polling interval no longer tears down/recreates unnecessarily.  
  *Completed: 2026-06-22*

- [x] **JWT secret hardening** 🟢  
  Removed hardcoded `|| 'docket-dev-secret-change-in-production'` fallback from `middleware.ts`, `login/route.ts`, and `me/route.ts`. All three now throw at module init if `JWT_SECRET` env var is missing. Added `JWT_SECRET: ${JWT_SECRET}` to `docker-compose.yml` environment block (interpolated from `.env` file).  
  *Completed: 2026-06-22*

- [x] **Database migrations framework** 🟢  
  Adopted `node-pg-migrate` for dev/CI and a lightweight `scripts/run-migrations.js` runner for production (no devDeps in standalone image). Created `001_baseline.sql` (idempotent full schema), `002_caldav_name_default.sql` (data backfill), `003_notes_to_pages.sql` (conditional legacy data migration). Migrations tracked in `pgmigrations` table. Converted and deleted 6 legacy ad-hoc migration scripts. Updated `update.sh` and `Dockerfile`.  
  *Completed: 2026-06-22*

- [x] **Cross-view task sync & UI bug fixes** 🟢  
  Fixed perpetual loading in TodayView/page\[id\], connected views with custom events for instant sync, fixed CalendarView mobile DayDetailPanel, extended DayView overlap to timed tasks, fixed event color opacity, extracted layout constants.  
  *Completed: 2026-06-15*

- [x] **Recurrence engine bug fixes & test coverage** 🟢  
  Fixed weekly `daysOfWeek` calculation (was ignored), added duplicate-spawn protection, removed unused `RecurrenceRule` fields, extracted pure functions to `recurrenceCalc.ts`, added 35 unit tests.  
  *Completed: 2026-06-15*

- [x] **RRULE sync for CalDAV VTODOs** 🟢  
  Added bidirectional RRULE ↔ RecurrenceRule conversion. `parseVTodo` now extracts RRULE, `createVTodoString` now emits RRULE, sync paths persist `recurrence_rule` to DB. Added 25 tests.  
  *Completed: 2026-06-15*

- [x] **Task widget API endpoint** 🟢  
  Added `/api/widget/today` returning today's tasks in a lightweight JSON format for AIO Launcher widget integration. Added route to public middleware whitelist.  
  *Completed: 2026-06-12*

- [x] **Calendar shared module extraction** 🟢  
  Created `src/lib/calendar.ts` (shared types + utils), `EventCard`, `CalendarTaskCard`, `CalendarTaskBlock` components, `useCalendarEvents` and `useCalendarSources` hooks. Refactored CalendarView, WeeklyCalendar, TodayView to use shared modules.  
  *Completed: 2026-06-11*

- [x] **Interactive task blocks in DayView** 🟢  
  CalendarTaskBlock with checkbox toggle, status colors (todo=purple, in_progress=amber, done=green), drag-to-move, hover states.  
  *Completed: 2026-06-11*

- [x] **Click-to-create tasks on DayView time grid** 🟢  
  Click empty time slot → inline input appears at that position. Enter creates task with due time, Escape dismisses.  
  *Completed: 2026-06-11*

- [x] **CalendarTaskSidebar enhancement** 🟢  
  Added task completion toggles, quick-add input with date selector (today/tomorrow/no date), due date badges, TaskEditModal integration, sorted task list (overdue → today → tomorrow → upcoming → no date), completed tasks section.  
  *Completed: 2026-06-11*

- [x] **Merge CalendarTaskSidebar into UnscheduledTaskPanel** 🟢  
  Replaced standalone `CalendarTaskSidebar` with an integrated panel inside `UnscheduledTaskPanel`. Unified sidebar calendar interaction under one component tree. Deleted 283 lines of standalone sidebar code.  
  *Completed: 2026-06-11*

- [x] **Wire TaskEditModal to all calendar task clicks** 🟢  
  `CalendarView` and `WeeklyCalendar` now pass `openTaskEdit()` to `CalendarTaskCard` and `CalendarTaskBlock` `onClick` props. Clicking a task in week, month, or mobile views opens the edit modal.  
  *Completed: 2026-06-11*

---

## 🏗️ Immediate (Next 1–2 weeks)

### Architectural & Technical Debt
- [x] **Unify type systems** 🟢  
  *Merged `src/types/index.ts` and `src/types/v2.ts` into a single canonical set. Removed all adapter code and dead code (`api.ts`, unused hooks). The canonical `Task` type uses `status: TaskStatus` (not `completed: boolean`) and string dates matching JSON shapes.*  
  **Status:** 🟢 Complete  
  *Completed: 2026-06-13*

- [x] **Consolidate API layers** 🟢  
  *Removed `src/lib/api.ts`, added ~20 data access functions to `db.ts` (`getTasks`, `updateTask`, `deleteTask`, `deleteCompletedTasks`, `getFolders`, `createFolder`, `updateFolder`, `deleteFolder`, `getCalendarEvents`, `updateCalendarEvent`, CalDAV config CRUD, push subscription helpers, journal helpers, `searchAll`, `getFolderPages`). Refactored 12 route files to use `db.ts` helpers instead of inline SQL. Removed `mapFolder` camelCase conversions. Removed 4 unused `db.ts` exports. Fixed `pages.ts` dynamic import.*  
  **Status:** 🟢 Complete  
  *Completed: 2026-06-13*

- [x] **Database migrations framework** 🟢  
  *Adopted `node-pg-migrate` + custom production runner. Converted all legacy scripts to migration files. See Recently Completed for details.*  
  **Status:** 🟢 Complete  
  *Completed: 2026-06-22*

- [x] **JWT secret handling** 🟢  
  *Removed hardcoded fallback. All auth routes throw at init if `JWT_SECRET` is missing.*  
  **Status:** 🟢 Complete  
  *Completed: 2026-06-22*

### Calendar & Sync Improvements
- [ ] **CalDAV multi‑account support**  
  *Extend `caldav.ts` to handle multiple servers (currently only one set of credentials active).*  
  **Status:** 🔴 Not Started  
  **Context:** Marked as TODO in codebase; users need multiple calendar sources.

- [~] **Calendar Day View UX overhaul** 🟢  
  *Dave wants the day view to be a proper time-blocking tool, not just a read-only grid. Several interconnected improvements:*  
  **Status:** 🟢 Complete — all 7 items (a–g) shipped. Items a,b,c,e,f,g shipped 2026-07-22; item d (time-blocking) shipped 2026-08-10.
  **Reported:** 2026-07-09 (via Hermes, from Dave)
  
  **a) Full-screen scrollable day container** ✅ — Day grid wraps in `overflow-y-auto` (`max-h: calc(100vh - 200/220px)`); grid uses `minHeight` to preserve absolute positioning; `PullToRefresh` `max-h-[60vh]` removed for day view; sidebar scrolls independently at the same max-height.
  
  **b) Truncate off-hours** ✅ — Defaults to 6 AM–10 PM; "24 hours" toggle pill (with "{n} hidden" amber badge); `gridYToMinutes`/`minutesToGridY` helpers handle the non-zero `HOUR_START`; click/drop/touch math and current-time indicator fixed accordingly.
  
  **c) All-day events & tasks** ✅ — Polished as a dedicated "All-day" panel (rounded border, "ALL-DAY" label, unified pill cards for events + tasks, "+N more" collapse/expand).
  
  **d) Time-blocking for tasks** 🟢 — Tasks now carry an optional `end_time` (same-calendar-day absolute timestamp) so a task can occupy a time block (e.g., "Work on deck — 10:00 AM to 12:00 PM") rather than just a point-in-time deadline. Added migration `006_task_end_time.sql` (nullable `end_time` column + check constraint), plumbed `end_time` through `Task`/`TaskRow` types, `createTask`/`updateTask` DB helpers, both task PUT routes (with same-day + end-after-start validation), `DatePickerPopover` (None/30m/1h/2h/Custom duration picker), `TaskEditor`, `TaskItem`, and `EditorTaskItem`. DayView renders blocks at their actual duration (30-min fallback for point-in-time tasks), drag-drop preserves duration and clamps within the displayed grid, and unscheduling clears both `due_date` and `end_time`. Recurrence spawning preserves the duration offset into the next instance. Drag-resize handles deferred to a follow-up. *Completed: 2026-08-10*
  
  **e) Default to today on open** ✅ — `currentDate` always initializes to `new Date()`; `cal_current_date` localStorage read + persistence effect removed; `viewType` persistence retained.
  
  **f) Drag visualization with 15-min snap** ✅ — Live `dragIndicator` ghost (dashed indigo line + dot + time label at the snap point) renders during `onDragOver` (mouse) and `onTouchMove` (touch); clamps to 15-min in displayed range; clears on drop/leave/end.
  
  **g) Drag to unschedule** ✅ — Floating "Drop here to remove date" zone (`position: fixed` bottom-center, `z-50`) appears when dragging a task and PATCHes `due_date: null`; the desktop `UnscheduledTaskPanel` sidebar is also a drop target with a red ring hover state.
  
  **Affected files (Phase 1):** `src/components/CalendarView.tsx` (DayView function + CalendarViewV2 layout), `src/components/calendar/UnscheduledTaskPanel.tsx` (drop-to-unschedule handlers). **No API/DB/type changes** — all Phase 1 work is frontend-only.
  **Affected files (Phase 2 / time-blocking, pending):** `DatePickerPopover.tsx` (duration/end-time UI), `src/types/index.ts` (optional `end_time` on Task), `src/lib/db.ts` (`updateTask` end_time), API routes (`tasks.ts`, `[id].ts`), new migration `006_task_end_time.sql`.

- [x] **Page editor overhaul** 🔴 → 🟢  
  *The TipTap editor is functional but needs polish across several surfaces. Dave wants a general tightening of the editing experience.*  
  **Status:** 🟢 Complete  
  **Reported:** 2026-07-09 (via Hermes, from Dave)  
  *Completed: 2026-07-20*
  
  **a) Toolbar cleanup** — BUG-013 (double-click required for toolbar buttons) is the most visible issue — all buttons need `onMouseDown` + `preventDefault()` instead of `onClick`. Beyond that: button sizing/hit targets, icon clarity, responsive behavior (mobile toolbar is cramped), and the table controls strip that appears/disappears awkwardly.
  
  **b) Block drag handle & type switcher** — The `GlobalDragHandle` grip icon appears on hover in the left gutter. The positioning can be janky (relies on `posAtCoords` projection). The `BlockTypePopover` (paragraph, heading, list, quote, code, subpage, task) needs visual polish — icon + label alignment, active state indicator, transition smoothness.
  
  **c) Editor padding & spacing** — Review the editor's internal padding (`px-4 py-3` etc.) and the vertical rhythm between blocks. The drag handle's offset from the block, cursor behavior when hovering the gutter, and focus ring / selection styling all need a consistent look.
  
  **d) Slash command menu** — The `/` command palette (`SlashCommandList.tsx`) for inserting blocks. Check positioning, scroll behavior, keyboard navigation, and whether the command list is complete.
  
  **Affected files:** `Editor.tsx`, `EditorToolbar.tsx`, `GlobalDragHandle.tsx`, `BlockTypePopover.tsx`, `SlashCommandList.tsx`, `TagList.tsx`, and related TipTap extensions (`TaskExtension.tsx`, `TagExtension.tsx`, `PageLinkExtension.tsx`, `CollapsibleBlockExtension.tsx`).

- [~] **Disable CalDAV task sync (event sync retained)** 🟢  
  *CalDAV **task** sync is now disabled — `syncCalDAV()` in `caldav.ts` returns an empty result for the task branch instead of calling `syncTasksForConfig`. `createTombstone` in `db.ts` is a no-op; `recurrence.ts` no longer writes `task_sync_meta`. Event/calendar sync is kept intact. The background sync loop (`usePeriodicSync` / `/api/caldav/sync`) remains and now only syncs events. No env flag was needed — tasks are local-only by default. Resolved:**2026-07-09. (Original request was to gate **all** CalDAV sync behind an env flag; partial completion since event sync is intentionally retained.)*  
  **Status:** 🟢 Complete (task sync); event sync kept  
  **Reported:** 2026-07-09 (via Hermes, from Dave)

- [x] **Recurrence COUNT/UNTIL end conditions** 🟢  
  Added `count` and `until` fields to `RecurrenceRule`. `spawnNextRecurrence` terminates on COUNT exhaustion or UNTIL date. RRULE round-trip supports COUNT and UNTIL. DatePickerPopover has "Ends" UI (Never/After/On date). 18 new tests.  
  *Completed: 2026-06-15*

- [x] **Wire TaskEditModal to calendar task clicks** 🟢  
  *CalendarView and WeeklyCalendar now pass `openTaskEdit()` to card `onClick` props. Clicking a task in any view opens the edit modal.*  
  **Status:** 🟢 Complete  
  *Completed: 2026-06-11*

- [x] **Real-time cross-view task sync** 🟢  
  *Views now communicate via custom DOM events (`taskUpdated`, `taskCreated`, `taskDeleted`). Completed earlier as part of the cross-view sync & UI bug fixes batch. `useTaskSync` was removed in type unification — direct event dispatch replaces it.*  
  **Status:** 🟢 Complete  
  *Completed: 2026-06-11*

### Performance & Stability
- [x] **Fix useCalendarEvents re-fetch loop** 🟢  
  *Wrapped `getDateRange()` in `useMemo`; deps changed to `[start, end]` references.*  
  **Status:** 🟢 Complete  
  *Completed: 2026-06-22*

- [x] **Consolidate 30s polling intervals** 🟢
  *Created `src/contexts/SyncContext.tsx` — SyncProvider with single 30s interval, parallel fetch of tasks + ±180-day events window, CustomEvent listeners for immediate refetch. All three views (CalendarView, TodayView, WeeklyCalendar) now consume `useSync()` and filter client-side. Removed `useCalendarEvents.ts` entirely. Eliminated 4 independent 30s pollers → 1 shared poller.*
  **Status:** 🟢 Complete  
  *Completed: 2026-06-24*  
  **Context:** Network saturation and battery drain on mobile when multiple views are mounted.

- [x] **Cross-device auto-refresh via visibility API** 🟢
  *When the browser tab regains focus (user switches back from phone to laptop), trigger an immediate delta fetch so task lists auto-update without waiting for the next 30s poll tick. The SyncContext already handles polling, delta merging, and auto-re-rendering of subscribing views — the only missing piece is the `visibilitychange` event listener.*
  **Status:** 🟢 Complete  
  **Completed:** 2026-07-15  
  **What happened:**
  - **a)** Added `visibilitychange` listener to `SyncContext.tsx` — calls `fetchData(true)` when tab becomes visible. ~5-line effect added alongside the existing CustomEvent listener.
  - **b)** Delta endpoint verified — `/api/v2/tasks?since=<ISO>` already filters by `updated_at > $1`, and `updateTask` sets `updated_at = NOW()` on all mutations. No server changes needed.
  - **c)** No banner or user action needed — views re-render automatically from SyncContext state.
  **Affected files:** `src/contexts/SyncContext.tsx`

- [x] **Add error state UI for failed operations** 🟢
  *Created ToastProvider context + useToast() hook with showToast(message, type) API. Toasts auto-dismiss after 4s, render via portal, color-coded (success/error/info). Wired into all 7 CalendarView drag-drop/creation handlers. Reusable — other components can adopt trivially.*
  **Status:** 🟢 Complete  
  *Completed: 2026-06-24*

- [x] **Silent drag-drop failures in CalendarView** 🟢
  *All 7 drag-drop/creation .catch(console.error) handlers now show error toasts via useToast(). Covers handleDropTask, DayView onDrop (dragTask, external drop, dragEvent), onTouchEnd, and inline task creation.*
  **Status:** 🟢 Complete
  *Completed: 2026-06-24*

### Code Quality
- [ ] **Typography overhaul: Bitter for content, Nunito for chrome** 🙅
  *Replace the unused Platypi font with Bitter (a warm, readable serif Dave enjoys). Split typography into two lanes: Bitter for reading/writing surfaces (editor content, task descriptions, journal entries) and Nunito for UI chrome (sidebar, buttons, nav, headers). JetBrains Mono stays for code blocks.*
  **Status:** 🙅 Won't Fix — tried Bitter, didn't hit as expected. Reverted to original Nunito-everywhere setup. Platypi remains dead code.
  **Reported:** 2026-07-15 (via Hermes, from Dave)
  **Attempted:** 2026-07-15 — implemented and deployed, reverted same day after Dave reviewed.

- [ ] **Move constants out of component functions**  
  *`HOUR_HEIGHT`, `HOUR_START`, `HOUR_END` are recreated on every render in CalendarView. Should be module-level.*  
  **Status:** 🔴 Not Started

- [x] **Remove console.log from production code** 🟢
  *Removed all 45 `console.log` statements from production code across 13 files (caldav sync, recurrence, contexts, hooks, components, API routes). Retained `console.error` (117 catch/error handlers) and `console.warn` (7 operational warnings). No functional changes.*
  **Status:** 🟢 Complete
  *Completed: 2026-06-30*

- [x] **Replace `handleDeletePage` / `handleCreatePageSubmit` full page reloads**  
  *Replaced 4 `window.location.href` calls with `useRouter()` across `Sidebar.tsx` and `page/[id]/page.tsx`. Deletions use `router.replace()` (no stale history entries); creation/navigation uses `router.push()` (normal forward nav).*
  **Status:** 🟢 Complete  
  *Completed: 2026-07-08*

### Testing & Stability
- [ ] **Re-enable TypeScript & ESLint in builds**  
  *Fix all existing errors and remove `ignoreBuildErrors` / `ignoreDuringBuilds` from `next.config.ts`.*  
  **Status:** 🔴 Not Started

- [ ] **Add integration tests for critical flows**  
  *Task CRUD → sync, CalendarView drag & drop, folder export ZIP integrity.*  
  **Status:** 🔴 Not Started

---

## 🎯 Near‑term (1–3 months)

### Feature Work
- [ ] **App icon redesign** 🔴
  *The current icon (white clipboard + green checkmark on navy blue) has been the same since initial PWA setup. It's clean but generic — every Docket/app icon in Dave's launcher is some variation of a clipboard with a checkmark. Time for something distinct. The icon should reflect a dark-mode native aesthetic (the app is dark-only, `bg-gray-950`) and feel like it belongs on a home screen next to Things, Fantastical, and Obsidian — not like a stock placeholder.*
  **Status:** 🔴 Not Started
  **Reported:** 2026-07-13 (via Hermes, from Dave)

  **What needs to happen:**
  - **a) New icon design** — Create a new icon that's distinct from the clipboard+checkmark trope. The Docket is a dark-mode task+notes+calendar app. The icon should feel premium, minimal, and recognizable at app-icon sizes (not just a smaller version of a detailed illustration). Consider glyphs that suggest planning, time, or structured thought — not just a checklist.
  - **b) All 5 icon files** — Generate consistent versions across all required sizes:
    - `public/icon-192.png` (192×192, PWA)
    - `public/icon-512.png` (512×512, PWA)
    - `public/apple-touch-icon.png` (180×180 preferred, Apple)
    - `public/favicon.png` (32×32 or 64×64, browser tab)
    - `src/app/favicon.ico` (multi-size ICO, legacy browser support)
  - **c) Manifest cleanup** — Update `manifest.json`: `theme_color` to `#030712` (matches the dark-only app's viewport themeColor), `background_color` to `#030712` (currently `#ffffff` — a white flash on dark PWA launch). The `name`, `short_name`, and `description` are fine.
  - **d) Layout metadata** — `src/app/layout.tsx` already references `favicon.png` and `apple-touch-icon.png` in the `icons` metadata. Just replacing the files is sufficient — no code changes needed unless the filenames change.
  - **e) Maskable icon safety** — The manifest declares `"purpose": "any maskable"`. Ensure the new icon has adequate safe zone padding (the central glyph should fit within ~60% of the canvas) so Android adaptive icon masking doesn't clip it. The current icon likely doesn't — the clipboard fills most of the canvas.

  **Design direction options to explore:**
  - A single distinctive glyph (stylized "D", an abstract mark, a geometric composition) on a dark background
  - Something that reads well at 48×48dp (launcher size) — not a detailed illustration
  - Could incorporate subtle gradients or a glow effect since the app is dark-mode — but must still work as a flat PNG
  - The green checkmark is the only color accent in the current icon; consider whether to keep it, shift it, or drop it entirely

  **Affected files:**
  - `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/favicon.png` — replace
  - `src/app/favicon.ico` — replace
  - `public/manifest.json` — update `theme_color` and `background_color`
  - `src/app/layout.tsx` — no changes needed (already points to correct filenames) unless filenames change

  **Verification:**
  ```bash
  # Manifest
  curl -s https://docket.dcplaskett.com/manifest.json | python3 -m json.tool
  # Icons
  curl -sI https://docket.dcplaskett.com/icon-192.png
  curl -sI https://docket.dcplaskett.com/apple-touch-icon.png
  # PWA install test on phone — icon should appear correctly in launcher
  ```
- [x] **Recording Schedule Module** 🟢
  *A dedicated sports recording schedule management system bolted onto The Docket (same pattern as Focus Timer). Database table, CRUD API, conflict detection, dashboard UI. Hermes scripts will POST/read schedules via API instead of JSON files. Built as a standalone module in `src/modules/recording-scheduler/` then plugged into the app shell.*
  **Status:** 🟢 Complete (Phases 1-6)
  **Plan:** `.hermes/plans/2026-08-01-recording-schedule-module.md`
  **Reported:** 2026-08-01 (via Hermes, from Dave)
  *Completed: 2026-08-11 (Phases 1-4), 2026-08-12 (Phase 5)*

  **What needs to happen (6 phases):**
  - **Phase 1: Module scaffold + DB** — `src/modules/recording-scheduler/` directory, migration `007_recording_schedules.sql`, types, db helpers ✅
  - **Phase 2: API routes** — CRUD endpoints at `/api/v2/recordings` + conflict detection at `/api/v2/recordings/conflicts` ✅
  - **Phase 3: UI components** — RecordingCard, ConflictPanel, RecordingDashboard (auto-refreshing, 60s polling) ✅
  - **Phase 4: Plug into Docket** — `/recordings` page route, sidebar + BottomTabBar navigation ✅
  - **Phase 5: Hermes script integration** — `smartiflix-fixture-scheduler.py`, `smartiflix-recording-runner.py`, `pl-replay-grabber.py` all switch from JSON file I/O to API calls ✅
  - **Phase 6: Polish** — ROADMAP, AGENTS, deploy ✅

  **Affected files:**
  - `src/modules/recording-scheduler/` — types, db helpers, components (new)
  - `src/pages/api/v2/recordings/` — CRUD + conflict detection API (new)
  - `src/app/recordings/page.tsx` — dashboard page (new)
  - `src/migrations/007_recording_schedules.sql` — DB table + indexes (new)
  - `src/components/v2/Sidebar.tsx` — navigation link (modified)
  - `src/components/v2/BottomTabBar.tsx` — mobile tab (modified)
  - `~/.hermes/scripts/recording_api.py` — shared API client (new)
  - `~/.hermes/scripts/smartiflix-fixture-scheduler.py` — API integration (modified)
  - `~/.hermes/scripts/smartiflix-recording-runner.py` — API integration (modified)
  - `~/.hermes/scripts/pl-replay-grabber.py` — API integration (modified)
  - `~/.hermes/docket_credentials.json` — API credentials (new)
- [x] **Focus page AzuraCast integration + sound system rework** 🟢  
  *Replaced binary toggles with dropdown selectors. Music: Pentatonic (procedural) + AzuraCast streams (Runtime Loop, Warm Boot). Ambience: Brown Noise, Rain, Snow, Orbit, Off — decoupled from visualization mode. Stream URLs discovered via AzuraCast API.*
  **Status:** 🟢 Complete  
  **Reported:** 2026-07-11 (via Hermes, from Dave)  
  *Completed: 2026-07-13*

  **What exists now:**
  - `useAmbience` hook — procedural Web Audio API generator. Ambience modes (brown noise, pink noise/rain, snow, orbit drones) tied to the visualization mode. Music mode is a C Major Pentatonic sine-wave melody generator (random sparse notes). Both are simple on/off toggles in the header.
  - `useSoundEffects` hook — procedural UI click/chime sounds (separate from ambience).
  - AzuraCast running on Ambrosia at `azuracast.dcplaskett.com` with 3 stations: `azuratest_radio`, `runtime_loop`, `warm_boot`. Each has a public stream URL (likely MP3/AAC via Icecast on port 8000 or proxied through NPM).

  **What needs to happen:**
  - **a) Music source dropdown** — Replace the binary Music toggle with a `<select>` or popover that lists:
    - "Pentatonic" (existing procedural generator)
    - "AzuraCast — AzuraTest Radio" (stream URL)
    - "AzuraCast — Runtime Loop" (stream URL)
    - "AzuraCast — Warm Boot" (stream URL)
    Selecting a stream creates an `<audio>` element (or uses the Web Audio API `MediaElementAudioSourceNode`) pointing to the station's public stream URL. Selecting "Pentatonic" uses the existing procedural `startMusic`/`stopMusic`.
  - **b) Ambience dropdown** — Replace the binary Ambience toggle with a dropdown listing the procedural modes: "Brown Noise" (default), "Rain", "Snow", "Orbit", "None / Off". Selecting a mode calls `startAmbience(mode)` with that visualization mode. "None" calls `stopAmbience()`. This decouples ambience from the visualization mode — the user can have rain sounds with the constellation visualizer if they want.
  - **c) UI placement** — The current ambience/music toggle pills in the header become a single "Sound" dropdown or two compact dropdowns. Keep the header compact — this is a phone-first PWA. Consider a small popover with both dropdowns inside, triggered by a speaker/music icon button.
  - **d) Stream URL discovery** — Determine the public stream URLs for the AzuraCast stations. AzuraCast typically exposes streams at `https://azuracast.dcplaskett.com/radio/8000/{station_shortcode}.mp3` or similar. Fetch the station list from AzuraCast's API (`/api/stations`) or hardcode the URLs. Since the stations rarely change, hardcoding is fine for now.
  - **e) Persist user selections** — Use `useFocusPreferences` (localStorage-backed) to remember the user's music source and ambience selection across sessions. Existing `isAmbienceEnabled`/`isMusicEnabled` booleans become `ambienceMode: string | null` and `musicSource: string` (e.g., `'pentatonic' | 'azuratest_radio' | 'runtime_loop' | 'warm_boot'`).

  **Affected files (likely):**
  - `src/app/focus/page.tsx` — replace toggle buttons with dropdown(s)
  - `src/hooks/useAmbience.ts` — add `startStream(url)` / `stopStream()` for AzuraCast audio elements; export `startAmbience` as-is, decouple from viz mode
  - `src/hooks/useFocusPreferences.ts` — migrate from booleans to string selections
  - `src/components/focus/VisualizationDropdown.tsx` — reference for building the new dropdown component (or create `SoundDropdown.tsx`)
  - New: `src/components/focus/SoundDropdown.tsx` — popover with music source selector + ambience selector

  **Pitfalls to watch for:**
  - `<audio>` elements need `crossOrigin="anonymous"` if you want to connect them to the Web Audio API for visualization/volume control.
  - AzuraCast streams may be HTTPS through the NPM proxy. Verify the stream URLs work in a browser before wiring them into the app.
  - Mobile browsers require a user gesture to play audio. The existing timer start button handles this — ensure stream playback is triggered in the same gesture chain.
  - If an AzuraCast station is offline, the `<audio>` element will fail silently. Add `onerror` handling with a toast notification.
  - The procedural music generator (`playNote`) uses `setTimeout` recursion. Make sure `stopMusic()` clears the timeout when switching to a stream source.

- [ ] **Dashboard redesign / makeover** 🔴  
  *The current dashboard (`DashboardView.tsx`) is a basic single-column scroll: 4 stat cards → WeeklyCalendar → RecentNotes. Dave wants a proper makeover — better layout, more visual polish, smarter use of space. Consider: two-column desktop layout (calendar + tasks on one side, notes/quick actions on the other), ambient/stats widgets, quick-capture input, recent activity feed. Mobile: the current single-column scroll works but could use better visual hierarchy. The dashboard is the landing page — it should feel like a command center, not an afterthought.*  
  **Status:** 🔴 Not Started  
  **Reported:** 2026-07-08 (via Hermes, from Dave)

- [ ] **Inline page links in editor**  
  *Add autocomplete and proper back‑linking support via the `PageLinkExtension`; show backlinks panel.*  
  **Status:** 🔴 Not Started

- [ ] **Advanced search filters**  
  *Date range, tag intersection, folder scope, content type (page/task). Improve full‑text indexing.*  
  **Status:** 🔴 Not Started

- [ ] **Mobile PWA enhancements**  
  *Offline‑first using Workbox, background sync for tasks, install prompts.*  
  **Status:** 🔴 Not Started

- [ ] **Rich calendar drag & resize**  
  *Implement multi‑day drag, all‑day toggle, and visual feedback for event resizing in Month/Week views. Basic drag-to-move for events and tasks already works in DayView.*  
  **Status:** 🟡 Partial — DayView drag complete; multi-day and resize not yet done

### Refactors & Cleanup
- [ ] **Extract TipTap extensions into independent packages**  
  *Make TaskExtension, TagExtension re‑usable; add proper test coverage.*  
  **Status:** 🔴 Not Started

- [ ] **Standardise error handling across routes**  
  *Create a consistent error response shape and logging (avoid raw 500s).*  
  **Status:** 🔴 Not Started

- [ ] **Remove legacy tables & columns**  
  *Drop `completed` and `source_note_id` references, clean up unused indexes.*  
  **Status:** 🔴 Not Started

---

## 🧭 Long‑term (6+ months)

- [ ] **Collaboration & sharing** (multi‑user, shared pages/tasks)
- [ ] **AI‑powered smart scheduling** (analyse task due dates, free time from CalDAV)
- [ ] **Customisable dashboards** (widgets: pomodoro, calendar, task list, journal)
- [ ] **Plugin architecture** to allow community extensions

---

**Notes for Opencode / contributors:**  
- Always update this roadmap when a task is started or completed.  
- Add new items to the appropriate section and mark their status.  
- If a task is blocked, note the dependency and link to an issue or discussion.
