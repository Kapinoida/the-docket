# The Docket Improvement Synopsis

## Core Diagnosis

The Docket is currently stronger at storing and executing tasks than helping decide what deserves to become a task in the first place.

It already has a strong foundation:

- First-class tasks linked to pages
- Inline task creation inside notes
- Inbox, Today, All Tasks, Calendar, and Focus views
- Daily journal
- Natural-language date parsing
- Recurrence and time-blocking
- Context/page relationships
- Calendar integration
- Cross-view synchronization
- Mobile/PWA work
- Rich editor with slash commands, links, tags, drag handles, and embeds

The missing layer is decision support. The application should help answer:

- What am I trying to accomplish?
- Is this actually actionable?
- What is the next physical step?
- Why does this matter?
- What should I deliberately not do?
- What should be reviewed before it becomes urgent?

The central product opportunity is to turn The Docket from a task-and-notes application into a system that helps turn thinking into deliberate action.

---

## 1. Tasks Need More Planning Context

The current task model contains content, status, due date, end time, and recurrence. It does not explicitly represent:

- Desired outcome
- Project
- Next action
- Priority or importance
- Effort
- Energy required
- Waiting on someone
- Review date
- Deadline versus preferred date
- Why the task exists
- Whether it is still worth doing

A task such as “Work on website,” “Look into insurance,” or “Plan vacation” is not a useful next action. These are clouds of concern wearing task costumes.

### Recommendation: a lightweight task-quality funnel

Keep capture frictionless, then process tasks later:

```text
Raw thought:
"Need to deal with the basement"

Desired outcome:
"Basement is usable and organized"

Next physical action:
"Take photos of the basement clutter"

When does it matter?
Optional

Effort:
5 minutes / 30 minutes / 1–2 hours / substantial

Context:
Home / Project / Reference
```

The highest-value addition is an optional **Next action** field.

---

## 2. Turn Inbox into a Processing Queue

The current Inbox primarily stores tasks without page context. It should become a decision queue for captured thoughts that have not yet been interpreted.

Suggested quick actions:

- Do — confirm it is a real next action
- Schedule — assign a date or time
- Move — assign context/page
- Waiting — identify a dependency
- Someday — remove from active workload
- Convert to note — this is information, not an action
- Clarify — open the lightweight processing form
- Delete

Add a **Process next** mode that shows one Inbox item at a time.

Useful keyboard shortcuts:

```text
J/K       next/previous Inbox item
Enter     edit or clarify
D         schedule
M         move to page
S         someday
W         waiting
X         delete
```

Use language such as “Needs a decision” or “Captured, not sorted” rather than treating Inbox size as a shame metric.

---

## 3. Add Projects and Outcomes

The Docket needs a clearer distinction between:

```text
Area       = ongoing responsibility
Project    = finite outcome
Task       = next action
Note       = thinking or reference
```

Example:

```text
Area: Home
Project: Replace basement flooring
Outcome: Basement has finished, usable flooring

Tasks:
- Measure basement floor
- Photograph damaged sections
- Get quote from contractor
- Compare flooring options
```

Pages could gain a lightweight type:

```ts
type PageKind =
  | 'area'
  | 'project'
  | 'reference'
  | 'journal'
  | 'template';
```

Project pages should show:

- Desired outcome
- Current state
- Next action
- Waiting items
- Review date
- Related notes and tasks

A project page should answer:

1. What does “done” look like?
2. What is the next action?
3. What is blocked?
4. What needs review?
5. What information matters?
6. What decision comes next?

---

## 4. Make Today a Commitment View

Today currently functions mostly as a list of tasks and events due today. It should help answer:

> Given the day I actually have, what am I committing to?

Suggested structure:

```text
Today

Reality
08:00–09:00   Work meeting
12:00–13:00   Lunch
18:00–19:30   Oliver's soccer

Must happen
[ ] Submit payroll form
[ ] Call dentist

If there is room
[ ] Research flooring options
[ ] Clean up recording schedule

Overdue decisions
[ ] Decide whether to keep this task active
[ ] Reschedule basement project

Unscheduled tasks: 14
```

Use three commitment levels:

