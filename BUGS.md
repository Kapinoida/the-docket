# Known Bugs

## BUG-017 — Focus timer fog overlay too bright

**Status:** ✅ Fixed  
**Reported:** 2026-09-21  
**Area:** `/focus`, `src/components/focus/FocusVisualizer.tsx`

### User-visible symptom

The fog overlay behind the Focus timer controls created a visible glow around the controls, particularly noticeable in the outer region.

### Investigation

Confirmed in the live source:

- `FocusVisualizer.tsx:1064-1089` renders a radial gradient fog overlay for certain visualization modes.
- The outer fade used 0.8 opacity at 20% radius, creating a harsh glow.
- The fog included a light-mode branch, but the app is dark-only.
- The controls semicircle itself (`TimerControls.tsx:41`) uses `bg-bg-secondary` which is correct and should remain solid.

### Implementation

Simplified and reduced the fog overlay opacity:
- Removed the light-mode branch (app is dark-only)
- Reduced outer fade from 0.8 to 0.5 opacity at 20% radius
- Center remains opaque (1.0) to obscure canvas behind controls
- Edge remains transparent (0)

The fog now provides subtle obscuring without creating a harsh glow.

### Acceptance criteria

- The fog overlay is subtle in the outer region.
- No harsh glow around the controls.
- Play/pause, skip, reset, progress ring geometry, element id, and canvas alignment remain unchanged.
- Added 3 focused component tests.
- Ran `npm test`, `npx tsc --noEmit`, and lint before deployment.

### Fixed file

- `src/components/focus/FocusVisualizer.tsx` (fog overlay opacity, removed light-mode branch)

### Related code

- `src/components/focus/TimerControls.tsx` — controls semicircle (unchanged, correctly uses solid `bg-bg-secondary`)
