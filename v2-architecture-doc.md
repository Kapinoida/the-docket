# The Docket: Context-Based Architecture (v2)

## Vision Statement

The Docket is a productivity application that bridges thinking and doing. Unlike traditional note-taking apps (file-centric) or task managers (project-centric), The Docket is **context-centric** — meaning and organization emerge from relationships, not manual categorization.

**Core principle:** Objects don't need tags because their placement in the graph IS their context.

---

## The Context Model

### What is Context?

Context is **implicit metadata derived from relationships**. When a task appears on a page, it gains that page's context automatically. Add it to another page, it gains additional context. No tagging required.

```
┌─────────────────┐         ┌─────────────────┐
│  Personal Tasks │         │Server Maintenance│
│     (page)      │         │     (page)       │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │      ┌───────────┐        │
         └─────►│  Task:    │◄───────┘
                │  "Backup  │
                │   photos" │
                └───────────┘
                      │
            Context automatically includes:
            - Personal Tasks
            - Server Maintenance
            - Any ancestor context of those pages
```

### Context vs Tags

|Aspect|Context (Computed)|Tags (Explicit)|
|---|---|---|
|Source|Derived from relationships|Manually assigned|
|Maintenance|Automatic — move item, context updates|Manual — must add/remove|
|Inheritance|Flows to children automatically|Flows to children automatically|
|Use case|Structural meaning ("where does this live?")|Categorical meaning ("what kind of thing is this?")|
|Examples|Project membership, area of responsibility|Priority, energy level, status|

**Tags are additive.** They supplement context when computed relationships aren't enough. Anything created within a context inherits its tags.

---

## Core Objects

### Page

The primary container. Can hold content, tasks, and subpages.

```
Page {
  id: uuid
  title: string
  content: rich_text (block-based, not markdown)
  created_at: timestamp
  updated_at: timestamp
}
```

- Pages exist independently
- Pages gain context by being placed on other pages
- Pages can have multiple parents (graph, not tree)
- Deleting a page prompts for orphaned items

### Task

An actionable item. First-class object, not embedded in page content.

```
Task {
  id: uuid
  content: string
  status: enum (todo, in_progress, done, cancelled)
  due_date: timestamp (nullable)
  created_at: timestamp
  updated_at: timestamp
}
```

- Tasks exist independently (can live in inbox with no context)
- Tasks gain context by being placed on pages
- Tasks can appear on multiple pages
- No origin/reference distinction — just membership

### Subpage

A page that is placed on another page. Structurally identical to Page, but the relationship defines it as a "child" in context.

(Subpages are just Pages with a placement relationship. No separate object type needed.)

---

## Relationships

### PageItems (The Context Graph)

```
PageItems {
  id: uuid
  page_id: uuid (the parent page)
  item_id: uuid (the thing being placed)
  item_type: enum (task, page)
  position: integer (ordering within the page)
  display_mode: enum (reference, embed) — for pages only
  created_at: timestamp
}
```

**Key behaviors:**

- A task on Page A gains Page A's context
- A task on Page A and Page B gains both contexts
- A subpage on Page A inherits Page A's context (and ancestors)
- A subpage on multiple pages has multiple parent contexts
- `display_mode: embed` shows subpage content inline (transclusion)
- `display_mode: reference` shows a link only

### Context Computation

To get an item's full context:

```
function getContext(item_id):
  direct_pages = all pages where item appears
  ancestor_pages = for each direct_page, traverse up to all ancestors
  tags = union of all explicit tags on direct_pages and ancestors
  return { pages: direct_pages ∪ ancestor_pages, tags: tags }
```

This is computed at query time, not stored.

---

## Deletion Logic

When a page is deleted:

```
for each item on page:
  other_contexts = getContext(item) excluding this page
  
  if other_contexts is empty:
    prompt user: "This item has no other context. Delete or relocate?"
    options: [Delete] [Move to Inbox] [Move to specific page]
  else:
    item survives (still has context elsewhere)

then delete page
```

No orphans unless user explicitly allows it.