- Must
- Should
- Could

Add a **Plan my day** flow:

1. Show fixed calendar events.
2. Show overdue and due-today tasks.
3. Ask the user to select a realistic number of commitments.
4. Let the user drag commitments into open time blocks.
5. Put remaining items under “If there is room.”
6. Save a short daily intention in the journal.

---

## 5. Separate Deadlines, Target Dates, and Review Dates

A single `due_date` can mix genuine deadlines with preferred planning dates. Consider distinguishing:

```text
target_date = when I would like to work on this
deadline     = when this must be completed
review_at    = when I should reconsider or check this
```

Even before changing the database, the UI could distinguish:

- Due
- Plan for
- Deadline
- Review on

A `review_at` field would support projects, waiting items, ideas, and long-term reminders without polluting Today or Overdue.

---

## 6. Add Waiting and Someday States

The current statuses are:

```ts
todo | in_progress | done | cancelled
```

Add a `waiting` state with optional metadata:

```ts
waiting_on: string | null
waiting_since: timestamp | null
follow_up_date: timestamp | null
```

Example:

```text
Get estimate from contractor
Status: Waiting
Waiting on: Mike
Follow up: Friday
```

Also add a `someday` state or list. Someday tasks should be excluded from active counts, Today, Overdue, calendar task banks, and Focus selection, while remaining searchable and reviewable.

---

## 7. Add a Weekly Review

The Docket needs a recurring decision ritual that brings its existing pieces together.

### Weekly review sections

#### Loose ends

- Inbox items
- Undated active tasks
- Tasks without page context
- Tasks without a next action

#### Stale items

- Active tasks untouched for 14+ days
- Projects with no updates
- Tasks repeatedly rescheduled

#### Overdue items

For each overdue item:

```text
Why is this overdue?
[Still matters] [Move date] [Waiting] [Someday] [Delete]
```

#### Projects

Show project name, last updated, next action, blocked state, and next review date.

#### Calendar look-ahead

Show the next 7–14 days of events, commitments, and deadlines.

#### Review closeout

Ask:

```text
What are the three outcomes that matter most this week?
```

---

## 8. Add Decision Records

Important decisions should not be buried inside general notes.

A `/decision` slash command could insert:

```text
Decision: [What needs to be decided]

Context:
[Why this decision exists]

Options:
- Option A
- Option B
- Option C

Criteria:
[What matters most?]

Decision:
[What I chose]

Why:
[Reasoning]

Revisit on:
[Optional date]

Outcome:
[What happened]
```

Useful decision actions:

- Convert a note section into a decision
- Create tasks for unresolved criteria
- Link the decision to a project/page
- Mark it active, decided, or under reconsideration
- Show recent decisions during weekly review

The revisit date prevents decisions from being endlessly reopened.

---

## 9. Improve the Dashboard

The current dashboard displays mostly passive statistics:

- Total Notes
- Active Tasks
- Overdue
- Due Today
- Weekly Schedule
- Recent Notes

Replace or supplement these with action-oriented cards:

```text
Needs attention
7 overdue tasks

Needs processing
12 Inbox items

Needs planning
18 active tasks have no date

Needs review
4 projects untouched for 14 days

Today's capacity
3h 20m scheduled / 5h available
```

The dashboard should be a decision console rather than an observability dashboard.

Suggested hierarchy:

- Greeting and daily capacity summary
- Today's commitments
- Overdue decisions
- Calendar reality
- Inbox processing
- Active projects
- Waiting for
- Recently changed notes
- Weekly outcomes
- Optional statistics

---

## 10. Unify Capture

There are multiple capture inputs:

- Sidebar quick add
- Inbox quick add
- Today quick add
- All Tasks quick add
- Editor task creation
- Daily journal
- Calendar task creation

These should ultimately use one shared capture engine. A universal command such as `Cmd/Ctrl + Space` could accept:

```text
Write a thought, task, note, decision, or event...
```

Examples:

```text
Call dentist tomorrow
```
Creates a task with a date.

```text
Idea: use the garage wall for tool storage
```
Creates a note or Inbox thought.

```text
Decision: should I keep the old NAS?
```
Opens a decision template.

