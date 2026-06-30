export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  weekOfMonth?: number;
  count?: number;
  until?: string;
}

export interface Task {
  id: number;
  content: string;
  status: TaskStatus;
  due_date: string | null;
  recurrence_rule?: RecurrenceRule;
  created_at: string;
  updated_at: string;
  page_name?: string;
}

export type PageItemType = 'page' | 'task';
export type DisplayMode = 'reference' | 'embed';

export interface Page {
  id: number;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  folder_id?: number | null;
  is_favorite: boolean;
  created_at: Date;
  updated_at: Date;
  items?: PageItem[];
  folder?: { id: number; name: string } | null;
  parent_page?: { id: number; title: string } | null;
}

export interface PageItem {
  id: number;
  page_id: number;
  child_page_id?: number;
  child_task_id?: number;
  type: PageItemType;
  item?: Page | Task;
  position: number;
  display_mode: DisplayMode;
  created_at: Date;
}

export interface Context {
  direct_pages: Page[];
  ancestor_pages: Page[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location: string;
  calendar_name: string;
  calendar_color?: string;
}

export interface CalendarSource {
  id: number;
  name: string;
  color: string;
  resource_type: string;
  server_url: string;
  calendar_url: string;
  username?: string;
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

export interface TaskRow {
  id: number;
  content: string;
  status: TaskStatus;
  due_date: string | null;
  recurrence_rule: RecurrenceRule | null;
  created_at: string;
  updated_at: string;
  completed?: boolean;
  completed_at?: string;
  source_note_id?: number;
}

export interface PageRow {
  id: number;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  folder_id?: number | null;
  is_favorite: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PageItemRow {
  id: number;
  page_id: number;
  child_page_id?: number;
  child_task_id?: number;
  position: number;
  display_mode: DisplayMode;
  created_at: Date;
}

export interface NoteRow {
  id: number;
  title: string;
  content: string;
  folder_id?: string;
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface FolderRow {
  id: number;
  name: string;
  parent_id?: string;
  created_at: Date;
}

export interface CalendarEventRow {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location: string;
  calendar_name: string;
  calendar_color?: string;
}

export interface CalendarSourceRow {
  id: number;
  name: string;
  color: string;
  resource_type: string;
  server_url: string;
  calendar_url: string;
  username?: string;
}

export function taskRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    content: row.content,
    status: row.status || 'todo',
    due_date: row.due_date,
    recurrence_rule: row.recurrence_rule || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function taskToTaskRow(task: Partial<Task>): Partial<TaskRow> {
  const row: Partial<TaskRow> = {};
  if (task.content !== undefined) row.content = task.content;
  if (task.status !== undefined) row.status = task.status;
  if (task.due_date !== undefined) row.due_date = task.due_date;
  if (task.recurrence_rule !== undefined) row.recurrence_rule = task.recurrence_rule ?? null;
  return row;
}

export function pageRowToPage(row: PageRow): Page {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    folder_id: row.folder_id,
    is_favorite: row.is_favorite,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}