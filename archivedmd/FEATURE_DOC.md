## Project Vision

**The Docket** is a self-hosted productivity application that bridges the gap between thinking and doing. It seamlessly integrates free-form note-taking (in Markdown) with structured task management, solving the universal problem: "I wrote something down, but I never actually did anything about it."

### Core Philosophy

- **Notes and tasks are not separate things** — they exist on a spectrum from thought to action
- **Context travels with tasks** — a task should never lose the "why" behind it
- **Single user, single source of truth** — designed for personal productivity, not team collaboration
- **Self-hostable first** — you own your data, you control your system

### The Differentiator

Unlike Obsidian (tasks are plugins), Notion (bloated), or Todoist (no real notes), The Docket treats the note-to-task relationship as a first-class feature with a many-to-many architecture.

---

## Core Architecture

### Data Model

```
┌─────────────┐         ┌─────────────────┐         ┌─────────────┐
│    Note     │         │   NoteTasks     │         │    Task     │
├─────────────┤         ├─────────────────┤         ├─────────────┤
│ id          │────────<│ note_id         │>────────│ id          │
│ title       │         │ task_id         │         │ content     │
│ content     │         │ relationship    │         │ due_date    │
│ tags[]      │         │ (origin/ref)    │         │ is_completed│
│ created_at  │         │ position        │         │ priority    │
│ updated_at  │         └─────────────────┘         │ recurrence  │
│ is_archived │                                     │ tags[]      │
└─────────────┘                                     │ created_at  │
                                                    │ updated_at  │
                                                    └─────────────┘
```

### Key Relationships

- **Origin Link**: Task was created from this note; note is the "source of truth" for context
- **Reference Link**: Task appears in this note but originated elsewhere
- **Tag Inheritance**: Tasks automatically inherit tags from their origin note

### Technology Stack

- **Framework**: Next.js (TypeScript)
- **Frontend**: React + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **Deployment**: Docker (self-hosted), optional Vercel (hosted tier)

---

## Feature Categories

### 🟢 Phase 1: Core Foundation (MVP)

_Get the basics right. Ship something usable._

### 🟡 Phase 2: Enhanced Productivity

_Make it powerful. Add the features that make it sticky._

### 🔵 Phase 3: Integration & Sync

_Connect to the world. Make it work with other tools._

### 🟣 Phase 4: Advanced Intelligence

_Add smart features. Let AI help where it makes sense._

### ⚪ Future Possibilities

_Blue sky thinking. May or may not ever happen._

---

## Phase 1: Core Foundation (MVP)

### 1.1 Note Management

|Feature|Description|Status|
|---|---|---|
|**Create Note**|New note with title, content (markdown), optional tags|✅ Built|
|**Edit Note**|Live editing with autosave|✅ Built|
|**Delete Note**|Soft delete (archive) with hard delete option|🚧 Partial|
|**Note List**|Sidebar/panel showing all notes|✅ Built|
|**Note Search**|Full-text search across note content|❌ Not started|
|**Tag Management**|Create, rename, delete, merge tags|🚧 Partial|
|**Markdown Rendering**|Live preview with standard markdown support|✅ Built|
|**Note Archive**|Hide notes without deleting, restore later|❌ Not started|

### 1.2 Task Management

|Feature|Description|Status|
|---|---|---|
|**Inline Task Creation**|Type `[ ] task text` in a note to create a task|✅ Built|
|**Task Checkbox Toggle**|Click to complete/uncomplete|✅ Built|
|**Task List View**|Dedicated view showing all tasks|✅ Built|
|**Task Filtering**|Filter by status, due date, tags|🚧 Partial|
|**Task Detail Modal**|Edit task properties in a modal/sidebar|✅ Built|
|**Due Date Assignment**|Manual date picker for due dates|✅ Built|
|**Priority Levels**|None, Low, Medium, High, Urgent|❌ Not started|
|**Task Deletion**|Remove task (prompts about note references)|✅ Built|

### 1.3 Note-Task Integration

|Feature|Description|Status|
|---|---|---|
|**Tag Inheritance**|Tasks automatically get tags from origin note|✅ Built|
|**Origin Tracking**|Every task knows which note created it|✅ Built|
|**Cross-Reference**|Link existing task in another note|❌ Not started|
|**Task Context Navigation**|Click task → jump to origin note|🚧 Partial|
|**Note Task Summary**|Show task count/status in note list|❌ Not started|