```text
Journal: today was frustrating because...
```
Adds to the daily journal.

All capture surfaces should provide the same parsing and confirmation behavior.

---

## 11. Show Natural-Language Parsing Feedback

The parser already supports relative dates, weekdays, and phrases such as `today`, `tomorrow`, `next friday`, `in 3 days`, and `end of week`.

The missing piece is visible confirmation:

```text
Call dentist due friday at 3pm
                           ↓
📅 Friday, August 28 at 3:00 PM
```

Allow the user to:

- Click the parsed chip to edit it
- Remove the interpreted date
- Choose deadline versus target date
- Reject ambiguous interpretations

Keep the user’s natural wording intact, and store scheduling metadata separately instead of silently rewriting task text.

---

## 12. Preserve All Task Context

The context-centric architecture allows tasks to appear on multiple pages, but the current task query derives only one `page_name` using `LIMIT 1`.

That means the database can contain richer context than the interface reveals.

Return all associations:

```ts
contexts: Array<{
  id: number;
  title: string;
  type: 'page' | 'folder' | 'project';
}>;
```

Render compact context such as:

```text
Backup photos
Personal · Server Maintenance
```

The task editor should show:

```text
Appears in:
[x] Personal
[x] Server Maintenance
[+ Add context]
```

This is more valuable than adding more tags.

---

## 13. Improve Search

Current search appears to cover page titles, task content, and tag names, but not full page content or journal material.

Improve search to include:

- Page titles and body content
- Task content
- Journal entries
- Tags
- Decisions
- Projects
- Matching text snippets
- Content-type filters
- Context filters
- Date filters
- Active-task filters

Useful result groups:

```text
Tasks
Pages
Journal
Decisions
Projects
Tags
```

Begin with full-text content indexing and good result presentation before adding complex query syntax.

---

## 14. Preserve Task Origin and “Why”

When reviewing a task outside its source page, the user should be able to see why it exists.

A task detail panel should show:

```text
Task: Call insurance company

Origin:
Daily Journal — August 25

Contexts:
Home
Financial

Nearby note context:
“I need to resolve the deductible issue before renewal...”

Next action:
Call the customer service number
```

This helps determine whether the task should be completed, rewritten, rescheduled, or deleted.

---

## 15. Detect Repeated Rescheduling

A task repeatedly moved to a new date is giving useful information. It may be:

- Too vague
- Too large
- Blocked
- Not important
- Unrealistically scheduled
- Something the user does not actually want to do

Track:

```ts
reschedule_count
last_rescheduled_at
```

After repeated movement, offer:

```text
This task keeps moving. What should happen?
[Break it down] [Move to someday] [Mark waiting] [Delete] [Keep]
```

This should be helpful rather than judgmental.

---

## 16. Improve Focus Mode

Focus should be fed by planning, not by a generic task list.

Suggested selection logic:

1. Current calendar block
2. Next committed task
3. Quick win under 15 minutes
4. Continue the active project
5. Choose manually

At the end of a focus session, ask:

```text
What happened?
[Done] [Made progress] [Blocked] [Abandoned]
```

This can update task state and optionally append a journal entry.

---

## 17. Add Effort and Energy Metadata

Add an optional effort estimate:

```ts
effort_minutes: number | null
```

Presets:

- 5 minutes
- 15 minutes
- 30 minutes
- 60 minutes
- 2+ hours

This enables useful capacity feedback:

```text
You have 11 hours of tasks scheduled into 5 hours of available time.
```

Optional energy and mode chips could also help:

```text
Energy: Low / Normal / High
Mode: Computer / Phone / Errands / Home / Work
```

These should remain optional and quick to apply.

---

## 18. Make Recurrence Reviewable

Recurring tasks should support:

- Skip this occurrence
- Skip once and continue
- Stop recurrence
- Change future occurrences
- Change this occurrence only
- Review recurrence
- Completion history
- Missed occurrence count

Example:

```text
Every Thursday
Last completed: Aug 20
Missed: 2 occurrences
```

This helps determine whether a recurrence is still realistic.

---

## 19. Turn the Daily Journal into a Reflection-to-Action Tool

