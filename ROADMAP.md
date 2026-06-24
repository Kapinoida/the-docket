# Docket Roadmap

A living plan for the Docket app. Items are ordered by priority within each time horizon.  
Statuses: `🔴 Not Started` | `🟡 In Progress` | `🟢 Complete` | `⛔ Blocked`

---

## ✅ Recently Completed

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

- [ ] **Consolidate 30s polling intervals**  
  *CalendarView, TodayView, WeeklyCalendar, and useCalendarEvents all run separate 30s intervals. Should be one shared sync mechanism.*  
  **Status:** 🔴 Not Started  
  **Context:** Network saturation and battery drain on mobile when multiple views are mounted.

- [x] **Add error state UI for failed operations** 🟢
  *Created ToastProvider context + useToast() hook with showToast(message, type) API. Toasts auto-dismiss after 4s, render via portal, color-coded (success/error/info). Wired into all 7 CalendarView drag-drop/creation handlers. Reusable — other components can adopt trivially.*
  **Status:** 🟢 Complete  
  *Completed: 2026-06-24*

- [x] **Silent drag-drop failures in CalendarView** 🟢
  *All 7 drag-drop/creation .catch(console.error) handlers now show error toasts via useToast(). Covers handleDropTask, DayView onDrop (dragTask, external drop, dragEvent), onTouchEnd, and inline task creation.*
  **Status:** 🟢 Complete
  *Completed: 2026-06-24*

### Code Quality
- [ ] **Move constants out of component functions**  
  *`HOUR_HEIGHT`, `HOUR_START`, `HOUR_END` are recreated on every render in CalendarView. Should be module-level.*  
  **Status:** 🔴 Not Started

- [ ] **Remove console.log from production code**  
  *45+ `console.log` statements in production code (caldav sync, recurrence, contexts).*  
  **Status:** 🔴 Not Started

- [ ] **Replace `handleDeletePage` / `handleCreatePageSubmit` full page reloads**  
  *Sidebar uses `window.location.href` instead of Next.js router. Should use `useRouter().push()`.*  
  **Status:** 🔴 Not Started  
  **Context:** `src/components/v2/Sidebar.tsx` lines 141, 168.

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