---

## Views (Queries Against Context)

Views are saved queries, not separate organizational structures.

|View|Query|
|---|---|
|**Inbox**|All tasks where context is empty|
|**Today**|All tasks where due_date = today|
|**Page view**|All items where context includes this page|
|**Kanban**|All tasks with context X, grouped by status|
|**Cross-context**|All items where context includes A AND B|
|**Tag filter**|All items where tags include X|

### Example: Kanban Board

```
Query: tasks where context includes "Home Renovation"
Group by: status
Display: cards with title, due date, context breadcrumbs

┌─────────────┬─────────────┬─────────────┐
│    Todo     │ In Progress │    Done     │
├─────────────┼─────────────┼─────────────┤
│ Get quotes  │ Demo kitchen│ Pick colors │
│ ───────     │ ───────     │ ───────     │
│ Kitchen     │ Kitchen     │ Kitchen     │
│ Remodel     │ Remodel     │ Remodel     │
├─────────────┼─────────────┼─────────────┤
│ Research    │             │             │
│ flooring    │             │             │
│ ───────     │             │             │
│ Living Room │             │             │
└─────────────┴─────────────┴─────────────┘
```

---

## Navigation Structure

**No folders.** Flat list with powerful filtering.

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar                                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📥 Inbox (items with no context)                        │
│ 📅 Today                                                │
│ ⭐ Favorites                                            │
│                                                         │
│ ─────────────────────────────                           │
│                                                         │
│ 🔍 Search...                                            │
│                                                         │
│ Recent:                                                 │
│   • The Docket Architecture                             │
│   • Server Maintenance                                  │
│   • Home Renovation                                     │
│                                                         │
│ ─────────────────────────────                           │
│                                                         │
│ All Pages                                               │
│   [filterable, searchable, sortable]                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**The "folder" experience comes from clicking a page** — you see everything with that context, which _feels_ like opening a folder but is actually a query.

---

## Shared Concepts (Transclusion)

A subpage can appear on multiple pages. With `display_mode: embed`, its content renders inline.

```
┌─────────────────────────────────────────┐
│ Page: API Documentation                 │
├─────────────────────────────────────────┤
│                                         │
│ ## Authentication                       │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📄 Embedded: "Context Definition"   │ │
│ │                                     │ │
│ │ Context is implicit metadata        │ │
│ │ derived from relationships...       │ │
│ │                                     │ │
│ │ [Edit] [Open in new page]           │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ The API uses context to filter...       │
│                                         │
└─────────────────────────────────────────┘
```

"Context Definition" also lives on the Glossary page. Edit once, updates everywhere.

---

## Inline Conversion UX

Any block of text can become a task or subpage.

### Methods

|Method|How|Power Level|
|---|---|---|
|**Slash commands**|`/task Buy hardware`|Medium|
|**Keyboard shortcut**|Select text → `Cmd+Shift+T`|High|
|**Block menu**|Click handle → "Convert to..."|Low|
|**Syntax shortcut**|`[] Buy hardware` auto-converts|High|

### Conversion Behavior

When text becomes a task:

1. Text content moves to task.content
2. Task is placed on current page (gains context)
3. Task appears inline where text was (can be moved)
4. Original text block is replaced with task reference

When text becomes a subpage:

1. Text content becomes subpage title (or first content)
2. Subpage is placed on current page
3. Reference/embed appears where text was
4. User can expand and add more content

---

## Open Questions

### Resolved

|Question|Decision|
|---|---|
|Can tasks exist without context?|Yes — they live in Inbox until placed|
|Is there an origin page?|No — just membership, no hierarchy|
|Can pages have multiple parents?|Yes — true graph|
|How do tags interact?|Additive, inherited through context|

### Still Open

