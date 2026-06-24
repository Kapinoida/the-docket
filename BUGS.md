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
- **Status:** 🐛 Open
- **Severity:** Medium
- **Reported:** 2026-06-22 (via Hermes, from ROADMAP)
- **Description:** CalendarView, TodayView, WeeklyCalendar, and useCalendarEvents each run their own 30-second polling `setInterval`. When multiple views are mounted (e.g., tab switching), this creates N concurrent pollers all hitting the same endpoints.
- **Steps to reproduce:** Open CalendarView, then navigate to TodayView, then WeeklyCalendar. Check network tab — multiple GET requests firing every 30s.
- **Expected:** One shared sync mechanism that all views subscribe to.
- **Actual:** Independent intervals in each component/hook, causing redundant network requests and battery drain on mobile.
- **Affected files:** `CalendarView.tsx`, `TodayView.tsx`, `WeeklyCalendar.tsx`, `useCalendarEvents.ts`
- **Hermes notes:** Consider a `useSyncPoller` hook or a React context with a single interval that components subscribe to. Also overlaps with BUG-001 — fixing the re-fetch loop first would make this less painful, but the architectural fix is still needed.
- **Related ROADMAP:** "Consolidate 30s polling intervals" (Immediate section)

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