The Daily Journal already provides an autosaving editor and a master Journal page. Add end-of-day prompts:

```text
What mattered today?
What remains unresolved?
What is the one thing to carry into tomorrow?
```

Selected text should be convertible into:

- Task
- Decision
- Project item
- Scheduled task
- Reflection only

Also add an “unresolved thoughts” view for questions, ideas, and concerns that are not yet formal tasks.

Possible slash blocks:

```text
/question
/idea
/decision
/task
```

---

## 20. Small UI Improvements

### Task rows

Provide compact quick actions:

```text
[Today] [Tomorrow] [Someday] [Move] [More]
```

### Empty states

Replace generic messages with useful actions:

```text
Nothing is scheduled today.

[Plan the day] [Review Inbox] [Browse active projects]
```

### Dashboard cards

Explain the action behind every number:

```text
7 overdue
Review, reschedule, or release these tasks
```

### Page lists

Show lightweight project health:

```text
Basement project
3 open · 1 waiting · reviewed 2 days ago
```

### Mobile

Use direct gestures where appropriate:

- Tap task body: open details
- Tap date: change schedule
- Swipe right: complete
- Swipe left: defer or move
- Long press: secondary menu

Long press should be a bonus, not the only discoverable action.

---

## 21. Technical Work Supporting the Product Direction

### Unify mutations

Some views use `apiFetch`, others use raw `fetch`, and mutation events are not entirely consistent. Create a shared task mutation service:

```ts
taskService.create()
taskService.update()
taskService.complete()
taskService.delete()
taskService.move()
taskService.schedule()
```

Every mutation should:

1. Update local state optimistically.
2. Call the API.
3. Roll back on failure.
4. Emit the standard event.
5. Show a toast on failure.
6. Return the updated task.

### Extract planning logic

Keep filtering and planning calculations out of JSX and in testable modules:

- Task filtering
- Today grouping
- Inbox classification
- Review queues
- Capacity calculations
- Project health
- Reschedule detection

### Improve search storage

Use PostgreSQL full-text search or a maintained search vector instead of expanding ILIKE queries indefinitely.

### Resolve schema drift

The project contains multiple generations of concepts, including legacy notes/folders, pages/tasks, context graph relationships, and newer modules. Create a current schema map before adding a substantial planning layer.

### Improve journal autosave

The DailyJournalEditor currently saves on every editor update. Add:

- Debounced save
- Save queue protection
- Dirty state
- Saved/saving/offline states
- Retry on failure

---

# Recommended Build Order

## Phase 1: Immediate cognitive payoff

1. Inbox processing actions
2. Optional Next action field
3. Must / Should / Could sections in Today
4. Action-oriented dashboard cards
5. Visible natural-language parsing feedback
6. Shared capture service

## Phase 2: Planning backbone

7. Waiting status with follow-up date
8. Someday state
9. Review date
10. Deadline versus target date
11. Project/page type and outcome field
12. Weekly review screen
13. Display all task contexts

## Phase 3: Decision support

14. Decision records
15. Project health and stale-item detection
16. Reschedule-count intervention
17. Effort estimates and capacity view
18. Focus suggestions based on current context
19. Journal reflection-to-action flow

## Phase 4: Larger architecture

20. First-class outcome/project model
21. Full-text content search
22. Unified planning engine
23. Offline-first capture and mutation queue
24. Optional intelligent scheduling or AI assistance

AI belongs last. The Docket does not primarily suffer from a lack of intelligence. It suffers from thoughts and intentions not being forced through a useful decision funnel.

---

# The Five Highest-Value Changes

If only five changes are built first:

1. **Inbox processing mode** — one item at a time with Do, Schedule, Move, Waiting, Someday, and Delete.
2. **Next-action field** — every active project should have one clearly visible next physical step.
3. **Must / Should / Could Today view** — make commitments realistic.
4. **Weekly review** — surface stale, overdue, waiting, undated, and unprocessed items and force decisions.
5. **Decision records** — capture options, criteria, choice, rationale, and revisit date.

These changes would shift The Docket from a nicely integrated notes-and-task app into a system that helps Dave decide what deserves attention and turn thinking into deliberate action.
