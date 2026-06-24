import { Pool } from 'pg';
import { Page, Task, PageItem, PageItemType } from '../types';

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'), // Updated to match docker-compose
  database: process.env.DB_NAME || 'the_docket',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

console.log('Database Pool Configured:', {
  host: process.env.DB_HOST || 'localhost (default)',
  port: process.env.DB_PORT || '5433 (default)',
  database: process.env.DB_NAME || 'the_docket (default)',
  user: process.env.DB_USER || 'postgres (default)'
});

export default pool;

// V2 Data Access Functions

export async function createPage(title: string, content: any = {}, folderId?: number): Promise<Page> {
  const res = await pool.query(
    'INSERT INTO pages (title, content, folder_id) VALUES ($1, $2, $3) RETURNING *',
    [title, content, folderId || null]
  );
  return res.rows[0];
}

export async function getPage(id: number): Promise<Page | null> {
  const query = `
    SELECT p.*,
           row_to_json(f.*) as folder_data,
           (
             SELECT row_to_json(parent.*)
             FROM page_items pi
             JOIN pages parent ON pi.page_id = parent.id
             WHERE pi.child_page_id = p.id
             LIMIT 1
           ) as parent_page_data
    FROM pages p
    LEFT JOIN folders f ON p.folder_id = f.id
    WHERE p.id = $1
  `;
  
  const res = await pool.query(query, [id]);
  const row = res.rows[0];
  
  if (!row) return null;
  
  return {
      ...row,
      folder: row.folder_data ? { id: row.folder_data.id, name: row.folder_data.name } : null,
      parent_page: row.parent_page_data ? { id: row.parent_page_data.id, title: row.parent_page_data.title } : null
  };
}

export async function createTask(content: string, dueDate: Date | null = null, recurrenceRule: any = null): Promise<Task> {
  const res = await pool.query(
    'INSERT INTO tasks (content, due_date, recurrence_rule) VALUES ($1, $2, $3) RETURNING *',
    [content, dueDate, recurrenceRule]
  );
  return res.rows[0];
}