### 1.4 Natural Language Processing

|Feature|Description|Status|
|---|---|---|
|**Date Parsing**|"due tomorrow", "due friday", "due jan 15"|✅ Built|
|**Time Parsing**|"at 3pm", "at 14:00", "morning"|🚧 Partial|
|**Relative Dates**|"in 3 days", "next week", "end of month"|🚧 Partial|
|**Smart Defaults**|No time specified → default to 9am or EOD|❌ Not started|
|**Parsing Feedback**|Show interpreted date before saving|❌ Not started|

### 1.5 Basic UI/UX

|Feature|Description|Status|
|---|---|---|
|**Two-Panel Layout**|Notes list + Editor/Task view|✅ Built|
|**Dark Mode**|System preference or manual toggle|❌ Not started|
|**Keyboard Shortcuts**|Common actions (new note, save, search)|❌ Not started|
|**Mobile Responsive**|Usable on phone/tablet (basic)|🚧 Partial|
|**Loading States**|Skeleton loaders, spinners|🚧 Partial|
|**Error Handling**|Toast notifications, error boundaries|🚧 Partial|

---

## Phase 2: Enhanced Productivity

### 2.1 Advanced Task Features

|Feature|Description|Priority|
|---|---|---|
|**Recurring Tasks**|Daily, weekly, monthly, custom patterns|High|
|**Subtasks**|Nested tasks within a parent task|High|
|**Task Dependencies**|Task B can't start until Task A is done|Medium|
|**Time Estimates**|"This will take ~2 hours"|Medium|
|**Actual Time Tracking**|Start/stop timer on tasks|Low|
|**Task Templates**|Reusable task structures|Medium|
|**Batch Operations**|Select multiple tasks, bulk edit/delete/move|Medium|
|**Task Snooze**|"Remind me about this tomorrow"|Medium|

#### Recurring Task Implementation Details

```
Recurrence patterns to support:
- Daily (every N days)
- Weekly (every N weeks on specific days)
- Monthly (day of month or Nth weekday)
- Yearly (specific date)
- Custom (every N days/weeks/months)
- After completion (N days after marked done)

Edge cases:
- Feb 30 → Feb 28/29
- Task completed early → next occurrence still on schedule
- Task completed late → next occurrence from completion or original?
- Skipping occurrences
- End date for recurring series
```

### 2.2 Advanced Note Features

|Feature|Description|Priority|
|---|---|---|
|**Note Templates**|Quick-start templates (meeting, daily, project)|High|
|**Note Linking**|[[Wiki-style]] links between notes|High|
|**Backlinks**|See all notes that link to current note|High|
|**Table of Contents**|Auto-generated from headings|Medium|
|**Note Versioning**|History of changes, restore previous|Medium|
|**Note Pinning**|Pin important notes to top|Low|
|**Note Folders/Categories**|Organize notes beyond tags|Medium|
|**Embedded Images**|Paste/upload images into notes|High|
|**File Attachments**|Attach PDFs, documents to notes|Medium|

### 2.3 Views & Organization

|Feature|Description|Priority|
|---|---|---|
|**Today View**|Tasks due today + overdue|High|
|**Inbox View**|Tasks with no due date (needs triage)|High|
|**Calendar View**|Month/week view of tasks by due date|High|
|**Tag Browser**|Visual tag cloud, click to filter|Medium|
|**Search with Filters**|is:completed due:today tag:work|High|
|**Saved Searches**|Save filter combinations as views|Medium|
|**Focus Mode**|Hide everything except current note|Low|
|**Daily/Weekly Review**|Summary of completed, upcoming tasks|Medium|

### 2.4 User Experience Refinements

|Feature|Description|Priority|
|---|---|---|
|**Drag & Drop**|Reorder tasks, move between notes|High|
|**Command Palette**|Cmd+K to access all actions|High|
|**Customizable Shortcuts**|User-defined keyboard shortcuts|Low|
|**Quick Capture**|Global shortcut to add task from anywhere|High|
|**Undo/Redo**|Undo accidental deletions, edits|High|
|**Themes**|Multiple color themes beyond dark/light|Low|
|**Font Options**|Custom fonts for editor|Low|
|**Density Options**|Compact/comfortable/spacious|Medium|

---

## Phase 3: Integration & Sync

### 3.1 Calendar Integration

