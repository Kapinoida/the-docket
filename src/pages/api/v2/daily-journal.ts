
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../../lib/db';
import { format } from 'date-fns';

const JOURNAL_TITLE = 'Journal';

// Helper to get formatted date string: "Monday, January 20, 2026"
const getTodayHeader = () => format(new Date(), 'EEEE, MMMM d, yyyy');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // 1. Find or Create Journal Page
      let pageRes = await pool.query('SELECT * FROM pages WHERE title = $1', [JOURNAL_TITLE]);
      let page = pageRes.rows[0];

      if (!page) {
        const createRes = await pool.query(
          'INSERT INTO pages (title, content) VALUES ($1, $2) RETURNING *',
          [JOURNAL_TITLE, { type: 'doc', content: [] }]
        );
        page = createRes.rows[0];
      }

      const fullContent = page.content || { type: 'doc', content: [] };
      const nodes = fullContent.content || [];
      const todayDate = getTodayHeader();

      // 2. Extract Today's Section
      let todayContentNodes: any[] = [];
      let foundToday = false;

      for (const node of nodes) {
        if (node.type === 'heading' && node.attrs?.level === 2) {
          const headerText = node.content?.[0]?.text;
          if (headerText === todayDate) {
            foundToday = true;
            continue; // Skip the header itself in the returned editor content
          } else if (foundToday) {
            // Found the next header, stop extracting
            break; 
          }
        }
        
        if (foundToday) {
          todayContentNodes.push(node);
        }
      }

      // Return consistent Tiptap doc structure
      res.status(200).json({
        id: page.id,
        date: todayDate,
        todayContent: {
          type: 'doc',
          content: todayContentNodes.length > 0 ? todayContentNodes : [{ type: 'paragraph' }] 
        }
      });
    } catch (error) {
      console.error('Failed to get daily journal:', error);
      res.status(500).json({ error: 'Failed to retrieve journal' });
    }
  } 
  else if (req.method === 'POST') {
    try {
      const { content } = req.body; // Expects full Tiptap JSON doc for today's section
      
      if (!content || !content.content) {
        return res.status(400).json({ error: 'Invalid content' });
      }

      const todayDate = getTodayHeader();

      // 1. Get Current Page Content
      const pageRes = await pool.query('SELECT * FROM pages WHERE title = $1', [JOURNAL_TITLE]);
      const page = pageRes.rows[0];
      
      if (!page) {
        // Should not happen if GET is called first, but handle it
        return res.status(404).json({ error: 'Journal page not found' });
      }

      const fullContent = page.content || { type: 'doc', content: [] };
      let existingNodes = fullContent.content || [];

      // 2. Reconstruct Content
      const newNodes: any[] = [];
      let insertedToday = false;
      let skippedOldToday = false;

      // Iterate through existing nodes to rebuild the document
      for (let i = 0; i < existingNodes.length; i++) {
        const node = existingNodes[i];
        
        // Detect Header
        if (node.type === 'heading' && node.attrs?.level === 2) {
            const headerText = node.content?.[0]?.text;

            if (headerText === todayDate) {
                // Found existing Today section -> START SKIPPING
                skippedOldToday = true;
                
                // If we haven't inserted the new content yet, do it now
                if (!insertedToday) {
                    // Only insert if valid content exists (not just empty paragraph)
                    const hasContent = content.content.some((n: any) => 
                        (n.content && n.content.length > 0) || (n.type === 'image') || (n.type === 'taskItem')
                    );

                    if (hasContent) {
                         newNodes.push({
                            type: 'heading',
                            attrs: { level: 2 },
                            content: [{ type: 'text', text: todayDate }]
                        });
                        newNodes.push(...content.content);
                    }
                    insertedToday = true;
                }
                continue; // Skip the old header
            } 
            
            if (skippedOldToday) {
                // We hit the NEXT header after skipping today's section
                // Stop skipping, append this header and continue normal copying
                skippedOldToday = false;
            }
        }

        if (!skippedOldToday) {
            newNodes.push(node);
        }
      }

      // If we never found today's section to replace, AND we haven't inserted it yet
      // Append it to the end
      if (!insertedToday) {
         const hasContent = content.content.some((n: any) => 
            (n.content && n.content.length > 0) || (n.type === 'image') || (n.type === 'taskItem')
        );

        if (hasContent) {
            newNodes.push({
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: todayDate }]
            });
            newNodes.push(...content.content);
        }
      }

      // 3. Save
      const updatedContent = {
          type: 'doc',
          content: newNodes
      };

      await pool.query(
          'UPDATE pages SET content = $1, updated_at = NOW() WHERE id = $2',
          [updatedContent, page.id]
      );

      res.status(200).json({ success: true });

    } catch (error) {
      console.error('Failed to save daily journal:', error);
      res.status(500).json({ error: 'Failed to save journal' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