export async function getTask(id: number): Promise<Task | null> {
  const res = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function addItemToPage(
  pageId: number,
  itemId: number,
  itemType: PageItemType,
  position: number = 0
): Promise<PageItem> {
  const column = itemType === 'page' ? 'child_page_id' : 'child_task_id';
  
  const res = await pool.query(
    `INSERT INTO page_items (page_id, ${column}, position) VALUES ($1, $2, $3) RETURNING *`,
    [pageId, itemId, position]
  );
  
  // map result to TS interface
  return {
    ...res.rows[0],
    type: itemType
  };
}

export async function getPageItems(pageId: number): Promise<PageItem[]> {
  // polymorphic join to get the actual item content
  // Note: This is a robust query to get everything on the page
  const query = `
    SELECT 
      pi.*,
      CASE 
        WHEN pi.child_page_id IS NOT NULL THEN 'page'
        WHEN pi.child_task_id IS NOT NULL THEN 'task'
      END as type,
      row_to_json(p.*) as page_data,
      row_to_json(t.*) as task_data
    FROM page_items pi
    LEFT JOIN pages p ON pi.child_page_id = p.id
    LEFT JOIN tasks t ON pi.child_task_id = t.id
    WHERE pi.page_id = $1
    AND (pi.child_page_id IS NOT NULL OR (t.content IS NOT NULL AND t.content != ''))
    ORDER BY pi.position ASC
  `;
  
  const res = await pool.query(query, [pageId]);
  
  return res.rows.map(row => {
    const item = row.type === 'page' ? row.page_data : row.task_data;
    return {
      id: row.id,
      page_id: row.page_id,
      child_page_id: row.child_page_id,
      child_task_id: row.child_task_id,
      type: row.type as PageItemType,
      position: row.position,
      display_mode: row.display_mode,
      created_at: row.created_at,
      item: item
    };
  });
} 

export async function getFocusTasks() {
  const now = new Date();
  
  // Overdue: due < today (start of day)
  // Today: due >= start of today AND due <= end of today
  // Week: due > end of today AND due <= end of week
  
  // Note: relying on Postgres DATE comparison or passing JS dates?
  // Using SQL standard logic for simplicity and "Today" defined by server time (or we could pass timezone offset)
  // modifying query to handle dates cleanly.
  
  // We'll simplify and fetch all active tasks with a due date, then group in code to allow flexible timezone filtering if needed,
  // OR use specific SQL queries. 
  // Let's use 3 specific queries for efficiency if list is huge, but fetching all "future/recent" might be okay.
  // Given it's a personal app, fetching all incomplete tasks with due dates is fine (likely < 1000).
  
  const query = `
    SELECT * FROM tasks 
    WHERE status != 'done' 
    AND due_date IS NOT NULL 
    ORDER BY due_date ASC
  `;
  
  const res = await pool.query(query);
  const tasks = res.rows;
  
  // Grouping in JS (easier to handle "End of Week" logic with date-fns if imported, or native JS)
  const todayStart = new Date(now.setHours(0,0,0,0));
  const todayEnd = new Date(now.setHours(23,59,59,999));
  
  // Get end of week (Sunday or Monday? ISO says week starts Mon, US Sunday. Let's assume standard 'upcoming 7 days' or 'rest of calendar week')
  // Let's do "Next 7 days" or "End of current week"?
  // User said "due this week". Usually means "by Sunday".
  const day = now.getDay(); // 0 is Sunday
  const diff = 7 - day; // days to next Sunday (if today is Sunday 0, diff is 7? No, next Sunday)
  // Let's just say "Next 7 days" is often more useful for Focus mode, but strict "This Week" implies calendar.
  // I will define 'Week' as 'Next 7 days' for utility, or separate 'This Week'.
  // Let's stick to "End of current week (Saturday/Sunday)".
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (6 - day + (day === 0 ? -6 : 1))); // Next Sunday? 
  // Actually simpler:
  const nextWeek = new Date(todayEnd);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const overdue: Task[] = [];
  const today: Task[] = [];
  const week: Task[] = [];
  
  tasks.forEach(task => {
      if (!task.due_date) return;
      const d = new Date(task.due_date);
      
      if (d < todayStart) {
          overdue.push(task);
      } else if (d >= todayStart && d <= todayEnd) {
          today.push(task);
      } else if (d > todayEnd && d <= nextWeek) { // Using "Next 7 Days" as generic "Week" bucket for now
          week.push(task);
      }
  });
  
  return { overdue, today, week };
}

// ... (existing code) ...
export async function createTombstone(taskId: number) {
  // Check if task interacts with CalDAV
  const res = await pool.query('SELECT caldav_uid FROM task_sync_meta WHERE task_id = $1', [taskId]);
  if (res.rows.length > 0) {
      const uid = res.rows[0].caldav_uid;
      await pool.query('INSERT INTO deleted_task_sync_log (caldav_uid) VALUES ($1)', [uid]);
      console.log(`[Sync] Created tombstone for task ${taskId} (UID: ${uid})`);
  }
}

