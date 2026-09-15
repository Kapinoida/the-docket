import type { AzuraCastNowPlayingResponse, AzuraCastStation } from '@/types/azuracast';

const AZURACAST_API_URL = 'https://radio.dcplaskett.com/api/nowplaying';
const FETCH_TIMEOUT_MS = 8000;

function isValidStation(data: unknown): data is AzuraCastStation {
  if (!data || typeof data !== 'object') return false;
  const station = data as Record<string, unknown>;
  return (
    typeof station.shortcode === 'string' &&
    typeof station.name === 'string' &&
    typeof station.listen_url === 'string' &&
    station.listeners !== null &&
    typeof station.listeners === 'object' &&
    station.now_playing !== null &&
    typeof station.now_playing === 'object'
  );
}

export async function fetchNowPlaying(): Promise<AzuraCastNowPlayingResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(AZURACAST_API_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data)) return null;

    const stations = data.filter(isValidStation);
    return stations.length > 0 ? stations : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
