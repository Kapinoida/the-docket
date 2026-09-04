import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../../../lib/db';
import {
  extractDecisions,
  getRecentDecisions,
  getDecisionsDueForReview,
  DecisionRecord,
} from '../../../../lib/decisionPlanning';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { limit, dueForReview } = req.query;

    const pagesResult = await pool.query(
      'SELECT id, title, content FROM pages ORDER BY updated_at DESC',
    );

    const allDecisions: DecisionRecord[] = [];
    for (const page of pagesResult.rows) {
      const decisions = extractDecisions(page.content, page.id, page.title);
      allDecisions.push(...decisions);
    }

    let result: DecisionRecord[];

    if (dueForReview === 'true') {
      result = getDecisionsDueForReview(allDecisions);
    } else {
      const limitNum = limit ? parseInt(limit as string, 10) : 20;
      result = getRecentDecisions(allDecisions, limitNum);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Failed to fetch decisions:', error);
    return res.status(500).json({ error: 'Failed to fetch decisions' });
  }
}