export async function deleteTaskReferences(taskId: number) {
  // 1. Remove references from Pages (TipTap Content)
  // Match task widget nodes that contain a specific taskId
  // Pattern handles: "taskId": 123, "taskId":"123", "taskId": "123"
  try {
    const pagesWithTask = await pool.query(
        `SELECT id, content FROM pages WHERE content::text ~ $1`, 
        [`\"taskId\"\\s*:\\s*(?:\"|\\s*)(${taskId})(?:\"|\\s*)`]
    );
    
    for (const page of pagesWithTask.rows) {
        let changed = false;

        const removeTaskNode = (node: any): any => {
            if (!node) return node;
            
            if (node.type === 'v2Task' && node.attrs && node.attrs.taskId == taskId) {
                changed = true;
                return null;
            }

            if (node.content && Array.isArray(node.content)) {
                node.content = node.content
                    .map((child: any) => removeTaskNode(child))
                    .filter((child: any) => child !== null);
            }
            return node;
        };

        const newContent = removeTaskNode(JSON.parse(JSON.stringify(page.content)));

        if (changed) {
            await pool.query('UPDATE pages SET content = $1, updated_at = NOW() WHERE id = $2', [newContent, page.id]);
            console.log(`[Cleaner] Removed task ${taskId} from page ${page.id}`);
        }
    }
  } catch (error) {
    console.error(`[Cleaner] Failed to remove task references from pages:`, error);
  }

  // 2. Remove references from page items where this task is a child
  await pool.query('DELETE FROM page_items WHERE child_task_id = $1', [taskId]);
}


// --- Tagging System ---

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export async function createTag(name: string, color: string = 'blue'): Promise<Tag> {
  const res = await pool.query(
    'INSERT INTO tags (name, color) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET color = $2 RETURNING *',
    [name, color]
  );
  return res.rows[0];
}

export async function getTags(): Promise<Tag[]> {
  const res = await pool.query('SELECT * FROM tags ORDER BY name ASC');
  return res.rows;
}

export async function assignTag(tagId: number, itemId: number, itemType: 'page' | 'task') {
  await pool.query(
    'INSERT INTO tag_assignments (tag_id, item_id, item_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [tagId, itemId, itemType]
  );
}

export async function removeTag(tagId: number, itemId: number, itemType: 'page' | 'task') {
  await pool.query(
    'DELETE FROM tag_assignments WHERE tag_id = $1 AND item_id = $2 AND item_type = $3',
    [tagId, itemId, itemType]
  );
}

export async function getTagsForItem(itemId: number, itemType: 'page' | 'task'): Promise<Tag[]> {
  const res = await pool.query(`
    SELECT t.* 
    FROM tags t
    JOIN tag_assignments ta ON t.id = ta.tag_id
    WHERE ta.item_id = $1 AND ta.item_type = $2
    ORDER BY t.name ASC
  `, [itemId, itemType]);
  return res.rows;
}

// --- Task Data Access ---

export interface GetTasksOptions {
  due?: 'today';
  context?: 'none';
  status?: 'todo' | 'done' | 'all';
  sort?: 'dueDate' | 'oldest' | 'newest';
}

export async function getTasks(options: GetTasksOptions = {}): Promise<Task[]> {
  let query = `SELECT t.*, (SELECT p.title FROM page_items pi JOIN pages p ON p.id = pi.page_id WHERE pi.child_task_id = t.id LIMIT 1) as page_name`;
  const params: any[] = [];
  let paramIdx = 1;

  if (options.due === 'today') {
    query += ` FROM tasks t WHERE t.due_date::date <= CURRENT_DATE AND (t.status IS NULL OR t.status != 'done') AND t.content != ''`;
    query += ` ORDER BY t.due_date ASC, t.created_at ASC`;
  } else if (options.context === 'none') {
    query += ` FROM tasks t WHERE t.content != '' AND (t.status IS NULL OR t.status != 'done')`;
    query += ` AND NOT EXISTS (SELECT 1 FROM page_items WHERE child_task_id = t.id)`;
    query += ` ORDER BY t.created_at DESC`;
  } else {
    query += " FROM tasks t WHERE t.content != ''";
    if (options.status === 'todo') {
      query += " AND (t.status IS NULL OR t.status != 'done')";
    } else if (options.status === 'done') {
      query += " AND t.status = 'done'";
    }
    if (options.sort === 'dueDate') {
      query += " ORDER BY t.due_date ASC NULLS LAST, t.created_at ASC";
    } else if (options.sort === 'oldest') {
      query += " ORDER BY t.created_at ASC";
    } else {
      query += " ORDER BY t.created_at DESC";
    }
  }

  const res = await pool.query(query, params);
  return res.rows;
}

