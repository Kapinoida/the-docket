# Bug Tracker

Living bug list for The Docket. Entries are added by Hermes (from Dave's bug reports) and resolved by OpenCode (Daedalus).

Statuses: `🐛 Open` | `🔧 In Progress` | `✅ Fixed` | `🙅 Won't Fix` | `❓ Can't Reproduce`

---

## BUG-005: TaskEditModal date/time/recurrence changes not saved
- **Status:** ✅ Fixed
- **Severity:** High
- **Reported:** 2026-06-22 (via Hermes, from Dave)
- **Description:** When editing a task through the TaskEditModal, changes to the due date, time, and recurrence rule appear to save but don't actually persist. Closing and reopening the modal shows the old values. The inline datepicker on task list items works correctly.
- **Steps to reproduce:**
  1. Click a task in TodayView or InboxView to open the edit modal
  2. Change the due date using the DatePickerPopover
  3. Click "Update"
  4. Reopen the modal — the date reverts to the original value
- **Expected:** Date/time/recurrence changes save and persist.
- **Actual:** Only `content` and `status` changes persist. `due_date` and `recurrence_rule` are silently dropped.
- **Affected files:**
  - `src/pages/api/v2/tasks.ts` (index handler — expects camelCase, lines 31, 44)
  - `src/pages/api/v2/tasks/[id].ts` (dynamic handler — correctly accepts snake_case, line 18)
  - `src/contexts/TaskEditContext.tsx` (routes PUT to `?id=` query param, line 75)
  - `src/components/TaskEditor.tsx` (sends snake_case `due_date` + `recurrence_rule`, lines 69-70)
- **Hermes notes:** Root cause is a field name mismatch between the two API route handlers:
  - **`tasks/[id].ts`** (dynamic route, line 18): accepts `due_date` (snake_case) ✓ — this is what the inline datepicker hits via `/api/v2/tasks/42`
  - **`tasks.ts`** (index handler, line 44): expects `dueDate: newDueDate` and `recurrenceRule: newRecurrenceRule` (camelCase) ✗ — this is what TaskEditContext hits via `/api/v2/tasks?id=42`
  - Both TaskEditor.tsx (line 69) and TaskItem.tsx (line 76) send `due_date` (snake_case), matching the unified type system
  - The `[id].ts` handler also handles `recurrence_rule` correctly with a dual-name check (lines 49-51): `const ruleToUse = recurrenceRule !== undefined ? recurrenceRule : recurrence_rule;`

  **Fix options:**
  1. **(Simplest)** Change `TaskEditContext.tsx` line 75 to use `fetch(\`/api/v2/tasks/${taskId}\`, ...)` instead of `fetch(\`/api/v2/tasks?id=${taskId}\`, ...)` — this would route the modal through the working `[id].ts` handler. Also fix line 57 (POST) to accept snake_case `due_date`.
  2. **(Thorough)** Update `tasks.ts` to accept both naming conventions for `due_date`/`dueDate` and `recurrence_rule`/`recurrenceRule`, matching what `[id].ts` already does for recurrence.

  The thorough fix is better — both handlers should be consistent and accept snake_case (since the entire codebase was unified to snake_case types per AGENTS.md).
- **Fix:** Applied both approaches. (1) Routed `TaskEditContext.tsx` PUT/DELETE to `/api/v2/tasks/${taskId}` (dynamic route), which correctly handles snake_case and also calls `spawnNextRecurrence` on task completion. (2) Updated `tasks.ts` index handler to accept both snake_case and camelCase for `due_date`/`dueDate` and `recurrence_rule`/`recurrenceRule` in both POST and PUT, making both handlers consistent.
- **Related ROADMAP:** N/A (bug, not planned feature)

---

## BUG-006: Quick-date buttons ("Today", "Tomorrow") set due time to current clock time
- **Status:** ✅ Fixed
- **Severity:** Medium
- **Reported:** 2026-06-22 (via Hermes, from Dave)
- **Description:** Clicking the "Today" or "Tomorrow" quick buttons in the DatePickerPopover sets the task's due time to the current clock time (e.g., if it's 2:35 PM, the due time becomes 2:35 PM). This is almost never the desired behavior — when you say "due today," you don't mean "due right now." If the current time is in the evening, the task may even show as immediately overdue.
- **Steps to reproduce:**
  1. At 2:35 PM, click the calendar icon on any task
  2. Click "Today" in the quick buttons
  3. The task's due time is now 2:35 PM today (almost certainly not what you meant)
