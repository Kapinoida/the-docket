import { renderHook, act, waitFor } from '@testing-library/react';
import { useNowPlaying } from '../useNowPlaying';

jest.mock('@/lib/azuracast', () => ({
  fetchNowPlaying: jest.fn(),
}));

import { fetchNowPlaying } from '@/lib/azuracast';
const mockFetchNowPlaying = fetchNowPlaying as jest.MockedFunction<typeof fetchNowPlaying>;

const mockStation = {
  station: {
    id: 1,
    name: 'Runtime Loop',
    shortcode: 'runtime_loop',
    listen_url: 'https://radio.dcplaskett.com/listen/runtime_loop/radio.mp3',
  },
  listeners: { total: 5, unique: 3, current: 5 },
  now_playing: {
    song: {
      id: 'abc123',
      text: 'Artist — Title',
      artist: 'Artist',
      title: 'Title',
      art: 'https://example.com/art.jpg',
    },
    elapsed: 30,
    duration: 180,
    played_at: 1700000000,
  },
  playing_next: null,
  song_history: [],
  is_online: true,
};

describe('useNowPlaying', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchNowPlaying.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches now playing data on mount', async () => {
    mockFetchNowPlaying.mockResolvedValue([mockStation]);

    const { result } = renderHook(() => useNowPlaying());

    await waitFor(() => {
      expect(result.current.stations['runtime_loop']).toBeDefined();
      expect(result.current.stations['runtime_loop'].station.shortcode).toBe('runtime_loop');
    });

    expect(result.current.isOffline).toBe(false);
    expect(result.current.lastUpdated).not.toBeNull();
  });

  it('sets isOffline when fetch returns null', async () => {
    mockFetchNowPlaying.mockResolvedValue(null);

    const { result } = renderHook(() => useNowPlaying());

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });

    expect(Object.keys(result.current.stations)).toHaveLength(0);
  });

  it('sets isOffline when fetch throws', async () => {
    mockFetchNowPlaying.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNowPlaying());

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });
  });

  it('keys stations by shortcode', async () => {
    const warmBootStation = {
      ...mockStation,
      station: {
        ...mockStation.station,
        id: 2,
        name: 'Warm Boot',
        shortcode: 'warm_boot',
      },
    };
    mockFetchNowPlaying.mockResolvedValue([mockStation, warmBootStation]);

    const { result } = renderHook(() => useNowPlaying());

    await waitFor(() => {
      expect(Object.keys(result.current.stations)).toHaveLength(2);
      expect(result.current.stations['runtime_loop']).toBeDefined();
      expect(result.current.stations['warm_boot']).toBeDefined();
    });
  });

  it('getStation returns station by shortcode', async () => {
    mockFetchNowPlaying.mockResolvedValue([mockStation]);

    const { result } = renderHook(() => useNowPlaying());

    await waitFor(() => {
      expect(result.current.getStation('runtime_loop')).not.toBeNull();
    });

    expect(result.current.getStation('nonexistent')).toBeNull();
  });

  it('refresh triggers a new fetch', async () => {
    mockFetchNowPlaying.mockResolvedValue([mockStation]);

    const { result } = renderHook(() => useNowPlaying());

    await waitFor(() => {
      expect(mockFetchNowPlaying).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockFetchNowPlaying).toHaveBeenCalledTimes(2);
    });
  });

  it('filters out invalid station shapes', async () => {
    const validStation = { ...mockStation };
    mockFetchNowPlaying.mockResolvedValue([validStation]);

    const { result } = renderHook(() => useNowPlaying());

    await waitFor(() => {
      expect(Object.keys(result.current.stations)).toHaveLength(1);
      expect(result.current.stations['runtime_loop']).toBeDefined();
    });
  });
});
