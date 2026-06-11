# Docket Roadmap

A living plan for the Docket app. Items are ordered by priority within each time horizon.  
Statuses: `🔴 Not Started` | `🟡 In Progress` | `🟢 Complete` | `⛔ Blocked`

---

## ✅ Recently Completed

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

---

## 🏗️ Immediate (Next 1–2 weeks)

### Architectural & Technical Debt
- [ ] **Unify type systems**  
  *Merge `src/types/index.ts` and `src/types/v2.ts` into a single canonical set, using snake_case DB types and camelCase public API types with explicit transformations.*  
  **Status:** 🔴 Not Started  
  **Context:** Current dual type systems cause manual conversion in TaskEditContext.

- [ ] **Consolidate API layers**  
  *Remove `src/lib/api.ts` legacy layer, migrate all routes to use `src/lib/db.ts` exclusively.*  
  **Status:** 🔴 Not Started  
  **Context:** Some routes still depend on legacy camelCase conversions; blocking progress.

- [ ] **Database migrations framework**  
  *Choose a lightweight migration tool (e.g., `graphile-migrate`, `node-pg-migrate`) and convert existing `src/migrations/` files.*  
  **Status:** 🔴 Not Started  
  **Context:** Manual SQL changes are error-prone; no version tracking.

- [ ] **JWT secret handling**  
  *Replace hardcoded default with environment variable and fail fast if missing in production.*  
  **Status:** 🔴 Not Started

### Calendar & Sync Improvements
- [ ] **CalDAV multi‑account support**  
  *Extend `caldav.ts` to handle multiple servers (currently only one set of credentials active).*  
  **Status:** 🔴 Not Started  
  **Context:** Marked as TODO in codebase; users need multiple calendar sources.

- [ ] **Recurrence engine edge cases**  
  *Audit `recurrence.ts` for exceptions, timezone handling, and missing rule parts (BYDAY, COUNT). Add tests.*  
  **Status:** 🔴 Not Started

- [ ] **Wire TaskEditModal to calendar task clicks**  
  *CalendarTaskCard and CalendarTaskBlock have onClick props, but CalendarView and WeeklyCalendar don't pass `openTaskEdit()` yet. Clicking a task in week/month/mobile views currently does nothing.*  
  **Status:** 🔴 Not Started  
  **Context:** Natural next step after calendar refactoring; both components already designed for it.

- [ ] **Real-time cross-view task sync**  
  *When a task is completed in CalendarTaskSidebar or CalendarView, TodayView and other views don't update until their next 30s poll. Use existing `taskUpdated`/`taskCreated` custom events from TaskEditContext + `useTaskSync` hook to propagate changes instantly across all open views.*  
  **Status:** 🔴 Not Started  
  **Context:** `useTaskSync` already exists and dispatches/listens for DOM events; just needs wiring into calendar views.

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