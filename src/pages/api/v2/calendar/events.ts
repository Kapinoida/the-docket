import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { start, end } = req.query;
    
    let query = `
      SELECT e.*, c.name as calendar_name, c.username 
      FROM calendar_events e
      JOIN caldav_configs c ON e.calendar_id = c.id
      WHERE c.enabled = TRUE
    `;
    
    const params: any[] = [];
    
    if (start && end) {
      query += ` AND (e.start_time <= $2 AND e.end_time >= $1)`;
      params.push(start, end);
    }
    
    query += ` ORDER BY e.start_time ASC`;

    const result = await pool.query(query, params);
    
    // Transform for frontend if needed? 
    // Usually raw is fine, but formatting dates to ISO string might be handled by JSON.stringify automatically.
    
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Database error fetching events' });
  }
}
