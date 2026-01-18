import { useEffect, useRef } from 'react';

export function usePeriodicSync(intervalMs: number = 300000) { // Default 5 minutes
  const isSyncingRef = useRef(false);

  useEffect(() => {
    // Define the sync function
    const performSync = async () => {
      if (isSyncingRef.current) {
        console.log('[AutoSync] Sync already in progress, skipping.');
        return;
      }

      // Check if sync is paused
      const isPaused = localStorage.getItem('docket_sync_paused') === 'true';
      if (isPaused) {
        return;
      }

      try {
        isSyncingRef.current = true;
        console.log('[AutoSync] Starting periodic sync...');
        
        const res = await fetch('/api/caldav/sync', { method: 'POST' });
        
        if (res.ok) {
            console.log('[AutoSync] Sync completed successfully.');
        } else {
            console.warn('[AutoSync] Sync failed with status:', res.status);
        }
      } catch (error) {
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
