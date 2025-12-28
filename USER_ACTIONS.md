
## Philosophy: Multiple Paths to the Same Goal

Users have different preferences, contexts, and muscle memory. A power user wants keyboard shortcuts. A mobile user wants tap targets. A casual user wants obvious buttons. The Docket should support all of them doing the same things in the ways that feel natural to them.

---

## Action 1: Creating a Task from Text in a Note

### The Scenario

User is writing in a note and realizes "this line should be a task."

```
Meeting with Sarah about Q1 planning
- Discuss budget allocations
- Review team headcount     ← "I need to actually DO this"
- Finalize timeline
```

### Methods to Convert Line to Task

|Method|How It Works|User Type|
|---|---|---|
|**Inline Syntax**|Type `[ ]` at start of line → auto-converts|Keyboard-first users|
|**Keyboard Shortcut**|Cursor on line → `Cmd+Enter` or `Cmd+T`|Power users|
|**Context Menu**|Right-click line → "Convert to Task"|Mouse users|
|**Slash Command**|Type `/task` at start of line|Notion-familiar users|
|**Selection Action**|Select text → floating toolbar appears with task icon|Visual users|
|**Drag to Task Panel**|Drag line to task sidebar|Spatial thinkers|
|**Button in Gutter**|Hover on line → task icon appears in margin|Discoverable for new users|

### Detailed Interaction Flows

#### Flow A: Inline Syntax (Current Implementation)

```
1. User types: [ ] Review team headcount
2. System detects checkbox syntax on blur/enter
3. Task is created in database
4. Line transforms to interactive checkbox
5. Task inherits note's tags
```

#### Flow B: Keyboard Shortcut

```
1. Cursor is on line: "Review team headcount"
2. User presses Cmd+Enter (or configurable shortcut)
3. Line transforms: "[ ] Review team headcount"
4. Task created, checkbox interactive
5. Optional: Quick input appears for due date
```

#### Flow C: Selection → Floating Toolbar

```
1. User selects text: "Review team headcount"
2. Floating toolbar appears above selection
   ┌─────────────────────────────┐
   │ B  I  U  │ 📋 Task │ 🔗 Link │
   └─────────────────────────────┘
3. User clicks Task icon
4. Selection becomes a task
5. Optional: Inline date picker appears
```

#### Flow D: Slash Command

```
1. User types at line start: /task Review team headcount
2. Autocomplete shows: "Create task: Review team headcount"
3. User presses Enter
4. Task is created, line transforms
```

#### Flow E: Right-Click Context Menu

```
1. User right-clicks on a line
2. Context menu appears:
   ┌─────────────────────┐
   │ Cut                 │
   │ Copy                │
   │ Paste               │
   │ ─────────────────── │
   │ → Convert to Task   │
   │ → Add Due Date...   │
   │ → Add Tag...        │
   └─────────────────────┘
3. User selects "Convert to Task"
4. Task is created
```

#### Flow F: Gutter Icon (Hover Reveal)

```
1. User hovers on any line in the editor
2. Left margin shows faint icons:
   ┌──┬─────────────────────────────┐
   │☐ │ Review team headcount       │
   │  │ Finalize timeline           │
   └──┴─────────────────────────────┘
3. Clicking ☐ converts line to task
4. Icon becomes interactive checkbox
```

---

## Action 2: Assigning a Due Date to a Task

### The Scenario

User has a task and needs to set when it's due.

### Methods to Assign Due Date

|Method|How It Works|User Type|
|---|---|---|
|**Inline Natural Language**|Type "due friday" in task text|Fast typists|
|**Keyboard Shortcut**|On task → `Cmd+D` opens date picker|Power users|
|**Click Date Area**|Click "No date" or existing date → picker opens|Visual users|
|**Task Detail Panel**|Open task → calendar widget|Detail-oriented|
|**Quick Actions Menu**|`Cmd+K` → "Set due date"|Command palette users|
|**Right-Click**|Right-click task → "Set due date..."|Mouse users|
|**Drag to Calendar**|Drag task to calendar view date|Spatial planners|
|**Type in Parentheses**|Add `(friday)` or `(tomorrow)` anywhere in task|Inline thinkers|

### Natural Language Parsing Details

#### Supported Patterns

