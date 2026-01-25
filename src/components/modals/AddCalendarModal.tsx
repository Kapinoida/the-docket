'use client';

import { useState } from 'react';
import { X, Calendar as CalendarIcon, Link as LinkIcon, User, Lock, Loader2 } from 'lucide-react';

interface AddCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCalendarModal({ isOpen, onClose, onSuccess }: AddCalendarModalProps) {
  const [mode, setMode] = useState<'ical' | 'caldav'>('ical');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const payload = mode === 'ical' 
        ? {
            name: name || 'Calendar Subscription',
            server_url: url,
            calendar_url: url,
            resource_type: 'event_calendar'
          }
        : {
            name: name || 'CalDAV Account',
            server_url: url,
            username,
            password,
            resource_type: 'event_calendar' // Default to events, or let user pick? Assuming events for now.
          };

      const res = await fetch('/api/caldav/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add calendar');
      }

      onSuccess();
      onClose();
      // Reset form
      setName('');
      setUrl('');
      setUsername('');
      setPassword('');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-primary border border-border-default rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-accent-blue" />
            Add Calendar
          </h2>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-bg-secondary p-1 rounded-lg">
          <button
            onClick={() => setMode('ical')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === 'ical' 
                ? 'bg-bg-primary text-text-primary shadow-sm' 
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            iCal Subscription
          </button>
          <button
            onClick={() => setMode('caldav')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === 'caldav' 
                ? 'bg-bg-primary text-text-primary shadow-sm' 
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            CalDAV Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Work Calendar" or "Holidays"'
              className="w-full px-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              {mode === 'ical' ? 'Subscription URL (.ics)' : 'Server URL'}
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={mode === 'ical' ? 'https://example.com/calendar.ics' : 'https://nextcloud.example.com/remote.php/dav'}
                required
                className="w-full pl-9 pr-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all"
              />
            </div>
          </div>

          {mode === 'caldav' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all"
                  />
                </div>
              </div>
            </>
          )}
          
          <div className="flex items-center justify-end gap-3 mt-6 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-accent-blue hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'ical' ? 'Subscribe' : 'Connect Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
