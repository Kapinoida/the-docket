import pool from './db';
import { Task, TaskInstance, Note, Folder, TaskRow, NoteRow, FolderRow } from '@/types';

// Helper function to convert database rows to API objects
// Helper function to convert database rows to API objects
function taskRowToTask(row: TaskRow): Task {
  return {
    id: String(row.id), // Ensure ID is string for frontend
    content: row.content,
    dueDate: row.due_date,
    recurrenceRule: row.recurrence_rule ? (row.recurrence_rule as any) : undefined,
    sourceNoteId: row.source_note_id ? String(row.source_note_id) : undefined,
    completed: row.completed || false,
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function noteRowToNote(row: NoteRow): Note {
  return {
    id: String(row.id),
    title: row.title,
    content: row.content,
    folderId: row.folder_id ? String(row.folder_id) : 'home_folder',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper function for folders
function folderRowToFolder(row: FolderRow): Folder {
  return {
    id: String(row.id),
    name: row.name,
    parentId: row.parent_id ? String(row.parent_id) : undefined,
    createdAt: row.created_at,
  };
}

// Core API methods for task management
export async function getAllTasks(): Promise<TaskInstance[]> {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        t.*,
        n.title as note_title
      FROM tasks t
      LEFT JOIN notes n ON t.source_note_id = n.id
      ORDER BY t.completed ASC, t.due_date ASC NULLS LAST, t.created_at DESC
      LIMIT 1000
    `;
    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      return [];
    }
    
    return result.rows.map((row): TaskInstance => ({
      id: String(row.id),
      content: row.content,
      dueDate: row.due_date,
      completed: row.completed,
      completedAt: row.completed_at || undefined,
      sourceNote: row.source_note_id ? {
        id: String(row.source_note_id),
        title: row.note_title || 'Untitled Note'
      } : undefined,
      recurrenceRule: row.recurrence_rule ? (row.recurrence_rule as any) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error in getAllTasks:', error);
    return [];
  } finally {
    client.release();
  }
}

export async function getTasksByIds(taskIds: string[]): Promise<TaskInstance[]> {
  if (taskIds.length === 0) {
    return [];
  }
  
  // Filter and validate task IDs - must be numeric for DB
  const validTaskIds = taskIds.filter(id => {
    return id && !isNaN(Number(id));
  });
  
  if (validTaskIds.length === 0) {
    return [];
  }
  
  const client = await pool.connect();
  try {
    const placeholders = validTaskIds.map((_, index) => `$${index + 1}`).join(',');
    const query = `
      SELECT 
        t.*,
        n.title as note_title
      FROM tasks t
      LEFT JOIN notes n ON t.source_note_id = n.id
      WHERE t.id IN (${placeholders})
    `;
    const result = await client.query(query, validTaskIds);
    
    return result.rows.map((row): TaskInstance => ({
      id: String(row.id),
      content: row.content,
      dueDate: row.due_date,
      completed: row.completed,
      completedAt: row.completed_at || undefined,
      sourceNote: row.source_note_id ? {
        id: String(row.source_note_id),
        title: row.note_title || 'Untitled Note'
      } : undefined,
      recurrenceRule: row.recurrence_rule ? (row.recurrence_rule as any) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } finally {
    client.release();
  }
}

export async function getTasksForDateRange(startDate: Date, endDate: Date): Promise<TaskInstance[]> {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        t.*,
        n.title as note_title
      FROM tasks t
      LEFT JOIN notes n ON t.source_note_id = n.id
      WHERE t.due_date >= $1 AND t.due_date <= $2
      ORDER BY t.due_date ASC, t.created_at ASC
    `;
    const result = await client.query(query, [startDate, endDate]);
    
    return result.rows.map((row): TaskInstance => ({
      id: String(row.id),
      content: row.content,
      dueDate: row.due_date,
      completed: row.completed,
      completedAt: row.completed_at || undefined,
      sourceNote: row.source_note_id ? {
        id: String(row.source_note_id),
        title: row.note_title || 'Untitled Note'
      } : undefined,
      recurrenceRule: row.recurrence_rule ? (row.recurrence_rule as any) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } finally {
    client.release();
  }
}

export async function markTaskCompleted(taskId: string): Promise<void> {
  // Validate ID
  if (!taskId || isNaN(Number(taskId))) return;

  const client = await pool.connect();
  try {
    const query = `
      UPDATE tasks 
      SET completed = true, updated_at = NOW()
      WHERE id = $1
    `;
    await client.query(query, [taskId]);
  } finally {
    client.release();
  }
}

export async function createTaskFromNote(noteId: string, content: string, dueDate?: Date): Promise<Task> {
  const client = await pool.connect();
  try {
    // Rely on SERIAL id
    const query = `
      INSERT INTO tasks (content, due_date, source_note_id, updated_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    const result = await client.query(query, [content, dueDate, noteId]);
    
    return taskRowToTask(result.rows[0]);
  } finally {
    client.release();
  }
}

// Task CRUD operations
export async function createTask(content: string, dueDate?: Date): Promise<Task> {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO tasks (content, due_date, updated_at)
      VALUES ($1, $2, NOW())
      RETURNING *
    `;
    const result = await client.query(query, [content, dueDate]);
    return taskRowToTask(result.rows[0]);
  } finally {
    client.release();
  }
}

export async function updateTask(taskId: string, updates: Partial<Pick<Task, 'content' | 'dueDate' | 'completed'>>): Promise<Task | null> {
  const client = await pool.connect();
  try {
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    if (updates.content !== undefined) {
      setClauses.push(`content = $${paramCount++}`);
      values.push(updates.content);
    }
    if (updates.dueDate !== undefined) {
      setClauses.push(`due_date = $${paramCount++}`); // snake_case
      values.push(updates.dueDate);
    }
    if (updates.completed !== undefined) {
      setClauses.push(`completed = $${paramCount++}::boolean`); // snake_case
      values.push(updates.completed);
    }

    if (setClauses.length === 0) {
      // No updates to perform, just fetch the current task
      // Fetch source_note_id from tasks table directly
      const query = `
        SELECT t.*
        FROM tasks t
        WHERE t.id = $1
      `;
      const result = await client.query(query, [taskId]);
      return result.rows[0] ? taskRowToTask(result.rows[0]) : null;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(taskId);

    const query = `
      UPDATE tasks 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      return null; // Task not found
    }
    
    return taskRowToTask(result.rows[0]);
  } finally {
    client.release();
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  const client = await pool.connect();
  try {
    // Delete task (note_tasks will be deleted automatically due to CASCADE)
    await client.query('DELETE FROM tasks WHERE id = $1', [taskId]);
  } finally {
    client.release();
  }
}

export async function deleteCompletedTasks(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM tasks WHERE completed = true');
  } finally {
    client.release();
  }
}

// Note CRUD operations
export async function createNote(title: string, content: string, folderId?: string): Promise<Note> {
  const client = await pool.connect();
  try {
    const targetFolderId = (folderId && folderId !== 'home_folder' && !isNaN(Number(folderId))) ? folderId : null;
    const query = `
      INSERT INTO notes (title, content, folder_id, updated_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    const result = await client.query(query, [title, content, targetFolderId]);
    return noteRowToNote(result.rows[0]);
  } finally {
    client.release();
  }
}

export async function updateNote(noteId: string, updates: Partial<Pick<Note, 'title' | 'content'>>): Promise<Note> {
  if (!noteId || isNaN(Number(noteId))) throw new Error('Invalid Note ID');
  
  const client = await pool.connect();
  try {
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramCount++}`);
      values.push(updates.title);
    }
    if (updates.content !== undefined) {
      setClauses.push(`content = $${paramCount++}`);
      values.push(updates.content);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(noteId);

    const query = `
      UPDATE notes 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    return noteRowToNote(result.rows[0]);
  } finally {
    client.release();
  }
}

export async function getNotesByFolder(folderId: string): Promise<Note[]> {
  const client = await pool.connect();
  try {
    let query: string;
    let params: any[];

    if (!folderId || folderId === 'home_folder' || isNaN(Number(folderId))) {
      // Fetch root notes (folder_id is NULL)
      query = 'SELECT * FROM notes WHERE folder_id IS NULL ORDER BY updated_at DESC';
      params = [];
    } else {
      query = 'SELECT * FROM notes WHERE folder_id = $1 ORDER BY updated_at DESC';
      params = [folderId];
    }

    const result = await client.query(query, params);
    return result.rows.map(noteRowToNote);
  } finally {
    client.release();
  }
}

export async function getAllNotes(): Promise<Note[]> {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM notes ORDER BY updated_at DESC LIMIT 1000';
    const result = await client.query(query);
    return result.rows.map(noteRowToNote);
  } finally {
    client.release();
  }
}

export async function getNote(noteId: string): Promise<Note | null> {
  if (!noteId || isNaN(Number(noteId))) return null;

  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM notes WHERE id = $1';
    const result = await client.query(query, [noteId]);
    return result.rows[0] ? noteRowToNote(result.rows[0]) : null;
  } finally {
    client.release();
  }
}

export async function deleteNote(noteId: string): Promise<void> {
  if (!noteId || isNaN(Number(noteId))) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Cascade delete: Delete tasks associated with the note
    await client.query('DELETE FROM tasks WHERE source_note_id = $1', [noteId]);
    // Delete the note
    await client.query('DELETE FROM notes WHERE id = $1', [noteId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Folder CRUD operations
export async function createFolder(name: string, parentId?: string): Promise<Folder> {
  const client = await pool.connect();
  try {
    const targetParentId = (parentId && !isNaN(Number(parentId))) ? parentId : null;
    const query = `
      INSERT INTO folders (name, parent_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await client.query(query, [name, targetParentId]);
    return folderRowToFolder(result.rows[0]);
  } finally {
    client.release();
  }
}

export async function getFolders(): Promise<Folder[]> {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM folders ORDER BY name ASC';
    const result = await client.query(query);
    return result.rows.map(folderRowToFolder);
  } finally {
    client.release();
  }
}

export async function updateFolder(folderId: string, name: string): Promise<Folder> {
  if (!folderId || isNaN(Number(folderId))) throw new Error('Invalid Folder ID');

  const client = await pool.connect();
  try {
    const query = `
      UPDATE folders 
      SET name = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await client.query(query, [name, folderId]);
    return folderRowToFolder(result.rows[0]);
  } finally {
    client.release();
  }
}

export async function deleteFolder(folderId: string): Promise<void> {
  if (!folderId || isNaN(Number(folderId))) return;

  const client = await pool.connect();
  try {
    await client.query('DELETE FROM folders WHERE id = $1', [folderId]);
  } finally {
    client.release();
  }
}