# The Docket

A personal, self-hosted productivity application that seamlessly integrates free-form note-taking with structured task management. Designed for single-user use with a focus on simplicity and reliability.

## Project Overview

**The Docket** unifies brain-dumps and action items. It allows for inline task creation within notes while maintaining a structured task management system on the side.

### Key Features

*   **Folder Management:** Unlimited nested structure to organize your life.
*   **Rich Text Notes:** WYSIWYG editor for standard note-taking.
*   **Inline Tasks:** Create tasks directly inside notes using `- [ ]` syntax. The system automatically extracts and tracks them.
*   **Agenda View:** See your tasks organized by date.
*   **Focus Mode:** specialized view for getting things done.

## Technology Stack

*   **Framework:** Next.js 14+ (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **Database:** PostgreSQL
*   **deployment:** Docker (planned)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Configuration

Copy `.env.example` to `.env.local` and fill in the values. `.env.local` is git-ignored; `.env` (same folder) is used by `docker compose` for variable interpolation.

| Variable | Purpose |
|----------|---------|
| `DOCKET_PASSWORD` | Single-user login password |
| `JWT_SECRET` | Signs session JWTs. Required — the app refuses to boot without it |
| `DATABASE_URL` / `POSTGRES_*` | PostgreSQL connection |
| `WIDGET_TOKEN` | Read-only launcher widget endpoint (`/api/widget/today`) |
| `PUSH_TRIGGER_TOKEN` | Server-to-server credential for `/api/push/send` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push (VAPID) keys |

### Push reminder trigger

Timed task reminders are delivered by an external cron job that POSTs to
`/api/push/send`. That endpoint is not unauthenticated — it accepts the
`PUSH_TRIGGER_TOKEN` value in an `X-Push-Trigger-Token` header (or a normal
session cookie):

```bash
curl -X POST http://localhost:8088/api/push/send \
  -H "X-Push-Trigger-Token: $PUSH_TRIGGER_TOKEN"
```

The token is independent of `WIDGET_TOKEN` and the VAPID keys, so rotating one
never invalidates another.
