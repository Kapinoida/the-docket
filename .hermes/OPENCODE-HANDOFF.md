# Hermes ↔ OpenCode Handoff

## Current Objective

**Security and technical debt sprint (complete).** BUG-019, BUG-020, and BUG-021 are fixed.

**Next priorities:**
1. **ROADMAP**: Integration tests for critical flows (task CRUD → sync, calendar drag & drop, folder export ZIP integrity).
2. **Recreate Calibre-Web/KOReader ebook sync** (code lost during BUG-019 history rewrite, tracked in ROADMAP).

## Files to read first

1. `AGENTS.md` — identity, conventions, deployment
2. `BUGS.md` — all bugs fixed (BUG-019, BUG-020, BUG-021)
3. `ROADMAP.md` — Immediate section for next priorities
4. `DEVLOG.md` — recent changes context
5. `.hermes/OPENCODE-HANDOFF.md` — this file (for operating rhythm)

### Operating Rhythm

Hermes investigates and writes focused handoffs. OpenCode implements, verifies, documents, commits, and deploys.

> Read `AGENTS.md`, `ROADMAP.md`, `BUGS.md`, `DEVLOG.md`, and this handoff. Implement only the current handoff as a complete vertical slice. Inspect the existing code first, add tests, run verification, update docs, commit, and deploy only if verification passes.
``` 

## Previous handoff context

The prior radio handoff is retained in git history. 
``` 

## End

Do not treat this as a request to modify application code from Hermes. Dave's established workflow is Hermes investigates and files; OpenCode writes the code.
