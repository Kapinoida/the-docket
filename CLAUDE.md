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

## Database Schema (Current)

```sql
-- Notes with rich text content and tagging support
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Tasks with future-proof structure for recurrence
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "isCompleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "recurrenceRule" TEXT,  -- JSON string for recurrence patterns
  tags TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Many-to-many relationship between notes and tasks
-- ORIGIN: task was created from this note
-- REFERENCE: task is referenced/linked in this note
CREATE TYPE "NoteTaskType" AS ENUM ('ORIGIN', 'REFERENCE');

CREATE TABLE note_tasks (
  id TEXT PRIMARY KEY,
  "noteId" TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "taskId" TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type "NoteTaskType" NOT NULL DEFAULT 'REFERENCE',
  UNIQUE ("noteId", "taskId")
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
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Task {
  id: string;
  content: string;
  dueDate: Date | null;
  completed: boolean;
  completedAt?: Date;
  recurrenceRule?: RecurrenceRule;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Key API methods implemented
getTasksForDateRange(startDate: Date, endDate: Date): TaskInstance[]
markTaskCompleted(taskId: string): void
createTaskFromNote(noteId: string, content: string, dueDate?: Date): Task
getAllTasks(): TaskInstance[]
updateTask(taskId: string, updates: Partial<Task>): Task
deleteTask(taskId: string): void
```

## Phase 1 Status: ✅ COMPLETE (Legacy System)

### Core Functionality Delivered

1.  **Note Management** ✅ COMPLETE
    - Create/edit notes with rich text editor
    - Folder-based organization with nested structure
    - Tab-based interface for multiple notes
    - Auto-save functionality

2.  **Rich Text Editing** ✅ COMPLETE  
    - TipTap-based WYSIWYG editor with markdown support
    - Read-only toggle for notes
    - Full formatting: bold, italic, headers, lists, colors
    - Task parsing from markdown checkboxes

3.  **Legacy Inline Task System** ✅ IMPLEMENTED (Being Replaced)
    - Syntax: `- [ ] Task content @today/@tomorrow/@YYYY-MM-DD`
    - Smart date parsing with conversion to formatted dates
    - Basic checkbox sync with task completion status
    - UUID-based task tracking with HTML comments
    
    **⚠️ LIMITATIONS IDENTIFIED:**
    - No live bidirectional sync between inline and external task edits
    - Static date text doesn't update when task due date changes elsewhere  
    - No interactive elements (hover, edit buttons) in markdown
    - Complex UUID/comment system clutters content

4.  **Task Management** ✅ COMPLETE
    - Full CRUD operations with PostgreSQL backend
    - Task-note relationship tracking (ORIGIN/REFERENCE types)
    - Due date handling and completion tracking
    - Calendar views with drag-and-drop scheduling

## Phase 2: Live-Synced Task System 🚧 IN PROGRESS

### Vision: Interactive Task Widgets
**Goal**: Replace static markdown tasks with live, interactive task widgets that sync in real-time across all views.

### User Experience Goals
1. **Clean Inline Display**: `☐ test task [Today] [Edit]` (no visible IDs)
2. **Live Bidirectional Sync**: Changes anywhere reflect everywhere instantly
3. **Interactive Elements**: Hover states, edit buttons, due date badges
4. **Markdown Shortcuts**: Keep `- [ ] task @today` input convenience
5. **Rich Context**: Tasks as first-class interactive objects, not text

### Current Interface (Phase 1)

**✅ Implemented:**
- Tabbed interface for open content (notes, tasks, agenda views)
- Folder-based left sidebar with nested organization
- Calendar views with drag-and-drop task scheduling  
- Task management across multiple views

**🚧 Phase 2 Interface Enhancements:**
- Interactive task widgets embedded in rich text
- Real-time sync indicators and badges
- Contextual task editing (inline modals, hover actions)
- Live task status updates across all open tabs

## Implementation Strategy

### Phase 1 Status: ✅ COMPLETE (Legacy Foundation)

1.  **Database Architecture** ✅ - PostgreSQL with task/note/folder schema
2.  **Rich Text Foundation** ✅ - TipTap editor with markdown support
3.  **Task CRUD System** ✅ - Complete backend task management
4.  **Basic Inline Tasks** ✅ - Static markdown-based task parsing
5.  **Folder Organization** ✅ - Nested folder structure with note organization
6.  **Calendar Integration** ✅ - Drag-and-drop task scheduling
7.  **Multi-tab Interface** ✅ - Workspace with tab management

### Phase 2 Development Plan: Live Task System

**🎯 Phase 2A: Foundation (Current)**
- Design interactive task widget architecture
- Create TipTap custom node extensions for tasks
- Build task position mapping system
- Implement real-time sync infrastructure

**🎯 Phase 2B: Core Widgets** 
- Replace markdown tasks with interactive widgets
- Add hover states and inline editing
- Implement live due date badges
- Build bidirectional sync system

**🎯 Phase 2C: Advanced Features**
- Real-time multi-user collaboration prep
- Advanced task widgets (progress, priority)
- Context-aware task suggestions
- Performance optimization for large documents

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

