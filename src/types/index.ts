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

// Database row interfaces
export interface FolderRow {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: Date;
}

export interface NoteRow {
  id: number;
  title: string;
  content: string;
  folder_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface TaskRow {
  id: number;
  content: string;
  due_date: Date | null;
  recurrence_rule: RecurrenceRule | null;
  source_note_id: number | null;
  completed: boolean;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Tab management interfaces
export type TabType = 'home' | 'note' | 'task' | 'agenda' | 'folder';

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
}