export interface UpdateTaskFields {
  content?: string;
  status?: string;
  due_date?: Date | string | null;
  recurrence_rule?: any;
}

export async function updateTask(id: number, fields: UpdateTaskFields): Promise<Task | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (fields.content !== undefined) {
    setClauses.push(`content = $${paramIdx++}`);
    values.push(fields.content);
  }
  if (fields.status !== undefined) {
    setClauses.push(`status = $${paramIdx++}`);
    values.push(fields.status);
  }
  if (fields.due_date !== undefined) {
    setClauses.push(`due_date = $${paramIdx++}`);
    values.push(fields.due_date);
  }
  if (fields.recurrence_rule !== undefined) {
    setClauses.push(`recurrence_rule = $${paramIdx++}`);
    values.push(fields.recurrence_rule);
  }

  if (setClauses.length === 0) return null;

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const query = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`;
  const res = await pool.query(query, values);
  return res.rows[0] || null;
}

export async function deleteTask(id: number): Promise<void> {
  await createTombstone(id);
  await deleteTaskReferences(id);
  await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  await pool.query('DELETE FROM page_items WHERE child_task_id = $1', [id]);
}

export async function deleteCompletedTasks(): Promise<number> {
  const completedRes = await pool.query("SELECT id FROM tasks WHERE status = 'done'");
  const completedIds = completedRes.rows.map((r: any) => r.id);

  for (const taskId of completedIds) {
    await createTombstone(taskId);
    await deleteTaskReferences(taskId);
  }

  const deleteRes = await pool.query("DELETE FROM tasks WHERE status = 'done'");
  return deleteRes.rowCount ?? 0;
}

// --- Folder Data Access ---

export async function getFolders(): Promise<any[]> {
  const res = await pool.query('SELECT * FROM folders ORDER BY name ASC');
  return res.rows;
}

export async function createFolder(name: string, parentId?: number | null): Promise<any> {
  const res = await pool.query(
    'INSERT INTO folders (name, parent_id) VALUES ($1, $2) RETURNING *',
    [name, parentId || null]
  );
  return res.rows[0];
}

export async function updateFolder(id: number, fields: { name?: string; parent_id?: number | null }): Promise<any> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (fields.name !== undefined) {
    setClauses.push(`name = $${paramIdx++}`);
    values.push(fields.name);
  }
  if (fields.parent_id !== undefined) {
    setClauses.push(`parent_id = $${paramIdx++}`);
    values.push(fields.parent_id);
  }

  if (setClauses.length === 0) return null;

  values.push(id);
  const query = `UPDATE folders SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`;
  const res = await pool.query(query, values);
  return res.rows[0] || null;
}

export async function deleteFolder(id: number): Promise<void> {
  await pool.query('DELETE FROM folders WHERE id = $1', [id]);
}

// --- Calendar Event Data Access ---

export async function getCalendarEvents(start: string, end: string): Promise<{ regular: any[]; recurring: any[] }> {
  const regularQuery = `
    SELECT e.*, c.name as calendar_name, c.username, c.color as calendar_color
    FROM calendar_events e
    JOIN caldav_configs c ON e.calendar_id = c.id
    WHERE c.enabled = TRUE
    AND e.rrule IS NULL
    AND (e.start_time <= $2::timestamptz AND e.end_time >= $1::timestamptz)
  `;
  const recurringQuery = `
    SELECT e.*, c.name as calendar_name, c.username, c.color as calendar_color
    FROM calendar_events e
    JOIN caldav_configs c ON e.calendar_id = c.id
    WHERE c.enabled = TRUE
    AND e.rrule IS NOT NULL
    AND e.start_time <= $1::timestamptz
  `;
  const [regularRes, recurringRes] = await Promise.all([
    pool.query(regularQuery, [start, end]),
    pool.query(recurringQuery, [end])
  ]);
  return { regular: regularRes.rows, recurring: recurringRes.rows };
}

export async function updateCalendarEvent(id: string, fields: { start_time?: string; end_time?: string; last_synced_at?: Date }): Promise<any> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (fields.start_time !== undefined) {
    setClauses.push(`start_time = $${paramIdx++}`);
    values.push(fields.start_time);
  }
  if (fields.end_time !== undefined) {
    setClauses.push(`end_time = $${paramIdx++}`);
    values.push(fields.end_time);
  }
  if (fields.last_synced_at !== undefined) {
    setClauses.push(`last_synced_at = $${paramIdx++}`);
    values.push(fields.last_synced_at);
  }

  if (setClauses.length === 0) return null;

  values.push(id);
  const query = `UPDATE calendar_events SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`;
  const res = await pool.query(query, values);
  return res.rows[0] || null;
}

export async function getCalendarEventWithConfig(id: string): Promise<any> {
  const res = await pool.query(`
    SELECT e.*, c.server_url, c.username, c.password, c.calendar_url
    FROM calendar_events e
    JOIN caldav_configs c ON e.calendar_id = c.id
    WHERE e.id = $1 AND c.enabled = TRUE
  `, [id]);
  return res.rows[0] || null;
}

export async function updateCalendarEventRawData(id: string, rawData: string): Promise<void> {
  await pool.query('UPDATE calendar_events SET raw_data = $1 WHERE id = $2', [rawData, id]);
}

export async function getCalendarEventById(id: string): Promise<any> {
  const res = await pool.query(`
    SELECT e.*, c.name as calendar_name, c.color as calendar_color
    FROM calendar_events e
    JOIN caldav_configs c ON e.calendar_id = c.id
    WHERE e.id = $1
  `, [id]);
  return res.rows[0] || null;
}

// --- Push Notification Data Access ---

export async function upsertPushSubscription(endpoint: string, p256dh: string, auth: string): Promise<void> {
  await pool.query(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
     VALUES ($1, $2, $3)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = $2, auth = $3`,
    [endpoint, p256dh, auth]
  );
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}

