'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export function CalDAVSettings() {
  const [config, setConfig] = useState({
    server_url: '',
    username: '',
    password: '',
    calendar_url: '',
    enabled: true
  });
  const [calendars, setCalendars] = useState<Array<{name: string, url: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingCalendars, setFetchingCalendars] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/caldav/config')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setConfig({
            server_url: data.server_url || '',
            username: data.username || '',
            password: '', // Don't show existing password
            calendar_url: data.calendar_url || '',
            enabled: data.enabled
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleFetchCalendars = async () => {
    if (!config.server_url || !config.username || !config.password) {
      setMessage({ text: 'Please enter Server URL, Username, and Password first.', type: 'error' });
      return;
    }
    
    setFetchingCalendars(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/caldav/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_url: config.server_url,
          username: config.username,
          password: config.password
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch calendars');
      
      setCalendars(data);
      if (data.length > 0 && !config.calendar_url) {
        setConfig(prev => ({ ...prev, calendar_url: data[0].url }));
      }
      setMessage({ text: `Found ${data.length} task-enabled calendars.`, type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setFetchingCalendars(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/caldav/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setMessage({ text: 'Settings saved and connection verified!', type: 'success' });
      // Clear password field after save
      setConfig(prev => ({ ...prev, password: '' }));
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4"><Loader2 className="animate-spin w-5 h-5" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">CalDAV Integration</h3>
      <p className="text-sm text-zinc-500">Sync tasks with NextCloud or other CalDAV servers.</p>
      
      {message && (
        <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Server URL</label>
          <input
            type="text"
            required
            placeholder="https://nextcloud.example.com/remote.php/dav"
            value={config.server_url}
            onChange={e => setConfig({ ...config, server_url: e.target.value })}
            className="w-full p-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              required
              value={config.username}
              onChange={e => setConfig({ ...config, username: e.target.value })}
              className="w-full p-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required={!config.server_url}
              value={config.password}
              onChange={e => setConfig({ ...config, password: e.target.value })}
              className="w-full p-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
            />
          </div>
        </div>
        
        <div className="pt-2 border-t dark:border-zinc-800">
           <div className="flex justify-between items-center mb-2">
             <label className="block text-sm font-medium">Target Calendar</label>
             <button 
               type="button"
               onClick={handleFetchCalendars}
               disabled={fetchingCalendars || !config.server_url}
               className="text-xs text-blue-500 hover:text-blue-400 disabled:opacity-50"
             >
               {fetchingCalendars ? 'Fetching...' : 'Fetch Calendars'}
             </button>
           </div>
           
           {calendars.length > 0 ? (
             <select
               value={config.calendar_url}
               onChange={e => setConfig({ ...config, calendar_url: e.target.value })}
               className="w-full p-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
             >
               <option value="">Select a calendar...</option>
               {calendars.map(cal => (
                 <option key={cal.url} value={cal.url}>
                   {cal.name}
                 </option>
               ))}
             </select>
           ) : (
             <input
                type="text"
                placeholder="Or enter calendar URL/path manually"
                value={config.calendar_url}
                onChange={e => setConfig({ ...config, calendar_url: e.target.value })}
                className="w-full p-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
              />
           )}
           <p className="text-xs text-zinc-500 mt-1">Select the calendar list to sync tasks with.</p>
        </div>
        
        <button
          type="submit"
          disabled={saving}
          className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Testing & Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
