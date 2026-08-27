# Development Log (Devlog)

Keep entries concise, with dates, involved components, and a brief description.  
Use this format:
[YYYY-MM-DD] – Short Title
	•	What changed: …
	•	Why: …
	•	Affected areas: (routes, hooks, components, DB schema)
	•	Migration needed? Yes / No (and what steps)

---

## [2026-08-27] – Inbox mutation hardening with apiFetch
- **What changed:**
  Replaced all raw `fetch()` calls in `InboxView.tsx` with the centralized `apiFetch()` wrapper from `src/lib/api.ts`. This ensures HTTP 4xx/5xx responses are properly treated as failures instead of being silently ignored. Added `AuthError` handling to all mutation paths (create, toggle, update, delete, move-to-page) so session-expiry flows through the existing global auth-expiry handler without surfacing as a user-visible error. Optimistic local updates and rollback behavior are preserved.
- **Why:**
  The previous raw `fetch()` calls only caught network rejections in their `.catch()` blocks. HTTP error responses (e.g., 500, 403) were treated as successes because `res.ok` was not checked in all paths, leading to silent data inconsistencies. The `apiFetch()` wrapper throws on any non-2xx response, making failures explicit and enabling proper rollback.
- **Affected areas:** `src/components/v2/InboxView.tsx` (5 mutation handlers updated).
- **Migration needed?** No.
- **Testing:** All 222 tests pass. TypeScript clean (no new errors in modified files). ESLint clean (no new errors in modified files).

---

## [2026-08-27] – Move CalendarView constants to module scope
- **What changed:**
  Moved four static DayView layout constants from inside the `DayView` component function to module scope in `src/components/CalendarView.tsx`: `HOUR_HEIGHT` (64), `LEFT_GUTTER` (48), `COLUMN_GAP` (1), and `ALL_DAY_LIMIT` (4). `HOUR_START` and `HOUR_END` remain local to `DayView` because they depend on the `showAllHours` state.
- **Why:**
  ROADMAP "Move constants out of component functions." These values were being recreated on every render despite being static. Moving them to module scope eliminates unnecessary allocations and makes the intent clearer.
- **Affected areas:** `src/components/CalendarView.tsx` (DayView function).
- **Migration needed?** No.
- **Testing:** All 222 tests pass. TypeScript clean (no new errors in modified files). ESLint clean (no new errors in modified files).

---

## [2026-08-12] - Recording Schedule Module deployment
- **What changed:** Deployed the recording schedule module and Hermes API integration to production. The application image rebuilt successfully, containers restarted, and the migration runner confirmed `007_recording_schedules.sql` is applied.
- **Why:** Completes the recording module rollout with the dashboard, CRUD/conflict APIs, database schema, and recording script integration available in production.
- **Affected areas:** `/recordings`, `/api/v2/recordings/*`, `recording_schedules` database table, and Hermes recording scripts.
- **Migration needed?** No - migration `007_recording_schedules.sql` was already applied.
- **Testing:** 222 tests passed; production build completed successfully.

---

## [2026-08-12] – Recording Schedule Module Phase 5: Hermes Script Migration
- **What changed:**
  Migrated all three Hermes recording scripts from JSON file I/O to the new Recording Schedule API.
  
  - **Shared API client** (`~/.hermes/scripts/recording_api.py`): Created a reusable API client with JWT authentication (cookie-based), token caching (24h), and helper functions for all CRUD operations. Handles login via `/api/auth/login`, extracts token from Set-Cookie header, and sends it as a cookie in subsequent requests.
  
  - **Fixture scheduler** (`smartiflix-fixture-scheduler.py`): Removed `load_queue()` and `save_queue()` functions. Now uses `create_recording()` to POST matched fixtures to the API. Calculates end times based on league duration. Posts metadata including home/away teams and notes. Checks for conflicts after saving via `get_conflicts()`.
  
  - **Recording runner** (`smartiflix-recording-runner.py`): Removed JSON queue file operations. Now uses `get_recordings(status='pending')` to fetch upcoming recordings. Uses `update_recording()` to mark recordings as 'recording' when ffmpeg launches and 'completed' when done. Tracks PIDs locally in `~/.hermes/state/recording_pids.json` (API doesn't store PIDs). Checks for completed recordings by verifying PID status and updates API with output file path and size.
  
  - **PL replay grabber** (`pl-replay-grabber.py`): Now uses `create_recording()` to POST replay recordings to the API with `source='replay'`. Includes channel label and PID in metadata. Calculates end times based on duration.
  
  - **Credentials** (`~/.hermes/docket_credentials.json`): Created credentials file with Docket password for API authentication.
  
- **Why:**
  Phase 5 completes the migration from the legacy JSON-based recording queue to the new database-backed API. This provides:
  - Centralized recording schedule visible in The Docket dashboard
  - Conflict detection and visualization
  - Better data integrity (no more JSON file corruption)
  - API-based integration instead of file-based
  - Proper authentication and authorization
  
- **Affected areas:** 
  - `~/.hermes/scripts/recording_api.py` (new)
  - `~/.hermes/scripts/smartiflix-fixture-scheduler.py` (modified)
  - `~/.hermes/scripts/smartiflix-recording-runner.py` (modified)
  - `~/.hermes/scripts/pl-replay-grabber.py` (modified)
  - `~/.hermes/docket_credentials.json` (new)
  
- **Migration needed?** No — uses existing API from Phase 4
  
- **Testing:** 
  - ✅ API client successfully authenticates and makes requests
  - ✅ Fixture scheduler dry-run works
  - ✅ Recording runner dry-run works
  - ✅ PL replay grabber dry-run works
  - ✅ Created, fetched, updated, and deleted test recordings via API
  - ✅ All three scripts can communicate with the API

---

## [2026-08-11] – Recording Schedule Module Phase 4: Integration into The Docket
- **What changed:**
  Integrated the Recording Schedule Module into The Docket. Created migration `007_recording_schedules.sql` with the recording_schedules table, indexes, and updated_at trigger. Added recording types and data access functions to `src/lib/db.ts` and `src/types/index.ts`. Created API routes at `/api/v2/recordings/` (index, [id], conflicts) using Pages Router pattern. Moved all UI components to `src/components/recordings/` (StatusBadge, RecordingCard, ConflictPanel, TimelineView, Filters, DashboardSkeleton, EmptyState, RecordingDashboard). Created `/recordings` page route. Added Recordings navigation to Sidebar and BottomTabBar. Ported and adapted all tests (56 tests for recordings).
- **Why:**
  Phase 4 completes the integration of the recording schedule module into The Docket, making it accessible via the existing app shell with proper authentication, navigation, and mobile support. The module is now fully functional within The Docket's ecosystem.
- **Affected areas:** 
  - `src/migrations/007_recording_schedules.sql` (new)
  - `src/lib/db.ts` (added recording data access functions)
  - `src/types/index.ts` (added recording types)
  - `src/pages/api/v2/recordings/` (new: index.ts, [id].ts, conflicts.ts)
  - `src/components/recordings/` (new: 8 components)
  - `src/app/recordings/page.tsx` (new)
  - `src/components/v2/Sidebar.tsx` (added Recordings nav item)
  - `src/components/v2/BottomTabBar.tsx` (added Recordings tab)
  - `src/pages/api/v2/recordings/__tests__/` (new: 3 test files)
  - `src/components/recordings/__tests__/` (new: 4 test files)
- **Migration needed?** Yes — run `npm run migrate` to apply `007_recording_schedules.sql`
- **Testing:** All 222 tests pass (56 new recording tests). Lint clean (no new errors). TypeScript clean (no new errors).

---

## [2026-08-11] – Simplify time-blocking: explicit start/end times
- **What changed:**
  Replaced the duration-based UI (None/30m/1h/2h/Custom buttons) with explicit start and end time inputs. Users now set both times directly, which is more intuitive and eliminates complex state synchronization issues.
- **Why:**
  The duration-based approach had several problems:
  - Complex state sync between `durationOption` and `endTime`
  - Tasks would "disappear" when validation failed silently
  - Couldn't revert a task from having a duration back to point-in-time
  - Confusing UX: "I have a 2-hour meeting" vs "I have a meeting from 2-4pm"
  
  The explicit start/end model is simpler, more intuitive, and matches how people naturally think about time blocks.
- **Affected areas:** `src/components/v2/DatePickerPopover.tsx` (replaced duration buttons with end time input), `src/components/TaskEditor.tsx` (simplified onSelect handler).
- **Migration needed?** No.
- **Testing:** All 166 tests pass. Manually verified: creating tasks with explicit end times, editing times, clearing end times, validation (end must be after start, same calendar day).

---

## [2026-08-11] – Fix end_time preservation when editing task dates
- **What changed:**
  Fixed a bug where editing a task's date would lose the time component or cause validation errors when the task had an `end_time`. The DatePickerPopover now receives the full date+time (not just the date), and the TaskEditor recalculates `end_time` to preserve the original duration when the date changes. Cross-midnight blocks are prevented by clamping to 23:59 or rejecting invalid combinations.
- **Why:**
  When a user edited a task with a time block (e.g., 10:00 AM – 11:00 AM) and changed the date, the DatePickerPopover would initialize with `selectedTime` empty (because the `date` prop was created from just the date string, losing the time). The user would select a new date, and the TaskEditor would set `dueTime` to '12:00' (noon) while `endTime` remained at the original 11:00 AM, causing the API validation to reject the request (end < start). The fix ensures the time is preserved and the duration is maintained when editing dates.
- **Affected areas:** `src/components/TaskEditor.tsx` (pass full date+time to DatePickerPopover, recalculate end_time to preserve duration), `src/components/v2/DatePickerPopover.tsx` (clamp cross-midnight blocks to 23:59).
- **Migration needed?** No.
- **Testing:** All 166 tests pass. Manually verified: creating tasks with duration, editing dates while preserving time and duration, and rejection of cross-midnight blocks.

---

## [2026-08-10] – Time-blocking for tasks (`end_time`)
- **What changed:**
  Tasks now optionally carry an `end_time` (absolute timestamp, same calendar day as `due_date`) so a task can occupy a time block rather than just a point-in-time deadline.

  - **DB:** `006_task_end_time.sql` adds nullable `end_time TIMESTAMP` to `tasks` plus a `chk_tasks_end_time_after_due` check constraint (`end_time IS NULL OR (due_date IS NOT NULL AND end_time > due_date)`). Baseline schema updated for fresh installs.
  - **Types:** `Task` / `TaskRow` gained optional `end_time: string | null`.
  - **Pure helpers:** New `src/lib/taskTime.ts` — `getTaskDurationMinutes` (30-min default fallback), `isTaskAllDay`/`isTaskTimed` (midnight + no end_time = all-day; an `end_time` makes a task "timed" even from a midnight start), `isSameCalendarDay`, `isValidEndTime` (after-start + same-local-day), and `sameDayClampDragStart` (snaps to 15-min, clamps the whole block inside the displayed grid). Exported `DEFAULT_TASK_DURATION_MINUTES`.
  - **DB helpers:** `createTask()` takes an optional `endTime`; `UpdateTaskFields` + `updateTask()` accept `end_time`.
  - **API:** Both `tasks.ts` (POST/PUT) and `[id].ts` (PUT) accept `end_time`/`endTime` (the existing snake/camel alias pattern). Validation rejects an end_time without a start, before the start, or on a different calendar day (400). Clearing `due_date` also clears `end_time`.
  - **Editing UI:** `DatePickerPopover` gained a "Block" row under the time input — None / 30m / 1h / 2h / Custom (native time picker). `onSelect` now returns `(date, recurrence, endTime)`. `TaskEditor`, `TaskItem`, and `EditorTaskItem` all wire `end_time` through.
  - **TipTap:** `v2Task` node gained an `end_time` attribute; the editor optimistic temp task now carries `end_time: null`; `handleUpdate` triggers task creation on `end_time` changes too.
  - **DayView rendering:** `itemLayouts` and the timed-task height calculations use `getTaskDurationMinutes(task)` instead of the fixed 30-min `DEFAULT_TASK_DURATION` (constant removed). `timedTasks` now also treats tasks with a midnight start + an `end_time` as timed.
  - **Drag/drop:** Both the in-grid `dragTask` drop and the external sidebar drop preserve duration — they compute `new_end = new_start + duration` and PATCH both `due_date` and `end_time`. The start is run through `sameDayClampDragStart` so the whole block stays inside the visible grid (blocks never cross midnight by design). The floating "Drop here to remove date" zone and the `UnscheduledTaskPanel` drop both clear `due_date` AND `end_time`.
  - **CalendarTaskBlock:** Displays a full `startTime – endTime` range when the task has an `end_time` (was start-only).
  - **Recurrence:** `spawnNextRecurrence` preserves the duration offset — `nextEndTime = nextDate + (end_time - due_date)` — and threads it into `createTask()` and the generated `v2Task` node attrs.
- **Why:**
  ROADMAP "Calendar Day View UX overhaul — Item (d) Time-blocking". Turns the day view into a real time-blocking tool; tasks can occupy spans instead of point deadlines. Follows the agreed scoping decisions: blocks never cross midnight, drag-resize handles are deferred to a follow-up, and point-in-time tasks keep the 30-minute visual fallback.
- **Affected areas:** `src/migrations/006_task_end_time.sql`, `src/migrations/001_baseline.sql`, `src/types/index.ts`, `src/lib/taskTime.ts` (new), `src/lib/db.ts`, `src/lib/recurrence.ts`, `src/pages/api/v2/tasks.ts`, `src/pages/api/v2/tasks/[id].ts`, `src/components/v2/DatePickerPopover.tsx`, `src/components/TaskEditor.tsx`, `src/components/v2/TaskItem.tsx`, `src/components/v2/EditorTaskItem.tsx`, `src/components/v2/editor/extensions/TaskExtension.tsx`, `src/components/CalendarView.tsx`, `src/components/calendar/CalendarTaskBlock.tsx`, `src/components/calendar/UnscheduledTaskPanel.tsx`.
- **Migration needed? Yes.** `006_task_end_time.sql` runs automatically via `update.sh` (production) or `npm run migrate` (dev). Additive only — nullable column + check constraint, safe on any existing `tasks` table.
- **Testing:** Added `src/lib/__tests__/taskTime.test.ts` (23 pure-function tests for duration, all-day/timed classification, same-day validation, and drag clamping) and 3 new API tests in `tasks.test.ts` (create-with-end_time, reject cross-day, reject end-before-start) + 1 existing test updated for the new `createTask` arity. All 166 tests pass. TypeScript clean (15 pre-existing errors — none new). ESLint: matches the 81-problem baseline — **zero new errors/warnings**.

---

## [2026-07-22] – Calendar Day View UX overhaul (Phase 1: 6 of 7 items)
- **What changed:**
  Six interconnected improvements to the Calendar Day View, packaged as one coherent overhaul. The seventh item (time-blocking / `end_time` for tasks) is deferred to a follow-up since it touches the DB schema, types, and datepicker — it's the largest piece on its own.

  **a) Full-screen scrollable day container:**
  - Wrapped `<DayView>` in `overflow-y-auto styled-scrollbar` containers on both mobile (`max-h: calc(100vh - 200px)`) and desktop (`max-h: calc(100vh - 220px)`) call sites. The time grid now scrolls internally rather than pushing the whole page vertical scroll.
  - Changed the day grid from `style={{ height: totalHeight }}` to `style={{ minHeight: totalHeight }}` so the absolute-positioned hour/event/task children keep their offsets while the outer container controls visible height.
  - Removed the `PullToRefresh` wrapper's `max-h-[60vh]` constraint for day view (it conflicted with the new internal scroll container). Week and month views retain `max-h-[60vh]` on mobile.
  - Constrained the desktop `UnscheduledTaskPanel` sidebar to the same `calc(100vh - 220px)` maxHeight so the day column and the sidebar scroll independently and stay aligned.

  **b) Truncate off-hours (12am–6am, 10pm–12am):**
  - Made `HOUR_START` / `HOUR_END` state-driven: default to `HOUR_START = 6` (6 AM) and `HOUR_END = 22` (10 PM). A "24 hours" / "6am–10pm view" toggle pill above the time grid expands to the full range. The toggle shows a "{n} hidden" amber badge when off-hours items (events or timed tasks) are being clipped, so users don't silently lose visibility into a 2 AM appointment.
  - Added `gridYToMinutes()` / `minutesToGridY()` helpers to convert grid-pixel Y ↔ absolute-minutes-since-midnight while accounting for the non-zero `HOUR_START`. Replaced the raw `(y / HOUR_HEIGHT) * 60` math in the click-to-create, drag-drop, and touch-end handlers with these helpers and clamped to `[HOUR_START*60, HOUR_END*60 - 15]` instead of the previous `[0, 1440-15]`.
  - Updated the current-time indicator: it now renders with `minutesToGridY(currentMinuteOffset)` and is guarded to only paint when the current time falls within the displayed range (no more stale red line hovering above a 6 AM grid top).

  **c) All-day events & tasks section polish:**
  - Reworked the all-day row from a bare `flex-wrap` of dashed-border task divs into a dedicated "All-day" panel: rounded border container, "ALL-DAY" section label on the left, then events (via `<EventCard variant="allday">`) and tasks (purple-tinted pill cards) in a single flex row.
  - Added collapse/expand: if more than 4 all-day items are present, a "+N more" / "Collapse" toggle pill appears. State is local to DayView.

  **d) — Time-blocking — DEFERRED.** The `end_time`/duration work is the largest piece and will be tackled in a follow-up commit (DB migration, type changes, datepicker UI, resize handles).

  **e) Default to today on open:**
  - `currentDate` initializer no longer reads `localStorage.getItem('cal_current_date')` — always `new Date()`. The `localStorage.setItem` persistence effect was also removed. The calendar now always opens to today. In-session navigation continues to work; closing and reopening the tab resets to today. `viewType` persistence is retained (less annoying to remember you prefer Day View).
  - `resetToToday()` unchanged.

  **f) Drag visualization with 15-min snap:**
  - Added `dragIndicator` state (`{ y: number; label: string } | null`) and a live-snap ghost indicator inside the time grid. The grid's `onDragOver` now computes the 15-min-clamped snap position and time label in real time; a dashed indigo line + dot + time label render at the snap point while dragging (mouse or touch). The ghost clears on `onDragLeave`, `onDrop`, `onDragEnd`, and touch-end.
  - Touch drag (`onTouchMove` for events) also updates the indicator from `lastTouchY` so finger dragging gets the same feedback.

  **g) Drag to unschedule:**
  - Added a floating "Drop here to remove date" zone (red dashed pill, `position: fixed` bottom-center, `z-50`) that appears whenever `dragTask` is set inside DayView. Dropping a task on it PATCHes `/api/v2/tasks/{id}` with `due_date: null`, dispatches `taskUpdated`, and refreshes via `onEventMoved`. Works on both mobile and desktop.
  - Added unschedule drop handling to the `UnscheduledTaskPanel` sidebar itself: the panel root now has `onDragOver/onDragLeave/onDrop` handlers, with a red ring inset + tinted background as the visual hover state. Dropping a task on the sidebar clears its due date via the same PATCH.
