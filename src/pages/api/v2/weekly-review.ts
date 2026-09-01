import type { NextApiRequest, NextApiResponse } from 'next';
import { getJournalPage, upsertJournalContent, createJournalPage } from '../../../lib/db';
import { format } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { content } = req.body;

    if (!content || !content.content) {
      return res.status(400).json({ error: 'Invalid content' });
    }

    let page = await getJournalPage();
    if (!page) {
      page = await createJournalPage();
    }

    const fullContent = page.content || { type: 'doc', content: [] };
    const existingNodes = fullContent.content || [];

    const weekLabel = format(new Date(), "'Week of' MMMM d, yyyy");
    const reviewHeading = {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: weekLabel }],
    };

    const newNodes = [
      reviewHeading,
      ...content.content,
      { type: 'paragraph', content: [] },
      ...existingNodes,
    ];

    await upsertJournalContent(page.id, {
      type: 'doc',
      content: newNodes,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to save weekly review:', error);
    return res.status(500).json({ error: 'Failed to save weekly review' });
  }
}