|Feature|Description|Priority|
|---|---|---|
|**Google Calendar Sync**|Two-way sync of tasks as events|High|
|**CalDAV Support**|Sync with Nextcloud, iCloud, etc.|High|
|**Calendar Feed (ICS)**|Read-only calendar subscription|Medium|
|**Event → Task**|Create task from calendar event|Medium|
|**Time Blocking**|Schedule task execution time|Low|

### 3.2 External Integrations

|Feature|Description|Priority|
|---|---|---|
|**API (REST)**|Full CRUD API for external access|High|
|**Webhooks**|Trigger external actions on events|Medium|
|**Email to Inbox**|Send email → creates task|Medium|
|**Browser Extension**|Capture tasks from any webpage|Medium|
|**RSS/Atom Feed**|Subscribe to completed tasks, notes|Low|
|**IFTTT/Zapier**|Connect to automation platforms|Low|

### 3.3 Import/Export

|Feature|Description|Priority|
|---|---|---|
|**Export to Markdown**|Bulk export all notes as .md files|High|
|**Export to JSON**|Full data backup|High|
|**Import from Markdown**|Folder of .md files → notes|High|
|**Import from Todoist**|Migrate from Todoist|Medium|
|**Import from Notion**|Migrate from Notion export|Medium|
|**Import from Obsidian**|Migrate vault with tasks|Medium|
|**OPML Import/Export**|Outline format interop|Low|

### 3.4 Sync & Multi-Device

|Feature|Description|Priority|
|---|---|---|
|**Real-time Sync**|Changes reflect immediately across devices|High|
|**Offline Support**|Work without internet, sync when back|High|
|**Conflict Resolution**|Handle simultaneous edits gracefully|High|
|**Selective Sync**|Choose which notes/tags to sync|Low|
|**Sync Status Indicator**|Show sync state (synced, pending, error)|Medium|

---

## Phase 4: Advanced Intelligence

### 4.1 AI-Powered Features

|Feature|Description|Priority|
|---|---|---|
|**Smart Task Extraction**|AI identifies actionable items in notes|High|
|**Auto-Tagging**|Suggest tags based on content|Medium|
|**Due Date Suggestions**|AI suggests when task should be done|Medium|
|**Priority Recommendations**|AI suggests task priority|Low|
|**Writing Assistance**|Expand, summarize, rewrite notes|Medium|
|**Task Decomposition**|Break vague task into subtasks|Medium|
|**Similar Notes**|Find related notes automatically|Low|
|**Natural Language Queries**|"What do I need to do this week?"|Medium|

### 4.2 Analytics & Insights

|Feature|Description|Priority|
|---|---|---|
|**Completion Trends**|Graph of tasks completed over time|Medium|
|**Productivity Patterns**|Best days/times for completing tasks|Low|
|**Tag Analytics**|Which areas get most attention|Low|
|**Overdue Analysis**|Patterns in what gets delayed|Low|
|**Goal Tracking**|Set weekly/monthly completion goals|Medium|
|**Activity Heatmap**|GitHub-style contribution graph|Low|

### 4.3 Automation

|Feature|Description|Priority|
|---|---|---|
|**Auto-Archive**|Archive completed tasks after N days|Medium|
|**Auto-Priority**|Increase priority as due date approaches|Low|
|**Recurring Note Templates**|Auto-create daily/weekly notes|Medium|
|**Smart Lists**|Dynamic lists based on rules|Medium|
|**Scheduled Actions**|"Move to archive on Jan 1"|Low|

---

## Future Possibilities

### Platform Expansion

|Feature|Description|Notes|
|---|---|---|
|**Native Mobile App**|iOS/Android with full functionality|React Native or Flutter|
|**Desktop App**|Electron or Tauri wrapper|Quick capture, offline|
|**CLI Tool**|Terminal interface for power users|Add tasks from command line|
|**Apple Watch**|Quick capture, view today's tasks|Far future|
|**Widget Support**|iOS/Android home screen widgets|After mobile app|

### Collaboration (If Ever)

|Feature|Description|Notes|
|---|---|---|
|**Shared Notes**|Invite others to view/edit notes|Changes core architecture|
|**Shared Tasks**|Assign tasks to others|Multi-user database|
|**Comments on Tasks**|Discussion threads|Adds complexity|
|**Team Workspaces**|Separate personal/team|Major lift|

### Advanced Features