- **Why:**
  ROADMAP "Calendar Day View UX overhaul" (Immediate section). Dave wanted the day view to be a proper time-blocking tool rather than a read-only grid — a full-height scroll container, sensible hour range, polished all-day section, real-time drag feedback, and a way to unschedule by drag. These six items deliver the UX pass; time-blocking (`end_time` on tasks) remains the headline feature for a follow-up.
- **Affected areas:** `src/components/CalendarView.tsx` (DayView function + CalendarViewV2 layout), `src/components/calendar/UnscheduledTaskPanel.tsx` (drop-to-unschedule handlers).
- **Migration needed?** No. All changes are frontend-only — no DB, API, or type changes.
- **Testing:** All 140 tests pass. TypeScript clean (15 pre-existing errors — none new). ESLint: no new errors/warnings; actually one fewer warning than baseline (the previously-unused `Clock` import is now consumed by the off-hours toggle).

---

## [2026-07-20] – Page editor overhaul
- **What changed:**
  Four-area editor polish covering toolbar, drag handle, block type switcher, slash commands, and padding/spacing:

  **A) Toolbar cleanup (`EditorToolbar.tsx`):**
  - Added visual grouping with separators between format/headings/lists/blocks/align/insert groups
  - Replaced `window.prompt()` URL link with inline URL input (`LinkInput` component with Apply button, Escape to cancel, Enter to apply)
  - Extracted duplicated Markdown export logic into shared `exportMarkdown()` helper (was duplicated verbatim in desktop toolbar + mobile "More" popup)
  - Fixed mobile "More" popup positioning from `left-0` to `right-0` (extends leftward, less likely to overflow)
  - Increased mobile popup max width from `280px` to `320px`
  - Added link button to mobile primary actions (was desktop-only before)
  - Added `animate-in fade-in slide-in-from-top-1 duration-150` transition to `TableControls` strip (was abrupt appear/disappear)
  - Changed `@ts-ignore` to `@ts-expect-error` for tiptap-markdown storage access

  **B) Block drag handle & type switcher (`GlobalDragHandle.tsx`, `BlockTypePopover.tsx`):**
  - Added scroll event listener (`capture: true`) to hide handle during scroll (prevents stale viewport positioning)
  - Clear handle position on drag end (prevents lingering grip icon after drop)
  - Improved `posAtCoords` reliability: try `event.clientX` directly first, then center projection (original behavior), then 25% and 75% horizontal fallbacks
  - Added `role="toolbar"`, `aria-label`, `aria-haspopup`, `aria-expanded` accessibility attributes to drag handle and More button
  - Blocked type popover now shows active state indicator (blue highlight + checkmark) via `currentType` prop
  - Added Escape key dismissal to `BlockTypePopover`
  - Changed `BlockTypePopover` from `absolute` to `fixed` + `createPortal` to `document.body` (prevents clipping by `overflow-hidden` parents)
  - Added viewport boundary detection (flips popover above/below, shifts left/right if overflow)
  - Added click-outside-to-close safety net to `BlockTypePopover`
  - Fixed subpage conversion in `handleBlockTypeSelect`: now properly deletes the original block range before inserting the page link (was leaving the original block behind — known bug noted in comment)
  - Added `getCurrentBlockType()` helper to detect current block type for active state in popover

  **C) Editor padding & spacing (`Editor.tsx`, `EditorTaskItem.tsx`):**
  - Reduced `.ProseMirror` bottom padding from `pb-[80vh]` to `pb-[40vh]` (still provides scroll anchor space without wasting half the viewport)
  - Removed redundant `py-8` from outer wrapper (the editor itself has `p-4 md:p-8`, the compounding created excessive top spacing)
  - Added `focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-inset` focus ring to `.ProseMirror` (was `focus:outline-none` with no visual indicator)
  - Fixed mobile-invisible date button in `EditorTaskItem.tsx`: added `opacity-60` base for touch devices (was `md:opacity-0 md:group-hover:opacity-100` with no touch equivalent)
  - Fixed edit button background clash: changed hardcoded `bg-white dark:bg-gray-800` to theme-aware `bg-bg-primary` and `border-gray-200 dark:border-gray-700` to `border-border-default` (was clashing with `bg-purple-50/50` selection highlight)

  **D) Slash command menu (`SlashCommand.tsx` [renamed from `.ts`], `SlashCommandList.tsx`):**
  - Renamed `SlashCommand.ts` → `SlashCommand.tsx` and converted `React.createElement` calls to JSX for readability
  - Added `SlashCommandItem` and `CommandGroup` TypeScript types (was `any` throughout)
  - Added groupings with labels: Basic blocks / Lists / Advanced / Media (rendered as uppercase section headers in the popup)
  - Added descriptions to all 13 command items (was icon + title only)
  - Replaced `window.prompt("Image URL")` with file picker for image upload (triggers `<input type="file" accept="image/*">` → uploads to `/api/v2/upload` → inserts image — same flow as drag/paste)
  - Changed search filter from `startsWith` to `includes` for more forgiving matching
  - Set `allowSpaces: true` on slash command suggestion (was default `false`, so typing a space closed the menu)
  - Fixed Toggle Block icon from `ChevronDown` to `ChevronRight` (matches `CollapsibleBlockExtension`'s icon)
  - Added keyboard shortcut hints at bottom of slash command popup (↑↓ navigate, ↵ select, esc dismiss)
  - Exported `GROUP_LABELS` and `CommandListItems` from `SlashCommand.tsx` for reuse in `SlashCommandList.tsx`

- **Why:**
  ROADMAP "Page editor overhaul" (Immediate section). Dave wanted a general tightening of the editing experience across the toolbar, block drag handle, editor spacing, and slash command menu. BUG-013 (double-click toolbar buttons) was already fixed; this addresses the remaining polish items.
- **Affected areas:** `src/components/v2/editor/Editor.tsx`, `src/components/v2/editor/EditorToolbar.tsx`, `src/components/v2/editor/GlobalDragHandle.tsx`, `src/components/v2/editor/SlashCommandList.tsx`, `src/components/v2/editor/extensions/SlashCommand.tsx` (renamed from `.ts`), `src/components/v2/BlockTypePopover.tsx`, `src/components/v2/EditorTaskItem.tsx`.
- **Migration needed? No.** No DB, API, or type changes. Pure frontend polish.
- **Testing:** All 140 tests pass. TypeScript clean (15 pre-existing errors — none new). ESLint clean (no new errors beyond pre-existing `no-explicit-any` TipTap patterns).

---

## [2026-07-16] – Revert typography overhaul (Bitter)
- **What changed:**
  Reverted commit `2802294` (Typography overhaul: Bitter for content, Nunito for chrome). Restored Platypi `@import` + `--font-platypi` CSS variable, `.ProseMirror` `font-family: inherit`, and removed `font-serif` classes from `TaskItem.tsx` and `EditorTaskItem.tsx`. All typography is back to Nunito (body default) everywhere.
- **Why:**
  Dave reviewed the Bitter serif on content surfaces and didn't like it — "not hitting like I thought it would." Reverted to the original Nunito-everywhere setup. Platypi remains dead code (declared but unused); the ROADMAP item is marked 🙅 Won't Fix.
- **Affected areas:** Revert touched `globals.css`, `layout.tsx`, `TaskItem.tsx`, `EditorTaskItem.tsx`, `DEVLOG.md`, `ROADMAP.md`.
- **Migration needed? No.**
- **Testing:** 140 tests pass. TypeScript clean.

---

## [2026-07-15] – Cross-device auto-refresh via visibility API
- **What changed:**
  - **`src/contexts/SyncContext.tsx`:** Added a `visibilitychange` event listener that triggers `fetchData(true)` (delta mode — only tasks changed since last poll) when `document.visibilityState === 'visible'`. This ensures task lists and calendar views auto-update when the user switches back to the Docket tab from another app or device, without waiting for the next 30s poll tick.
- **Why:**
  ROADMAP "Cross-device auto-refresh via visibility API" — Dave switches between phone and laptop throughout the day. Previously, tasks created/completed on one device wouldn't appear on the other until the next 30s poll interval. Now they sync within the fetch round-trip (~200-500ms) as soon as the tab regains focus.
- **Affected areas:** `src/contexts/SyncContext.tsx` (~5-line effect added).
- **Migration needed? No.** No DB changes, no API changes, no env vars. The existing delta sync (`/api/v2/tasks?since=<ISO>`) and `updated_at = NOW()` on all task mutations already handle this.
- **Testing:** All 140 tests pass. TypeScript clean (15 pre-existing errors — none new).

---

## [2026-07-13] – Global sound context + persistent audio across pages + floating indicator
- **What changed:**
  - **`src/contexts/SoundContext.tsx` (new):** Global React context that owns the audio lifecycle. Internally uses `useAmbience` and manages `ambienceMode`, `musicSource`, and `isPlaying` state. On mount, restores saved selections from localStorage but does NOT auto-play (user must explicitly select). On selection, starts audio immediately — no longer gated by `timer.isActive`. Persists selections to the same localStorage key as `useFocusPreferences`. **No cleanup on React unmount** — audio persists across SPA page navigation. Cleanup only via `beforeunload` event listener (tab close). Exports `SoundProvider`, `useSound()` hook with `{ ambienceMode, musicSource, setAmbienceMode, setMusicSource, isPlaying, stopAll }`.
  - **`src/components/focus/FloatingSoundIndicator.tsx` (new):** Fixed-position floating pill (`bottom-4 left-4 z-50`) that appears on all pages when `isPlaying` is true. Shows `Volume2` icon + current label (e.g., `"Rain + Runtime Loop"`). X button calls `stopAll()`. Clicking the pill opens a full popover with ambience/music radio-style selectors — same options and styling as `SoundDropdown`. Hidden when not playing. `pb-[52px] md:pb-0` offset to clear the mobile `BottomTabBar`.
  - **`src/app/focus/page.tsx`:** Removed `useAmbience` import and both timer-gated `useEffect` blocks (ambience + music). Now consumes `useSound()` context for `ambienceMode`/`musicSource`/setters and `useFocusPreferences` for `visualMode` only. Sounds now play immediately on selection — no timer needed.
  - **`src/app/layout.tsx`:** Wrapped the provider tree with `<SoundProvider>` (inside `ToastProvider`, outside `SyncProvider`). Added `<FloatingSoundIndicator />` after `LayoutWrapper` so it overlays page content on all routes.
  - **Bug fixed:** Previously, ambience kept playing but music stopped when navigating away from Focus page. Root cause: `useAmbience`'s cleanup effect called `stopMusic()`/`stopStream()` on unmount but ambience had no cleanup. Now all audio is managed by the global context which never unmounts during SPA navigation, so both persist consistently.
- **Why:**
  Dave wanted to play sounds/music on the Focus page without starting a timer, and have the audio continue when navigating to other pages. A floating indicator with full dropdown controls was requested so sounds can be managed from any page.
- **Affected areas:** `src/contexts/SoundContext.tsx` (new), `src/components/focus/FloatingSoundIndicator.tsx` (new), `src/app/focus/page.tsx`, `src/app/layout.tsx`.
- **Migration needed? No.** (Same localStorage key, same format. `SoundContext` reads/restores `ambienceMode`/`musicSource` on mount. No DB changes.)
- **Testing:** All 137 tests pass. TypeScript clean (15 pre-existing errors — none new).

---

## [2026-07-13] – Focus page AzuraCast integration + sound system rework
- **What changed:**
  - **`src/hooks/useAmbience.ts`:** Added streaming support for AzuraCast radio stations. New `startStream(url)` creates an `<audio>` element with `crossOrigin="anonymous"`, connects it to the Web Audio API via `createMediaElementSource` → `GainNode` → `destination` with a 3s fade-in. `stopStream()` fades out over 2s then pauses/cleans up. New `startMusicSource(source)` dispatcher routes `'pentatonic'` to the existing procedural generator and station shortcodes (`'runtime_loop'`, `'warm_boot'`) to `startStream`. New `stopMusicAndStream()` stops both. Exported new `AmbienceMode` and `MusicSource` types. Removed the `VisualizationMode` import — `start()` now accepts `AmbienceMode` strings (`'brown-noise' | 'rain' | 'snow' | 'orbit' | 'none'`) directly, decoupling ambience from the visualizer.
  - **`src/hooks/useFocusPreferences.ts`:** Schema migration. Replaced `isAmbienceEnabled: boolean` → `ambienceMode: AmbienceMode` and `isMusicEnabled: boolean` → `musicSource: MusicSource`. On load, detects old boolean keys and migrates them (`true` → `'brown-noise'` / `'pentatonic'`, `false` → `'none'`), writes the migrated format back to localStorage, and deletes old keys. New setters: `setAmbienceMode`, `setMusicSource`. Validates that persisted string values are known options (strips unknown values).
  - **`src/components/focus/SoundDropdown.tsx` (new):** Compact popover component replacing the two binary toggle buttons. Single trigger button (`Volume2`/`VolumeX` icon) opens a translucent dropdown with two sections — Ambience (Brown Noise, Rain, Snow, Orbit, Off) and Music (Pentatonic, Runtime Loop, Warm Boot, Off). Radio-style selection with checkmark. Click-outside-to-close. Styled to match the Focus page's dark translucent aesthetic.
  - **`src/app/focus/page.tsx`:** Replaced the ambience/music toggle button group with `<SoundDropdown>`. Ambience `useEffect` now uses `ambienceMode` (decoupled from `visualMode`). Music `useEffect` now calls `startMusicSource(musicSource)` / `stopMusicAndStream()`. Removed unused `Music` icon import.
  - **AzuraCast stream URLs** (hardcoded in `useAmbience.ts`): `https://radio.dcplaskett.com/listen/runtime_loop/radio.mp3` and `https://radio.dcplaskett.com/listen/warm_boot/radio.mp3` (both 192kbps MP3). Discovered via AzuraCast API at `/api/stations`.
  - **Tests:** Updated `useAmbience.test.ts` — fixed 2 tests that passed `'rays'` (old VisualizationMode) to use `'brown-noise'` (new AmbienceMode). Added 6 new tests: stream start/stop, `startMusicSource` dispatch for pentatonic, runtime_loop, warm_boot. Added `MockMediaElementSourceNode`, `MockAudioElement`, and `createMediaElementSource` to test mocks. All 137 tests pass.
- **Why:**
  ROADMAP "Focus page AzuraCast integration + sound system rework". The binary ambience/music toggles were limiting — only one ambience mode (tied to visualizer) and one music source (procedural pentatonic). Dave wanted a proper audio mixer: choose ambience independent of visualizer, and pick between procedural music or live AzuraCast radio streams.
- **Affected areas:** `src/hooks/useAmbience.ts`, `src/hooks/useFocusPreferences.ts`, `src/components/focus/SoundDropdown.tsx` (new), `src/app/focus/page.tsx`, `src/hooks/__tests__/useAmbience.test.ts`.
- **Migration needed? No.** (localStorage-only migration, no DB changes. Old preferences auto-migrate on next app load.)
- **Testing:** All 137 tests pass. TypeScript clean (15 pre-existing errors — none new).

---

## [2026-07-09] – Fix BUG-015: flaky task timing + disable CalDAV task sync
- **What changed:**
  - **`normalizeDateToNoon` / `parseLocalDateNode` (`src/lib/dateUtils.ts`):** Added a guard preserving as-is any string containing `T` (ISO timestamp with explicit time component). Previously, any value landing at midnight UTC — including timestamps from the DB and calendar events — was normalized to local noon, clobbering intentional times that happened to land at 00:00 UTC (e.g., 7 PM CT = next-day 00:00 UTC → shifted 7 hours). Bare date strings (`"2026-05-18"`) are still noon-normalized — that behavior is unchanged.
  - **Disabled CalDAV task sync:** `syncCalDAV()` in `src/lib/caldav.ts` now returns an empty `SyncResult` for tasks instead of calling `syncTasksForConfig`. Event sync is retained. `createTombstone` in `src/lib/db.ts` is now a no-op (removed CalDAV tombstone queries). `recurrence.ts` no longer inserts into `task_sync_meta` (and dropped the unused `uuidv4` import). DB tables (`caldav_configs`, `task_sync_meta`, `deleted_task_sync_log`, `calendar_events`) are left in place — harmless, no migration needed, no data loss.
  - **Tests:** Updated `src/lib/__tests__/dateUtils.test.ts` (5 midnight-UTC tests now assert raw `new Date(input)` preservation instead of local noon) and `src/components/v2/__tests__/TaskItem.test.tsx` (2 tests using `'2026-05-18T00:00:00.000Z'` switched to bare `'2026-05-18'` since the intent was a date-only task).
- **Why:**
  BUG-015. Dave reported click-to-create tasks in Calendar Day View appearing at the wrong time slot and existing timed tasks shifting unexpectedly. CalDAV task sync was a likely source of timing interference — each cycle overwrote local times. The midnight-UTC-to-noon normalization was the deeper root cause: any time landing at 00:00 UTC was silently clobbered to local noon. Tasks are now local-only; events still sync via CalDAV.
- **Affected areas:** `src/lib/dateUtils.ts`, `src/lib/caldav.ts`, `src/lib/db.ts`, `src/lib/recurrence.ts`, `src/lib/__tests__/dateUtils.test.ts`, `src/components/v2/__tests__/TaskItem.test.tsx`.
- **Migration needs? No.** No new migrations; DB tables retained.
- **Testing:** All 131 tests pass. TypeScript clean (15 pre-existing errors — none new).

---

## [2026-07-09] – Fix inline task checkbox alignment + remove dead selection prop (BUG-014)
- **What changed:**
  - **Checkbox vertical alignment:** Reduced the completion button's `min-w-[44px] min-h-[44px]` → `min-w-[32px] min-h-[32px]` in `TaskItem.tsx`. The 44px forced height was flex-centering the 20px icon at ~22px from row top, while the adjacent text center is at ~13px — a 9px visual offset. With 32px, the icon center moves to ~16px, bringing the offset down to ~3px (imperceptible). Also added `min-w-[32px] min-h-[32px]` to `EditorTaskItem.tsx` checkbox (previously had no min dimensions — sized to content at 28px) for consistency.
  - **Removed dead `isSelectionEnabled` prop:** The `isSelectionEnabled` prop was declared in `TaskItemProps` but never passed by any consumer (TodayView, InboxView, AllTasksView). Only `AllTasksView` uses selection mode, and it relies solely on passing `onSelect`. Removed the prop from the interface and destructuring, simplified the selection checkbox render condition from `(onSelect || isSelectionEnabled)` → `onSelect`, and the opacity condition from `${isSelected || isSelectionEnabled ? ...}` → `${isSelected ? ...}`.
  - **Issues 2 & 3 (selection checkbox + edit button anomalies):** Confirmed as screenshot artifacts, not bugs. The "French cleat" task appeared to have a persistent selection checkbox and edit button because the cursor was hovering it, triggering `group-hover:opacity-100` on both elements. No code changes needed.
- **Why:**
  BUG-014 remaining issues from the 2026-07-09 screenshot review. The checkbox alignment was the primary visual problem — the 44px touch target was too aggressive for a checklist row and caused the icon to sit visibly lower than the text. The dead `isSelectionEnabled` prop was confusing dead code that made it seem like a selection mode could be independently toggled (it couldn't — no consumer ever set it).
- **Affected areas:** `src/components/v2/TaskItem.tsx` (checkbox min dimensions, removed `isSelectionEnabled` prop, simplified selection condition), `src/components/v2/EditorTaskItem.tsx` (added min dimensions for consistency).
- **Migration needs? No.**
- **Testing:** All 131 tests pass. TypeScript clean (15 pre-existing errors unchanged — no new errors).

---

## [2026-07-09] – Fix toolbar buttons requiring double-click (BUG-013)
- **What changed:**
  Converted all toolbar button handlers in `src/components/v2/editor/EditorToolbar.tsx` from `onClick` to `onMouseDown` with `e.preventDefault()`. This prevents the browser from stealing focus from the TipTap editor on `mousedown`, which was causing the first click to only refocus the editor (without executing the command) and requiring a second click for the action to fire. Changes: (1) `ToggleButton` component (line 38) — shared wrapper used by all toolbar items, undo/redo, and export buttons across desktop and mobile; (2) 7 raw `<button>` elements in `TableControls` (Add Column Before/After, Delete Column, Add Row Before/After, Delete Row, Delete Table); (3) Mobile "More" dropdown toggle button. Total: 9 `onClick` → `onMouseDown` conversions. The existing `chain().focus()` calls remain (harmless redundancy).
- **Why:**
  BUG-013 — browser's native button-focus behavior on `mousedown` stole focus from the editor before `onClick` could fire. By the time the `onClick` handler's `chain().focus()` restored focus, the editor had already lost its selection state, and the ProseMirror transaction either didn't apply or applied to a stale selection. The second click worked because the editor was already focused from the first click's `focus()` call. The fix prevents the focus loss entirely by calling `e.preventDefault()` on `mousedown` — the button never receives focus, so the editor keeps it throughout.
- **Affected areas:** `src/components/v2/editor/EditorToolbar.tsx` only. No API, DB, or type changes.
- **Migration needed?** No.
- **Testing:** All 131 tests pass. TypeScript clean (15 pre-existing errors unchanged — no new errors). ESLint clean (no new warnings/errors — EditorToolbar.tsx findings are all pre-existing: unused `ChevronDown` import, `any` type on ToggleButton, `@ts-ignore` comments).

---

## [2026-07-08] – Replace full page reloads with client-side navigation
- **What changed:**
  Replaced 4 `window.location.href` calls (full page reloads) with Next.js `useRouter()` client-side navigation across 2 files:
  - **`src/components/v2/Sidebar.tsx`:** Added `useRouter` import + `const router = useRouter()`. Three replacements: (1) `handleDeletePage` line 142 — `window.location.href = '/'` → `router.replace('/')` (replace so deleted page isn't in browser history); (2) `handleCreatePageSubmit` line 170 — `window.location.href = \`/page/${newPage.id}\`` → `router.push(\`/page/${newPage.id}\`)` (push for normal forward nav); (3) FolderTree `onPageSelect` callback line 361 — `window.location.href = \`/page/${page.id}\`` → `router.push(\`/page/${page.id}\`)`.
  - **`src/app/page/[id]/page.tsx`:** Added `useRouter` import + `const router = useRouter()`. One replacement: `handleDelete` line 59 — `window.location.href = '/'` → `router.replace('/')` (replace, same reasoning).
  - `router.replace` used for deletions so the back button doesn't navigate to a deleted page (would 404 or show stale data). `router.push` used for creation/navigation to preserve normal forward navigation.
  - Intentionally untouched: `src/app/login/page.tsx:48` (`window.location.href = redirect` — must do full page load so middleware sees the new auth cookie) and `src/lib/api.ts:41` (`handleSessionExpired` — same reason for session-expiry redirect).
- **Why:**
  Full page reloads on page creation/deletion/navigation were unnecessarily slow — they reload the entire app, re-fetch all client-side state, and cause a visible flash. Client-side navigation via Next.js router is instant, preserves component state, and is the idiomatic pattern.
- **Affected areas:** `src/components/v2/Sidebar.tsx`, `src/app/page/[id]/page.tsx`.
- **Migration needed?** No.
- **Testing:** All 131 tests pass. TypeScript clean (15 pre-existing errors unchanged — no new errors).

---

## [2026-07-08] – Fix global 401 handling + login redirect (BUG-012)
- **What changed:**
  Three-part fix for BUG-012 — the app broke silently when the JWT token expired, with no user-facing feedback and no way to return to the page after re-authenticating.
  - **Part A — `apiFetch` wrapper with 401 handling:** Created `src/lib/api.ts` with a centralized `apiFetch()` function that wraps `fetch()`, checks for 401 responses, dispatches a global `auth:expired` CustomEvent, and throws an `AuthError` (so callers exit cleanly). Also throws `ApiError` for other non-2xx responses. A module-level `redirectingRef` guard prevents cascading redirects from parallel failed fetches. Migrated all raw `fetch()` calls across 13 files to `apiFetch`: `SyncContext.tsx`, `TaskEditContext.tsx`, `CalendarView.tsx`, `TodayView.tsx`, `WeeklyCalendar.tsx`, `AllTasksView.tsx`, `UnscheduledTaskPanel.tsx`, `CommandPalette.tsx`, `SearchDialog.tsx`, `SyncButton.tsx`, `usePeriodicSync.ts`. Each call site now catches `AuthError` and returns/throws cleanly.
  - **Part B — Global `auth:expired` listener:** Wired `LayoutWrapper.tsx` to listen for the `auth:expired` CustomEvent, show a toast ("Session expired — please sign in again"), and call `handleSessionExpired()` which redirects to `/login?redirect=<current_path>`.
  - **Part C — Login page respects `redirect` param:** Changed `src/app/login/page.tsx:47` from `window.location.href = '/'` to `window.location.href = redirect` (the `redirect` variable is already read from `searchParams` on line 26). After successful login, the user returns to the page they were on when their session expired.
  - **Tests:** Updated `SyncButton.test.tsx` and `CommandPalette.test.tsx` to mock `apiFetch` instead of `global.fetch` (since components now use the wrapper). All 131 tests pass.
- **Why:**
  When the JWT cookie expired (after 7 days), the app silently broke — API calls returned 401 but the client swallowed errors, data stopped updating, and task actions failed with no feedback. The user had to manually reload to trigger middleware's redirect. Even when they reached `/login`, the hardcoded `window.location.href = '/'` ignored the `?redirect=<path>` param, always sending them home instead of back to their page.
- **Affected areas:** `src/lib/api.ts` (new), `src/app/login/page.tsx`, `src/components/v2/LayoutWrapper.tsx`, `src/contexts/SyncContext.tsx`, `src/contexts/TaskEditContext.tsx`, `src/components/CalendarView.tsx`, `src/components/v2/TodayView.tsx`, `src/components/v2/WeeklyCalendar.tsx`, `src/components/v2/AllTasksView.tsx`, `src/components/v2/SearchDialog.tsx`, `src/components/calendar/UnscheduledTaskPanel.tsx`, `src/components/CommandPalette.tsx`, `src/components/SyncButton.tsx`, `src/hooks/usePeriodicSync.ts`, `src/components/__tests__/SyncButton.test.tsx`, `src/components/__tests__/CommandPalette.test.tsx`.
- **Migration needed?** No.
- **Testing:** All 131 tests pass. TypeScript clean (15 pre-existing errors unchanged — no new errors).

---

## [2026-06-30] – Fix mobile sidebar hidden behind BottomTabBar + calendar header compactness (BUG-008)
- **What changed:**
  - **Sidebar container fix:** Added `pb-[calc(52px+env(safe-area-inset-bottom,8px))] md:pb-0` to the mobile sidebar container div in `src/components/v2/LayoutWrapper.tsx:68`. On mobile, the sidebar's bottom edge now ends above the BottomTabBar (52px tab height + safe-area inset). On desktop (`md:`), `md:pb-0` resets the padding. The sidebar's `mt-auto` footer (Settings + Sync) naturally repositions above the padding — no Sidebar.tsx internals needed changing.
  - **Calendar header compactness:** Four responsive tweaks in `src/components/CalendarView.tsx:184-218` to reduce wrapping on narrow phones: (1) "Tasks" button text wrapped in `<span className="hidden md:inline">` — icon only on mobile; (2) "Add Calendar" button text similarly hidden on mobile; (3) date label `min-w-[140px]` → `min-w-[100px] md:min-w-[140px]`; (4) "Today" button padding `px-4` → `px-3 md:px-4`. All text labels and full widths restore at `md:` breakpoint.
- **Why:**
  Both the sidebar (`fixed inset-y-0 z-50`) and BottomTabBar (`fixed bottom-0 z-50`) shared the same z-index. DOM order caused the tab bar to paint over the sidebar's bottom ~52px+, hiding the Settings and Sync buttons. The calendar header's 5 button groups wrapped to 2-3 rows on narrow phones, wasting vertical space.
- **Affected areas:** `src/components/v2/LayoutWrapper.tsx` (sidebar container padding), `src/components/CalendarView.tsx` (header button responsive classes).
- **Migration needed?:** No.
- **Testing:** All 131 tests pass. TypeScript clean (15 pre-existing errors unchanged — no new errors).

---

## [2026-06-30] – Remove console.log from production code (BUG-004)
- **What changed:**
  Removed all 45 `console.log` statements from production code across 13 files. `console.error` (117 calls in catch/error handlers) and `console.warn` (7 calls for operational warnings) were retained — they serve legitimate error-handling and debugging purposes. Files cleaned: `src/lib/caldav.ts` (18 `[Sync]`/`[Sync Fallback]` debug logs), `src/lib/recurrence.ts` (2 `[Recurrence]` logs), `src/lib/db.ts` (3 — pool config, tombstone, cleaner), `src/contexts/TaskEditContext.tsx` (3 "successfully" logs), `src/hooks/usePeriodicSync.ts` (4 `[AutoSync]` logs — also simplified success/fail branching), `src/components/SyncButton.tsx` (1), `src/components/CommandPalette.tsx` (1), `src/components/PwaRegister.tsx` (2 — converted failure to `console.warn`), `src/components/v2/SearchDialog.tsx` (2), `src/components/v2/Sidebar.tsx` (1 stub), `src/pages/api/caldav/calendars.ts` (3 `[Discovery]` logs), `src/pages/api/caldav/repair.ts` (2 `[Repair]` logs), `src/components/focus/FocusVisualizer.tsx` (1 dead commented-out debug line). In `caldav.ts`, the recurrence spawn `if (spawnedId)` block (which only logged) was simplified to a bare `await spawnNextRecurrence()`, and the tombstone-count `if` block (which only logged) was removed entirely.
- **Why:**
  Debug `console.log` statements polluted the browser console in production, leaking internal state and sync operation details. BUG-004 / ROADMAP "Remove console.log from production code". Error logging via `console.error` and operational warnings via `console.warn` are kept — they serve legitimate debugging purposes and don't clutter the console during normal operation.
- **Affected areas:** `src/lib/caldav.ts`, `src/lib/recurrence.ts`, `src/lib/db.ts`, `src/contexts/TaskEditContext.tsx`, `src/hooks/usePeriodicSync.ts`, `src/components/SyncButton.tsx`, `src/components/CommandPalette.tsx`, `src/components/PwaRegister.tsx`, `src/components/v2/SearchDialog.tsx`, `src/components/v2/Sidebar.tsx`, `src/pages/api/caldav/calendars.ts`, `src/pages/api/caldav/repair.ts`, `src/components/focus/FocusVisualizer.tsx`.
- **Migration needed?:** No.
- **Testing:** All 131 tests pass. TypeScript clean (15 pre-existing errors unchanged — no new errors). ESLint clean (no new warnings/errors).

---

## [2026-06-30] – Fix orphaned v2Task nodes after task deletion (BUG-010)
- **What changed:**
  Three-part fix for BUG-010 — orphaned `v2Task` nodes left in page content when their backing tasks were deleted, and ghost checkboxes with `taskId: null` left by the editor's input rule.
  - **Root Cause 2 (page deletion bypassed cleanup):** The DELETE handler in `src/pages/api/v2/pages.ts` used a raw `DELETE FROM tasks WHERE id IN (...)` to remove orphaned tasks when a page was deleted. This bypassed `createTombstone()` (no CalDAV tombstone for synced tasks), `deleteTaskReferences()` (v2Task nodes on OTHER pages referencing the same task were left behind), and `task_sync_meta` cleanup. Replaced with a SELECT of orphaned task IDs followed by per-task `deleteTask(id)` calls. `deleteTask()` (already imported) handles tombstone creation, v2Task node cleanup across all pages, `page_items` link removal, and the task row deletion in the correct order.
  - **Root Cause 3 (editor race condition):** The v2Task creation effect in `src/components/v2/editor/extensions/TaskExtension.tsx` debounced task creation by 500ms after content was typed. If page auto-save fired within that window, the v2Task node was persisted with `taskId: null` before the `createTask()` POST ran — leaving a permanent ghost checkbox. Removed the `setTimeout(..., 500)` wrapper so `createTask()` fires immediately when content appears in a null-taskId node. The `isCreating.current` ref already prevents duplicate creations, so the debounce was unnecessary.
  - **Save-time guard:** Added `stripDeadTaskNodes()` in the PUT handler of `pages.ts` that walks the incoming TipTap content JSON before persisting and removes any v2Task node with `taskId: null` AND no text content. These are definitively dead nodes (no backing task, no content). Nodes WITH content are left alone — the editor's (now immediate) creation flow is in-flight and will update the `taskId` on completion.
  - **DB health-check migration:** Added `src/migrations/005_clean_orphaned_v2task_nodes.sql` — a one-time, idempotent migration that recursively walks `pages.content` JSONB via a temporary PL/pgSQL function and strips: (a) v2Task nodes with `taskId: null` and no text content, and (b) v2Task nodes whose numeric `taskId` no longer exists in the `tasks` table. The function is dropped after running. Catches the 40 manual-cleanup orphans from the June 29 audit (if any regenerated) and prevents future re-accumulation.
- **Why:**
  Dave found 37 orphaned v2Task nodes referencing deleted tasks + 3 with `taskId: null` across 8 pages. Root Cause 1 (historical `deleteCompletedTasks` not calling `deleteTaskReferences`) was already fixed in June 2026. Root Cause 2 (page deletion raw SQL) and Root Cause 3 (editor race condition) remained active. This fix closes all three paths and adds prevention.
- **Affected areas:** `src/pages/api/v2/pages.ts` (DELETE handler orphan task cleanup + PUT handler null-taskId stripping), `src/components/v2/editor/extensions/TaskExtension.tsx` (creation effect), `src/migrations/005_clean_orphaned_v2task_nodes.sql` (new).
- **Migration needed?:** Yes — `005_clean_orphaned_v2task_nodes.sql` strips dead v2Task nodes from all page content. Idempotent (only strips dead nodes; live nodes untouched). Deployed via `update.sh` / `node scripts/run-migrations.js`.
- **Testing:** All 131 tests pass. TypeScript clean (no new errors — 15 pre-existing errors unchanged). ESLint clean (no new warnings/errors — all findings are pre-existing `no-explicit-any` and `react-hooks/exhaustive-deps` patterns consistent with the file's existing style).

---

## [2026-06-29] – Fix DatePickerPopover overflow on mobile + dynamic positioning (BUG-009 + BUG-011)
- **What changed:**
  Reworked the positioning logic in `src/components/v2/DatePickerPopover.tsx` to fix two related bugs in one pass:
  - **Scrollable popover with dynamic maxHeight:** The popover container has `overflow-y-auto overscroll-contain` and a dynamically computed `maxHeight` set via inline style. On desktop, `maxHeight` is calculated from the actual available space between the trigger and the viewport edge (`spaceBelow - 12` or `spaceAbove - 12`, capped at 85vh). On mobile, `maxHeight` is `85vh`. This ensures the popover scrolls internally only when content actually exceeds the visible space — not based on an arbitrary fixed threshold.
  - **Mobile centered overlay:** On `window.innerWidth < 768`, the popover renders as a centered overlay (`translate(-50%, -50%)`) with a semi-transparent backdrop (`bg-black/30`, click-to-close). Eliminates the below/above flip logic on small screens where it doesn't make sense.
  - **Dynamic height measurement:** Replaced the hardcoded `380px` flip threshold with `popoverRef.current.scrollHeight` (unconstrained content height) measured via `ResizeObserver`. The observer re-positions the popover when the recurrence editor expands/collapses. Also listens to `window resize`. Falls back to `400px` estimate if the ref isn't ready.
  - **Feedback loop prevention:** `setFixedStyle` uses functional updates that compare prev vs next values and bail out if nothing changed, preventing the ResizeObserver from re-triggering itself when `maxHeight` changes the popover's visible height.
  - **Removed `overflow-hidden` + `transition-all` from recurrence container:** These were clipping expanding content and causing the ResizeObserver to fire mid-animation with wrong heights.
  - Added `showBackdrop` state; wrapped `popoverContent` in a fragment with a conditional backdrop div (`z-[9998]`, below popover's `z-9999`).
- **Why:**
  BUG-011: On mobile, the popover's Save/Clear buttons were pushed off-screen when the recurrence editor was expanded (~600px total height vs ~700px viewport). BUG-009: The hardcoded `380px` flip threshold was too low — the popover with recurrence open is ~550px, so it rendered below the trigger even when there wasn't enough space. Initial fix used `offsetHeight` (constrained height) and `max-h-[85vh]` (fixed viewport percentage), which caused two follow-up issues: (1) the popover wouldn't scroll because `maxHeight` didn't account for the popover's position on screen, and (2) `offsetHeight` returned the constrained height, creating a feedback loop where the ResizeObserver thought the popover fit when it didn't. Fixed by using `scrollHeight` (natural content height), computing `maxHeight` from actual available space, removing `overflow-hidden` from the recurrence container, and adding state comparison guards to prevent feedback loops.
- **Affected areas:** `src/components/v2/DatePickerPopover.tsx` only. No changes to `TaskEditor.tsx`, `TaskItem.tsx`, `EditorTaskItem.tsx` (all consumers pass `triggerRef`/`onClose` which the new logic handles). No DB changes.
- **Migration needed?:** No.
- **Testing:** All 131 tests pass. TypeScript clean (no new errors). ESLint clean (no new errors — pre-existing warnings in the file are unchanged).

---

## [2026-06-25] – Fix overlapping events stacking in DayView (BUG-007)
- **What changed:**
  Changed `CalendarEvent.id` type from `number` to `string` in `src/types/index.ts` (and `CalendarEventRow.id` for consistency), matching the DB's `uid TEXT` primary key. Updated `src/pages/api/v2/calendar/events.ts` to map `uid` to `id` in three places: (1) regular events passthrough — `regular.map(e => ({ ...e, id: e.uid }))` instead of `[...regular]`, so each event gets a unique string ID; (2) recurring event expansion — `${event.uid}_${nextDate.getTime()}` instead of `${event.id}_${nextDate.getTime()}`, fixing recurring instances from getting `'undefined_<timestamp>'`; (3) recurrence expansion fallback in the catch block — `{ ...event, id: event.uid }` instead of raw `event`. Also updated the error log to reference `event.uid` instead of `event.id`.
- **Why:**
  The `calendar_events` table has a composite PK `(uid TEXT, calendar_id INTEGER)` with no `id` column. `SELECT e.*` returned `uid` but not `id`, so `event.id` was always `undefined` on the frontend. The DayView `itemLayouts` algorithm keys on `evt-${e.id}` — all non-recurring events shared the key `'evt-undefined'`, collapsing into a single column and stacking on top of each other instead of rendering side-by-side. No frontend rendering code changes were needed — all 8 `event.id` usages across CalendarView, TodayView, and WeeklyCalendar already treat `id` as an opaque string (template literals, Map keys, equality checks, `String()` coercion).
- **Affected areas:** `src/types/index.ts` (CalendarEvent.id + CalendarEventRow.id type change), `src/pages/api/v2/calendar/events.ts` (3 uid→id mappings + error log). No DB changes. No frontend component changes.
- **Migration needed?:** No.
- **Testing:** All 131 tests pass. TypeScript clean (no new errors). ESLint clean (no new errors).
- **Note:** Discovered secondary issue — `db.ts` functions for calendar event updates (`updateCalendarEvent`, `getCalendarEventWithConfig`, `getCalendarEventById`, `updateCalendarEventRawData`) use `WHERE id = $1` but the table has no `id` column. The PATCH `/api/v2/calendar/events/[id]` endpoint is likely broken for event drag-resize. Separate from BUG-007; needs its own bug report.

---
- **What changed:**

  **Optimistic updates:** Added `updateLocalTask(id, patch)`, `removeLocalTask(id)`, and `addLocalTask(task)` methods to SyncContext. Views call these before API calls for instant UI updates. The CustomEvent system then triggers a refetch to reconcile optimistic data with server state. Wired into:
  - CalendarView (`handleTaskToggle`, `handleDropTask`)
  - TodayView (`handleToggle`, `handleUpdate`, `handleDelete`)
  - WeeklyCalendar (`handleTaskComplete`)

  **Component consolidation:** Converted 3 more components from independent task fetching to `useSync()`:
  - `AllTasksView.tsx` — removed `fetchTasks`, `setTasks`, status/sort API calls. Now uses `useSync()` + client-side `useMemo` filtering/sorting. Optimistic toggle/update via `updateLocalTask`. Bulk delete via `removeLocalTask`. Cleaned up unused `Filter`, `SortAsc`, `SortDesc`, `useTaskEdit` imports.
  - `InboxView.tsx` — removed `fetchTasks`, `setTasks`, CustomEvent listeners. Now uses `useSync()` + `useMemo` filter for `!page_name && status !== 'done' && content !== ''` (replaces `?context=none` server filter). Optimistic toggle/update/delete via context methods. Removed `isLoading`, `isRefreshing` state.
  - `UnscheduledTaskPanel.tsx` — removed `fetchTasks`, `setTasks`, `useEffect` on `isOpen`, CustomEvent listeners. Now uses `useSync()`. Optimistic toggle via `updateLocalTask`. Removed `loading` state (uses `initialLoading` from context).

  **Delta sync for tasks:** Added `since` query parameter to `GET /api/v2/tasks` — returns only tasks with `updated_at > since`. Updated `getTasks()` in `db.ts` to accept and apply `since` filter. Added `004_task_updated_at_index.sql` migration (index on `tasks.updated_at`). SyncContext now:
  - Tracks `lastFetchTimeRef` (timestamp of last fetch)
  - Polling (30s interval) uses `?since=<lastFetchTime>` — fetches only changed tasks, merges into existing state via Map
  - CustomEvents (user mutations) trigger full refetch (no `since`) for correctness — ensures deletions are captured
  - Initial fetch is always full (no `since`)

  **Refined loading state:** Split `loading` into `initialLoading` (true only during first fetch) and `isFetching` (true during any fetch). Views use `initialLoading` for skeleton screens. `isFetching` available for future "refreshing..." indicators. Updated all 6 consumer views.

- **Why:** Phase 1 consolidated polling but removed optimistic updates (UI lag), left 5 components with independent fetch logic, and fetched full payloads every 30s. Phase 2 restores UX snappiness, completes the consolidation, and reduces idle polling bandwidth.
- **Affected areas:** `src/contexts/SyncContext.tsx`, `src/components/CalendarView.tsx`, `src/components/v2/TodayView.tsx`, `src/components/v2/WeeklyCalendar.tsx`, `src/components/v2/AllTasksView.tsx`, `src/components/v2/InboxView.tsx`, `src/components/calendar/UnscheduledTaskPanel.tsx`, `src/lib/db.ts`, `src/pages/api/v2/tasks.ts`, `src/migrations/004_task_updated_at_index.sql` (new). API is backward-compatible — `since` is optional.
- **Migration needed?:** Yes — `004_task_updated_at_index.sql` adds index on `tasks.updated_at`. Deployed via `update.sh`.
- **Testing:** All 131 tests pass. TypeScript clean (no new errors). ESLint clean (no new warnings/errors beyond pre-existing).

---

## [2026-06-24] – Consolidate 30s polling intervals into SyncContext (BUG-002, Phase 1)
- **What changed:**
  Created `src/contexts/SyncContext.tsx` — a `SyncProvider` with a single 30s `setInterval` that fetches `GET /api/v2/tasks` (all tasks) and `GET /api/v2/calendar/events` (±180-day window from today) in parallel. Listens for `taskCreated`/`taskUpdated`/`taskDeleted` CustomEvents for immediate refetch (so views don't need their own listeners). Uses a `fetchInProgressRef` guard to prevent overlapping fetches. Exposes `{ tasks, events, loading, refetch }` via `useSync()` hook.
  
  Added `SyncProvider` to `src/app/layout.tsx` inside `ToastProvider`, wrapping `TaskEditProvider`.
  
  Modified `src/components/CalendarView.tsx`: removed `useCalendarEvents` import, inline `fetchTasks` callback, `setTasks`/`tasksLoading` state, 30s `setInterval`, and cross-view CustomEvent listeners. Now consumes `useSync()` for both tasks and events. Removed optimistic `setTasks(prev => ...)` updates in `handleTaskToggle` and `handleDropTask` — replaced with `refetch()` on error/after mutation. `handleDataChanged` and `handleRefresh` call `refetch()`.
  
  Modified `src/components/v2/TodayView.tsx`: removed `useCalendarEvents` import, `fetchTasks`/`setTasks`/`tasksLoading`, 30s interval, and CustomEvent listeners. Now consumes `useSync()`. Added `status !== 'done'` filter to `overdueTasks` and `todayTasks` filters (previously filtered server-side by `?due=today`). Removed optimistic `setTasks` updates in `handleToggle`, `handleUpdate`, `handleDelete` — relying on CustomEvent → SyncContext refetch. Cleaned up unused `format`/`eventColorStyle` imports.
  
  Modified `src/components/v2/WeeklyCalendar.tsx`: removed `useCalendarEventsRange` import, `fetchTasks`/`setTasks`/`tasksLoading`, 30s interval, and CustomEvent listeners. Now consumes `useSync()`. Removed optimistic `setTasks` update in `handleTaskComplete` — dispatches `taskUpdated` CustomEvent instead. Cleaned up unused `eventColorStyle` import.
  
  Deleted `src/hooks/useCalendarEvents.ts` — no remaining consumers. The `getDateRange` utility and `useCalendarEventsRange` export are gone; all consumers now filter the ±180-day event window client-side.
  
- **Why:** Eliminate 4 independent 30s polling intervals (CalendarView tasks, TodayView tasks, WeeklyCalendar tasks, useCalendarEvents events) that caused redundant API calls, network saturation, and mobile battery drain when multiple views were mounted or tab-switched.
- **Affected areas:** `src/contexts/SyncContext.tsx` (new), `src/app/layout.tsx`, `src/components/CalendarView.tsx`, `src/components/v2/TodayView.tsx`, `src/components/v2/WeeklyCalendar.tsx`, `src/hooks/useCalendarEvents.ts` (deleted). API unchanged.
- **Migration needed?:** No DB changes. No env vars.
- **Testing:** All 131 tests pass. TypeScript clean (no new errors). ESLint clean (no new warnings/errors).
- **Known trade-offs:**
  - Optimistic UI updates are gone — task toggle/delete/create now update UI after the API round-trip + refetch, ~200-500ms delay. Acceptable for Phase 1; Phase 2 can re-add optimistic updates with local cache + context merge if needed.
  - Event window is fixed at ±180 days from today. If user navigates beyond 6 months in month view, events won't appear for those dates (unlikely edge case for personal calendar).
  - TodayView now fetches all tasks (not just `?due=today`) and filters client-side. Slightly larger payload, but enables future optimizations (delta sync, local caching).

---

## [2026-06-24] – Toast notification system + fix silent drag-drop failures (BUG-003)
- **What changed:**
  Created `src/contexts/ToastContext.tsx` — a lightweight toast notification system with `ToastProvider` context, `useToast()` hook, and `showToast(message, type)` API (types: `'success' | 'error' | 'info'`). Toasts auto-dismiss after 4 seconds, render via `createPortal` to `document.body` (fixed bottom-right, z-[10000]), with color-coded variants (green/red/blue), icon, dismiss button, and slide-in animation. Added `ToastProvider` to the root layout wrapping `TaskEditProvider`. Wired all 7 drag-drop/creation `.catch(console.error)` handlers in `CalendarView.tsx` to show error toasts on failure: `handleDropTask` (month/week grid drop), DayView `onDrop` (internal task drag, external sidebar drop, event drag), DayView `onTouchEnd` (touch event drag), and inline task creation (Enter key + blur). The `DayView` component calls `useToast()` directly since it's a separate function component within the same file. The `console.error` calls are retained alongside the toasts for debugging.
- **Why:**
  All drag-and-drop operations in CalendarView silently swallowed errors via `.catch(console.error)`. If a drag operation failed (network error, server error, auth expiry), the task snapped back with no indication anything went wrong. Users believed operations succeeded when they actually failed. The toast system is reusable — other components listed in the roadmap (Editor.tsx, TaskExtension.tsx) can adopt `useToast()` trivially.
- **Affected areas:**
  `src/contexts/ToastContext.tsx` (new), `src/app/layout.tsx` (added `ToastProvider`), `src/components/CalendarView.tsx` (import `useToast`, added to `CalendarViewV2` and `DayView`, replaced 7 `.catch(console.error)` with toast feedback).
- **Migration needed?** No.

---

## [2026-06-24] – Fix quick-date buttons setting due time to current clock time (BUG-006)
- **What changed:**
  In `handleQuickSelect` (`DatePickerPopover.tsx`), the `new Date()` call that previously carried the current hours/minutes/seconds now has `setHours(17, 0, 0, 0)` applied immediately, zeroing out the time and defaulting to 5:00 PM (end of business day). All three quick-select cases (today, tomorrow, next-week) inherit this default. When the user has explicitly set a custom time via the time input, that value takes precedence. The `today` case now creates a copy (`new Date(today)`) instead of sharing the mutable reference.
- **Why:**
  Clicking "Today" or "Tomorrow" at 2:35 PM would set the due time to 2:35 PM — almost never the user's intent. If the current time was in the evening, tasks showed as immediately overdue. The quick buttons are shortcuts and should make a reasonable assumption ("due by end of today").
- **Affected areas:**
  `src/components/v2/DatePickerPopover.tsx` (`handleQuickSelect`, lines 62-78).
- **Migration needed?** No.

---

## [2026-06-22] – Fix TaskEditModal date/time/recurrence not persisting (BUG-005)
- **What changed:**
  Two-part fix for the field name mismatch causing `due_date` and `recurrence_rule` to be silently dropped when saving task edits through the TaskEditModal. **(1)** Routed `TaskEditContext.tsx` PUT and DELETE from `/api/v2/tasks?id=${taskId}` (index handler) to `/api/v2/tasks/${taskId}` (dynamic `[id].ts` handler). The dynamic handler already accepts snake_case `due_date` and dual-name `recurrence_rule`/`recurrenceRule`, and also calls `spawnNextRecurrence` on task completion — a feature the index handler lacks. **(2)** Updated `tasks.ts` index handler to accept both snake_case and camelCase for `due_date`/`dueDate` and `recurrence_rule`/`recurrenceRule` in both POST and PUT, making both handlers consistent and defensive against any caller using either convention.
- **Why:**
  `TaskEditor.tsx` sends snake_case (`due_date`, `recurrence_rule`) per the unified type system, but the index handler `tasks.ts` destructured camelCase (`dueDate`, `recurrenceRule`). The destructured values were always `undefined`, so those fields were silently excluded from the update. The modal's PUT went to the index handler via `?id=`, while the inline datepicker (which works) goes to the dynamic `[id].ts` handler. Same bug affected POST creation through the modal — due dates and recurrence rules were lost on task creation too.
- **Affected areas:**
  `src/pages/api/v2/tasks.ts` (POST + PUT destructuring), `src/contexts/TaskEditContext.tsx` (PUT + DELETE fetch URLs).
- **Migration needed?** No.

---

## [2026-06-22] – Fix useCalendarEvents re-fetch loop
- **What changed:**
  Wrapped `getDateRange()` call in `useMemo` inside `useCalendarEvents` hook so that `start` and `end` Date objects are stable references between renders as long as `[date, viewType, rangeEnd]` haven't changed. Changed `fetchEvents` `useCallback` deps from `[start.toISOString(), end.toISOString()]` (string comparison) to `[start, end]` (reference equality on memoized objects). The fetch effect and 30s polling interval no longer tear down/recreate unnecessarily on unrelated re-renders.
- **Why:**
  `getDateRange` created fresh Date objects every render. While `.toISOString()` produced identical strings within a day (so `useCallback` mostly kept the same ref), any date boundary crossing or caller re-render with a fresh `new Date()` would cascade into a new `fetchEvents` ref, resetting the polling interval. Using `useMemo` + reference deps is the correct React pattern and eliminates unnecessary work.
- **Affected areas:**
  `src/hooks/useCalendarEvents.ts` (3 lines: imports, `useMemo` wrap, deps change). No caller changes needed — hook's public API unchanged.
- **Migration needed?** No.

---

## [2026-06-22] – JWT secret hardening
- **What changed:**
  Removed the hardcoded fallback string `'docket-dev-secret-change-in-production'` from 3 auth files (`src/middleware.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/me/route.ts`). Each now checks `if (!process.env.JWT_SECRET)` and throws at module init time with a clear error message. Added `JWT_SECRET: ${JWT_SECRET}` to the `docker-compose.yml` app service `environment:` block — docker-compose interpolates this from the new `.env` file (gitignored, same value as `.env.local`). This makes the secret explicitly visible in the compose config while keeping the actual value out of git.
- **Why:**
  The fallback was a known, predictable string readable in the source. If `JWT_SECRET` was unset in production, the app silently ran with a forgeable secret — a security vulnerability. Fail-fast at init ensures the app never starts without a real secret.
- **Affected areas:**
  `src/middleware.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/me/route.ts`, `docker-compose.yml`, `.env` (new, gitignored).
- **Migration needed?** No (config-only change, no DB impact).

---

## [2026-06-22] – Database migrations framework
- **What changed:**
  Adopted `node-pg-migrate` (devDependency) for local dev/CI migration management and created `scripts/run-migrations.js` — a lightweight CommonJS production runner that uses only `pg` (already in the standalone build). Both runners share the same `pgmigrations` tracking table (matching node-pg-migrate's schema: `id SERIAL PK, name varchar(255), run_on timestamp`) and the same SQL file format (`-- Up migration` / `-- Down migration` comments). Created 3 migration files: `001_baseline.sql` (idempotent full schema with `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` for all 12 tables + indexes), `002_caldav_name_default.sql` (`UPDATE caldav_configs SET name = 'Default Account' WHERE name IS NULL`), `003_notes_to_pages.sql` (conditional `DO $$` block that migrates legacy `notes` table rows to `pages` with TipTap JSON only if notes table exists and titles don't already match). Added npm scripts (`migrate`, `migrate:up`, `migrate:down`, `migrate:create`). Updated `update.sh` to use `node scripts/run-migrations.js` instead of `node scripts/migrate-production.js`. Updated `Dockerfile` to copy `src/migrations/` to the production image. Deleted 6 legacy ad-hoc scripts: `migrate-production.js`, `migrate-db.ts`, `migrate-calendar-integration.ts`, `migrate_v1_to_v2.ts`, `add-caldav-columns.ts`, `add-deleted-log-table.js`, and `src/migrations/add_rrule_to_calendar_events.sql`.
- **Why:**
  Manual SQL changes were error-prone with no version tracking. The old `migrate-production.js` was a flat file of idempotent `IF NOT EXISTS` statements — no ordering, no rollback, no audit trail. Legacy scripts were scattered and duplicated (calendar_events defined differently in 3 places). The new framework provides ordered, tracked, transactional migrations with forward-only safety.
- **Affected areas:**
  `src/migrations/001_baseline.sql` (new), `src/migrations/002_caldav_name_default.sql` (new), `src/migrations/003_notes_to_pages.sql` (new), `scripts/run-migrations.js` (new), `package.json` (node-pg-migrate devDep + npm scripts), `update.sh` (migration command), `Dockerfile` (copy migrations dir), `.env.local` (fixed DATABASE_URL password). Deleted: `scripts/migrate-production.js`, `scripts/migrate-db.ts`, `scripts/migrate-calendar-integration.ts`, `scripts/migrate_v1_to_v2.ts`, `scripts/add-caldav-columns.ts`, `scripts/add-deleted-log-table.js`, `src/migrations/add_rrule_to_calendar_events.sql`.
- **Migration needed?** Yes — run `node scripts/run-migrations.js` (or `npm run migrate`). The 3 new migration files will be applied and tracked in `pgmigrations`. On existing databases, `001_baseline` is a no-op (all `IF NOT EXISTS`), `002` sets default CalDAV names, `003` migrates legacy notes if the table exists.

---

## [2026-06-22] – Roadmap refresh for committed-but-undocumented work
- **What changed:**
  Added `count` and `until` fields to `RecurrenceRule` so recurring tasks can stop after N occurrences or a set date. `spawnNextRecurrence` now checks termination: if `until` is set and the next date exceeds it, the rule is stripped and no new instance is created; if `count > 1`, the next instance gets `count - 1`; if `count === 1`, this is the last occurrence. Added `shouldRecur()` pure function to `recurrenceCalc.ts` for testable UNTIL date comparison (handles both `YYYYMMDD` and `YYYYMMDDThhmmssZ` RRULE formats). Updated `rruleToRecurrenceRule` and `recurrenceRuleToRrule` to parse/emit COUNT and UNTIL. Added end-condition UI to `DatePickerPopover`: "Ends" selector with Never/After/On date options, count input, and date picker. Updated recurrence badge in `TaskEditor` to show `×5` for count and `until YYYYMMDD` for until. Added 18 new tests (shouldRecur, COUNT/UNTIL RRULE parsing, RRULE emission, round-trips). Total test count: 131.
- **Why:**
  Without end conditions, recurring tasks spawned infinitely. Users couldn't say "repeat 5 times" or "every week until December". RRULE COUNT/UNTIL are standard iCal fields that were being ignored on sync.
- **Affected areas:**
  `src/types/index.ts` (RecurrenceRule type), `src/lib/recurrenceCalc.ts` (shouldRecur, RRULE parsing/emission), `src/lib/recurrence.ts` (spawnNextRecurrence termination logic, re-export), `src/components/v2/DatePickerPopover.tsx` (end-condition UI), `src/components/TaskEditor.tsx` (badge display), `src/lib/__tests__/recurrence.test.ts` (18 new tests).
- **Migration needed?** No (new optional fields, existing data unaffected).

---
- **What changed:**
  Added full bidirectional RRULE ↔ RecurrenceRule conversion so recurring tasks sync correctly over CalDAV. `parseVTodo()` now extracts the RRULE property from VTODO components and converts it to a `RecurrenceRule` object. `createVTodoString()` now emits RRULE from a `RecurrenceRule` so outgoing sync includes recurrence data. `updateLocalFromRemote()` now persists `recurrence_rule` to the DB on remote changes. The "new remote task" INSERT now includes `recurrence_rule`. `pushLocalToRemote()` passes `local.recurrence_rule` to `createVTodoString`. Added `rruleToRecurrenceRule()` and `recurrenceRuleToRrule()` pure functions to `recurrenceCalc.ts` — handles FREQ, INTERVAL, BYDAY (MO/TU/WE/TH/FR/SA/SU ↔ 0-6), and BYSETPOS for monthly Nth-day rules. Updated `LocalTask` interface to include `recurrence_rule`. Added 25 tests for RRULE parsing, generation, and round-trips.
- **Why:**
  VTODOs from CalDAV servers that contain RRULE properties were losing their recurrence data on sync — parseVTodo never extracted RRULE, and outgoing VTODOs never included it. Recurring tasks from other platforms appeared as one-off tasks.
- **Affected areas:**
  `src/lib/caldav.ts`, `src/lib/recurrenceCalc.ts`, `src/lib/recurrence.ts`, `src/lib/__tests__/recurrence.test.ts`.
- **Migration needed?** No.

---

## [2026-06-15] – Recurrence engine bug fixes & test coverage
- **What changed:**
  Fixed weekly recurrence `daysOfWeek` calculation — old code ignored specific days and just added N weeks. New algorithm sorts target days, finds next match in current week, wraps to next interval cycle. Moved duplicate-spawn protection to strip rule *before* creating next instance. Removed unused `day`, `date`, `month` from `RecurrenceRule`. Extracted pure functions to `src/lib/recurrenceCalc.ts` for testability. Added 35 unit tests (daily, weekly+daysOfWeek+interval, monthly+Nth-day, yearly, edge cases).
- **Why:**
  Weekly `daysOfWeek` was saved by UI but ignored in calculation. Zero tests for core logic. Duplicate spawning possible on failure. Unused fields were dead code.
- **Affected areas:**
  `src/lib/recurrenceCalc.ts` (new), `src/lib/recurrence.ts`, `src/types/index.ts`, `src/lib/__tests__/recurrence.test.ts` (new).
- **Migration needed?** No.

---

## [2026-06-15] – Cross-view task sync & UI bug fixes
- **What changed:**
  Fixed perpetual loading in TodayView/page/[id] (dead `isLoading` states). Connected TodayView + InboxView with custom events for instant sync. Fixed CalendarView mobile DayDetailPanel missing `onTaskToggle`. Removed dead props. Extended DayView overlap algorithm to timed tasks with composite keys. Fixed event color opacity. Extracted layout constants. Normalized Sidebar event dispatch.
- **Why:**
  Dead `isLoading` caused perpetual spinner. Event opacity washed out colors. Tasks stacked on events. Mobile couldn't toggle completion.
- **Affected areas:**
  `TodayView.tsx`, `InboxView.tsx`, `Sidebar.tsx`, `CalendarView.tsx`, `CalendarTaskBlock.tsx`, `EventCard.tsx`, `calendar.ts`, `page/[id]/page.tsx`.
- **Migration needed?** No.

---

## [2026-06-13] – Type system unification & dead code cleanup
- **What changed:**  
  Merged `src/types/index.ts` and `src/types/v2.ts` into a single canonical `src/types/index.ts`. The unified file contains all app types (`Task`, `Page`, `PageItem`, `CalendarEvent`, `CalendarSource`, `Note`, `Folder`, `Context`, tab types), DB row types (`TaskRow`, `PageRow`, `PageItemRow`, `FolderRow`, `NoteRow`, `CalendarEventRow`, `CalendarSourceRow`), shared types (`TaskStatus`, `RecurrenceRule`, `PageItemType`, `DisplayMode`), and transformation functions (`taskRowToTask`, `taskToTaskRow`, `pageRowToPage`). Removed all adapter code: `v2TaskToLegacy()` from `calendar.ts`, manual V2↔Legacy conversion in `TaskEditContext.tsx`, inline adapters in `TaskItem.tsx`, `EditorTaskItem.tsx`, `CalendarView.tsx`, `WeeklyCalendar.tsx`, `UnscheduledTaskPanel.tsx`. The canonical `Task` type now uses `status: TaskStatus` (not `completed: boolean`) and `due_date: string | null` / `created_at: string` / `updated_at: string` (matching actual JSON shapes). `TaskEditContext` now accepts and dispatches the canonical `Task` directly. Updated 29 files that imported from `@/types/v2` to import from `@/types`. Deleted dead code: `src/lib/api.ts` (513 lines), `src/hooks/useTaskSync.ts` (298 lines), `src/hooks/useTasksData.ts` (169 lines), `src/hooks/useNotesData.ts` (161 lines), and orphaned scripts `verify-cascade.ts`, `verify-delete-completed.ts`. Moved `CalendarEvent` and `CalendarSource` interfaces from `calendar.ts` to the unified types file. Fixed `TaskEditor.tsx` to use `status` instead of `completed` boolean. Fixed `TaskEditModal.tsx` to use canonical `Task` with `onDelete?: (taskId: number)`.
- **Why:**  
  Dual type systems caused manual conversion in `TaskEditContext`, `v2TaskToLegacy` adapter, and 5+ component-level adapters. Dead code (`api.ts`, unused hooks) blocked progress on API consolidation. Single canonical type system eliminates conversion bugs and simplifies all task editing flows.
- **Affected areas:**  
  `src/types/index.ts` (rewrite), `src/types/v2.ts` (deleted), `src/lib/api.ts` (deleted), `src/hooks/useTaskSync.ts` (deleted), `src/hooks/useTasksData.ts` (deleted), `src/hooks/useNotesData.ts` (deleted), `src/lib/calendar.ts` (removed `v2TaskToLegacy`, re-exported interfaces), `src/contexts/TaskEditContext.tsx` (refactored), `src/components/TaskEditModal.tsx` (refactored), `src/components/TaskEditor.tsx` (refactored), `src/components/v2/TaskItem.tsx` (removed adapter), `src/components/v2/EditorTaskItem.tsx` (removed adapter), `src/components/CalendarView.tsx` (removed adapter), `src/components/v2/WeeklyCalendar.tsx` (removed adapter), `src/components/calendar/UnscheduledTaskPanel.tsx` (removed adapter), 29+ files (import path updates).
- **Migration needed?** No (existing functionality preserved; type shapes match actual API responses).

---

## [2026-06-13] – Type system unification & dead code cleanup
- **What changed:**  
  Merged `src/types/index.ts` and `src/types/v2.ts` into a single canonical `src/types/index.ts`. Removed all adapter code: `v2TaskToLegacy()`, manual V2↔Legacy conversion in `TaskEditContext`, inline adapters in 5 components. The canonical `Task` type uses `status: TaskStatus` and string dates matching JSON shapes. Updated 29+ import paths. Deleted dead code: `src/lib/api.ts` (513 lines), `src/hooks/useTaskSync.ts`, `useTasksData.ts`, `useNotesData.ts`, and orphaned scripts. Fixed mobile DayView missing `onTaskClick` prop.
- **Why:**  
  Dual type systems caused conversion bugs and blocked progress. Dead code (`api.ts`, unused hooks) confused which layer to use.
- **Affected areas:**  
  `src/types/index.ts` (rewrite), `src/types/v2.ts` (deleted), `src/lib/api.ts` (deleted), `src/hooks/useTaskSync.ts`, `useTasksData.ts`, `useNotesData.ts` (deleted), `src/lib/calendar.ts`, `src/contexts/TaskEditContext.tsx`, `src/components/TaskEditModal.tsx`, `src/components/TaskEditor.tsx`, `src/components/v2/TaskItem.tsx`, `src/components/v2/EditorTaskItem.tsx`, `src/components/CalendarView.tsx`, `src/components/v2/WeeklyCalendar.tsx`, `src/components/calendar/UnscheduledTaskPanel.tsx`, 29+ files (import path updates), `src/components/CalendarView.tsx` (mobile DayView fix).
- **Migration needed?** No.

---

## [2026-06-13] – API consolidation: route-level SQL → db.ts helpers
- **What changed:**  
  Added ~20 data access functions to `src/lib/db.ts`: `getTasks`, `updateTask`, `deleteTask`, `deleteCompletedTasks`, `getFolders`, `createFolder`, `updateFolder`, `deleteFolder`, `getCalendarEvents`, `updateCalendarEvent`, `getCalendarEventWithConfig`, `getCalendarEventById`, `updateCalendarEventRawData`, CalDAV config CRUD, push subscription helpers, `getJournalPage`, `upsertJournalContent`, `createJournalPage`, `searchAll`, `getFolderPages`, `getFolderName`, `getTasksDueSoon`, `recordPushNotification`, `removePushSubscriptionById`. Removed 4 unused exports: `getPages`, `searchContent`, `getItemContext`, `getItemsByTag`. Refactored 12 route files to use db.ts helpers instead of inline SQL: `tasks.ts`, `tasks/[id].ts`, `folders.ts`, `folders/[id].ts`, `folders/[id]/export.ts`, `search.ts`, `calendar/events.ts`, `calendar/events/[id].ts`, `daily-journal.ts`, `push/subscribe.ts`, `push/send.ts`, `caldav/config.ts`. Removed `mapFolder` camelCase conversions from folder routes. Fixed `pages.ts` dynamic `await import()` of `addItemToPage`. Removed redundant property remapping in `tasks/[id].ts`.
- **Why:**  
  Route handlers had raw SQL scattered across 12+ files. Data access through `db.ts` helpers makes routes testable, consistent, and eliminates duplicated SQL patterns. Removing camelCase conversions (`mapFolder`) aligns with the unified snake_case type system.
- **Affected areas:**  
  `src/lib/db.ts` (major additions), 12 route files, `src/pages/api/v2/pages.ts` (dynamic import fix).
- **Migration needed?** No.

---

## [2026-06-11] – Calendar module refactoring & interactive components
- **What changed:**  
  Extracted shared types (`CalendarEvent`, `CalendarSource`), utilities (`hexToRgb`, `eventColorStyle`, `isTrulyAllDay`) into `src/lib/calendar.ts`.  
  Created 3 new components: `EventCard` (3 variants: standard, compact, allday), `CalendarTaskBlock` (interactive DayView task block with checkbox, drag, status colors), `CalendarTaskCard` (3 variants: default, compact, overdue).  
  Enhanced `CalendarTaskSidebar` with completion toggles, quick-add input with date selector, due date badges, TaskEditModal integration, sorted task list.  
  Created `useCalendarEvents` and `useCalendarSources` hooks with 30s auto-polling.  
  Refactored `CalendarView`, `WeeklyCalendar`, and `TodayView` to consume shared modules — eliminated all duplicated `eventColorStyle`, `isTrulyAllDay`, and `CalendarEvent` interface definitions.
- **Why:**  
  Code duplication across views; inconsistent event/task rendering; tasks in DayView were non-interactive purple boxes; sidebar was drag-only with no task actions.
- **Affected areas:**  
  `src/lib/calendar.ts` (new), `src/components/calendar/EventCard.tsx` (new), `src/components/calendar/CalendarTaskBlock.tsx` (new), `src/components/calendar/CalendarTaskCard.tsx` (new), `src/components/calendar/CalendarTaskSidebar.tsx` (enhanced), `src/hooks/useCalendarEvents.ts` (new), `src/hooks/useCalendarSources.ts` (new), `src/components/CalendarView.tsx` (refactored), `src/components/v2/WeeklyCalendar.tsx` (refactored), `src/components/v2/TodayView.tsx` (refactored).
- **Migration needed?** No (existing functionality preserved; new patterns additive).

---

## [2026-06-11] – Day‑view click‑to‑create tasks
- **What changed:**  
  Added click handler on DayView time grid empty areas. Clicking an empty time slot computes the position, snaps to 15-minute grid, and renders an inline text input at that position. Pressing Enter calls `POST /api/v2/tasks` with `{ content, dueDate }`. Pressing Escape or blurring dismisses. Also creates the task on blur if text is non-empty.
- **Why:**  
  Quick task creation without leaving the calendar view — matches Google Calendar UX pattern.
- **Affected areas:**  
  `CalendarView.tsx` (DayView component) — new `creatingAt` and `creatingValue` state, inline `<input>` in the time grid.
- **Migration needed?** No.

---

## [2026-06-15] – Task status enum finalised
- **What changed:**  
  V2 schema now uses `status` column with `todo`, `in_progress`, `done`, `cancelled` instead of a boolean `completed`. All endpoints and components migrated.
- **Why:**  
  Boolean was too limiting for task workflows.
- **Affected areas:**  
  DB schema (`tasks` table), `db.ts`, task endpoints, `TaskItem`, `TaskEditModal`.
- **Migration needed?** Yes – a manual SQL migration was applied to the production database (see `src/migrations/003_task_status_enum.sql`).

---

## [2026-06-10] – Dual type system introduced (temporary)
- **What changed:**  
  Created `src/types/v2.ts` with snake_case types matching the DB. Legacy types remain in `src/types/index.ts`. `TaskEditContext` manually converts between them.
- **Why:**  
  Immediate need to support new DB schema without breaking existing code.
- **Affected areas:**  
  `TaskEditContext`, any component using `useTaskEdit`.
- **Migration needed?** Not yet – this is intentional tech debt (see Roadmap).

---

## [2026-06-22] – Roadmap refresh for committed-but-undocumented work
- **What changed:**
  Updated ROADMAP.md to reflect work landed in June 11-12 commits that wasn't tracked: TaskEditModal wiring, cross-view sync (was already delivered via custom events), CalendarTaskSidebar→UnscheduledTaskPanel merge, task widget API endpoint, and event opacity fix. Added 3 new entries to Recently Completed, marked 2 Immediate items as Complete, and cleaned up stale context references.
- **Why:**
  Roadmap fell out of sync with `git log` — several features and fixes were shipped without updating the tracking document.
- **Affected areas:**
  `ROADMAP.md` (Recently Completed, Immediate section)
- **Migration needed?** No.

## Template for future entries
[YYYY-MM-DD] – Short description
	•	What changed: …
	•	Why: …
	•	Affected areas: …
	•	Migration needed? Yes / No / See instructions

**Guidelines for Opencode:**  
- After every non‑trivial change, add an entry here.  
- If a change touches the database schema, note the migration file and whether it needs to be run.  
- Keep the log in reverse chronological order (newest on top).