|Question|Options to Consider|
|---|---|
|**Block-level context?**|Can a specific paragraph have different context than its page? Or is page-level enough?|
|**Context visibility**|How prominently do we show an item's context? Breadcrumbs? Subtle? On hover?|
|**Circular references**|Page A contains Page B contains Page A — allow? Prevent? Handle gracefully?|
|**Archive vs Delete**|Should we have soft-delete/archive? How does that interact with context?|
|**Version history**|Track changes to pages? Tasks? How granular?|
|**Search scope**|Search across all content, or within current context? Both?|
|**Keyboard-first nav**|How do you navigate the graph with keyboard only?|
|**Mobile UX**|Context model on small screens — how to surface relationships?|

---

## Technology Decisions

### Moving Away From

|Previous|Reason|
|---|---|
|Markdown as source|Hard to implement rich interactions, task extraction edge cases|
|Self-hosted only|Limits adoption, harder to monetize|
|Tags as primary organization|Context model is more powerful and automatic|

### Moving Toward

|New Direction|Rationale|
|---|---|
|Block-based rich text editor|Better UX, cleaner data model, easier inline conversion|
|Markdown as import/export|Portability without the implementation burden|
|Hosted option available|Reduces friction, enables SaaS model|
|Context as primary organization|Relationships carry meaning, less manual work|

### Tech Stack (Tentative)

|Layer|Technology|Notes|
|---|---|---|
|Frontend|React + TypeScript|Familiar, ecosystem|
|Editor|TipTap or Plate|Block-based, extensible|
|Backend|Next.js API routes or separate service|TBD based on hosting model|
|Database|PostgreSQL|Graph queries, JSON support|
|Hosting|Vercel (hosted) + Docker (self-hosted)|Both options|

---

## Implementation Sequence

### Phase 1: Core Foundation

1. **Data model** — Pages, Tasks, PageItems with context computation
2. **Basic CRUD** — Create/read/update/delete pages and tasks
3. **Context display** — Show what context an item has
4. **Placement** — Add task to page, add page to page
5. **Inbox** — View for uncontextualized items

**Exit criteria:** Can create pages, create tasks, place tasks on pages, see computed context.

### Phase 2: Editor & Conversion

1. **Block editor** — Rich text editing for page content
2. **Inline task creation** — Text → Task conversion
3. **Subpage creation** — Text → Page conversion
4. **Transclusion** — Embed subpage content inline

**Exit criteria:** Can write in a page and convert content to tasks/subpages fluidly.

### Phase 3: Views & Navigation

1. **Today view** — Tasks due today
2. **Page view** — Everything with this context
3. **Kanban view** — Tasks grouped by status within context
4. **Search** — Full-text across pages and tasks
5. **Sidebar navigation** — Recent, favorites, all pages

**Exit criteria:** Can navigate and view content in multiple useful ways.

### Phase 4: Polish & Features

1. **Tags** — Explicit tags, inheritance
2. **Due dates** — Natural language parsing
3. **Recurring tasks** — If implemented
4. **Deletion logic** — Orphan handling
5. **Import/export** — Markdown, maybe others

**Exit criteria:** Feature-complete for personal use.

### Phase 5: Distribution

1. **Docker packaging** — Self-hosted option
2. **Hosted version** — Multi-tenant if pursuing SaaS
3. **Documentation** — User guide, API docs
4. **Launch** — r/selfhosted, Hacker News, Product Hunt

---

## Positioning

### What The Docket Is

- A bridge between thinking and doing
- A place where notes naturally become tasks
- Context-centric: relationships carry meaning
- Flexible: self-hosted or cloud, your choice

### What The Docket Is Not

- A team collaboration tool
- A second brain / PKM system
- A project management suite
- A replacement for Notion (different philosophy)

### Tagline Candidates

- "Where context connects everything"
- "From thought to action — context included"
- "Your work, in context"
- "The bridge between thinking and doing"

---

## Next Steps

1. **Validate the data model** — Build schema, test context queries
2. **Prototype the editor** — TipTap or Plate spike
3. **Build Inbox + one page view** — Minimum to test the feel
4. **Iterate based on usage** — Does the context model feel right?

---

_Document version: 2.0_  
_Architecture: Context-based (v2)_  
_Last updated: January 2025_