## Phase 2 Implementation Plan: Live Task System

### Phased Transition Strategy

**Why Phased?** Ensure we don't break existing functionality while building the new system.

#### **Phase 2A: Foundation & Architecture** 📋 CURRENT PHASE

**Deliverables:**
1. **Task Widget Architecture Design**
   - Custom TipTap node extension for interactive tasks
   - Task position mapping system (note position ↔ task ID)
   - Real-time sync event system design

2. **Hybrid System Setup**
   - Keep existing markdown parsing as fallback
   - Add widget rendering alongside current system
   - Create migration utilities for existing tasks

3. **Core Widget Components**
   ```tsx
   <TaskWidget 
     taskId="abc123"
     content="test task" 
     dueDate={date}
     completed={false}
     onToggle={handleToggle}
     onEdit={handleEdit}
     onHover={showEditButton}
   />
   ```

**Success Criteria:** ✅ Can create and render basic task widgets alongside existing markdown tasks

#### **Phase 2B: Interactive Widgets** 🎯 NEXT PHASE

**Deliverables:**
1. **Live Sync Implementation**
   - Real-time task updates across all open notes
   - Optimistic UI updates with server sync
   - WebSocket or polling-based sync system

2. **Enhanced Interactions**
   - Hover states with edit/delete buttons
   - Inline due date editing with calendar picker
   - Visual due date badges (Today, Tomorrow, Overdue)
   - Drag-and-drop for task reordering within notes

3. **Markdown Shortcut Preservation**
   - `- [ ] task @today` still works but creates widgets
   - Automatic conversion from markdown to widget on save
   - Option to export back to markdown

**Success Criteria:** ✅ Tasks are fully interactive, live-synced, and indistinguishable from native rich text elements

#### **Phase 2C: Migration & Polish** 🚀 FINAL PHASE

**Deliverables:**
1. **Legacy System Migration**
   - Migrate all existing markdown tasks to widget system
   - Remove old HTML comment and UUID system
   - Clean up deprecated parsing code

2. **Performance Optimization**
   - Efficient rendering for notes with many tasks
   - Virtual scrolling for large documents
   - Debounced sync to prevent excessive API calls

3. **Advanced Features**
   - Task templates and quick actions
   - Bulk task operations (complete all, reschedule)
   - Task dependencies visualization

**Success Criteria:** ✅ Complete transition to widget-based system with no functionality regression

### Technical Architecture

#### **TipTap Task Node Extension**
```typescript
const TaskNode = Node.create({
  name: 'taskWidget',
  group: 'block',
  content: 'inline*',
  
  addAttributes() {
    return {
      taskId: { default: null },
      completed: { default: false },
      dueDate: { default: null },
    }
  },
  
  renderReact() {
    return TaskWidget
  }
})
```

#### **Real-time Sync System**
```typescript
// Task update events
interface TaskUpdateEvent {
  taskId: string
  updates: Partial<Task>
  source: 'inline' | 'modal' | 'calendar' | 'external'
}

// Sync across all components
const useTaskSync = () => {
  // WebSocket/polling implementation
  // Optimistic updates with rollback
  // Conflict resolution
}
```

## Development Guidelines

### Code Organization

- `/src/app/api/` - Backend API routes
- `/src/components/` - UI components and task widgets
- `/src/lib/` - Database utilities, sync system
- `/src/types/` - TypeScript interfaces
- `/src/extensions/` - TipTap custom extensions

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

**Phase 1: ✅ COMPLETE (Legacy System Functional)**

- ✅ Rich text notes with TipTap editor
- ✅ Folder-based organization with full CRUD
- ✅ Legacy inline task system (markdown-based)
- ✅ Complete task management backend
- ✅ Calendar views with drag-and-drop scheduling
- ✅ Tab-based interface with multi-document support
- ✅ PostgreSQL persistence with proper schema

**Phase 2: 🚧 IN PROGRESS (Live Task System)**

- 🚧 Interactive task widget architecture design
- ⏳ TipTap custom node extensions for tasks
- ⏳ Real-time bidirectional sync system
- ⏳ Live due date badges and hover interactions
- ⏳ Migration path from legacy markdown tasks

**Phase 2 Technical Priorities:**

- **Interactive Task Widgets**: Replace static markdown with live components
- **Real-time Sync**: Bidirectional task updates across all views
- **Performance**: Optimize for documents with many embedded tasks
- **User Experience**: Seamless transition from markdown shortcuts to widgets

**Future Phases (Phase 3+):**

- Advanced recurrence system with task instances
- Multi-user real-time collaboration
- Mobile app development
- Advanced calendar integration
- AI-powered task suggestions

## Development Notes

Remember: This is a personal tool first. Prioritize functionality that supports natural workflow over complex features. The goal is to eliminate the friction between capturing thoughts and managing actions.

Focus on building a solid foundation that can grow rather than trying to implement everything at once. Each phase should be fully functional and usable on its own.
