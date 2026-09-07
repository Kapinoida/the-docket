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

### Current Objective

Dave queued a batch of improvements from the **Docket Improvements page** (2026-09-07). The full queue lives in `ROADMAP.md`; the one confirmed bug is `BUG-016` in `BUGS.md`. This handoff covers the first coherent vertical slice: **Weekly Review polish** (BUG-016 + two adjacent gaps Dave flagged). Everything else is queued under "Queued Next Slices" — pick those up as separate passes.

### Weekly Review slice (this pass)

1. **BUG-016 — "Next 14 days" has no dates, no sort, no labels.** See BUGS.md for root cause. Merge `summary.lookaheadEvents` + `summary.lookaheadTasks` into one chronological list, group/label by day (Today / Tomorrow / weekday dates), and show each item's date/time.
2. **Loose ends are not actionable.** Loose ends render as muted text previews (`WeeklyReview.tsx:201-255`) with no per-item actions. Give each loose end the same action pattern as Overdue items (`OverdueReviewItem`): open editor, schedule (date picker), mark waiting, move to a page, delete. The "No page context" bucket especially needs a "Move to page" action.
3. **Stale items can't be processed or scheduled out.** Stale items (`WeeklyReview.tsx:257-295`) only open the task editor on click. Add inline actions: schedule (the reschedule `DatePickerPopover` at `WeeklyReview.tsx:490-502` already exists), mark waiting, keep active, delete.

### User Problem

The Weekly Review is Dave's decision ritual, but its two most common sections are passive. Loose ends and Stale items surface problems without letting him resolve them from the screen, and the 14-day look-ahead is an unsorted, undated blob that doesn't communicate what's actually coming up.

### Confirmed Current Behavior

- Weekly Review at `/review`: Loose ends, Stale items, Overdue decisions, Waiting for, Someday, Next 14 days, Review closeout.
- Overdue items have Keep Active / Reschedule / Clarify / Delete actions (`OverdueReviewItem`).
- Loose ends: text previews only, max 3 items per bucket, single "Process inbox →" link.
- Stale items: click opens the task edit modal; no inline actions.
- Next 14 days: events first, then tasks — no sort, no date labels, no grouping.
- `src/lib/weeklyReview.ts` `getLookaheadEvents`/`getLookaheadTasks` filter by range but do not sort.

### Scope (Weekly Review polish)

- **In scope:**
  - BUG-016: chronological merge + date labels/grouping for Next 14 days
  - Loose ends per-item actions (edit, schedule, waiting, move-to-page, delete)
  - Stale items per-item actions (schedule, waiting, keep active, delete)
  - Tests for any new pure functions and action handlers
- **Out of scope (queued in ROADMAP.md, separate passes):**
  - Dashboard overhaul round 2 / remove Recent Notes
  - Calendar styling + function improvements, holidays, workday-aware recurrence
  - Recording page styling + Sportarr integration
  - Data-update UX
  - Security audit

### Likely Files (Weekly Review polish)

- `src/components/v2/WeeklyReview.tsx` (all three areas)
- `src/lib/weeklyReview.ts` (lookahead merge/sort/group helpers)
- `src/components/v2/OverdueReviewItem.tsx` (reference pattern for per-item actions)
- Tests: `src/lib/__tests__/weeklyReview.test.ts`, `src/components/v2/__tests__/WeeklyReview.test.tsx`

### Acceptance Criteria (Weekly Review polish)

- [ ] Next 14 days shows one chronologically merged list, grouped/labeled by date, each item showing date/time
- [ ] Loose end items have per-item actions; "No page context" items can be moved to a page
- [ ] Stale items have inline actions: schedule, mark waiting, keep active, delete
- [ ] All existing tests pass; new tests for the sort/group helpers and action handlers
- [ ] DEVLOG.md + ROADMAP.md updated

### Verification (Weekly Review polish)

- [ ] Add unit tests for the lookahead merge/group function
- [ ] Add component tests for the new action buttons
- [ ] Run `npm test`
- [ ] Run `npx tsc --noEmit`
- [ ] Run lint
- [ ] Update `DEVLOG.md` and `ROADMAP.md`
- [ ] Commit and deploy

### Queued Next Slices (Docket Improvements page, 2026-09-07)

1. **Dashboard overhaul round 2** — more tools at hand, styling, functions, accessibility; **remove Recent Notes** (quick win, separate card).
2. **Calendar improvements** — "bigger and better" styling + functions; overlaps existing "Rich calendar drag & resize" (🟡 Partial).
3. **Holidays in calendar** + **workday/holiday-aware recurrence** — recurring tasks skip or move off conflicting days automatically.
4. **Data-update UX** — nicer data updates in menus and dashboards (optimistic updates / loading states).
5. **Recording page** — styling/feel pass, and pull recordings from **Sportarr** (the new recording engine).
6. **Security audit** — verify every endpoint requires auth; add rate limiting / DDoS protection. (App icon redesign is already queued in ROADMAP.md near-term.)

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