```
Explicit dates:
  "due jan 15" → January 15, 2025
  "due 1/15" → January 15, 2025
  "due 2025-01-15" → January 15, 2025

Relative dates:
  "due today" → today
  "due tomorrow" → tomorrow
  "due friday" → next Friday (or this Friday if before)
  "due next friday" → Friday of next week
  "due in 3 days" → 3 days from now
  "due next week" → Monday of next week
  "due end of month" → last day of current month
  "due end of week" → Friday

With times:
  "due tomorrow at 3pm" → tomorrow 15:00
  "due friday morning" → Friday 09:00
  "due jan 15 at 2:30pm" → Jan 15, 14:30
  "due tomorrow evening" → tomorrow 18:00

Recurring (future):
  "due every monday" → recurring weekly
  "due daily" → recurring daily
  "due monthly on the 15th" → recurring monthly
```

#### Parsing Feedback UI

```
As user types, show interpretation:

┌─────────────────────────────────────────────────┐
│ [ ] Review team headcount due friday at 3pm     │
│                           └──────────┬─────────┘│
│                        📅 Fri, Jan 17 @ 3:00 PM │
└─────────────────────────────────────────────────┘

The parsed date appears as a subtle chip/badge that:
- Shows the interpreted date
- Is clickable to open calendar picker
- Has an × to remove the date
- Turns red if date is in the past
```

### Date Picker Interactions

#### Keyboard-Driven Date Picker

```
Cmd+D opens picker, then:
  - Arrow keys navigate calendar
  - Enter selects date
  - T = today
  - M = tomorrow  
  - W = next week
  - Tab moves to time field
  - Esc closes without saving
```

#### Calendar Picker Features

```
┌────────────────────────────────────┐
│ ←  January 2025  →                 │
├────────────────────────────────────┤
│ Su  Mo  Tu  We  Th  Fr  Sa         │
│                  1   2   3   4     │
│  5   6   7   8   9  10  11         │
│ 12  13  14  15  16 [17] 18         │  ← Current selection
│ 19  20  21  22  23  24  25         │
│ 26  27  28  29  30  31             │
├────────────────────────────────────┤
│ Time: [ 3:00 PM ▼ ]                │
│                                    │
│ Quick: Today | Tomorrow | Next Week│
├────────────────────────────────────┤
│        [ Clear ]    [ Save ]       │
└────────────────────────────────────┘
```

---

## Action 3: Completing a Task

### The Scenario

User finished something and wants to check it off.

### Methods to Complete a Task

|Method|How It Works|User Type|
|---|---|---|
|**Click Checkbox**|Click the [ ] in note or task list|Everyone|
|**Keyboard Shortcut**|On task → `Cmd+/` or `Space`|Keyboard users|
|**Swipe**|Swipe right on task (mobile)|Mobile users|
|**Right-Click**|Right-click → "Mark Complete"|Mouse users|
|**Bulk Select**|Select multiple → complete all|Batch processors|
|**Context Menu**|In note, right-click task line|Note-centric users|

### Completion Behaviors

#### Immediate Feedback

```
1. Checkbox animates: [ ] → [✓]
2. Task text gets strikethrough
3. Optional: Subtle confetti/celebration
4. Task moves to "completed" section (or stays inline, preference)
```

#### Recurring Task Completion

```
1. User completes "[ ] Weekly review due every friday"
2. This instance marked complete
3. New instance created for next friday
4. Toast: "Nice! Next occurrence: Friday, Jan 24"
```

#### Undo Completion

```
1. After completing, toast appears:
   ┌─────────────────────────────────────┐
   │ ✓ Task completed          [ Undo ]  │
   └─────────────────────────────────────┘
2. Undo available for ~5 seconds
3. Or: Click completed checkbox to uncomplete
```

---

## Action 4: Adding Context to a Task

### The Scenario

User wants to add more information: notes, priority, tags, links.

### Methods to Add Context

|Method|How It Works|Access|
|---|---|---|
|**Expand Inline**|Click task → expands to show fields|Quick additions|
|**Task Detail Panel**|Click task → sidebar/modal opens|Full editing|
|**Inline Syntax**|`#tag`, `!high`, `+note` in task text|Power users|
|**Keyboard Shortcuts**|`Cmd+Shift+P` for priority, etc.|Speed|
|**Right-Click Menu**|Context menu with all options|Discoverability|

### Inline Syntax Options

