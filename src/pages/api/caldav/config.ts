import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../../lib/db';
import { getCalDAVClient } from '../../../lib/caldav';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET: List all configs
  if (req.method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT id, server_url, username, calendar_url, enabled, name, resource_type, created_at 
        FROM caldav_configs 
        WHERE enabled = TRUE 
        ORDER BY created_at ASC
      `);
      return res.status(200).json(result.rows);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: 'Database error' });
    }
  } 
  
  // POST: Create or Update a config
  else if (req.method === 'POST') {
    const { id, server_url, username, password, calendar_url, name, resource_type } = req.body;
    
    // Basic validation
    const looksLikeICal = (calendar_url && (calendar_url.includes('.ics') || calendar_url.includes('/ical/'))) || (server_url && server_url.includes('.ics'));
    
    if (!server_url || (!username && !looksLikeICal)) {
      return res.status(400).json({ error: 'Missing required fields (server_url, username)' });
    }

    try {
      // Test connection only if password is provided (new config or updating password)
      // If updating an existing config without password change, we trust existing credential? 
      // For MVP, we require password for connection test.
      // If id is present and password is empty, we might skip test? 
      // But typically we want to verify.
      
      // Special handling for Direct iCal URLs
      const isICal = (calendar_url && (calendar_url.includes('.ics') || calendar_url.includes('/ical/'))) || server_url.includes('.ics');

      if (isICal) {
         // Verify we can fetch it
         const target = calendar_url || server_url;
         try {
             const res = await fetch(target);
             if (!res.ok) throw new Error(`Status ${res.status}`);
         } catch (e: any) {
             return res.status(400).json({ error: 'Failed to access iCal URL: ' + e.message });
         }
      } else {
          // Standard CalDAV Connection Test
          if (password) {
            try {
              const testClient = await getCalDAVClient({ server_url, username, password } as any);
              await testClient.login();
              // We don't fetch calendars here to keep it fast, or maybe we should?
              // await testClient.fetchCalendars();
            } catch (connError: any) {
                 return res.status(400).json({ error: 'Connection failed: ' + connError.message });
            }
          }
      }

      if (id) {
        // UPDATE
        let query = `
          UPDATE caldav_configs SET 
            server_url = $1, 
            username = $2, 
            calendar_url = $3, 
            name = $4, 
            resource_type = $5,
            updated_at = NOW()
        `;
        const params = [server_url, username, calendar_url, name, resource_type || 'task_list'];
        
        let paramIdx = 6;
        if (password) {
          query += `, password = $${paramIdx}`;
          params.push(password);
          paramIdx++;
        }
        
        query += ` WHERE id = $${paramIdx} RETURNING id, server_url, username, enabled, name, resource_type`;
        params.push(id);
        
        const result = await pool.query(query, params);
        return res.status(200).json(result.rows[0]);
        
      } else {
        // CREATE
        // For iCal, we can default username/password if not provided
        const finalUser = username || (isICal ? 'ical_user' : '');
        const finalPass = password || (isICal ? 'none' : '');

        if (!finalPass) {
           return res.status(400).json({ error: 'Password required for new account' });
        }
        
        const result = await pool.query(
          `INSERT INTO caldav_configs (server_url, username, password, calendar_url, name, resource_type) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING id, server_url, username, enabled, name, resource_type`,
          [server_url, finalUser, finalPass, calendar_url || server_url, name || 'New Account', resource_type || 'task_list']
        );
        
        return res.status(201).json(result.rows[0]);
      }

    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  } 
  
  // DELETE: Remove a config
  else if (req.method === 'DELETE') {
     const { id } = req.query;
     
     if (!id) {
       return res.status(400).json({ error: 'ID required' });
     }
     
     await pool.query('DELETE FROM caldav_configs WHERE id = $1', [id]);
     return res.status(200).json({ success: true });
  } 
  
  else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
