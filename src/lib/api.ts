import pool from './db';
import { Task, TaskInstance, Note, Folder, TaskRow, NoteRow, FolderRow } from '@/types';

// Helper function to convert database rows to API objects
function taskRowToTask(row: TaskRow): Task {
  return {
    id: row.id.toString(),
    content: row.content,
    dueDate: row.due_date,
    recurrenceRule: row.recurrence_rule || undefined,
    sourceNoteId: row.source_note_id?.toString(),
    completed: row.completed,
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function noteRowToNote(row: NoteRow): Note {
  return {
    id: row.id.toString(),
    title: row.title,
    content: row.content,
    folderId: row.folder_id.toString(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function folderRowToFolder(row: FolderRow): Folder {
  return {
    id: row.id.toString(),
    name: row.name,
    parentId: row.parent_id?.toString(),
    createdAt: row.created_at,
  };
}

// Core API methods for task management
export async function getAllTasks(): Promise<TaskInstance[]> {
  const client = await pool.connect();
  try {
    const query = `
      SELECT t.*, n.title as note_title 
      FROM tasks t
      LEFT JOIN notes n ON t.source_note_id = n.id
      ORDER BY t.completed ASC, t.due_date ASC NULLS LAST, t.created_at DESC
    `;
    const result = await client.query(query);
    
    return result.rows.map((row): TaskInstance => ({
      id: row.id.toString(),
      content: row.content,
      dueDate: row.due_date,
      completed: row.completed,
      completedAt: row.completed_at || undefined,
      sourceNote: row.source_note_id ? {
        id: row.source_note_id.toString(),
        title: row.note_title || 'Untitled Note'
      } : undefined,
      recurrenceRule: row.recurrence_rule || undefined,
    }));
  } finally {
    client.release();
  }
}

export async function getTasksForDateRange(startDate: Date, endDate: Date): Promise<TaskInstance[]> {
  const client = await pool.connect();
  try {
    const query = `
      SELECT t.*, n.title as note_title 
      FROM tasks t
      LEFT JOIN notes n ON t.source_note_id = n.id
      WHERE t.due_date >= $1 AND t.due_date <= $2
      ORDER BY t.due_date ASC, t.created_at ASC
    `;
    const result = await client.query(query, [startDate, endDate]);
    
    return result.rows.map((row): TaskInstance => ({
      id: row.id.toString(),
      content: row.content,
      dueDate: row.due_date,
      completed: row.completed,
      completedAt: row.completed_at || undefined,
      sourceNote: row.source_note_id ? {
        id: row.source_note_id.toString(),
        title: row.note_title || 'Untitled Note'
      } : undefined,
      recurrenceRule: row.recurrence_rule || undefined,
    }));
  } finally {
    client.release();
  }
}

export async function markTaskCompleted(taskId: string, instanceDate?: Date): Promise<void> {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE tasks 
      SET completed = true, completed_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `;
    await client.query(query, [parseInt(taskId)]);
  } finally {
    client.release();
  }
}

export async function createTaskFromNote(noteId: string, content: string, dueDate?: Date): Promise<Task> {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO tasks (content, due_date, source_note_id, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `;
    const result = await client.query(query, [content, dueDate, parseInt(noteId)]);
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
      INSERT INTO tasks (content, due_date, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
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
      setClauses.push(`content = ${paramCount++}`);
      values.push(updates.content);
    }
    if (updates.dueDate !== undefined) {
      setClauses.push(`due_date = ${paramCount++}`);
      values.push(updates.dueDate);
    }
    if (updates.completed !== undefined) {
      setClauses.push(`completed = ${paramCount++}::boolean`);
      values.push(updates.completed);
      if (updates.completed) {
        setClauses.push(`completed_at = NOW()`);
      } else {
        setClauses.push(`completed_at = NULL`);
      }
    }

    if (setClauses.length === 0) {
      // No updates to perform, just fetch the current task
      const result = await client.query('SELECT * FROM tasks WHERE id = $1', [parseInt(taskId)]);
      return result.rows[0] ? taskRowToTask(result.rows[0]) : null;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(parseInt(taskId));

    const query = `
      UPDATE tasks 
      SET ${setClauses.join(', ')}
      WHERE id = ${paramCount}
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
    await client.query('DELETE FROM tasks WHERE id = $1', [parseInt(taskId)]);
  } finally {
    client.release();
  }
}

// Note CRUD operations
export async function createNote(title: string, content: string, folderId: string): Promise<Note> {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO notes (title, content, folder_id, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `;
    const result = await client.query(query, [title, content, parseInt(folderId)]);
    return noteRowToNote(result.rows[0]);
  } finally {
    client.release();
  }
}

export async function updateNote(noteId: string, updates: Partial<Pick<Note, 'title' | 'content'>>): Promise<Note> {
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
    values.push(parseInt(noteId));

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
    const query = 'SELECT * FROM notes WHERE folder_id = $1 ORDER BY updated_at DESC';
    const result = await client.query(query, [parseInt(folderId)]);
    return result.rows.map(noteRowToNote);
  } finally {
    client.release();
  }
}

export async function getAllNotes(): Promise<Note[]> {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM notes ORDER BY updated_at DESC';
    const result = await client.query(query);
    return result.rows.map(noteRowToNote);
  } finally {
    client.release();
  }
}

export async function getNote(noteId: string): Promise<Note | null> {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM notes WHERE id = $1';
    const result = await client.query(query, [parseInt(noteId)]);
    return result.rows[0] ? noteRowToNote(result.rows[0]) : null;
  } finally {
    client.release();
  }
}

export async function deleteNote(noteId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM notes WHERE id = $1', [parseInt(noteId)]);
  } finally {
    client.release();
  }
}

// Folder CRUD operations
export async function createFolder(name: string, parentId?: string): Promise<Folder> {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO folders (name, parent_id, created_at)
      VALUES ($1, $2, NOW())
      RETURNING *
    `;
    const result = await client.query(query, [name, parentId ? parseInt(parentId) : null]);
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
  const client = await pool.connect();
  try {
    const query = `
      UPDATE folders 
      SET name = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await client.query(query, [name, parseInt(folderId)]);
    return folderRowToFolder(result.rows[0]);
  } finally {
    client.release();
  }
}

export async function deleteFolder(folderId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM folders WHERE id = $1', [parseInt(folderId)]);
  } finally {
    client.release();
  }
}