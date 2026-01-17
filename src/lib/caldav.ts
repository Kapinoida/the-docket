import { DAVAccount, DAVClient, DAVCalendar, DAVCalendarObject } from 'tsdav';
import pool from './db';
import { v4 as uuidv4 } from 'uuid';
import ICAL from 'ical.js';

// Types
export interface CalDAVConfig {
  id: number;
  server_url: string;
  username: string;
  password: string; // Plaintext for MVP
  calendar_url?: string;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TaskSyncMeta {
  task_id: number;
  caldav_uid: string;
  caldav_etag?: string;
  last_synced_at: Date;
}

interface LocalTask {
  id: number;
  content: string;
  status: string;
  due_date: Date | null;
  updated_at: Date;
  caldav_uid: string | null;
  caldav_etag: string | null;
  last_synced_at: Date | null;
}

// Interfaces for sync results
interface SyncResult {
  addedToRemote: number;
  addedToLocal: number;
  updatedRemote: number;
  updatedLocal: number;
  errors: string[];
}

/**
 * Initialize the CalDAV client using stored configuration
 */
export async function getCalDAVClient(config: CalDAVConfig): Promise<DAVClient> {
  return new DAVClient({
    serverUrl: config.server_url,
    credentials: {
      username: config.username,
      password: config.password,
    },
    authMethod: 'Basic', 
    defaultAccountType: 'caldav',
  });
}

/**
 * Retrieve the active CalDAV configuration
 */
export async function getCalDAVConfig(): Promise<CalDAVConfig | null> {
  const res = await pool.query('SELECT * FROM caldav_configs WHERE enabled = TRUE LIMIT 1');
  return res.rows[0] || null;
}

/**
 * Helper: Parse iCal string to data object
 */
function parseVTodo(icalData: string) {
  try {
    const jcal = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcal);
    const vtodo = comp.getFirstSubcomponent('vtodo');
    
    if (!vtodo) return null;

    return {
      uid: vtodo.getFirstPropertyValue('uid'),
      summary: vtodo.getFirstPropertyValue('summary'),
      status: vtodo.getFirstPropertyValue('status'),
      // ICAL.js handling of dates can be complex, verify type
      due: vtodo.getFirstPropertyValue('due') ? vtodo.getFirstPropertyValue('due').toJSDate() : null,
      lastModified: vtodo.getFirstPropertyValue('last-modified') ? vtodo.getFirstPropertyValue('last-modified').toJSDate() : null,
    };
  } catch (e) {
    console.warn("Failed to parse VTODO", e);
    return null;
  }
}

/**
 * Helper: Create VTODO string
 */
function createVTodoString(uid: string, summary: string, status: string, dueDate: Date | null): string {
  const comp = new ICAL.Component(['vcalendar', [], []]);
  const vtodo = new ICAL.Component('vtodo');
  comp.addSubcomponent(vtodo);

  vtodo.addPropertyWithValue('uid', uid);
  vtodo.addPropertyWithValue('summary', summary);
  vtodo.addPropertyWithValue('status', status === 'done' ? 'COMPLETED' : 'NEEDS-ACTION');
  
  if (dueDate) {
    const time = ICAL.Time.fromJSDate(dueDate);
    time.isDate = true; // Force DATE-only (All Day) to avoid timezone shifts
    vtodo.addPropertyWithValue('due', time);
  }
  
  vtodo.addPropertyWithValue('dtstamp', ICAL.Time.now());
  
  const generated = comp.toString();
  // console.log(`[Sync] Generated VTODO for ${uid}:`, generated);
  return generated;
}

/**
 * Main Synchronization Function
 */
