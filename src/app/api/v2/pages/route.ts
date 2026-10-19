import { NextRequest, NextResponse } from 'next/server';
import { createPage, getPage, getPageItems, getTagsForItem, addItemToPage, deleteTask } from '@/lib/db';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const view = searchParams.get('view');
  const folderId = searchParams.get('folderId');
  const backlinks = searchParams.get('backlinks');
  const search = searchParams.get('search');

  try {
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
      return NextResponse.json(searchResult.rows);
    }

    if (id) {
      // Get single page
      const page = await getPage(Number(id));
      if (!page) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
      }
      
      // Get page context items
      const items = await getPageItems(Number(id));

      // Get tags
      const tags = await getTagsForItem(Number(id), 'page');

      // Get backlinks if requested
      let backlinksList = [];
      if (backlinks === 'true') {
        try {
          const pageIdNum = Number(id);
          // Search for pages containing v2PageLink nodes that reference this page
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
      
      return NextResponse.json({ ...page, items, tags, backlinks: backlinksList });
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
      return NextResponse.json(result.rows);
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, folderId: pageFolderId, parentPageId, page_kind, desired_outcome, current_state, review_date } = body;
    
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

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

    const newPage = await createPage(
      title, 
      content, 
      finalFolderId,
      page_kind,
      desired_outcome,
      current_state,
      review_date
    );

    // Link to parent if applicable
    if (parentPageId) {
        await addItemToPage(Number(parentPageId), newPage.id, 'page');
    }

    return NextResponse.json(newPage, { status: 201 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const pageId = Number(id);

  try {
    const body = await request.json();
    const { 
      content: newContent, 
      title: newTitle, 
      is_favorite: newIsFavorite, 
      folderId: newFolderId,
      page_kind: newPageKind,
      desired_outcome: newDesiredOutcome,
      current_state: newCurrentState,
      review_date: newReviewDate
    } = body;
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let valueIdx = 1;

    if (newContent !== undefined) {
      // Get old content to detect removed v2Task references
      const oldPage = await pool.query('SELECT content FROM pages WHERE id = $1', [pageId]);
      const oldContent = oldPage.rows[0]?.content;

      // Strip dead v2Task nodes before persisting
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
      
      // After updating, clean up any orphaned tasks
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
       return NextResponse.json(currentRes.rows[0]);
    }

    updateValues.push(id);
    const updateQuery = `UPDATE pages SET ${updateFields.join(', ')} WHERE id = $${valueIdx} RETURNING *`;
    
    const updateRes = await pool.query(updateQuery, updateValues);
    return NextResponse.json(updateRes.rows[0]);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const pageId = Number(id);

  try {
    // 1. Identify and Delete Orphaned Tasks
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

    // 2. Identify and Delete Orphaned Subpages
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

    // 3. Delete the Page itself
    await pool.query('DELETE FROM page_items WHERE page_id = $1 OR child_page_id = $1', [pageId]);
    
    const deleteRes = await pool.query('DELETE FROM pages WHERE id = $1 RETURNING id', [pageId]);
    
    if (deleteRes.rowCount === 0) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: pageId });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
