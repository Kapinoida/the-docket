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

The dashboard redesign is complete. The landing page is now an action-oriented decision console with four action cards (overdue, inbox, undated, today) and a Today's commitments section.

The next vertical slice from `DOCKET-IMPROVEMENT-SYNOPSIS.md` is the **Weekly Review** screen — a recurring decision ritual that surfaces stale, overdue, waiting, undated, and unprocessed items and forces decisions.

### User Problem

The Docket currently has no structured review process. Tasks can sit stale for weeks without being noticed. Overdue items accumulate without prompting a decision. Projects go unreviewed. The weekly review would bring together the existing pieces (Inbox, Today, All Tasks, Calendar) into a single decision ritual.

### Confirmed Current Behavior

- Dashboard now shows action cards for overdue, inbox, undated, and today.
- Today view has Must/Should/Could commitment sections.
- Inbox has processing mode with keyboard shortcuts.
- Tasks have `next_action`, `commitment_level`, `due_date`, `end_time`, `recurrence_rule`.
- No `waiting` status, `someday` state, `review_at` field, or project/page type system yet.

### Desired Behavior

A Weekly Review screen that surfaces:

- **Loose ends**: Inbox items, undated active tasks, tasks without page context, tasks without next_action.
- **Stale items**: Active tasks untouched for 14+ days, projects with no updates, tasks repeatedly rescheduled.
- **Overdue items**: For each overdue item, prompt: "Still matters / Move date / Waiting / Someday / Delete".
- **Projects**: Show project name, last updated, next action, blocked state.
- **Calendar look-ahead**: Next 7–14 days of events, commitments, and deadlines.
- **Review closeout**: "What are the three outcomes that matter most this week?"

### Scope

- In scope:
  - Weekly review screen component
  - Stale-item detection (14+ day threshold)
  - Overdue decision prompts
  - Calendar look-ahead
  - Review closeout journal entry
- Out of scope:
  - `waiting` status or waiting metadata
  - `someday` status or list
  - Project/page type system
  - Reschedule-count tracking
  - AI classification

### Likely Files

- `src/components/v2/WeeklyReview.tsx` (new)
- `src/lib/weeklyReview.ts` (new — pure selectors)
- `src/app/review/page.tsx` (new route)
- `src/components/v2/Sidebar.tsx` (navigation link)
- `src/components/v2/BottomTabBar.tsx` (mobile tab)
- `src/lib/db.ts` (stale-item queries if needed)

### Acceptance Criteria

- [ ] Weekly review screen is accessible from sidebar and bottom tab bar.
- [ ] Loose ends section shows inbox count, undated count, tasks without context.
- [ ] Stale items section shows tasks untouched for 14+ days.
- [ ] Overdue section shows each overdue task with decision prompts.
- [ ] Calendar look-ahead shows next 7–14 days.
- [ ] Review closeout saves a journal entry.
- [ ] Mobile and desktop layouts work.

### Verification

- [ ] Add component tests for weekly review sections.
- [ ] Add pure-function tests for stale-item detection.
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
