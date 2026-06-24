import { NextApiRequest, NextApiResponse } from 'next';
import { getCalDAVConfigs, createCalDAVConfig, updateCalDAVConfig, deleteCalDAVConfig } from '../../../lib/db';
import { getCalDAVClient } from '../../../lib/caldav';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const configs = await getCalDAVConfigs();
      return res.status(200).json(configs);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: 'Database error' });
    }
  } 
  
  if (req.method === 'POST') {
    const { id, server_url, username, password, calendar_url, name, resource_type, color } = req.body;
    
    const looksLikeICal = (calendar_url && (calendar_url.includes('.ics') || calendar_url.includes('/ical/'))) || (server_url && server_url.includes('.ics'));
    
    if (!server_url || (!username && !looksLikeICal)) {
      return res.status(400).json({ error: 'Missing required fields (server_url, username)' });
    }

    try {
      const isICal = (calendar_url && (calendar_url.includes('.ics') || calendar_url.includes('/ical/'))) || server_url.includes('.ics');

      if (isICal) {
         const target = calendar_url || server_url;
         try {
             const fetchRes = await fetch(target);
             if (!fetchRes.ok) throw new Error(`Status ${fetchRes.status}`);
         } catch (e: any) {
             return res.status(400).json({ error: 'Failed to access iCal URL: ' + e.message });
         }
      } else {
          if (password) {
            try {
              const testClient = await getCalDAVClient({ server_url, username, password } as any);
              await testClient.login();
            } catch (connError: any) {
                 return res.status(400).json({ error: 'Connection failed: ' + connError.message });
            }
          }
      }

      if (id) {
        const isICalEdit = (calendar_url && (calendar_url.includes('.ics') || calendar_url.includes('/ical/'))) || (server_url && server_url.includes('.ics'));

        const fields: Record<string, any> = {
          server_url,
          name: name,
          resource_type: resource_type || 'event_calendar',
          color: color || '#7c3aed',
          calendar_url,
        };
        if (username !== undefined) fields.username = username || (isICalEdit ? 'ical_user' : '');
        if (password) fields.password = password;

        const updated = await updateCalDAVConfig(Number(id), fields);
        return res.status(200).json(updated);
      } else {
        const finalUser = username || (isICal ? 'ical_user' : '');
        const finalPass = password || (isICal ? 'none' : '');

        if (!finalPass) {
           return res.status(400).json({ error: 'Password required for new account' });
        }
        
        const created = await createCalDAVConfig({
          server_url,
          username: finalUser,
          password: finalPass,
          calendar_url: calendar_url || server_url,
          name: name || 'New Account',
          resource_type: resource_type || 'task_list',
          color: color || '#7c3aed',
        });
        
        return res.status(201).json(created);
      }

    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  } 
  
  if (req.method === 'DELETE') {
     const { id } = req.query;
     
     if (!id) {
       return res.status(400).json({ error: 'ID required' });
     }
     
     await deleteCalDAVConfig(Number(id));
     return res.status(200).json({ success: true });
  } 
  
  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}