|Feature|Description|Notes|
|---|---|---|
|**Kanban Board**|Drag tasks between status columns|Alternative view|
|**Gantt Chart**|Timeline view for projects|Project management|
|**Mind Mapping**|Visual note/task relationships|Different UI paradigm|
|**Voice Notes**|Audio recording with transcription|Storage considerations|
|**Handwriting Support**|Stylus input for notes|Tablet-focused|
|**Plugin System**|User-created extensions|Major architecture decision|
|**Themes Marketplace**|Community-created themes|After plugin system|

---

## Technical Considerations

### Performance Targets

|Metric|Target|
|---|---|
|Initial page load|< 2 seconds|
|Note list render (1000 notes)|< 500ms|
|Search results|< 200ms|
|Task toggle|< 100ms (optimistic)|
|Autosave debounce|500ms|

### Data Limits (Suggested)

|Limit|Value|Rationale|
|---|---|---|
|Max notes|10,000|Performance|
|Max tasks|50,000|Performance|
|Note content size|500KB|Reasonable document|
|Attachment size|10MB|Storage considerations|
|Tags per item|20|UX sanity|

### Security Considerations

|Feature|Implementation|
|---|---|
|Authentication|Single-user: optional local auth, Multi-user: full auth|
|Data encryption|At-rest encryption for database|
|API security|Rate limiting, CORS configuration|
|Backup encryption|Encrypted exports option|
|Audit logging|Track data access/changes|

### Self-Hosting Requirements

|Component|Minimum|Recommended|
|---|---|---|
|CPU|1 core|2 cores|
|RAM|512MB|1GB|
|Storage|1GB|10GB|
|Database|PostgreSQL 14+|PostgreSQL 15+|
|Node.js|18+|20 LTS|

---

## Monetization Strategy

### Option A: Open Source + Hosted Tier

- **Free**: Self-host via Docker
- **Paid ($5-10/month)**: Hosted version with sync, backups, support

### Option B: One-Time Purchase

- **Free**: Open source, self-host
- **Paid ($29-49)**: Desktop app (Electron/Tauri)

### Option C: Freemium Features

- **Free**: Core notes + tasks
- **Premium**: Recurring tasks, calendar sync, AI features, mobile app

### Distribution Channels

- GitHub releases
- Docker Hub
- r/selfhosted, Hacker News
- Product Hunt launch
- Personal blog documentation

---

## Development Roadmap

### Now (Current Sprint)

1. Fix any critical bugs
2. Polish core note/task CRUD
3. Complete tag inheritance
4. Basic search

### Next (1-2 months)

1. Recurring tasks
2. Note linking ([[wiki-style]])
3. Today/Inbox views
4. Dark mode
5. Keyboard shortcuts

### Later (3-6 months)

1. Calendar sync (CalDAV first)
2. Mobile responsive polish
3. Import/export
4. API for integrations

### Eventually (6-12 months)

1. AI features
2. Native mobile app
3. Public launch / monetization
4. Community building

---

## Competitive Positioning

### What The Docket Is NOT

- ❌ A team collaboration tool (try Notion, Asana)
- ❌ A note-taking powerhouse (try Obsidian, Logseq)
- ❌ A project management system (try Linear, Jira)
- ❌ A second brain (try Roam, Tana)

### What The Docket IS

- ✅ A bridge between thinking and doing
- ✅ A place where notes naturally become tasks
- ✅ A single-user, self-hosted productivity tool
- ✅ The simplest path from "I should do X" to "X is done"

### Tagline Options

- "From thought to action"
- "Where notes become tasks"
- "The bridge between thinking and doing"
- "Write it down. Get it done."

---

## Success Metrics

### MVP Success

- [ ] Can create notes and tasks reliably
- [ ] Tasks inherit tags correctly
- [ ] Natural language dates work 90%+ of the time
- [ ] App is usable on mobile (basic)
- [ ] Docker deployment works reliably

### Product-Market Fit Indicators

- [ ] 100 GitHub stars
- [ ] 10 active self-hosters (feedback loop)
- [ ] 3+ unsolicited testimonials
- [ ] Someone writes a blog post about it

### Revenue Indicators (if monetizing)

- [ ] First paying customer
- [ ] 100 paying customers
- [ ] Revenue covers hosting costs
- [ ] Revenue matches a meaningful number

---

_Document Version: 1.0_ _Last Updated: December 2024_ _Author: The Docket Project_