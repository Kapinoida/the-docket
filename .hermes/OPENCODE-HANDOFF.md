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

Turn Inbox from a passive list of uncategorized tasks into a focused processing queue where Dave can make a deliberate decision about each captured item.

This is the first vertical slice from `DOCKET-IMPROVEMENT-SYNOPSIS.md` and should remain independent of the later planning-model changes.

### User Problem

The Inbox currently stores tasks without page context, but it does not help decide what each captured thought means or what should happen next. A task can remain in Inbox indefinitely without being clarified, scheduled, moved, deferred, or deliberately discarded.

The existing Inbox is a good capture surface. The missing behavior is a low-friction decision flow.

### Confirmed Current Behavior

- `src/components/v2/InboxView.tsx` derives Inbox items by filtering the shared SyncContext task list:
  - no `page_name`
  - status is not `done`
  - content is not empty
- The current Inbox supports:
  - quick task creation
  - completion
  - inline content editing through `TaskItem`
  - date editing through `DatePickerPopover`
  - moving a task to a page through `MoveToPageModal`
  - deletion
- Inbox mutations now use `apiFetch()` and dispatch the standard task events.
- `TaskEditContext` already provides the shared edit modal and task create/update/delete behavior.
- `MoveToPageModal` still uses raw `fetch()` for page loading and has no centralized auth/error handling. If it is reused or expanded by processing mode, bring that fetch path into line with the existing API wrapper where appropriate.
- The task model currently has no `processed`, `waiting`, or `someday` field. Do not add one for this pass.

### Desired Behavior

Add a clearly discoverable **Process next** mode to Inbox.

Processing mode shows one Inbox item at a time with:

- the task content and relevant existing metadata
- visible progress, using neutral language such as `Needs a decision` and `3 of 12`
- actions for:
  - **Do** — confirm it is a real active task; no schema mutation is required
  - **Schedule** — reuse the existing date/time editing workflow
  - **Move** — reuse the existing move-to-page workflow
  - **Clarify** — reuse the existing task editor or inline editing workflow
  - **Delete** — delete the task
  - **Skip** — leave the task unchanged and advance to the next item
- a predictable completion state when the queue is exhausted
- an obvious way to exit processing mode without changing the current item

For the MVP, `Do` should leave the task active and advance. Do not invent a new processed flag merely to distinguish a confirmed task.

Add desktop keyboard shortcuts:

```text
J / ArrowDown  next item
K / ArrowUp    previous item
Enter          clarify/edit
D              schedule
M              move to page
X              delete
Escape         leave processing mode
```

Keyboard shortcuts must not fire while focus is inside an `input`, `textarea`, `select`, or content-editable element. Mobile must remain fully usable without a keyboard.

### Scope

- In scope:
  - Inbox processing-mode state and UI
  - One-item-at-a-time navigation
  - Progress/count display
  - Do, Schedule, Move, Clarify, Delete, and Skip actions
  - Keyboard navigation with editable-field guards
  - Reuse of existing task/date/page-edit flows
  - Error handling and mutation behavior for processing actions
  - Component tests for the new behavior
- Out of scope:
  - `waiting` status or waiting metadata
  - `someday` status or list
  - Next-action field
  - Project/page kinds or outcome fields
  - Review dates or deadline-versus-target-date distinction
  - Weekly review screen
  - AI classification or automatic task interpretation
  - Universal capture engine
  - New database migrations unless inspection proves one is unavoidable

### Likely Files

- `src/components/v2/InboxView.tsx`
- `src/components/v2/TaskItem.tsx`
- `src/components/v2/MoveToPageModal.tsx`
- `src/contexts/TaskEditContext.tsx`
- `src/contexts/SyncContext.tsx`
- `src/lib/api.ts`
- `src/types/index.ts`
- Relevant Inbox/component tests under `src/components/**/__tests__/`
- Relevant task API tests under `src/pages/api/v2/__tests__/`

Inspect actual current test locations before editing; do not assume a test file exists solely because the component exists.

### Data/API Changes

No database or API schema change is expected for this slice.

Use the existing routes and conventions:

- `PUT /api/v2/tasks/[id]` for task updates and completion
- `DELETE /api/v2/tasks/[id]` for deletion
- existing date-picker save path for scheduling
- existing `addToPageId` task update path for moving
- `TaskEditContext` for shared clarification/edit behavior

All new mutation calls must use `apiFetch()`, preserve `AuthError` behavior, show a user-visible error through the existing toast mechanism where appropriate, and avoid advancing past an item after a failed mutation.

Continue emitting the standard events:

- `taskUpdated`
- `taskDeleted`

Do not add a second processing-specific synchronization mechanism.

### Acceptance Criteria

- [ ] Inbox exposes a clear `Process next` entry point without making normal list mode harder to use.
- [ ] Processing mode presents exactly one current Inbox item at a time.
- [ ] Progress and remaining-item state are visible and use neutral wording.
- [ ] Do leaves the task active and advances without adding a new database field.
- [ ] Skip leaves the task unchanged and advances.
- [ ] Schedule opens or reuses the existing date/time workflow and advances only after a successful save.
- [ ] Move opens or reuses the existing page-selection workflow and advances only after a successful move.
- [ ] Clarify opens the existing edit workflow without duplicating task-edit logic.
- [ ] Delete uses the existing authenticated mutation path and advances only after success.
- [ ] Failed mutations show an error and keep the current item available for retry.
- [ ] J/K, arrow navigation, Enter, D, M, X, and Escape work outside editable controls.
- [ ] Keyboard shortcuts are ignored inside text inputs, textareas, selects, and content-editable elements.
- [ ] Mobile processing mode works through visible touch controls alone.
- [ ] Empty Inbox and exhausted processing queue have useful states and next actions.
- [ ] Existing normal Inbox behavior remains intact.
- [ ] No speculative waiting, someday, project, review, or AI behavior is introduced.

### Verification

- [ ] Add/update component tests for entering/exiting processing mode, current-item navigation, progress, Skip, Do, and empty/exhausted states.
- [ ] Test keyboard shortcuts and editable-element guards.
- [ ] Test successful and failed schedule/move/delete mutations, including no advancement on failure.
- [ ] Run `npm test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run the project lint command and record any pre-existing baseline issues separately from new issues.
- [ ] Run `npm run build`.
- [ ] Review `git diff` for accidental changes outside this slice.
- [ ] Update `DEVLOG.md` and `ROADMAP.md` if the slice is completed.
- [ ] Commit with a descriptive conventional commit before deployment.
- [ ] Deploy only after verification passes, using `bash update.sh`, then verify the production Inbox behavior if deployment is requested.

### Open Questions / Risks

- Decide whether processing state is local component state or encoded in the URL. Prefer local state for the MVP unless existing navigation/deep-link requirements make that insufficient.
- Reuse existing modal/date-picker flows rather than creating processing-specific copies. The main risk is coordinating modal close/save callbacks with queue advancement.
- Do not treat `page_name` as the complete context model in future work. The synopsis calls for all task contexts, but that is a separate planning-backbone slice.
- The current `TaskItem` has long-press actions and several local interaction states. Avoid changing those behaviors unless required for processing mode.
- Keep normal Inbox list mode available. Processing mode is an additional workflow, not a replacement until it has been validated.

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
