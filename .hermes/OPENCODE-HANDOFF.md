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

Replace this section for each focused implementation pass.

### Current Objective

The Weekly Review screen is complete. The landing page is now an action-oriented decision console, and the Weekly Review provides a structured ritual for reviewing loose ends, stale items, overdue decisions, and planning the week ahead.

The next vertical slice from `DOCKET-IMPROVEMENT-SYNOPSIS.md` could be one of:

1. **Waiting and Someday states** — Add `waiting` status with `waiting_on`, `waiting_since`, `follow_up_date` metadata. Add `someday` state that excludes tasks from active counts, Today, Overdue, calendar task banks, and Focus selection.

2. **Decision records** — A `/decision` slash command that inserts a structured decision template with context, options, criteria, choice, reasoning, revisit date, and outcome. Useful decision actions: convert note section to decision, create tasks for unresolved criteria, link to project/page, show recent decisions during weekly review.

3. **Project/page type system** — Add `PageKind` type (area, project, reference, journal, template). Project pages show desired outcome, current state, next action, waiting items, review date, related notes and tasks.

4. **Effort and energy metadata** — Add optional `effort_minutes` field to tasks with presets (5m, 15m, 30m, 60m, 2h+). Enables capacity feedback: "You have 11 hours of tasks scheduled into 5 hours of available time."

5. **Full-text search improvements** — Index page content, journal entries, decisions, and projects. Add content-type filters, context filters, date filters. Show matching text snippets.

### User Problem

The Docket now has strong capture (Inbox), planning (Today commitments), and review (Weekly Review) surfaces. The missing pieces are:

- **Waiting/Someday**: Tasks that are blocked or deferred have no formal state. They clutter active lists and confuse priority calculations.
- **Decision records**: Important decisions are buried in general notes. There's no structured way to capture options, criteria, choice, and rationale.
- **Project model**: Pages are flat. There's no distinction between ongoing areas, finite projects, and reference material.
- **Effort estimates**: Tasks have no size indicator. Capacity planning is impossible without knowing how long things take.
- **Search**: Current search covers titles and tags but not full content. Finding information across pages, journals, and decisions is difficult.

### Confirmed Current Behavior

- Dashboard shows action cards for overdue, inbox, undated, and today.
- Today view has Must/Should/Could commitment sections.
- Inbox has processing mode with keyboard shortcuts.
- Weekly Review has five sections: loose ends, stale items, overdue decisions, calendar look-ahead, review closeout.
- Tasks have `next_action`, `commitment_level`, `due_date`, `end_time`, `recurrence_rule`.
- No `waiting` status, `someday` state, `review_at` field, project/page type system, or effort estimates yet.

### Recommended Next Slice

**Waiting and Someday states** is the highest-value next slice because:

1. It unblocks the Weekly Review's "Waiting" and "Someday" actions for overdue items.
2. It cleans up active task lists by moving blocked/deferred items out.
3. It enables follow-up date tracking for waiting items.
4. It's a small schema change (add status values + optional metadata fields) with clear UI implications.
5. It aligns with the synopsis's recommendation to "separate deadlines, target dates, and review dates."

### Scope (Waiting/Someday)

- In scope:
  - Add `waiting` and `someday` to `TaskStatus` type
  - Add `waiting_on` (TEXT), `waiting_since` (TIMESTAMP), `follow_up_date` (TIMESTAMP) optional fields
  - Update task API routes to accept/return new fields
  - Update task editor UI with waiting metadata inputs
  - Exclude `someday` tasks from active counts, Today, Overdue, calendar task banks
  - Add "Waiting for" and "Someday" sections to Weekly Review
  - Update dashboard action cards to reflect new states
- Out of scope:
  - Project/page type system
  - Decision records
  - Effort estimates
  - Review dates
  - AI classification

### Likely Files (Waiting/Someday)

- `src/migrations/010_task_waiting_someday.sql` (new)
- `src/types/index.ts` (update `TaskStatus`, add fields to `Task`)
- `src/lib/db.ts` (update queries to handle new fields)
- `src/pages/api/v2/tasks.ts` and `[id].ts` (accept/return new fields)
- `src/components/TaskEditor.tsx` (add waiting metadata UI)
- `src/components/v2/WeeklyReview.tsx` (add Waiting/Someday sections)
- `src/lib/weeklyReview.ts` (add selectors for waiting/someday)
- `src/lib/dashboardPlanning.ts` (exclude someday from counts)

### Acceptance Criteria (Waiting/Someday)

- [ ] Tasks can be marked as `waiting` with optional `waiting_on`, `waiting_since`, `follow_up_date`.
- [ ] Tasks can be marked as `someday`.
- [ ] `someday` tasks are excluded from active task counts, Today, Overdue, and calendar task banks.
- [ ] `waiting` tasks appear in a "Waiting for" section in Weekly Review.
- [ ] `someday` tasks appear in a "Someday" section in Weekly Review.
- [ ] Task editor shows waiting metadata inputs when status is `waiting`.
- [ ] Dashboard action cards exclude `someday` tasks from counts.
- [ ] Migration is additive and safe on existing data.

### Verification (Waiting/Someday)

- [ ] Add migration tests.
- [ ] Add API tests for new fields.
- [ ] Add component tests for task editor waiting UI.
- [ ] Add component tests for Weekly Review waiting/someday sections.
- [ ] Run `npm test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run lint.
- [ ] Update `DEVLOG.md` and `ROADMAP.md`.
- [ ] Commit and deploy.

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
