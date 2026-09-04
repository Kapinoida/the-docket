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

The Waiting and Someday task states are complete. Tasks can now be marked as `waiting` with metadata (waiting_on, waiting_since, follow_up_date) or `someday` to remove them from all active views.

The next vertical slice from `DOCKET-IMPROVEMENT-SYNOPSIS.md` could be one of:

1. **Decision records** — A `/decision` slash command that inserts a structured decision template with context, options, criteria, choice, reasoning, revisit date, and outcome. Useful decision actions: convert note section to decision, create tasks for unresolved criteria, link to project/page, show recent decisions during weekly review.

2. **Project/page type system** — Add `PageKind` type (area, project, reference, journal, template). Project pages show desired outcome, current state, next action, waiting items, review date, related notes and tasks.

3. **Effort and energy metadata** — Add optional `effort_minutes` field to tasks with presets (5m, 15m, 30m, 60m, 2h+). Enables capacity feedback: "You have 11 hours of tasks scheduled into 5 hours of available time."

4. **Full-text search improvements** — Index page content, journal entries, decisions, and projects. Add content-type filters, context filters, date filters. Show matching text snippets.

5. **Reschedule-count tracking** — Track how many times a task has been rescheduled. After repeated movement, offer helpful interventions: "This task keeps moving. What should happen? [Break it down] [Move to someday] [Mark waiting] [Delete] [Keep]"

### User Problem

The Docket now has strong capture (Inbox), planning (Today commitments), review (Weekly Review), and deferral (Waiting/Someday) surfaces. The missing pieces are:

- **Decision records**: Important decisions are buried in general notes. There's no structured way to capture options, criteria, choice, and rationale.
- **Project model**: Pages are flat. There's no distinction between ongoing areas, finite projects, and reference material.
- **Effort estimates**: Tasks have no size indicator. Capacity planning is impossible without knowing how long things take.
- **Search**: Current search covers titles and tags but not full content. Finding information across pages, journals, and decisions is difficult.
- **Reschedule detection**: Tasks that keep getting moved give useful signal but there's no tracking or intervention.

### Confirmed Current Behavior

- Dashboard shows action cards for overdue, inbox, undated, and today.
- Today view has Must/Should/Could commitment sections.
- Inbox has processing mode with keyboard shortcuts.
- Weekly Review has seven sections: loose ends, stale items, overdue decisions, waiting for, someday, calendar look-ahead, review closeout.
- Tasks have `next_action`, `commitment_level`, `due_date`, `end_time`, `recurrence_rule`, `waiting_on`, `waiting_since`, `follow_up_date`.
- Task statuses: `todo`, `in_progress`, `done`, `cancelled`, `waiting`, `someday`.
- No decision records, project/page type system, effort estimates, or reschedule tracking yet.

### Recommended Next Slice

**Decision records** is the highest-value next slice because:

1. It captures important decisions that are currently lost in general notes.
2. It provides a structured format for options, criteria, choice, and rationale.
3. It supports revisit dates to prevent endless re-litigation.
4. It integrates with the Weekly Review (show recent decisions).
5. It's a pure addition — no schema changes to existing tables, just a new page type or content block.

### Scope (Decision Records)

- In scope:
  - `/decision` slash command in editor
  - Decision template with context, options, criteria, choice, reasoning, revisit date, outcome
  - Decision storage (as a page type or structured content block)
  - Decision list view / recent decisions panel
  - Integration with Weekly Review (show recent decisions)
  - Convert note section to decision
  - Create tasks from unresolved criteria
- Out of scope:
  - Project/page type system
  - Effort estimates
  - Full-text search improvements
  - Reschedule-count tracking
  - AI classification

### Likely Files (Decision Records)

- `src/components/v2/editor/extensions/DecisionExtension.tsx` (new — TipTap extension)
- `src/components/v2/editor/DecisionBlock.tsx` (new — decision rendering component)
- `src/migrations/011_decisions.sql` (new — decisions table or page type)
- `src/lib/db.ts` (decision CRUD helpers)
- `src/pages/api/v2/decisions.ts` (new — API routes)
- `src/components/v2/WeeklyReview.tsx` (add recent decisions section)
- `src/components/v2/editor/extensions/SlashCommand.tsx` (add /decision command)

### Acceptance Criteria (Decision Records)

- [x] `/decision` slash command inserts a decision template.
- [x] Decision template has fields: context, options, criteria, choice, reasoning, revisit date, outcome.
- [x] Decisions are stored and retrievable.
- [x] Recent decisions panel shows last N decisions.
- [x] Weekly Review shows recent decisions section.
- [ ] Can convert a note section to a decision. *(Deferred to follow-up)*
- [ ] Can create tasks from unresolved criteria. *(Deferred to follow-up)*
- [x] Revisit date triggers a reminder (optional — could be in Weekly Review).

### Verification (Decision Records)

- [x] Add TipTap extension tests.
- [x] Add API tests for decision CRUD.
- [x] Add component tests for decision block rendering.
- [x] Run `npm test`.
- [x] Run `npx tsc --noEmit`.
- [ ] Run lint.
- [x] Update `DEVLOG.md` and `ROADMAP.md`.
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
