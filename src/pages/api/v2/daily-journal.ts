import type { NextApiRequest, NextApiResponse } from 'next';
import { getJournalPage, upsertJournalContent, createJournalPage } from '../../../lib/db';
import { format } from 'date-fns';

const JOURNAL_TITLE = 'Journal';
const getTodayHeader = () => format(new Date(), 'EEEE, MMMM d, yyyy');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      let page = await getJournalPage();

      if (!page) {
        page = await createJournalPage();
      }

      const fullContent = page.content || { type: 'doc', content: [] };
      const nodes = fullContent.content || [];
      const todayDate = getTodayHeader();

      let todayContentNodes: any[] = [];
      let foundToday = false;

      for (const node of nodes) {
        if (node.type === 'heading' && node.attrs?.level === 2) {
          const headerText = node.content?.[0]?.text;
          if (headerText === todayDate) {
            foundToday = true;
            continue;
          } else if (foundToday) {
            break;
          }
        }
        
        if (foundToday) {
          todayContentNodes.push(node);
        }
      }

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
      const { content } = req.body;
      
      if (!content || !content.content) {
        return res.status(400).json({ error: 'Invalid content' });
      }

      const todayDate = getTodayHeader();

      const page = await getJournalPage();
      
      if (!page) {
        return res.status(404).json({ error: 'Journal page not found' });
      }

      const fullContent = page.content || { type: 'doc', content: [] };
      let existingNodes = fullContent.content || [];

      const newNodes: any[] = [];
      const hasContent = content.content.some((n: any) => 
        (n.content && n.content.length > 0) || (n.type === 'image') || (n.type === 'taskItem')
      );

      const todayIndex = existingNodes.findIndex((n: any) => 
        n.type === 'heading' && 
        n.attrs?.level === 2 && 
        n.content?.[0]?.text === todayDate
      );

      if (todayIndex === -1) {
        if (hasContent) {
           newNodes.push({
               type: 'heading',
               attrs: { level: 2 },
               content: [{ type: 'text', text: todayDate }]
           });
           newNodes.push(...content.content);
        }
        newNodes.push(...existingNodes);
      } else {
        let insertedToday = false;
        let skippedOldToday = false;

        for (let i = 0; i < existingNodes.length; i++) {
          const node = existingNodes[i];
          
          if (node.type === 'heading' && node.attrs?.level === 2) {
              const headerText = node.content?.[0]?.text;

              if (headerText === todayDate) {
                  skippedOldToday = true;
                  
                  if (!insertedToday) {
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
                  continue;
              }
              
              if (skippedOldToday) {
                  skippedOldToday = false;
              }
          }

          if (!skippedOldToday) {
              newNodes.push(node);
          }
        }
      }

      const updatedContent = {
          type: 'doc',
          content: newNodes
      };

      await upsertJournalContent(page.id, updatedContent);

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