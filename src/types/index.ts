// Core interfaces for The Docket application

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  day?: string; // For weekly: 'monday', 'tuesday', etc.
  date?: number; // For monthly: 1-31
  month?: number; // For yearly: 1-12
}

export interface TaskInstance {
  id: string;
  content: string;
  dueDate: Date | null;
  completed: boolean;
  completedAt?: Date;
  sourceNote?: { id: string; title: string; };
  recurrenceRule?: RecurrenceRule;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  content: string;
  dueDate: Date | null;
  recurrenceRule?: RecurrenceRule;
  sourceNoteId?: string;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Database row interfaces matching current schema
export interface FolderRow {
  id: string;
  name: string;
  parent_id?: string;
  created_at: Date;
}

export interface NoteRow {
  id: string;
  title: string;
  content: string;
  folder_id?: string;
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface TaskRow {
  id: string;
  content: string;
  due_date: Date | null;
  recurrence_rule: any; // Ideally JSONB/Object
  source_note_id?: string; // Derived from join
  is_completed?: boolean; // 'completed' col in DB is boolean. 'isCompleted' might be old logic?
                         // Schema has `completed` BOOLEAN.
                         // But api.ts queries say `SELECT t."isCompleted"`.
                         // Let's check schema again. schema.sql says `completed` BOOLEAN.
                         // So it should be `completed: boolean`.
  completed?: boolean;
  completed_at?: Date;
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface NoteTaskRow {
  id: string;
  note_id: string;
  task_id: string;
  type: 'ORIGIN' | 'REFERENCE';
}

// Tab management interfaces
export type TabType = 'home' | 'note' | 'task' | 'tasks' | 'agenda' | 'folder' | 'calendar';

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  content: TabContent;
  isPinned?: boolean;
}

export interface TabContent {
  noteId?: string;
  note?: Note;
  folderId?: string;
  folder?: Folder;
  taskId?: string;
  task?: Task;
  scrollToTaskId?: string;
}