```
Tags:           [ ] Review headcount #planning #q1
Priority:       [ ] Review headcount !high
                [ ] Review headcount !urgent
                [ ] Review headcount !! (shorthand for high)
                [ ] Review headcount !!! (shorthand for urgent)
Assignee:       [ ] Review headcount @sarah (future, if multi-user)
Time estimate:  [ ] Review headcount ~2h
Links:          [ ] Review headcount [[Meeting Notes]]
```

### Task Detail Panel Layout

```
┌─────────────────────────────────────────────────────────┐
│ Review team headcount                              [×]  │
├─────────────────────────────────────────────────────────┤
│ Status:   ○ To Do  ● In Progress  ○ Done                │
│                                                         │
│ Due:      [ Friday, Jan 17 @ 3:00 PM    📅 ]           │
│                                                         │
│ Priority: [ ● None ○ Low ○ Med ○ High ○ Urgent ]       │
│                                                         │
│ Tags:     [ #planning ] [ #q1 ] [ + Add tag ]          │
│                                                         │
│ Origin:   📄 Q1 Planning Meeting (click to jump)       │
│                                                         │
│ Notes:    ┌─────────────────────────────────────────┐  │
│           │ Sarah mentioned we might have budget    │  │
│           │ for 2 more headcount. Check with finance│  │
│           └─────────────────────────────────────────┘  │
│                                                         │
│ Subtasks: [ ] Get budget numbers                       │
│           [ ] Draft headcount proposal                  │
│           [ + Add subtask ]                            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Created: Jan 10, 2025  │  Modified: Jan 12, 2025       │
└─────────────────────────────────────────────────────────┘
```

---

## Action 5: Finding a Task or Note

### The Scenario

User needs to find something they wrote or created.

### Search Methods

|Method|How It Works|Best For|
|---|---|---|
|**Global Search**|`Cmd+K` or `/` opens search|Finding anything|
|**Filter Bar**|Click filters above list|Browsing with constraints|
|**Tag Click**|Click any tag → filtered view|Tag-based organization|
|**Saved Views**|Click "Today", "Inbox", custom|Common filters|
|**Full-Text Search**|Type in search box|Finding by content|
|**Natural Language**|"tasks due this week"|Power users|

### Search Syntax

```
Basic:
  headcount                   → matches title or content
  "team headcount"            → exact phrase

Filters:
  is:task                     → only tasks
  is:note                     → only notes
  is:completed                → completed tasks
  is:incomplete               → incomplete tasks
  is:overdue                  → past due date

Dates:
  due:today                   → due today
  due:tomorrow                → due tomorrow
  due:this-week               → due within 7 days
  due:overdue                 → past due
  created:today               → created today
  modified:this-week          → modified in last 7 days

Tags:
  tag:planning                → has #planning tag
  tag:planning,q1             → has both tags
  -tag:archived               → does NOT have tag

Priority:
  priority:high               → high priority
  priority:urgent             → urgent

Combinations:
  is:task due:this-week tag:work priority:high
  is:note created:this-week tag:meeting
```

### Search Results UI

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 [ headcount                              ] [×]      │
│                                                         │
│ Filters: [is:task ×] [due:this-week ×] [+ Add filter]  │
├─────────────────────────────────────────────────────────┤
│ 3 results                                               │
│                                                         │
│ 📋 Review team headcount                               │
│    Due: Fri, Jan 17 │ #planning #q1                    │
│    "...discuss budget allocations and headcount..."    │
│                                                         │
│ 📋 Finalize headcount proposal                         │
│    Due: Mon, Jan 20 │ #planning                        │
│    "...send headcount numbers to Sarah..."             │
│                                                         │
│ 📄 Q1 Planning Meeting                                 │
│    Modified: Jan 10 │ #planning #q1                    │
│    "...team headcount needs to be reviewed..."         │
└─────────────────────────────────────────────────────────┘
```

---

## Action 6: Organizing Tasks (Moving, Reordering, Grouping)

### The Scenario

User wants to restructure their tasks — prioritize, group, or move between contexts.

### Reordering Methods

|Method|How It Works|Context|
|---|---|---|
|**Drag & Drop**|Drag task to new position|Visual reordering|
|**Keyboard**|`Cmd+↑/↓` to move up/down|Keyboard users|
|**Priority Sort**|Click column header to sort|List view|
|**Due Date Sort**|Auto-sort by due date|Calendar-minded|
|**Manual Order**|User-defined order preserved|Personal preference|

### Grouping Options

```
Group by:
├── Due Date
│   ├── Overdue (3)
│   ├── Today (5)
│   ├── Tomorrow (2)
│   ├── This Week (8)
│   ├── Later (12)
│   └── No Date (7)
│
├── Priority
│   ├── Urgent (1)
│   ├── High (4)
│   ├── Medium (8)
│   ├── Low (6)
│   └── None (18)
│
├── Tag
│   ├── #work (15)
│   ├── #personal (12)
│   ├── #planning (8)
│   └── Untagged (2)
│
├── Origin Note
│   ├── Q1 Planning Meeting (4)
│   ├── Weekly Review (6)
│   ├── Random Thoughts (3)
│   └── No Origin (24)
│
└── Status
    ├── To Do (28)
    ├── In Progress (5)
    └── Completed (hidden by default)
