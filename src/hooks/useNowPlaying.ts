import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchNowPlaying } from '@/lib/azuracast';
import type { AzuraCastStation } from '@/types/azuracast';

const POLL_INTERVAL_MS = 30_000;

interface NowPlayingState {
  stations: Record<string, AzuraCastStation>;
  isOffline: boolean;
  lastUpdated: number | null;
}

export function useNowPlaying() {
  const [state, setState] = useState<NowPlayingState>({
    stations: {},
    isOffline: false,
    lastUpdated: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);

  const poll = useCallback(async () => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const data = await fetchNowPlaying();
      if (data) {
        const stations: Record<string, AzuraCastStation> = {};
        for (const station of data) {
          stations[station.shortcode] = station;
        }
        setState({
          stations,
          isOffline: false,
          lastUpdated: Date.now(),
        });
      } else {
        setState((prev) => ({ ...prev, isOffline: true }));
      }
    } catch {
      setState((prev) => ({ ...prev, isOffline: true }));
    } finally {
      isPollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    poll();

    const startPolling = () => {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
      }
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopPolling();
      } else {
        poll();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [poll]);

  const getStation = useCallback(
    (shortcode: string) => state.stations[shortcode] ?? null,
    [state.stations]
  );

  return {
    stations: state.stations,
    isOffline: state.isOffline,
    lastUpdated: state.lastUpdated,
    getStation,
    refresh: poll,
  };
}
