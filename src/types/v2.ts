export interface Page {
  id: number;
  title: string;
  content: any; // JSONB from TipTap
  folder_id?: number | null; // Unified Architecture
  is_favorite: boolean;
  created_at: Date;
  updated_at: Date;
  items?: PageItem[];
  folder?: { id: number; name: string; } | null;
  parent_page?: { id: number; title: string; } | null;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[]; // [0-6] Sunday=0
  weekOfMonth?: number; // 1 (first), 2, 3, 4, -1 (last)
  day?: string; // Legacy: For weekly: 'monday'
  date?: number; // Legacy: For monthly: 1-31
  month?: number; // Legacy: For yearly: 1-12
}

export interface Task {
  id: number;
  content: string;
  status: TaskStatus;
  due_date: Date | null;
  recurrence_rule?: RecurrenceRule;
  created_at: Date;
  updated_at: Date;
}

export type PageItemType = 'page' | 'task';
export type DisplayMode = 'reference' | 'embed';

export interface PageItem {
  id: number;
  page_id: number; // The parent page
  
  // The item
  child_page_id?: number;
  child_task_id?: number;
  
  // Derived for convenience in TS (not in DB row strictly, but useful)
  type: PageItemType;
  item?: Page | Task; 
  
  position: number;
  display_mode: DisplayMode;
  created_at: Date;
}

export interface Context {
  direct_pages: Page[];
  ancestor_pages: Page[];
  // tags: string[]; // Future
}