```

### Moving Tasks Between Notes

```
Scenario: Task created in "Meeting Notes" but belongs in "Project Plan"

Methods:
1. Drag task from one note to another in split view
2. Task detail → "Move to..." → select note
3. Right-click → "Move to Note..." → search/select
4. Cut (Cmd+X) in one note, paste (Cmd+V) in another

Behavior:
- Task maintains original origin (for context)
- New note gets a "reference" relationship
- Or: User can choose to change origin
```

---

## Action 7: Quick Capture (Getting Things Out of Your Head Fast)

### The Scenario

User has a thought that needs to be captured NOW — mid-meeting, while browsing, etc.

### Quick Capture Methods

|Method|How It Works|Context|
|---|---|---|
|**Global Shortcut**|`Cmd+Shift+Space` from anywhere|Desktop app|
|**Browser Extension**|Click icon → quick input|While browsing|
|**Mobile Widget**|Tap widget → quick input|Phone home screen|
|**Inbox Hotkey**|`I` in app → new inbox task|Already in app|
|**Email to Inbox**|Send to inbox@docket.app|From anywhere|
|**Share Sheet**|Share from any app → The Docket|Mobile|

### Quick Capture UI

```
Minimal popup that appears over everything:

┌─────────────────────────────────────────────────────────┐
│ ⚡ Quick Capture                                    [×] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [ Call Sarah about budget due friday #planning      ]  │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 📅 Friday, Jan 17        #planning                 ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│        [ More Options ]            [ Add to Inbox ✓ ]  │
└─────────────────────────────────────────────────────────┘

Features:
- Auto-parses dates and tags from input
- Shows parsed interpretation
- Single Enter to save
- Escape to cancel
- "More Options" expands to full task form
- Saves to Inbox by default (no note association)
```

### Inbox Concept

```
The Inbox is where quick-captured tasks live until processed:

┌─────────────────────────────────────────────────────────┐
│ 📥 Inbox (7 items)                        [ Process ▼ ]│
├─────────────────────────────────────────────────────────┤
│ [ ] Call Sarah about budget                 due Fri    │
│     → [ Assign to Note ] [ Set Priority ] [ Delete ]   │
│                                                         │
│ [ ] Look into new project management tools             │
│     → [ Assign to Note ] [ Set Priority ] [ Delete ]   │
│                                                         │
│ [ ] Book dentist appointment                due Mon    │
│     → [ Assign to Note ] [ Set Priority ] [ Delete ]   │
│                                                         │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘

Inbox items:
- Have no origin note (captured quickly)
- Should be processed: assigned to a note, given context, or deleted
- Can remain in inbox if truly standalone
```

---

## Action 8: Reviewing and Planning

### The Scenario

User wants to see what's on their plate and plan their time.

### Review Views

#### Today View

```
┌─────────────────────────────────────────────────────────┐
│ 📅 Today — Friday, January 17                          │
├─────────────────────────────────────────────────────────┤
│ OVERDUE (2)                                             │
│ ─────────────────────────────────────────────────────── │
│ ⚠️ [ ] Send invoice to client          was due Jan 15  │
│ ⚠️ [ ] Review PR #234                  was due Jan 16  │
│                                                         │
│ DUE TODAY (4)                                           │
│ ─────────────────────────────────────────────────────── │
│ [ ] Review team headcount                    @ 3:00 PM │
│ [ ] Weekly report                            @ 5:00 PM │
│ [ ] Call mom                                 no time   │
│ [ ] Finish blog post                         no time   │
│                                                         │
│ COMPLETED TODAY (3)                                     │
│ ─────────────────────────────────────────────────────── │
│ [✓] Morning standup                                     │
│ [✓] Review emails                                       │
│ [✓] Update project timeline                             │
├─────────────────────────────────────────────────────────┤
│ ✨ 3 of 6 tasks completed                              │
└─────────────────────────────────────────────────────────┘
```

#### Weekly View

```
┌─────────────────────────────────────────────────────────┐
│ 📆 This Week — Jan 13-19                               │
├───────┬───────┬───────┬───────┬───────┬───────┬───────┤
│ Mon   │ Tue   │ Wed   │ Thu   │ Fri   │ Sat   │ Sun   │
│ 13    │ 14    │ 15    │ 16    │ 17    │ 18    │ 19    │
├───────┼───────┼───────┼───────┼───────┼───────┼───────┤
│ ✓ 2   │ ✓ 1   │ • 1   │ ✓ 2   │ • 4   │ • 1   │       │
│       │ • 1   │       │       │       │       │       │
│ Sync  │ Draft │ Invoi │ PR    │ Head- │ Clean │       │
│ mtg   │ post  │ ce    │ 234   │ count │ garage│       │
│       │       │       │       │ ...+3 │       │       │
└───────┴───────┴───────┴───────┴───────┴───────┴───────┘
        ✓ = completed  • = pending
```

#### Weekly Review Workflow

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Weekly Review                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ LAST WEEK SUMMARY                                       │
│ • Completed: 18 tasks                                   │
│ • Rolled over: 4 tasks                                  │
│ • New tasks created: 12                                 │
│                                                         │
│ NEEDS ATTENTION                                         │
│ ─────────────────────────────────────────────────────── │
│ Overdue tasks (2):                                      │
│   [ ] Send invoice — reschedule? [ Today ] [ Delete ]  │
│   [ ] Review PR — reschedule? [ Today ] [ Delete ]     │
│                                                         │
│ Inbox items (7):                                        │
│   [ Process Inbox → ]                                   │
│                                                         │
│ Tasks without dates (12):                               │
│   [ Review undated tasks → ]                            │
│                                                         │
│ NEXT WEEK PREVIEW                                       │
│ ─────────────────────────────────────────────────────── │
│ • 8 tasks already scheduled                             │
│ • Busiest day: Wednesday (3 tasks)                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Action 9: Keyboard Shortcuts Reference

### Global Shortcuts

|Shortcut|Action|
|---|---|
|`Cmd+K`|Command palette / global search|
|`Cmd+N`|New note|
|`Cmd+Shift+N`|New task (to inbox)|
|`Cmd+Shift+Space`|Quick capture (from anywhere)|
|`Cmd+/`|Toggle sidebar|
|`Cmd+\`|Toggle task panel|
|`Cmd+,`|Settings|
|`Cmd+1-9`|Switch to view 1-9|

### Note Editor Shortcuts

|Shortcut|Action|
|---|---|
|`Cmd+Enter`|Convert line to task|
|`Cmd+D`|Add/edit due date for task|
|`Cmd+L`|Insert link|
|`Cmd+Shift+K`|Insert note link `[[`|
|`Cmd+B/I/U`|Bold, italic, underline|
|`Cmd+S`|Save (though autosave is on)|
|`Tab`|Indent line|
|`Shift+Tab`|Outdent line|
|`Cmd+]`|Increase heading level|
|`Cmd+[`|Decrease heading level|

### Task Shortcuts

|Shortcut|Action|
|---|---|
|`Space` or `Enter`|Toggle complete (when focused)|
|`Cmd+D`|Set due date|
|`Cmd+Shift+P`|Set priority|
|`Cmd+Shift+T`|Add tag|
|`Backspace`|Delete task (with confirmation)|
|`Cmd+↑/↓`|Move task up/down|
|`Tab`|Indent (make subtask)|
|`Shift+Tab`|Outdent|
|`Cmd+Enter`|Open task detail|
|`Escape`|Close task detail|

### Navigation Shortcuts

|Shortcut|Action|
|---|---|
|`G then I`|Go to Inbox|
|`G then T`|Go to Today|
|`G then W`|Go to This Week|
|`G then A`|Go to All Tasks|
|`G then N`|Go to Notes|
|`G then S`|Go to Search|
|`J/K`|Move selection down/up|
|`O`|Open selected item|

---

## Action 10: Right-Click Context Menus

### On a Task (in list or note)

```
┌─────────────────────────────┐
│ ✓ Complete                  │
│ ─────────────────────────── │
│ 📅 Set Due Date...          │
│ ⚡ Set Priority      →      │
│ 🏷️  Add Tag...              │
│ ─────────────────────────── │
│ 📝 Open in Detail Panel     │
│ 📄 Go to Origin Note        │
│ ─────────────────────────── │
│ 📋 Duplicate                │
│ 📁 Move to Note...          │
│ ─────────────────────────── │
│ 🗑️  Delete                   │
└─────────────────────────────┘
```

### On a Note (in list)

```
┌─────────────────────────────┐
│ 📝 Open                     │
│ 📝 Open in New Tab          │
│ ─────────────────────────── │
│ 📌 Pin to Top               │
│ 🏷️  Add Tag...              │
│ ─────────────────────────── │
│ 📋 Duplicate                │
│ 📤 Export as Markdown       │
│ ─────────────────────────── │
│ 🗄️  Archive                  │
│ 🗑️  Delete                   │
└─────────────────────────────┘
```

### On Selected Text (in editor)

```
┌─────────────────────────────┐
│ ✂️  Cut                      │
│ 📋 Copy                     │
│ 📥 Paste                    │
│ ─────────────────────────── │
│ ☐ Convert to Task          │
│ 🔗 Create Link...           │
│ 📄 Create Note Link [[      │
│ ─────────────────────────── │
│ 🔍 Search for Selection     │
│ 🌐 Search Web               │
└─────────────────────────────┘
```

---

## Mobile-Specific Interactions

### Gestures

|Gesture|Action|
|---|---|
|Swipe right on task|Complete|
|Swipe left on task|Delete (with undo)|
|Long press task|Enter selection mode|
|Pull down on list|Refresh|
|Tap and hold + drag|Reorder|
|Two-finger tap|Quick actions menu|

### Mobile Quick Actions (3D Touch / Long Press on App Icon)

```
┌─────────────────────────────┐
│ + New Task                  │
│ + New Note                  │
│ 🔍 Search                   │
│ 📅 Today                    │
└─────────────────────────────┘
```

### Mobile Widget Types

```
Small (2x2):
┌─────────────────┐
│ 📅 Today     4  │
│ + Quick Add     │
└─────────────────┘

Medium (4x2):
┌─────────────────────────────────────┐
│ 📅 Today                        4  │
│ [ ] Review headcount      3:00 PM  │
│ [ ] Weekly report         5:00 PM  │
│ + Quick Add                        │
└─────────────────────────────────────┘

Large (4x4):
┌─────────────────────────────────────┐
│ 📅 Today — Friday, Jan 17       4  │
├─────────────────────────────────────┤
│ [ ] Review headcount      3:00 PM  │
│ [ ] Weekly report         5:00 PM  │
│ [ ] Call mom                       │
│ [ ] Finish blog post               │
├─────────────────────────────────────┤
│ [✓] Morning standup                │
│ [✓] Review emails                  │
├─────────────────────────────────────┤
│ + Quick Add                        │
└─────────────────────────────────────┘
```

---

## Summary: Action → Methods Matrix

|Action|Keyboard|Mouse/Touch|Voice|Syntax|
|---|---|---|---|---|
|Create task|`Cmd+Enter`|Gutter icon, toolbar|"Add task"|`[ ]`|
|Set due date|`Cmd+D`|Click date, picker|"Due friday"|`due friday`|
|Complete task|`Space`|Click checkbox|"Done"|`[x]`|
|Add tag|`Cmd+Shift+T`|Tag button|"Tag work"|`#work`|
|Set priority|`Cmd+Shift+P`|Priority selector|"Priority high"|`!high`|
|Search|`Cmd+K`|Click search|"Find"|N/A|
|Quick capture|`Cmd+Shift+Space`|Widget, extension|"Capture"|N/A|
|Navigate|`G then X`|Click nav|"Go to today"|N/A|

---

_This document focuses on HOW users interact with The Docket, complementing the feature overview which focuses on WHAT the app does._