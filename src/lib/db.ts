import { Pool } from 'pg';
import { Page, Task, PageItem, PageItemType } from '../types/v2';

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

export async function getPages(options: { folderId?: number, view?: 'favorites' | 'recent' | 'all' } = {}): Promise<Page[]> {
  let query = 'SELECT * FROM pages';
  const params: any[] = [];
  const startParam = 1;

  if (options.folderId !== undefined) {
    query += ` WHERE folder_id = $${startParam}`;
    params.push(options.folderId);
  } else if (options.view === 'favorites') {
    query += ' WHERE is_favorite = true';
  }

  // Ordering
  if (options.view === 'recent') {
    query += ' ORDER BY updated_at DESC LIMIT 10';
  } else {
    query += ' ORDER BY title ASC';
  }

  const res = await pool.query(query, params);
  return res.rows;
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

// Get all pages where an item appears (Context)
export async function getItemContext(itemId: number, itemType: PageItemType): Promise<Page[]> {
  const column = itemType === 'page' ? 'child_page_id' : 'child_task_id';
  
  const query = `
    SELECT p.* 
    FROM pages p
    JOIN page_items pi ON p.id = pi.page_id
    WHERE pi.${column} = $1
  `;
  
  const res = await pool.query(query, [itemId]);
  return res.rows;
}

export async function searchContent(query: string) {
  const searchTerm = `%${query}%`;
  
  const pagesPromise = pool.query(
    'SELECT * FROM pages WHERE title ILIKE $1 OR content::text ILIKE $1 LIMIT 5',
    [searchTerm]
  );
  
  const tasksPromise = pool.query(
    `SELECT t.*, p.id as page_id, p.title as page_title 
     FROM tasks t
     LEFT JOIN page_items pi ON t.id = pi.child_task_id
     LEFT JOIN pages p ON pi.page_id = p.id
     WHERE t.content ILIKE $1 LIMIT 5`,
    [searchTerm]
  );
  
  const [pagesRes, tasksRes] = await Promise.all([pagesPromise, tasksPromise]);
  
  return {
    pages: pagesRes.rows,
    tasks: tasksRes.rows
  };
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