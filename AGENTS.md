# Agent Instructions

## Identity
Name: Daedalus — after the master craftsman of Greek mythology, the architect, inventor, and artificer who built the labyrinth. Approaches problems with precision, ingenuity, and thoroughness. Does not second-guess what it is told it can do; it just does the work.

## Project: The Docket
A Next.js task/calendar management app with PostgreSQL.

## Deployment
You are running on the host machine with OrbStack (Docker). Run `bash update.sh` directly to deploy — do not claim you cannot do this. The script runs tests, pulls code, rebuilds containers, runs migrations, and cleans up. If Docker isn't found in PATH, try `export PATH="/usr/local/bin:$PATH"` first.

## Hermes ↔ OpenCode Collaboration

Read `.hermes/OPENCODE-HANDOFF.md` for the collaboration workflow. Hermes investigates the live project and writes focused findings to markdown; OpenCode implements, verifies, documents, commits, and deploys the agreed code changes. Use `DOCKET-IMPROVEMENT-SYNOPSIS.md` as the product direction, not as one giant implementation prompt.

## Key Conventions
- Always run lint/typecheck after making changes
- Test suite: `npm test`
- Type check: `npx tsc --noEmit`
- When editing components, check for stale state variables (e.g., `useState` booleans that are never updated) that can cause perpetual loading states or UI bugs
- Pure calculation functions (no DB/external dependencies) go in separate files for testability: e.g., `recurrenceCalc.ts` extracted from `recurrence.ts`
- Cross-view sync uses custom DOM events: `taskCreated`, `taskUpdated`, `taskDeleted` — dispatch with `new CustomEvent('taskCreated', { detail: { source: '...' } })`
- Calendar event colors use `eventColorStyle()` from `src/lib/calendar.ts` — never use `opacity-*` Tailwind classes on colored event blocks
- Recurrence: `RecurrenceRule` type has `type`, `interval`, `daysOfWeek?`, `weekOfMonth?` — no `day`, `date`, `month` fields (removed as unused)
- RRULE sync: `rruleToRecurrenceRule()` and `recurrenceRuleToRrule()` in `recurrenceCalc.ts` handle CalDAV RRULE ↔ Docket conversion
- Always update DEVLOG.md and ROADMAP.md when completing non-trivial changes
- Bug fixes: check BUGS.md for reported issues. When you fix one, update its status to `✅ Fixed` and add the commit/PR reference. Hermes adds bugs with investigation notes — you bring the code fixes.
- After finalizing work (tests pass, lint/typecheck clean, BUGS.md/DEVLOG.md/ROADMAP.md updated), commit your changes with a descriptive message before deploying. The deploy script (`update.sh`) runs `git pull` — uncommitted changes won't be in the build.

## Database Migrations
- **Create**: `npm run migrate:create migration_name` — generates a timestamped SQL file in `src/migrations/`
- **Run (local dev)**: `npm run migrate` — uses `node-pg-migrate` CLI with `DATABASE_URL` from `.env.local`
- **Run (production/deploy)**: `bash update.sh` runs `node scripts/run-migrations.js` inside the Docker container
- **Dual runner**: `node-pg-migrate` (devDependency) for dev/CI; `scripts/run-migrations.js` (uses only `pg`, which is in the standalone build) for production. Both share the `pgmigrations` tracking table and the SQL comment format (`-- Up migration` / `-- Down migration`).
- **Migration files**: Use SQL only. Each gets a sequential prefix (e.g., `001_baseline.sql`). node-pg-migrate uses timestamps (e.g., `1782132281837_test-migration.sql`); both naming styles work.
- **If migrating from scratch**: `001_baseline.sql` has all tables with `CREATE TABLE IF NOT EXISTS` — safe on any state.
- **Data migrations**: Use `DO $$ ... $$` blocks with `IF EXISTS` guards for idempotency.

## Architecture
- `src/lib/recurrenceCalc.ts` — Pure calculation functions (testable without DB)
- `src/lib/recurrence.ts` — `spawnNextRecurrence()` (DB-dependent, imports from recurrenceCalc)
- `src/lib/caldav.ts` — CalDAV sync (tasks + events), includes RRULE conversion
- `src/lib/calendar.ts` — Shared calendar utilities, color system, event rendering
- `src/lib/db.ts` — All data access functions, used by API routes
- `src/lib/pushTrigger.ts` — Pure helpers for the server-to-server push trigger credential
- `src/types/index.ts` — Canonical type definitions (snake_case matching DB)

## Push Notifications

- `POST /api/push/send` — sends reminders for tasks due in the next 10 minutes. It is **never** unauthenticated. Two credentials are accepted:
  - `PUSH_TRIGGER_TOKEN` sent as the `X-Push-Trigger-Token` header — for the external Hermes cron job (`~/.hermes/scripts/docket_push.sh`). The middleware lets the request through only when the header validates.
  - A normal session cookie — for in-app use.
- `POST /api/push/test-notification` — session-authenticated test push to the caller's own device (Settings → "Send test notification").
- Accounting rule: a row is written to `push_notifications` **only** when at least one subscription delivery succeeded. Failed tasks stay eligible for a later retry. Subscriptions that return HTTP 404/410 are deleted.
- Never log push endpoints, `p256dh`, or `auth` values — report failure counts only.
- `PUSH_TRIGGER_TOKEN` is separate from `WIDGET_TOKEN` and the VAPID keys on purpose. Do not rotate any of them without an explicit request.

## Retired Surfaces (2026-10-19)

**Radio Product Surface** — Removed
- `/radio` page and components deleted
- AzuraCast integration (azuracast.ts, radioStations.ts, useNowPlaying hook) deleted
- Radio station/channel UI removed from sound player
- **Retained**: Procedural ambience system (brown-noise, rain, snow, orbit) and pentatonic music generator

**Recordings Product Surface** — Removed
- `/recordings` page and dashboard components deleted
- Recordings API endpoints (index, [id], conflicts) deleted
- Recording types and data access functions removed from src/types/index.ts and src/lib/db.ts
- Recording Schedule Module documentation (Dashboard, API Endpoints, Components, Types, Data Access sections) no longer applies

**What Remains**
- `recording_schedules` database table retained (migrations 007, 011) — used by Sportarr sync pipeline
- Sportarr integration and sports scheduler cron jobs continue to run
- Sound player with ambience and music controls (no radio/streaming)