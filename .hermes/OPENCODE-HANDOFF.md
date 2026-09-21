# Hermes ↔ OpenCode Handoff

## Current Objective

Fix the Focus timer's background semicircle so it is subtle and translucent rather than reading as bright white, without disturbing the timer controls, progress ring, or visualizer alignment.

## Confirmed Bug: BUG-017

`src/components/focus/TimerControls.tsx:41` renders `#timer-controls-semicircle` with the opaque `bg-bg-secondary` class. The theme token is `#f9fafb` in light mode and `#161b22` in dark mode (`src/app/globals.css:13-37`). In light mode, this creates the reported near-white semicircle.

`FocusVisualizer.tsx` measures the element's bounding box by DOM id, so preserve its id, dimensions, position, and z-index. The visualizer also has a separate mode-specific light fog overlay at lines 1064-1089, but that is out of scope unless manual verification shows it is the source of the reported appearance.

## Implementation Scope

1. Read `AGENTS.md`, `ROADMAP.md`, `BUGS.md`, `DEVLOG.md`, and this handoff.
2. Update only the semicircle surface treatment in `src/components/focus/TimerControls.tsx`.
3. Use a genuinely translucent theme-aware treatment. Do not use an unverified Tailwind opacity modifier on the custom `bg-bg-secondary` token. Preserve geometry and DOM id.
4. Add/update a focused component assertion if practical.
5. Run tests, typecheck, lint, and build as appropriate.
6. Update `BUGS.md` to mark BUG-017 fixed, and add concise entries to `DEVLOG.md` and `ROADMAP.md`.
7. Commit with a descriptive conventional commit. Deploy with `bash update.sh` only after verification passes.

## Acceptance Criteria

- Semicircle is visibly subtle/translucent in dark and light themes.
- No near-white slab in the Focus UI.
- Play/pause, skip, reset, progress ring geometry, element id, and canvas alignment remain unchanged.
- Verification is reported with actual command output.

## Out of Scope

Do not bundle changes to the progress SVG paths, canvas arc, or the `FocusVisualizer` fog gradient in this pass. The light-mode fog may warrant a separate bug if it remains visibly too white in affected visualization modes.

## Verification

Not yet run. OpenCode owns implementation, tests, docs, commit, and deployment.

## Queued Next Slices

Existing radio/calendar work remains as previously documented below this handoff.

### Prior Context

The radio mini-player and dedicated `/radio` page slices are complete. See git history and `DEVLOG.md` for details.

### Operating Rhythm

Hermes investigates and writes focused handoffs. OpenCode implements, verifies, documents, commits, and deploys.

> Read `AGENTS.md`, `ROADMAP.md`, `BUGS.md`, `DEVLOG.md`, and this handoff. Implement only the current handoff as a complete vertical slice. Inspect the existing code first, add tests, run verification, update docs, commit, and deploy only if verification passes.
``` 

## Previous handoff context

The prior radio handoff is retained in git history. 
``` 

## End

Do not treat this as a request to modify application code from Hermes. Dave's established workflow is Hermes investigates and files; OpenCode writes the code.
