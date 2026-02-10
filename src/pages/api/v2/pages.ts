
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPage, getPage, getPageItems, getTagsForItem } from '../../../lib/db';
import pool from '../../../lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const { id } = req.query;

  try {
    switch (method) {
      case 'GET':
        const { view, folderId } = req.query;

        if (id) {
          // Get single page
          const page = await getPage(Number(id));
          if (!page) return res.status(404).json({ error: 'Page not found' });
          
          // Get page context items
          const items = await getPageItems(Number(id));

          // Get tags
          const tags = await getTagsForItem(Number(id), 'page');
          
          return res.status(200).json({ ...page, items, tags });
        } else {
          // List pages with filters
          let query = 'SELECT * FROM pages';
          const params: any[] = [];
          
          if (folderId) {
             // Folder View
             query += ' WHERE folder_id = $1 ORDER BY title ASC';
             params.push(Number(folderId));
          } else if (view === 'favorites') {
              query += ' WHERE is_favorite = true ORDER BY title ASC';
          } else if (view === 'recent') {
              query += ' ORDER BY updated_at DESC LIMIT 10';
          } else if (view === 'all') {
              query += ' ORDER BY title ASC';
          } else {
              // Default
              query += ' ORDER BY updated_at DESC';
          }

          const result = await pool.query(query, params);
          return res.status(200).json(result.rows);
        }

      case 'POST':
        // Create page
        const { title, content, folderId: pageFolderId, parentPageId } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        let finalFolderId = pageFolderId;

        // Context Inheritance
        if (parentPageId) {
            const parentRes = await pool.query('SELECT folder_id FROM pages WHERE id = $1', [parentPageId]);
            if (parentRes.rows.length > 0) {
                // If no folder explicitly set, inherit from parent
                if (finalFolderId === undefined) {
                    finalFolderId = parentRes.rows[0].folder_id;
                }
            }
        }

        const newPage = await createPage(title, content, finalFolderId);

        // Link to parent if applicable
        if (parentPageId) {
             // We need to import addItemToPage if it's not exported from db, 
             // but checking imports: createPage, getPage, getPageItems are imported.
             // Need to add addItemToPage to import list above if missing.
             // It seems 'addItemToPage' is exported in db.ts but check imports in this file.
             // Line 3 imports: { createPage, getPage, getPageItems }. Need to add addItemToPage.
             const { addItemToPage } = await import('../../../lib/db');
             await addItemToPage(Number(parentPageId), newPage.id, 'page');
        }

        return res.status(201).json(newPage);

      case 'PUT':
        if (!id) return res.status(400).json({ error: 'ID is required' });
        const { content: newContent, title: newTitle, is_favorite: newIsFavorite } = req.body;
        // Simple update query
        // TODO: Move to db.ts function
        const updateRes = await pool.query(
          'UPDATE pages SET content = COALESCE($1, content), title = COALESCE($2, title), is_favorite = COALESCE($3, is_favorite), updated_at = NOW() WHERE id = $4 RETURNING *',
          [newContent, newTitle, newIsFavorite, id]
        );
        return res.status(200).json(updateRes.rows[0]);

      case 'DELETE':
        if (!id) return res.status(400).json({ error: 'ID is required' });
        const pageId = Number(id);

        // 1. Identify and Delete Orphaned Tasks (Tasks only on this page)
        // A task is orphaned if it is linked to this page AND not linked to any other page.
        await pool.query(`
            DELETE FROM tasks 
            WHERE id IN (
                SELECT child_task_id 
                FROM page_items 
                WHERE page_id = $1 
                AND child_task_id IS NOT NULL
            )
            AND id NOT IN (
                SELECT child_task_id 
                FROM page_items 
                WHERE page_id != $1 
                AND child_task_id IS NOT NULL
            )
        `, [pageId]);

        // 2. Identify and Delete Orphaned Subpages (Pages only on this page AND no folder)
        // A page is orphaned if linked to this page, has no folder, and no other parent.
        await pool.query(`
            DELETE FROM pages 
            WHERE id IN (
                SELECT child_page_id 
                FROM page_items 
                WHERE page_id = $1 
                AND child_page_id IS NOT NULL
            )
            AND folder_id IS NULL
            AND id NOT IN (
                SELECT child_page_id 
                FROM page_items 
                WHERE page_id != $1 
                AND child_page_id IS NOT NULL
            )
        `, [pageId]);

        // 3. Delete the Page itself (Cascading deletion of page_items handled by DB usually, or manual)
        // We delete links explicitly to be safe if FK cascade isn't set up
        await pool.query('DELETE FROM page_items WHERE page_id = $1 OR child_page_id = $1', [pageId]);
        
        const deleteRes = await pool.query('DELETE FROM pages WHERE id = $1 RETURNING id', [pageId]);
        
        if (deleteRes.rowCount === 0) {
            return res.status(404).json({ error: 'Page not found' });
        }

        return res.status(200).json({ success: true, deletedId: pageId });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ 
        error: 'Internal Server Error',
        details: error.message,
        stack: error.stack
    });
  }
}
