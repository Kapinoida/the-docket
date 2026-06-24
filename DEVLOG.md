# Development Log (Devlog)

Keep entries concise, with dates, involved components, and a brief description.  
Use this format:
[YYYY-MM-DD] – Short Title
	•	What changed: …
	•	Why: …
	•	Affected areas: (routes, hooks, components, DB schema)
	•	Migration needed? Yes / No (and what steps)

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