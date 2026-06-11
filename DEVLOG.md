# Development Log (Devlog)

Keep entries concise, with dates, involved components, and a brief description.  
Use this format:
[YYYY-MM-DD] – Short Title
	•	What changed: …
	•	Why: …
	•	Affected areas: (routes, hooks, components, DB schema)
	•	Migration needed? Yes / No (and what steps)

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