export async function syncTasks(): Promise<SyncResult> {
  const result: SyncResult = {
    addedToRemote: 0,
    addedToLocal: 0,
    updatedRemote: 0,
    updatedLocal: 0,
    errors: [],
  };

  try {
    const config = await getCalDAVConfig();
    if (!config) {
      result.errors.push('No enabled CalDAV configuration found.');
      return result;
    }

    const client = await getCalDAVClient(config);
    await client.login();

    // 1. Fetch Calendars
    const calendars = await client.fetchCalendars();
    let calendar: DAVCalendar | undefined;
    
    if (config.calendar_url) {
      calendar = calendars.find(c => c.url === config.calendar_url);
    }
    
    
    if (!calendar) {
      calendar = calendars.find(c => c.components && c.components.includes('VTODO'));
    }
    
    if (!calendar && calendars.length > 0) {
      calendar = calendars[0]; // Fallback
    }

    if (!calendar) {
      result.errors.push('No suitable calendar found on server.');
      return result;
    }
    
    console.log(`[Sync] Using Calendar: ${calendar.displayName} (${calendar.url})`);

    // 1.5 Process Tombstones (Delete remote tasks that were deleted locally)
    const tombstonesRes = await pool.query('SELECT caldav_uid FROM deleted_task_sync_log');
    const tombstoneUids = new Set(tombstonesRes.rows.map(r => r.caldav_uid));
    
    if (tombstoneUids.size > 0) {
        console.log(`[Sync] Found ${tombstoneUids.size} deletion tombstones. Processing...`);
    }

    // 2. Fetch Remote Tasks
    let remoteObjects: DAVCalendarObject[] = [];
    
    try {
      remoteObjects = await client.fetchCalendarObjects({
        calendar,
        filters: [{
            type: 'comp-filter',
            attrs: { name: 'VCALENDAR' }
        }]
      });
    } catch (e) {
      console.warn('Standard fetch failed, trying fallback...', e);
    }

    // FALLBACK: If standard fetch returned 0 items but we suspect there are tasks (or just to be safe with NextCloud)
    if (remoteObjects.length === 0) {
        console.log('[Sync] Standard fetch returned 0 items. Attempting Raw PROPFIND fallback...');
        
        try {
            const auth = 'Basic ' + Buffer.from(config.username + ':' + config.password).toString('base64');
            const rawRes = await fetch(calendar.url, {
                method: 'PROPFIND',
                headers: {
                    'Authorization': auth,
                    'Depth': '1',
                    'Content-Type': 'application/xml; charset=utf-8'
                },
                body: `<?xml version="1.0" encoding="utf-8" ?>
                       <d:propfind xmlns:d="DAV:">
                         <d:prop>
                           <d:getetag/>
                           <d:resourcetype/>
                         </d:prop>
                       </d:propfind>`
            });

            if (rawRes.ok) {
                const xmlText = await rawRes.text();
                
                // Simple regex parsing to find hrefs and etags (XML parser is heavy/missing)
                // Look for <d:response> blocks
                const responseBlocks = xmlText.split('</d:response>');
                
                for (const block of responseBlocks) {
                    if (!block.includes('.ics')) continue;

                    const hrefMatch = block.match(/<d:href>([^<]+)<\/d:href>/);
                    // More robust ETag regex dealing with variable namespaces
                    const etagMatch = block.match(/<[^>]*getetag[^>]*>([^<]*)<\/[^>]*getetag>/);
                    
                    if (hrefMatch) {
                        const href = hrefMatch[1].trim();
                        // ETag might be quoted in XML, unquote it
                        const etag = etagMatch ? etagMatch[1].replace(/^"|"$/g, '') : uuidv4(); 
                        console.log(`[Sync] Fallback parsed ETag for ${href}: ${etag}`);
                        
                        // Construct absolute URL if needed (NextCloud usually gives path)
                        // If href starts with http, use it. Else append to server base.
                        let fetchUrl = href;
                        if (!href.startsWith('http')) {
                           // Try to resolve relative path. server_url might be base.
                           // Simplest: If calendar.url is "https://.../cal/", and href is "/.../cal/123.ics"
                           const urlObj = new URL(href, config.server_url);
                           fetchUrl = urlObj.toString();
                        }

                        // Fetch the body
                        const itemRes = await fetch(fetchUrl, {
                            headers: { 'Authorization': auth }
                        });
                        
                        if (itemRes.ok) {
                            const icalData = await itemRes.text();
                            // Mimic DAVCalendarObject
                            remoteObjects.push({
                                data: icalData,
                                etag: etag,
                                url: fetchUrl
                            } as any);
                        }
                    }
                }
                console.log(`[Sync] Fallback found ${remoteObjects.length} tasks via PROPFIND.`);
            }
        } catch (fallbackErr) {
            console.error('[Sync] Fallback failed:', fallbackErr);
        }
    }
    
    console.log(`[Sync] Fetched ${remoteObjects.length} remote objects.`);
    remoteObjects.forEach(r => {
        // Quick parse to log UIDs
        if (r.data) {
             const p = parseVTodo(r.data);
             if (p) console.log(`[Sync] Remote Item Found: ${p.uid}`);
        }
    });

    // 3. Fetch Local Tasks (Active only for MVP, or all? Let's do active + recently completed to avoid history churn)
    // Actually, we must fetch ALL mapped tasks to check for updates, plus all unmapped active tasks.
    const localTasksRes = await pool.query(`
      SELECT t.*, m.caldav_uid, m.caldav_etag, m.last_synced_at 
      FROM tasks t 
      LEFT JOIN task_sync_meta m ON t.id = m.task_id
    `);
    const localTasks: LocalTask[] = localTasksRes.rows;

    const localByUid = new Map<string, LocalTask>();
    const localUnmapped: LocalTask[] = [];

    localTasks.forEach(t => {
      if (t.caldav_uid) {
        localByUid.set(t.caldav_uid, t);
        console.log(`[Sync] Task ${t.id} mapped to UID ${t.caldav_uid}`);
      } else {
        console.log(`[Sync] Task ${t.id} is unmapped (No UID). Adding to process queue.`);
        localUnmapped.push(t);
      }
    });

    // 4. Process Remote Tasks
    const remoteProcessedUids = new Set<string>();

    for (const rObj of remoteObjects) {
      // rObj.data is the ical string
      if (!rObj.data) continue;
      
      const parsed = parseVTodo(rObj.data);
      if (!parsed || !parsed.uid) continue;

      remoteProcessedUids.add(parsed.uid);
      
      // Handle Tombstone
      if (tombstoneUids.has(parsed.uid)) {
          console.log(`[Sync] Remote task ${parsed.uid} matches local tombstone. DELETING from remote...`);
          try {
              const auth = 'Basic ' + Buffer.from(config.username + ':' + config.password).toString('base64');
              const delRes = await fetch(rObj.url, {
                  method: 'DELETE',
                  headers: { 'Authorization': auth }
              });
              
              if (delRes.ok) {
                  console.log(`[Sync] Successfully deleted remote task ${parsed.uid}`);
                  // Cleanup tombstone
                  await pool.query('DELETE FROM deleted_task_sync_log WHERE caldav_uid = $1', [parsed.uid]);
                  // Also cleanup sync meta if it lingered (should have been cascaded but just in case)
                  // await pool.query('DELETE FROM task_sync_meta WHERE caldav_uid = $1', [parsed.uid]);
              } else {
                  console.error(`[Sync] Failed to delete remote task ${parsed.uid}: ${delRes.status}`);
                  result.errors.push(`Failed to delete remote task ${parsed.uid}`);
              }
          } catch (delErr) {
              console.error(`[Sync] Error deleting remote task ${parsed.uid}:`, delErr);
          }
          continue; // Don't process further
      }
      
      const local = localByUid.get(parsed.uid);

      if (local) {
        // MATCH: Compare and Update
        
        // ETag matches if identical OR if local ETag is null (meaning we pushed but haven't saved feedback yet)
        const etagMatches = rObj.etag === local.caldav_etag || (local.caldav_etag === null && local.last_synced_at);

        if (local.last_synced_at && etagMatches) {
           // Check for local updates using numeric timestamps to avoid object/timezone issues
           const localUpdatedTime = local.updated_at ? new Date(local.updated_at).getTime() : 0;
           const lastSyncedTime = local.last_synced_at ? new Date(local.last_synced_at).getTime() : 0;

           // Using >= might be risky if they happen same millisecond, but usually updated > last_synced
           // Adding a small buffer? No, strict > should work if updated_at is set to NOW() on edit.
           if (localUpdatedTime > lastSyncedTime) {
             console.log(`[Sync] Pushing update for Task ${local.id} (UID ${parsed.uid}) to ${rObj.url}`);
             
             // Local changed -> Push to Remote via Raw Fetch
             const vtodoStr = createVTodoString(parsed.uid, local.content, local.status, local.due_date);
             
             try {
                const auth = 'Basic ' + Buffer.from(config.username + ':' + config.password).toString('base64');
                let updateRes = await fetch(rObj.url, {
                    method: 'PUT',
                    headers: {
                        'Authorization': auth,
                        'Content-Type': 'text/calendar; charset=utf-8',
                        'If-Match': `"${rObj.etag}"` 
                    },
                    body: vtodoStr
                });

                // Retry logic for 412 Precondition Failed
                if (updateRes.status === 412) {
                    console.warn(`[Sync] 412 Precondition Failed for Task ${local.id}. Retrying with blind overwrite (No If-Match)...`);
                    updateRes = await fetch(rObj.url, {
                        method: 'PUT',
                        headers: {
                            'Authorization': auth,
                            'Content-Type': 'text/calendar; charset=utf-8'
                            // No If-Match implies overwrite
                        },
                        body: vtodoStr
                    });
                }

                if (!updateRes.ok) {
                    throw new Error(`Server returned ${updateRes.status} ${updateRes.statusText}`);
                }
                
                // Success! Get new ETag if provided (NextCloud often uses OC-Etag)
                const newEtagRaw = updateRes.headers.get('etag') || updateRes.headers.get('oc-etag');
                const newEtag = newEtagRaw ? newEtagRaw.replace(/^"|"$/g, '') : null;
                console.log(`[Sync] Update successful for Task ${local.id}. New ETag: ${newEtag}`);
                
                // Update meta
                if (newEtag) {
                     await pool.query(
                       'UPDATE task_sync_meta SET last_synced_at = NOW(), caldav_etag = $1 WHERE task_id = $2',
                       [newEtag, local.id]
                     );
                } else {
                     await pool.query(
                       'UPDATE task_sync_meta SET last_synced_at = NOW() WHERE task_id = $1',
                       [local.id]
                     );
                }
                
                result.updatedRemote++;
                continue; // Done

             } catch (updateErr: any) {
                 console.error(`[Sync] Update FAILED for Task ${local.id}:`, updateErr);
                 result.errors.push(`Update failed for task ${local.id}: ${updateErr.message}`);
                 continue;
             }
           } else {
             // Neither changed content. Update ETag if needed to stabilize.
             if (local.caldav_etag !== rObj.etag) {
                 await pool.query(
                   'UPDATE task_sync_meta SET caldav_etag = $1 WHERE task_id = $2', 
                   [rObj.etag, local.id]
                 );
             }
             continue;
           }
        }
        
        // If ETag mismatch, Remote changed (Remote Wins)
        // Future improvement: "Local Wins" or Merge if local.updated_at > remote.lastModified
        let remoteIsNewer = true; 
        
        if (remoteIsNewer) {
           const newStatus = parsed.status === 'COMPLETED' ? 'done' : 'todo';
           // Update local task
           await pool.query(
             'UPDATE tasks SET content = $1, status = $2, due_date = $3, updated_at = NOW() WHERE id = $4',
             [parsed.summary, newStatus, parsed.due, local.id]
           );
           
           // Update meta
           await pool.query(
             'UPDATE task_sync_meta SET caldav_etag = $1, last_synced_at = NOW() WHERE task_id = $2',
             [rObj.etag, local.id]
           );
           result.updatedLocal++;
        }

      } else {
        // NO MATCH: New Remote Task -> Create Local
        if (!parsed.summary || parsed.summary.trim() === '') {
            console.log(`[Sync] Skipping empty remote task ${parsed.uid}`);
            continue;
        }

        console.log(`[Sync] New Remote Task found (UID ${parsed.uid}). Creating local.`);
        const newStatus = parsed.status === 'COMPLETED' ? 'done' : 'todo';
        
        const newTaskRes = await pool.query(
          'INSERT INTO tasks (content, status, due_date) VALUES ($1, $2, $3) RETURNING id',
          [parsed.summary, newStatus, parsed.due]
        );
        const newTaskId = newTaskRes.rows[0].id;
        
        await pool.query(
          'INSERT INTO task_sync_meta (task_id, caldav_uid, caldav_etag, last_synced_at) VALUES ($1, $2, $3, NOW())',
          [newTaskId, parsed.uid, rObj.etag]
        );
        result.addedToLocal++;
      }
    }

    // 5. Process Unmapped Local Tasks -> Push to Remote
    for (const local of localUnmapped) {
      if (local.status === 'cancelled') continue; // Don't sync cancelled?
      if (!local.content || local.content.trim() === '') {
          console.log(`[Sync] Skipping empty/blank task ${local.id}`);
          continue; 
      }
      
      console.log(`[Sync] Processing Unmapped Local Task ${local.id}. Pushing new to remote.`);
      
      const newUid = uuidv4();
      const vtodoStr = createVTodoString(newUid, local.content, local.status, local.due_date);
      
      // Filename usually required
      const filename = `${newUid}.ics`;
      
      await client.createCalendarObject({
        calendar,
        filename,
        iCalString: vtodoStr
      });
      
      // Save meta
      // We need to fetch ETag or just set it null until next sync
      await pool.query(
        'INSERT INTO task_sync_meta (task_id, caldav_uid, last_synced_at) VALUES ($1, $2, NOW())',
        [local.id, newUid]
      );
      result.addedToRemote++;
    }

  } catch (error: any) {
    console.error('CalDAV Sync Error:', error);
    result.errors.push(error.message || 'Unknown error');
  }

  return result;
}
