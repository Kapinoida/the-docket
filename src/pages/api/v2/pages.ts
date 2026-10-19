
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPage, getPage, getPageItems, getTagsForItem, addItemToPage, deleteTask } from '../../../lib/db';
import pool from '../../../lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const { id } = req.query;
  const pageId = Number(id);

  try {
    switch (method) {
      case 'GET':
        const { view, folderId, backlinks, search } = req.query;

        // Search endpoint for autocomplete
        if (search) {
          const searchTerm = `%${search}%`;
          const searchResult = await pool.query(
            `SELECT id, title, folder_id FROM pages 
             WHERE title ILIKE $1 
             ORDER BY title ASC 
             LIMIT 20`,
            [searchTerm]
          );
          return res.status(200).json(searchResult.rows);
        }

        if (id) {
          // Get single page
          const page = await getPage(Number(id));
          if (!page) return res.status(404).json({ error: 'Page not found' });
          
          // Get page context items
          const items = await getPageItems(Number(id));

          // Get tags
          const tags = await getTagsForItem(Number(id), 'page');

          // Get backlinks if requested
          let backlinksList = [];
          if (backlinks === 'true') {
            try {
              const pageIdNum = Number(id);
              const backlinksResult = await pool.query(
                `SELECT DISTINCT p.id, p.title 
                 FROM pages p
                 WHERE p.content::text LIKE '%v2PageLink%'
                 AND p.content::text LIKE '%"pageId":' || $1 || '%'
                 AND p.id != $2
                 ORDER BY p.title ASC`,
                [pageIdNum, pageIdNum]
              );
              backlinksList = backlinksResult.rows;
            } catch (err) {
              console.error('Failed to fetch backlinks:', err);
              backlinksList = [];
            }
          }
          
          return res.status(200).json({ ...page, items, tags, backlinks: backlinksList });
        } else {
          // List pages with filters
          let query = 'SELECT * FROM pages';
          const params: any[] = [];
          
          if (folderId) {
             query += ' WHERE folder_id = $1 ORDER BY title ASC';
             params.push(Number(folderId));
          } else if (view === 'favorites') {
              query += ' WHERE is_favorite = true ORDER BY title ASC';
          } else if (view === 'recent') {
              query += ' ORDER BY updated_at DESC LIMIT 10';
          } else if (view === 'all') {
              query += ' ORDER BY title ASC';
          } else {
              query += ' ORDER BY updated_at DESC';
          }

          const result = await pool.query(query, params);
          return res.status(200).json(result.rows);
        }

      case 'POST':
        const { title, content, folderId: pageFolderId, parentPageId, page_kind, desired_outcome, current_state, review_date } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        let finalFolderId = pageFolderId;

        if (parentPageId) {
            const parentRes = await pool.query('SELECT folder_id FROM pages WHERE id = $1', [parentPageId]);
            if (parentRes.rows.length > 0) {
                if (finalFolderId === undefined) {
                    finalFolderId = parentRes.rows[0].folder_id;
                }
            }
        }

        const newPage = await createPage(
          title, 
          content, 
          finalFolderId,
          page_kind,
          desired_outcome,
          current_state,
          review_date
        );

        if (parentPageId) {
            await addItemToPage(Number(parentPageId), newPage.id, 'page');
        }

        return res.status(201).json(newPage);

      case 'PUT':
        if (!id) return res.status(400).json({ error: 'ID is required' });
        const { 
          content: newContent, 
          title: newTitle, 
          is_favorite: newIsFavorite, 
          folderId: newFolderId,
          page_kind: newPageKind,
          desired_outcome: newDesiredOutcome,
          current_state: newCurrentState,
          review_date: newReviewDate
        } = req.body;
        
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let valueIdx = 1;

        if (newContent !== undefined) {
          const oldPage = await pool.query('SELECT content FROM pages WHERE id = $1', [pageId]);
          const oldContent = oldPage.rows[0]?.content;

          const collectText = (node: any): string => {
            if (!node) return '';
            if (node.type === 'text') return node.text || '';
            if (node.content && Array.isArray(node.content)) {
              return node.content.map(collectText).join('');
            }
            return '';
          };
          
          const stripDeadTaskNodes = (node: any): any => {
            if (!node || typeof node !== 'object') return node;
            if (node.content && Array.isArray(node.content)) {
              node.content = node.content
                .map((child: any) => {
                  const isDeadTask = child?.type === 'v2Task'
                    && (child.attrs?.taskId === null || child.attrs?.taskId === undefined)
                    && !collectText(child).trim();
                  return isDeadTask ? null : stripDeadTaskNodes(child);
                })
                .filter((child: any) => child !== null);
            }
            return node;
          };
          
          const contentToSave = stripDeadTaskNodes(
            typeof newContent === 'string' ? JSON.parse(newContent) : newContent
          );

          updateFields.push(`content = $${valueIdx++}`);
          updateValues.push(contentToSave);
          
          if (oldContent) {
            const extractTaskIds = (content: any): number[] => {
              const ids: number[] = [];
              const walk = (node: any) => {
                if (!node) return;
                if (node.type === 'v2Task' && node.attrs?.taskId) {
                  ids.push(node.attrs.taskId);
                }
                if (node.content && Array.isArray(node.content)) {
                  node.content.forEach(walk);
                }
              };
              try {
                walk(typeof content === 'string' ? JSON.parse(content) : content);
              } catch {}
              return ids;
            };
            
            const oldIds = new Set(extractTaskIds(oldContent));
            const newIds = new Set(extractTaskIds(newContent));
            
            for (const taskId of oldIds) {
              if (!newIds.has(taskId)) {
                const otherPageItemRefs = await pool.query(
                  'SELECT COUNT(*) as cnt FROM page_items WHERE child_task_id = $1 AND page_id != $2',
                  [taskId, pageId]
                );
                
                if (parseInt(otherPageItemRefs.rows[0].cnt) === 0) {
                  const otherContentRefs = await pool.query(
                    `SELECT COUNT(*) as cnt FROM pages 
                     WHERE id != $1 AND content::text LIKE $2`,
                    [pageId, `%"taskId":${taskId}%`]
                  );
                  
                  if (parseInt(otherContentRefs.rows[0].cnt) === 0) {
                    await deleteTask(taskId);
                  } else {
                    await pool.query('DELETE FROM page_items WHERE child_task_id = $1 AND page_id = $2', [taskId, pageId]);
                  }
                }
              }
            }
          }
        }
        
        if (newTitle !== undefined) {
          updateFields.push(`title = $${valueIdx++}`);
          updateValues.push(newTitle);
        }
        if (newIsFavorite !== undefined) {
          updateFields.push(`is_favorite = $${valueIdx++}`);
          updateValues.push(newIsFavorite);
        }
        if (newFolderId !== undefined) {
          updateFields.push(`folder_id = $${valueIdx++}`);
          updateValues.push(newFolderId);
        }
        if (newPageKind !== undefined) {
          updateFields.push(`page_kind = $${valueIdx++}`);
          updateValues.push(newPageKind);
        }
        if (newDesiredOutcome !== undefined) {
          updateFields.push(`desired_outcome = $${valueIdx++}`);
          updateValues.push(newDesiredOutcome || null);
        }
        if (newCurrentState !== undefined) {
          updateFields.push(`current_state = $${valueIdx++}`);
          updateValues.push(newCurrentState || null);
        }
        if (newReviewDate !== undefined) {
          updateFields.push(`review_date = $${valueIdx++}`);
          updateValues.push(newReviewDate || null);
        }

        updateFields.push(`updated_at = NOW()`);
        
        if (updateFields.length === 1) { 
           const currentRes = await pool.query('SELECT * FROM pages WHERE id = $1', [id]);
           return res.status(200).json(currentRes.rows[0]);
        }

        updateValues.push(id);
        const updateQuery = `UPDATE pages SET ${updateFields.join(', ')} WHERE id = $${valueIdx} RETURNING *`;
        
        const updateRes = await pool.query(updateQuery, updateValues);
        return res.status(200).json(updateRes.rows[0]);

      case 'DELETE':
        if (!id) return res.status(400).json({ error: 'ID is required' });

        const orphanedTaskRes = await pool.query(`
            SELECT child_task_id AS id
            FROM page_items
            WHERE page_id = $1
            AND child_task_id IS NOT NULL
            AND child_task_id NOT IN (
                SELECT child_task_id
                FROM page_items
                WHERE page_id != $1
                AND child_task_id IS NOT NULL
            )
        `, [pageId]);
        for (const row of orphanedTaskRes.rows) {
            await deleteTask(row.id);
        }

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
        error: 'Internal Server Error'
    });
  }
}