export async function hasPushSubscriptions(): Promise<boolean> {
  const res = await pool.query('SELECT COUNT(*)::int as count FROM push_subscriptions');
  return res.rows[0].count > 0;
}

export async function getPushSubscriptions(): Promise<any[]> {
  const res = await pool.query('SELECT * FROM push_subscriptions');
  return res.rows;
}

export async function getTasksDueSoon(): Promise<any[]> {
  const res = await pool.query(`
    SELECT id, content, due_date
    FROM tasks
    WHERE status = 'todo'
      AND due_date IS NOT NULL
      AND due_date > NOW()
      AND due_date <= NOW() + INTERVAL '10 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM push_notifications pn
        WHERE pn.task_id = tasks.id
          AND pn.sent_at > tasks.updated_at
      )
    ORDER BY due_date
  `);
  return res.rows;
}

export async function recordPushNotification(taskId: number): Promise<void> {
  await pool.query('INSERT INTO push_notifications (task_id) VALUES ($1)', [taskId]);
}

export async function removePushSubscriptionById(id: number): Promise<void> {
  await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [id]);
}

// --- CalDAV Config Data Access ---

export async function getCalDAVConfigs(): Promise<any[]> {
  const res = await pool.query(`
    SELECT id, server_url, username, calendar_url, enabled, name, resource_type, color, created_at
    FROM caldav_configs
    WHERE enabled = TRUE
    ORDER BY created_at ASC
  `);
  return res.rows;
}

