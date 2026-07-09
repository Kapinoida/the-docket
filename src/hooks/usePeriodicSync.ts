import { useEffect, useRef } from 'react';
import { apiFetch, AuthError } from '@/lib/api';

export function usePeriodicSync(intervalMs: number = 300000) { // Default 5 minutes
  const isSyncingRef = useRef(false);

  useEffect(() => {
    // Define the sync function
    const performSync = async () => {
      if (isSyncingRef.current) {
        return;
      }

      // Check if sync is paused
      const isPaused = localStorage.getItem('docket_sync_paused') === 'true';
      if (isPaused) {
        return;
      }

      try {
        isSyncingRef.current = true;

        await apiFetch('/api/caldav/sync', { method: 'POST' });
      } catch (error) {
        if (error instanceof AuthError) { return; }
        console.error('[AutoSync] Sync error:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Run once on mount? Maybe not, allow initial load to settle.
    // Or simpler: Just set the interval.

    // Actually, often good to run one shortly after load, but let's stick to strict interval for now.
    const timerId = setInterval(performSync, intervalMs);

    return () => clearInterval(timerId);
  }, [intervalMs]);
}