- **Expected:** Quick-date buttons should set a sensible default time: end-of-day (5:00 PM) or midday (noon), or strip the time entirely so the backend's `normalizeDateToNoon` can apply its existing logic.
- **Actual:** Due time is the exact moment the button was clicked.
- **Affected files:** `src/components/v2/DatePickerPopover.tsx` lines 62-75 (`handleQuickSelect`)
- **Hermes notes:** Root cause in `handleQuickSelect` (line 63): `const today = new Date()` creates a Date object with the current hours/minutes/seconds. When `selectedTime` is empty (which it is on first open), the time is never stripped or replaced — the current clock time leaks through:
  ```js
  case 'today': newDate = today; break;  // today = new Date() → has current time
  ...
  if (selectedTime && newDate) {         // selectedTime is '' → skipped
      const [h, m] = selectedTime.split(':').map(Number);
      newDate.setHours(h, m, 0, 0);
  }
  // newDate still has current time → passed to onSelect()
  ```

  This affects both the inline datepicker (TaskItem.tsx line 76: `date.toISOString()` preserves the time) and the modal (though the modal's `onSelect` callback reformats the date and defaults time to 12:00, mitigating it there).

  **Fix approach:** In `handleQuickSelect`, create a clean date (zero out hours/minutes/seconds), then apply a sensible default time. Several options:
  - **A: Default to 5:00 PM** — "due by end of day" is the most common intent for personal tasks. Clean, predictable.
  - **B: Default to noon (12:00 PM)** — matches the existing `normalizeDateToNoon` behavior used for DB storage. Consistent but less intuitive than end-of-day.
  - **C: Strip time entirely** — let the date be time-less (midnight UTC), then rely on the `normalizeDateToNoon` function in `dateUtils.ts` to convert it to noon local time. Cleanest separation of concerns, but the inline path sends `date.toISOString()` directly without going through `normalizeDateToNoon`, so it would need to be plumbed through.

  My recommendation: **Option A (5:00 PM)** for quick buttons specifically. "Today" → "due by end of today." Quick buttons are shortcuts — they should make a reasonable assumption. The full calendar picker + save flow can still give the user explicit time control.
- **Related ROADMAP:** N/A
- **Fix:** In `handleQuickSelect` (`DatePickerPopover.tsx:62-78`), replaced `const today = new Date()` (which carries current clock time) with `today.setHours(17, 0, 0, 0)` to zero out the time and default to 5:00 PM (end of business day). The `tomorrow` and `next-week` cases inherit the 5 PM default via `addDays`/`nextMonday`. When the user has explicitly set a time via the time input, that time takes precedence. The `today` case now creates a copy (`new Date(today)`) instead of sharing the reference.

---

## BUG-001: useCalendarEvents infinite re-fetch loop
- **Status:** ✅ Fixed
- **Severity:** High
- **Reported:** 2026-06-22 (via Hermes, from ROADMAP)
- **Description:** `fetchEvents` callback in `useCalendarEvents` depends on `start.toISOString()` / `end.toISOString()` which create new strings every render. This causes the `useCallback` dependency array to detect changes on every render, triggering infinite re-fetches.
- **Steps to reproduce:** Mount any view that uses `useCalendarEvents` — observe network tab showing continuous API calls.
- **Expected:** Single fetch on mount and when date range actually changes.
- **Actual:** Continuous re-fetch loop.
- **Affected files:** `src/hooks/useCalendarEvents.ts:42-58`
- **Hermes notes:** The `useCallback` deps include `start` and `end` Date objects. `.toISOString()` creates a new string reference each render. Fix: either memoize the ISO strings before the callback, or use the Date timestamps directly in deps.
- **Fix:** Wrapped `getDateRange()` in `useMemo` so `start`/`end` are stable references; changed `useCallback` deps from `.toISOString()` strings to `[start, end]` references.
- **Related ROADMAP:** "Fix useCalendarEvents re-fetch loop" (Immediate section) — 🟢 Complete

---

## BUG-002: Redundant 30s polling intervals across views
- **Status:** ✅ Fixed
- **Severity:** Medium
- **Reported:** 2026-06-22 (via Hermes, from ROADMAP)
- **Description:** CalendarView, TodayView, WeeklyCalendar, and useCalendarEvents each run their own 30-second polling `setInterval`. When multiple views are mounted (e.g., tab switching), this creates N concurrent pollers all hitting the same endpoints.
- **Steps to reproduce:** Open CalendarView, then navigate to TodayView, then WeeklyCalendar. Check network tab — multiple GET requests firing every 30s.
- **Expected:** One shared sync mechanism that all views subscribe to.
- **Actual:** Independent intervals in each component/hook, causing redundant network requests and battery drain on mobile.
- **Affected files:** `CalendarView.tsx`, `TodayView.tsx`, `WeeklyCalendar.tsx`, `useCalendarEvents.ts`
- **Hermes notes:** Consider a `useSyncPoller` hook or a React context with a single interval that components subscribe to. Also overlaps with BUG-001 — fixing the re-fetch loop first would make this less painful, but the architectural fix is still needed.
- **Related ROADMAP:** "Consolidate 30s polling intervals" (Immediate section)
- **Fix:** Created `src/contexts/SyncContext.tsx` — a `SyncProvider` with a single 30s interval that fetches all tasks + a ±180-day event window in parallel. Listens for `taskCreated`/`taskUpdated`/`taskDeleted` CustomEvents for immediate refetch. Views consume `useSync()` and filter client-side. Removed `useCalendarEvents.ts` entirely (no remaining consumers). Removed inline `setInterval`, `fetchTasks`, `tasksLoading` state, and CustomEvent listeners from CalendarView, TodayView, and WeeklyCalendar. Optimistic `setTasks` updates replaced with `refetch()` (slightly less snappy but correct — Phase 2 can re-add optimistic updates if needed). `SyncProvider` added to root layout inside `ToastProvider`, wrapping `TaskEditProvider`.

---

## BUG-003: Silent drag-drop failures in CalendarView
- **Status:** ✅ Fixed
- **Severity:** High
- **Reported:** 2026-06-22 (via Hermes, from ROADMAP)
- **Description:** All drag-and-drop operations in CalendarView use `.catch(console.error)` with zero user-facing feedback. If a drag operation fails (network error, server error, auth expiry), the task snaps back with no indication anything went wrong. User believes the operation succeeded.
- **Steps to reproduce:** Drag a task to a new time slot in DayView while the server is unreachable. The task appears to move, then snaps back silently.
- **Expected:** Toast/banner on failure explaining what happened.
- **Actual:** Silent failure — task snaps back, error only visible in console.
- **Affected files:** `CalendarView.tsx` lines 725, 755, 779, 876
- **Hermes notes:** This overlaps with ROADMAP items "Add error state UI for failed operations" and "Silent drag-drop failures in CalendarView." A shared toast/notification system would address both bugs and the broader error-state gap. Could use a lightweight context + toast component rather than pulling in a library.
- **Related ROADMAP:** "Add error state UI for failed operations" + "Silent drag-drop failures in CalendarView" (Immediate section)
- **Fix:** Created a lightweight `ToastProvider` context (`src/contexts/ToastContext.tsx`) with `useToast()` hook, `showToast(message, type)` API, and a portal-rendered toast UI (auto-dismiss after 4s, success/error/info variants, dark-themed). Added `ToastProvider` to the root layout. Wired all 7 drag-drop/creation `.catch(console.error)` handlers in `CalendarView.tsx` to call `showToast()` on failure: `handleDropTask` (month/week drop), DayView `onDrop` (dragTask, external drop, dragEvent), DayView `onTouchEnd` (touch event drag), and inline task creation (Enter + blur). The toast system is reusable — other components can adopt `useToast()` trivially for error feedback. No external libraries added.

---

## BUG-004: 45+ console.log statements in production
- **Status:** 🐛 Open
- **Severity:** Low
- **Reported:** 2026-06-22 (via Hermes, from ROADMAP)
- **Description:** ~45 `console.log` statements remain in production code across caldav sync, recurrence engine, and context providers. These pollute the console and may leak internal state.
- **Steps to reproduce:** Open browser console while using the app normally. Observe extensive debug logging.
- **Expected:** Clean console in production. Debug logging behind a flag or removed.
- **Actual:** Verbose console output.
- **Affected files:** `src/lib/caldav.ts`, `src/lib/recurrence.ts`, various context files
- **Hermes notes:** Low priority but good hygiene. Could replace with a debug logger that's stripped in production builds, or just remove the ones that are clearly leftover debugging.
- **Related ROADMAP:** "Remove console.log from production code" (Immediate section)

---

## BUG-007: Overlapping events stack instead of rendering side-by-side in DayView
- **Status:** ✅ Fixed
- **Severity:** High
- **Reported:** 2026-06-25 (via Hermes, from Dave)
- **Description:** In the day calendar view, when two events overlap at the same time (e.g., Ecuador-Germany and Curaçao-Ivory Coast both at 3:00–4:45 PM), they stack directly on top of each other instead of being displayed side-by-side at half-width. The `itemLayouts` column-assignment algorithm exists in the code but isn't distributing events across columns because all non-recurring events share the same lookup key.
- **Steps to reproduce:**
  1. Go to Calendar → Day View on a day with overlapping calendar events (e.g., World Cup match days)
  2. Look at the 3:00 PM slot — Ecuador-Germany and Curaçao-Ivory Coast are stacked, not side-by-side
  3. Same at 6:00 PM (Tunisia-Netherlands / Japan-Sweden) and 9:00 PM
- **Expected:** Overlapping events render as adjacent columns, each taking `(100% - gutter) / N` width.
- **Actual:** Events render at the same position (column 1) stacked on top of each other. The left half of the calendar grid is empty where the first event should be.
- **Affected files:**
  - `src/pages/api/v2/calendar/events.ts` lines 23, 44–46 — API returns events with no `id` field
  - `src/lib/db.ts` line 450 — `getCalendarEvents` queries `SELECT e.*` which includes `uid` (text) but no `id` column
  - `src/types/index.ts` line 58 — `CalendarEvent.id` typed as `number`, but DB has `uid: text`
  - `src/components/CalendarView.tsx` lines 578–592 — `itemLayouts` uses `evt-${e.id}` as key; all non-recurring events get `'evt-undefined'`
- **Hermes notes:** The `calendar_events` table has a composite PK `(uid TEXT, calendar_id INTEGER)` and NO `id` column. The `getCalendarEvents` function does `SELECT e.*` which returns `uid` but NOT any field called `id`. For recurring events, the API handler generates a synthetic ID (`${event.id}_${timestamp}`) which also resolves to `'undefined_timestamp'` — unique per instance but still reveals the root issue. For non-recurring events, they pass through directly from the DB query with `id: undefined`.

  The `itemLayouts` useMemo in DayView maps events to keys like `evt-${e.id}`. Since all non-recurring events have `e.id === undefined`, every event maps to the key `'evt-undefined'`. The `colMap` overwrites this single key on each iteration, preserving only the LAST event's column. The `result` Map also has only one entry for `'evt-undefined'`, so all events retrieve the same `{column, total}`. They all render at the same `leftOffset` and `colWidth` — stacked.

  **Fix approach:** Map `uid` to `id` in the API response so frontend code gets a unique identifier. Option A (minimal): In `events.ts`, add `id: event.uid` to the regular event passthrough (line 23 area) and change the recurring `id` generation to use `event.uid` instead of `event.id`. Then update `CalendarEvent.id` type from `number` to `string`. No frontend rendering code changes needed — `evt-${e.id}` will produce unique keys like `'evt-sSUFq6FvkThV4BPN8jIAzBVGtYWUnwBMWQPA1jBR@maak-agenda.nl'`.

  **Verification data:** 6 events today (June 25, 2026) — 3 overlapping pairs. All from calendar_id=5, all non-recurring. Pairs at 15:00 (Ecuador-Germany + Curaçao-Ivory Coast), 18:00 (Tunisia-Netherlands + Japan-Sweden), 21:00 (Paraguay-Australia + Türkiye-United States).
- **Fix:** Changed `CalendarEvent.id` type from `number` to `string` in `src/types/index.ts` (matching the DB's `uid TEXT` primary key). Updated `src/pages/api/v2/calendar/events.ts` to map `uid` to `id` in three places: (1) regular events — `regular.map(e => ({ ...e, id: e.uid }))` instead of `[...regular]`, (2) recurring event expansion — `${event.uid}_${timestamp}` instead of `${event.id}_${timestamp}`, (3) recurrence expansion fallback — `{ ...event, id: event.uid }` instead of raw `event`. Also updated `CalendarEventRow.id` to `string` for consistency. No frontend changes needed — all 8 `event.id` usages across CalendarView, TodayView, and WeeklyCalendar treat `id` as an opaque string (template literals, Map keys, equality checks).
- **Related ROADMAP:** N/A (bug, not planned feature)
- **Note:** Secondary finding — `db.ts` functions `updateCalendarEvent`, `getCalendarEventWithConfig`, `getCalendarEventById`, and `updateCalendarEventRawData` use `WHERE id = $1` but the `calendar_events` table has no `id` column (composite PK `uid, calendar_id`). The PATCH `/api/v2/calendar/events/[id]` endpoint is likely broken for event drag-resize as a result. Separate from BUG-007; should be filed as its own bug.

---

## BUG-008: Mobile sidebar Settings/Sync buttons hidden behind BottomTabBar
- **Status:** 🐛 Open
- **Severity:** Low
- **Reported:** 2026-06-25 (via Hermes, from Dave)
- **Description:** On mobile, when the left sidebar is open, the Settings button and Sync button at the bottom of the sidebar are obscured by the BottomTabBar. The user can't see or tap them. Additionally, the sidebar header/toolbar area has room to be more compact on mobile.
- **Steps to reproduce:**
  1. Open The Docket on a phone
  2. Tap the hamburger menu to open the left sidebar
  3. Look at the bottom of the sidebar — Settings and Sync are hidden behind the tab bar
- **Expected:** Sidebar content is fully visible above the BottomTabBar. All controls reachable.
- **Actual:** Sidebar footer (settings + sync) sits behind the BottomTabBar, unreachable.
- **Affected files:**
  - `src/components/v2/LayoutWrapper.tsx` lines 63–71 — sidebar container `fixed inset-y-0` with no bottom padding for tab bar
  - `src/components/v2/BottomTabBar.tsx` lines 18–21 — `fixed bottom-0 z-50`, same z-index as sidebar, later in DOM
  - `src/components/v2/Sidebar.tsx` lines 392–406 — Settings + Sync button footer section (`mt-auto`)
  - `src/components/CalendarView.tsx` lines 184–218 — calendar header buttons (view toggle, nav, Today, Tasks, Add Calendar) use `flex-wrap` and could be more compact on mobile
- **Hermes notes:** Both elements use `z-50` and are `fixed` positioned. DOM order determines stacking: sidebar renders first in LayoutWrapper, BottomTabBar renders later (inside the main content flex container). BottomTabBar wins the stacking contest and paints over the sidebar's bottom ~52px+.

  The sidebar container (LayoutWrapper line 68) uses `fixed inset-y-0` which means `bottom: 0`. It needs `bottom: calc(52px + env(safe-area-inset-bottom, 8px))` or equivalent padding so the sidebar ends above the tab bar.

  **Fix:** Add `pb-[calc(52px+env(safe-area-inset-bottom,8px))]` to the sidebar container div on mobile (it already has `md:relative md:translate-x-0` — only apply the padding below `md:`). This pushes the sidebar's bottom edge up above the tab bar.

  **Secondary fix (optional, same pass):** The calendar header toolbar (CalendarView.tsx lines 194–218) has 5 button groups (`flex-wrap gap-2`): view toggle (3 buttons), nav (3 buttons), Today, Tasks, Add Calendar. On narrow phones these wrap to 2-3 rows. Could shrink: hide text labels on view toggle and action buttons, show icons only (`<ListTodo size={14} />` without "Tasks" text). Reduce `min-w-[140px]` date label to `min-w-[100px]`. This is a nice-to-have compactness improvement.
- **Fixed in:** TBD

---

## BUG-009: DatePickerPopover flip threshold too low — renders below trigger when it overflows
- **Status:** 🐛 Open
- **Severity:** Medium
- **Reported:** 2026-06-25 (via Hermes, from Dave)
- **Description:** When opening the date picker on a task positioned low on the page, the popover renders below the trigger even when there isn't enough vertical space. It overflows the viewport before the auto-flip logic kicks in. Dave also notes that on mobile, a centered modal might be better UX than the below/above flip logic.
- **Steps to reproduce:**
  1. Scroll to a task near the bottom of the viewport
  2. Click the calendar icon to open the date picker
  3. Popover renders below the trigger, extending past the bottom of the screen
  4. Particularly visible when the recurrence editor is expanded (adds ~200px height)
- **Expected:** Popover flips above the trigger when there's insufficient space below. On mobile, popover centers vertically for guaranteed visibility.
- **Actual:** Popover renders below and overflows because the hardcoded `380px` threshold is too low. The popover with recurrence editor expanded can reach 500-600px.
- **Affected files:** `src/components/v2/DatePickerPopover.tsx` lines 167–169
- **Hermes notes:** The positioning effect (line 154) checks:
  ```ts
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  if (spaceBelow >= 380 || spaceBelow >= spaceAbove) {
      // Show below — top: rect.bottom + 4
  } else {
      // Show above — bottom: window.innerHeight - rect.top + 4
  }
  ```
  Two issues: (1) `380` is too low — the popover with recurrence editor open (`showCustom=true`) is ~550px. The quick-actions + calendar + time + recurrence editor + footer add up. (2) The `|| spaceBelow >= spaceAbove` check is correct but the `380` guard overrides it — if there's 390px below and 500px above, it still renders below because `390 >= 380` short-circuits before the `>= spaceAbove` check.

  **Fix options:**
  - **A (minimal):** Bump the hardcoded threshold to 550 or measure the popover's actual height via `popoverRef.current.offsetHeight` after render and re-position if needed.
  - **B (better):** Remove the hardcoded threshold entirely. Flip based purely on available space: `spaceBelow >= spaceAbove ? below : above`. If neither has enough room, pick the larger one. This handles any popover height automatically.
  - **C (mobile enhancement):** Add a mobile mode (detect `window.innerWidth < 768`). On mobile, center the popover vertically with `top: 50%; left: 50%; transform: translate(-50%, -50%)` and add a semi-transparent backdrop overlay. This avoids the edge cases of the below/above flip entirely on small screens. Desktop keeps the trigger-adjacent flip behavior.

  **Recommended:** Option B for desktop + Option C for mobile. Remove `380`, use `spaceBelow >= spaceAbove`, and for mobile add centered modal behavior.
- **Fixed in:** TBD

---

## BUG-010: Orphaned v2Task nodes on pages after task deletion

- **Status:** 🐛 Open
- **Severity:** Medium
- **Reported:** 2026-06-29 (via Hermes, from Dave)
- **Description:** Dave noticed that pages like "Basic Notes for Ambrosia" had checkbox items (v2Task nodes) that were done but whose backing tasks no longer existed in the database. These are "ghost" checkboxes — leftover from failed cleanup when tasks were deleted. He asked for a full audit and cleanup.

  **Audit results (June 29, 2026):**
  - **37 orphaned v2Task nodes** found across **8 pages** (taskId references tasks that don't exist)
  - **3 null-taskId v2Task nodes** found — v2Task nodes with `"taskId": null` that never had a valid task reference
  - **0 orphaned `page_items`** — the `page_items` cleanup (line 250 of `deleteTaskReferences`) works correctly
  - All 40 orphans were cleaned up manually via script on 2026-06-29
  - **Orphaned pages**: Docket Improvements (#6), Data Dashboard (#9), Basic Notes (#16), Work Reminders (#18), Common Assessments (#25), Recurring Tasks (#28), Ambrosia Tasks (#32), localhost Radio Tasks (#39)

- **Steps to reproduce:**
  1. Create a task and add it to a page (creates a v2Task node in the page content)
  2. Delete the task through a path that bypasses `deleteTaskReferences()`
  3. Observe: the page still shows the checkbox, but there's no task in the database

- **Expected:** When a task is deleted, ALL references are cleaned up — `tasks` row, `page_items` links, v2Task nodes in page content, `task_sync_meta`, and CalDAV tombstones.

- **Actual:** Two code paths can leave orphaned v2Task nodes:

  **Root Cause 1 — Historical (already fixed):** `deleteCompletedTasks()` in `src/lib/db.ts` did NOT call `deleteTaskReferences(taskId)` before June 2026. Any tasks deleted via the "Clear Completed" bulk action before that fix left their v2Task nodes behind. This is the primary source of the 37 orphans found. The fix was deployed in June 2026 — `deleteCompletedTasks` now calls `deleteTaskReferences(taskId)` for each completed task (line 398).

  **Root Cause 2 — Active bug:** Page deletion (`src/pages/api/v2/pages.ts`, lines 183-197) deletes orphaned tasks with a raw `DELETE FROM tasks WHERE id IN (...)` query. This bypasses:
  - `deleteTaskReferences(taskId)` — v2Task nodes on OTHER pages referencing the same task are NOT cleaned up (rare, but possible if a task is linked to multiple pages)
  - `createTombstone(taskId)` — no CalDAV tombstone is created for synced tasks
  - `task_sync_meta` cleanup

  **Root Cause 3 — Null taskId nodes:** Three v2Task nodes had `"taskId": null` — these were created by the editor with no valid task reference. These would never match the cleanup regex (which requires a numeric ID). Source unknown — likely from a race condition or editor bug when creating inline tasks.

- **Affected files:**
  - `src/pages/api/v2/pages.ts` (lines 183-197) — page deletion bypasses `deleteTaskReferences` and `createTombstone`
  - `src/lib/db.ts` (lines 209-251) — `deleteTaskReferences` function itself works correctly; regex tested and confirmed functional
  - `src/lib/db.ts` (lines 392-403) — `deleteCompletedTasks` now correct (post-June-2026 fix)

- **Hermes notes:**
  - The `deleteTaskReferences` regex (line 216): `"taskId"\s*:\s*(?:"|\s*)<id>(?:"|\s*)` — verified working against real JSON content for both `"taskId": 365` and `"taskId": 171` patterns
  - `page_items` cleanup works perfectly — zero orphaned `page_items` found in the audit
  - The June 2026 fix for `deleteCompletedTasks` calls `deleteTaskReferences(taskId)` correctly (line 398), so new bulk completions/deletions should be clean
  - **Fix for Root Cause 2 (page deletion):** Replace the raw `DELETE FROM tasks` in pages.ts:183-197 with calls to `deleteTask(taskId)` for each orphaned task ID. This ensures `createTombstone` + `deleteTaskReferences` + proper cleanup for every task.
  - **Fix for Root Cause 3 (null taskId):** Audit the inline task creation flow in the editor — specifically the `v2Task` node creation in `TaskExtension.tsx`. Ensure a `taskId` is always assigned before the node is persisted. Consider adding a migration or health check that strips v2Task nodes with null taskId.
  - **Prevention:** Consider adding a database-level health check (cron or migration) that compares v2Task nodes in `pages.content` against the `tasks` table and reports/strips orphans. This would catch any future leak paths.
  - The `deleteTaskReferences` function already handles null-taskId nodes implicitly — `node.attrs.taskId == taskId` would be `null == <number>` → false, so they survive. The regex also can't match them. A separate cleanup pass is needed.

- **Fixed in:** TBD

---

## Template for new bugs

```
## BUG-XXX: Short title
- **Status:** 🐛 Open
- **Severity:** High | Medium | Low
- **Reported:** YYYY-MM-DD (via Hermes)
- **Description:** What Dave observes — the user-facing symptom.
- **Steps to reproduce:** 1. Go to... 2. Click... 3. Observe...
- **Expected:** What should happen.
- **Actual:** What actually happens.
- **Affected files:** paths relative to repo root
- **Hermes notes:** Any investigation, DB queries, relevant code pointers, or context Hermes added.
- **Fixed in:** commit SHA or PR reference (filled by OpenCode when resolved)
```

---

**Guidelines for OpenCode (Daedalus):**
- When you start working on a bug, update its status to `🔧 In Progress`.
- When fixed, update status to `✅ Fixed`, add the commit/PR reference, and add an entry to DEVLOG.md.
- If you determine a bug is not reproducible, mark it `❓ Can't Reproduce` and explain why.
- If a bug is intentionally not being fixed, mark it `🙅 Won't Fix` with reasoning.
- Bugs may reference related ROADMAP items — check both files.
- Hermes adds bugs with investigation notes; you bring the code fixes.