export async function createCalDAVConfig(fields: { server_url: string; username: string; password: string; calendar_url: string; name: string; resource_type: string; color: string }): Promise<any> {
  const res = await pool.query(
    `INSERT INTO caldav_configs (server_url, username, password, calendar_url, name, resource_type, color)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, server_url, username, enabled, name, resource_type, color`,
    [fields.server_url, fields.username, fields.password, fields.calendar_url, fields.name, fields.resource_type, fields.color]
  );
  return res.rows[0];
}

export async function updateCalDAVConfig(id: number, fields: { server_url?: string; username?: string; password?: string; calendar_url?: string; name?: string; resource_type?: string; color?: string }): Promise<any> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (fields.server_url !== undefined) { setClauses.push(`server_url = $${paramIdx++}`); values.push(fields.server_url); }
  if (fields.username !== undefined) { setClauses.push(`username = $${paramIdx++}`); values.push(fields.username); }
  if (fields.calendar_url !== undefined) { setClauses.push(`calendar_url = $${paramIdx++}`); values.push(fields.calendar_url); }
  if (fields.name !== undefined) { setClauses.push(`name = $${paramIdx++}`); values.push(fields.name); }
  if (fields.resource_type !== undefined) { setClauses.push(`resource_type = $${paramIdx++}`); values.push(fields.resource_type); }
  if (fields.color !== undefined) { setClauses.push(`color = $${paramIdx++}`); values.push(fields.color); }
  if (fields.password !== undefined) { setClauses.push(`password = $${paramIdx++}`); values.push(fields.password); }

  if (setClauses.length === 0) return null;

  setClauses.push(`updated_at = NOW()`);
  values.push(id);
  const query = `UPDATE caldav_configs SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING id, server_url, username, enabled, name, resource_type, color`;
  const res = await pool.query(query, values);
  return res.rows[0] || null;
}

export async function deleteCalDAVConfig(id: number): Promise<void> {
  await pool.query('DELETE FROM caldav_configs WHERE id = $1', [id]);
}

// --- Journal Data Access ---

export async function getJournalPage(): Promise<any> {
  const res = await pool.query("SELECT * FROM pages WHERE title = 'Journal'");
  return res.rows[0] || null;
}

export async function upsertJournalContent(pageId: number, content: any): Promise<void> {
  await pool.query(
    'UPDATE pages SET content = $1, updated_at = NOW() WHERE id = $2',
    [content, pageId]
  );
}

export async function createJournalPage(): Promise<any> {
  const res = await pool.query(
    "INSERT INTO pages (title, content) VALUES ('Journal', $1) RETURNING *",
    [{ type: 'doc', content: [] }]
  );
  return res.rows[0];
}

// --- Search ---

export async function searchAll(query: string): Promise<any[]> {
  const searchTerm = `%${query}%`;

  const [pagesRes, tasksRes, tagsRes] = await Promise.all([
    pool.query(`SELECT id, title, 'page' as type FROM pages WHERE title ILIKE $1 LIMIT 5`, [searchTerm]),
    pool.query(`SELECT id, content, 'task' as type FROM tasks WHERE content ILIKE $1 LIMIT 5`, [searchTerm]),
    pool.query(`SELECT id, name, 'tag' as type FROM tags WHERE name ILIKE $1 LIMIT 5`, [searchTerm]),
  ]);

  return [
    ...tagsRes.rows.map((r: any) => ({ ...r, title: r.name })),
    ...pagesRes.rows.map((r: any) => ({ ...r, title: r.title || 'Untitled Page' })),
    ...tasksRes.rows.map((r: any) => ({ ...r, title: r.content })),
  ];
}

// --- Folder Export ---

export async function getFolderPages(folderId: number): Promise<any[]> {
  const res = await pool.query('SELECT id, title, content FROM pages WHERE folder_id = $1 ORDER BY title ASC', [folderId]);
  return res.rows;
}

export async function getFolderName(folderId: number): Promise<string | null> {
  const res = await pool.query('SELECT name FROM folders WHERE id = $1', [folderId]);
  return res.rows[0]?.name || null;
}