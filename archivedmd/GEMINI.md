# The Docket - Development Guide

## Project Overview

Building a personal, self-hosted productivity application that seamlessly integrates free-form note-taking with structured task management. Designed for single-user use with a focus on simplicity and reliability.

**Core Concept:** A unified brain-dump-to-action system where notes and tasks work together naturally, allowing inline task creation within notes while maintaining structured task management.

## Technology Stack

- **Framework:** Next.js with TypeScript
- **Frontend:** React with Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL
- **Priority:** Web application first, mobile later

## Database Schema (Phase 1)

```sql
-- Core folder structure with nesting support
folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES folders(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notes with rich text content
notes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,  -- Will store rich text/markdown
  folder_id INTEGER REFERENCES folders(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tasks with future-proof structure
tasks (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  due_date TIMESTAMP,
  recurrence_rule JSONB,  -- Future: {type: 'weekly', interval: 2, day: 'monday'}
  source_note_id INTEGER REFERENCES notes(id),  -- nullable, provides context
  completed BOOLEAN DEFAULT FALSE,  -- Phase 1: simple boolean, Phase 2: move to instances
  completed_at TIMESTAMP,  -- Phase 1: timestamp, Phase 2: move to instances
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Design Principles

**Future-Proofing Strategy:** Abstract database implementation behind API methods to enable seamless migration from simple completion tracking to instance-based recurrence system.

```typescript
// Core interfaces
interface TaskInstance {
  id: string;
  content: string;
  dueDate: Date | null;
  completed: boolean;
  completedAt?: Date;
  sourceNote?: { id: string; title: string; };
  recurrenceRule?: RecurrenceRule;
}

interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Folder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: Date;
}

// Key API methods to implement
getTasksForDateRange(startDate: Date, endDate: Date): TaskInstance[]
markTaskCompleted(taskId: string, instanceDate?: Date): void
createTaskFromNote(noteId: string, content: string, dueDate?: Date): Task
```

## Phase 1 MVP Features

### Core Functionality

1.  **Folder Management**

    - Create/rename folders
    - Nested folder structure (unlimited depth)
    - Simple sidebar navigation with collapsible folders
    - Default to "Home" view on app open

2.  **Note Management**

    - WYSIWYG rich text editor (basic markdown tools)
    - Read-only toggle for notes
    - Basic formatting: bold, italic, headers, lists
    - No images in MVP

3.  **Inline Task Creation**

    - Syntax: `- [ ] Task content @today/@tomorrow/@YYYY-MM-DD`
    - Date part stays visible in note after parsing
    - Checkbox in note linked to task completion status
    - Click task text to open editing modal

4.  **Task Management**

    - Standalone task creation (not from notes)
    - Task editing modal (content, due date)
    - Task context display (shows source note name when applicable)
    - Simple completion tracking

5.  **Agenda View**

    - Weekly view showing tasks
    - Overdue tasks prominently displayed
    - Basic date-based organization

### Interface Design (Obsidian-Style)

**Main Window:**
- Tabbed interface for open content (notes, tasks, agenda views)
- Each tab can display different content types
- Support for multiple notes/views open simultaneously
- Tab management (close, reorder, pin important tabs)

**Left Sidebar:**
- Folder tree navigation with expand/collapse
- Create new note/task buttons contextual to selected folder
- Quick actions for folder management (create, rename, delete)
- Recent notes/tasks list at bottom

**Home Dashboard (Default Tab):**
- Today's tasks overview
- This week's agenda preview
- Recent notes quick access
- Activity summary

## Implementation Strategy

### Phase 1 Development Order

1.  **Database setup** - PostgreSQL with schema above
2.  **Basic folder CRUD** - Create, read, update folder structure
3.  **Note CRUD** - Basic note management with simple text editor
4.  **Task CRUD** - Standalone task creation and management
5.  **Inline task parsing** - Parse and create tasks from note content
6.  **Agenda view** - Basic date-based task display
7.  **Rich text editor** - Upgrade from plain text to WYSIWYG

### Key Technical Decisions

**Editor Choice:** Start with markdown, upgrade to rich text editor like TipTap or React-Quill in later iterations.

**Inline Task Parsing:**

- Parse on note save/update
- Store task references separately but maintain live connection
- Update task status from both note checkboxes and task views

**Date Handling:**

- Support @today, @tomorrow, @YYYY-MM-DD format
- Parse and convert to proper Date objects for database storage
- Display friendly dates in UI

## Future Migration Path (Post-MVP)

### Recurrence System Migration

**Current (Phase 1):** Simple completed boolean on tasks **Future (Phase 2):** Task instances with per-occurrence completion

Migration strategy:

1.  Add `task_instances` table
2.  Create instance records for existing tasks
3.  Update API methods to use instance-based completion
4.  Remove completion fields from main tasks table

### Sync Architecture (Phase 3)

- Real-time task updates via WebSocket/Server-Sent Events
- Traditional API sync for notes/folders
- Self-hosted Docker container for multi-device sync

## Development Guidelines

### Code Organization

- `/pages/api/` - All backend logic
- `/components/` - Reusable UI components
- `/lib/` - Database utilities, API helpers
- `/types/` - TypeScript interfaces and types

### Database Interactions

- Use consistent database abstraction layer
- Always return standardized interface objects
- Prepare for easy migration to recurrence instances

### UI/UX Principles

- Obsidian-style tabbed interface for flexible content viewing
- Left sidebar for contextual creation and folder navigation
- Simple, clean interface with focus on content
- Keyboard shortcuts for power users (tab switching, quick creation)
- Mobile-responsive design from day one
- Fast, local-first feel with background sync

## Success Criteria

**Phase 1 Complete When:**

- Can create nested folders and navigate them
- Can write notes with basic rich text formatting
- Can create tasks inline with `- [ ]` syntax and basic date parsing
- Can manage standalone tasks
- Can view tasks in weekly agenda format
- Task context properly shows source note
- All data persists reliably in PostgreSQL

**Technical Debt to Address Later:**

- Rich text editor upgrade
- Real-time sync implementation
- Mobile app development
- Advanced recurrence patterns
- Calendar integration
- Time blocking features

## Development Notes

Remember: This is a personal tool first. Prioritize functionality that supports natural workflow over complex features. The goal is to eliminate the friction between capturing thoughts and managing actions.

Focus on building a solid foundation that can grow rather than trying to implement everything at once. Each phase should be fully functional and usable on its own.
