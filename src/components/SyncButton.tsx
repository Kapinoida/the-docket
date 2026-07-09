'use client';

import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch, AuthError } from '@/lib/api';

interface SyncResponse {
  error?: string;
}

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiFetch<SyncResponse>('/api/caldav/sync', { method: 'POST' });

      router.refresh(); // Refresh data on page
    } catch (error) {
      if (error instanceof AuthError) { return; }
      console.error('Sync Error:', error);
      alert('Sync failed. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
      title="Sync with CalDAV"
    >
      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
    </button>
  );
}
