'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Calendar, CheckSquare, RefreshCw, X } from 'lucide-react';
import { ConfirmationModal } from './modals/ConfirmationModal';

interface CalDAVConfig {
  id: number;
  server_url: string;
  username: string;
  calendar_url?: string;
  name?: string;
  resource_type: 'task_list' | 'event_calendar';
  enabled: boolean;
}

interface DiscoveredCalendar {
  name: string;
  url: string;
}

export function CalDAVSettings() {
  const [configs, setConfigs] = useState<CalDAVConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    server_url: '',
    username: '',
    password: '',
  });
  const [discovered, setDiscovered] = useState<DiscoveredCalendar[]>([]);
  const [selectedCalendarUrl, setSelectedCalendarUrl] = useState('');
  const [resourceType, setResourceType] = useState<'task_list' | 'event_calendar'>('task_list');
  const [accountName, setAccountName] = useState('');
  
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; accountId: number | null }>({
    isOpen: false,
    accountId: null
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/caldav/config');
      if (res.ok) {
        const data = await res.json();
        setConfigs(Array.isArray(data) ? data : []); // Handle legacy null/object gracefully? API ensures array now.
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: number) => {
    setDeleteConfirmation({ isOpen: true, accountId: id });
  };

  const handleDelete = async () => {
    if (!deleteConfirmation.accountId) return;
    
    const id = deleteConfirmation.accountId;
    
    try {
      const res = await fetch(`/api/caldav/config?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConfigs(prev => prev.filter(c => c.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDiscover = async () => {
    if (!formData.server_url || !formData.username || !formData.password) {
      setMessage({ text: 'Please fill in all credentials first.', type: 'error' });
      return;
    }
    
    setProcessing(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/caldav/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch calendars');
      
      setDiscovered(data);
      if (data.length > 0) {
        setSelectedCalendarUrl(data[0].url);
        // Default name to first calendar
        if (!accountName) setAccountName(data[0].name);
      }
      setMessage({ text: `Found ${data.length} calendars.`, type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setMessage(null);

    const payload = {
        ...formData,
        calendar_url: selectedCalendarUrl,
        name: accountName || 'My Calendar',
        resource_type: resourceType
    };

    try {
      const res = await fetch('/api/caldav/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      // Success
      setConfigs(prev => [...prev, data]);
      // Reset Form
      setFormData({ server_url: '', username: '', password: '' });
      setDiscovered([]);
      setSelectedCalendarUrl('');
      setAccountName('');
      setShowAddForm(false);
      
      setMessage({ text: 'Account added successfully!', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-4"><Loader2 className="animate-spin w-5 h-5" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">CalDAV Integration</h3>
        <p className="text-sm text-zinc-500">Connect external calendars (Tasks & Events).</p>
      </div>
      
      {/* Active Accounts List */}
      <div className="space-y-3">
        {configs.map(config => (
          <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg bg-bg-secondary border-border-default">
             <div className="flex items-center gap-3">
               <div className={`p-2 rounded-full ${config.resource_type === 'task_list' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30'}`}>
                 {config.resource_type === 'task_list' ? <CheckSquare size={18} /> : <Calendar size={18} />}
               </div>
               <div>
                 <div className="font-medium text-sm">{config.name}</div>
                 <div className="text-xs text-text-muted">{config.username} • {new URL(config.server_url).hostname}</div>
               </div>
             </div>
             <button 
               onClick={() => confirmDelete(config.id)}
               className="p-2 text-text-muted hover:text-red-600 transition-colors"
               title="Disconnect"
             >
               <Trash2 size={16} />
             </button>
          </div>
        ))}
        
        {configs.length === 0 && !showAddForm && (
          <div className="text-sm text-text-muted italic py-2">No accounts connected.</div>
        )}
      </div>

      {/* Add Account Button */}
      {!showAddForm ? (
         <button 
           onClick={() => setShowAddForm(true)}
           className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
         >
           <Plus size={16} /> Add Account
         </button>
      ) : (
        <div className="border rounded-lg p-4 bg-bg-secondary space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-sm">New Connection</h4>
                <button onClick={() => setShowAddForm(false)} className="text-text-muted hover:text-text-primary"><X size={16}/></button>
            </div>
            
            {message && (
                <div className={`p-3 rounded-md text-xs ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {message.text}
                </div>
            )}

            <div className="space-y-3">
               <input
                 className="w-full p-2 text-sm border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                 placeholder="Server URL (e.g., https://cloud.example.com/remote.php/dav)"
                 value={formData.server_url}
                 onChange={e => setFormData({ ...formData, server_url: e.target.value })}
               />
               <div className="grid grid-cols-2 gap-3">
                 <input
                   className="w-full p-2 text-sm border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                   placeholder="Username"
                   value={formData.username}
                   onChange={e => setFormData({ ...formData, username: e.target.value })}
                 />
                 <input
                   type="password"
                   className="w-full p-2 text-sm border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                   placeholder="Password"
                   value={formData.password}
                   onChange={e => setFormData({ ...formData, password: e.target.value })}
                 />
               </div>
               
               {discovered.length === 0 && (
                   <button
                     type="button"
                     onClick={handleDiscover}
                     disabled={processing}
                     className="flex items-center justify-center gap-2 w-full py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
                   >
                     {processing ? <Loader2 className="animate-spin w-4 h-4"/> : <RefreshCw className="w-4 h-4"/>} 
                     Discover Calendars
                   </button>
               )}
               
               {discovered.length > 0 && (
                   <div className="space-y-3 pt-3 border-t border-border-subtle">
                        <div>
                            <label className="block text-xs font-medium mb-1">Select Resource</label>
                            <select 
                                value={selectedCalendarUrl}
                                onChange={e => {
                                    setSelectedCalendarUrl(e.target.value);
                                    const found = discovered.find(d => d.url === e.target.value);
                                    if(found) setAccountName(found.name);
                                }}
                                className="w-full p-2 text-sm border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                            >
                                {discovered.map(cal => (
                                    <option key={cal.url} value={cal.url}>{cal.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium mb-1">Type</label>
                                <select 
                                    value={resourceType}
                                    onChange={e => setResourceType(e.target.value as any)}
                                    className="w-full p-2 text-sm border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                                >
                                    <option value="task_list">Task List</option>
                                    <option value="event_calendar">Event Calendar</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Display Name</label>
                                <input
                                    value={accountName}
                                    onChange={e => setAccountName(e.target.value)}
                                    className="w-full p-2 text-sm border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                                />
                            </div>
                        </div>
                        
                        <button
                            onClick={handleSave}
                            disabled={processing}
                            className="w-full py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                        >
                            {processing ? 'Saving...' : 'Save Connection'}
                        </button>
                   </div>
               )}
            </div>
        </div>
      )}
      
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, accountId: null })}
        onConfirm={handleDelete}
        title="Remove Account"
        message="Are you sure you want to remove this account? Local data may be preserved but sync will stop."
        confirmLabel="Remove"
      />
    </div>
  );
}
