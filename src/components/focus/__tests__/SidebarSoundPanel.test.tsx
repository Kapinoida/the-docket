import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SidebarSoundPanel from '../SidebarSoundPanel';
import type { AmbienceMode, MusicSource } from '@/hooks/useAmbience';

const mockSetAmbienceMode = jest.fn();
const mockSetMusicSource = jest.fn();
const mockStopAll = jest.fn();
const mockSetVolume = jest.fn();

let mockSoundState: {
  ambienceMode: AmbienceMode;
  musicSource: MusicSource;
  isPlaying: boolean;
  volume: number;
} = {
  ambienceMode: 'none',
  musicSource: 'none',
  isPlaying: false,
  volume: 0.6,
};

jest.mock('@/contexts/SoundContext', () => ({
  useSound: () => ({
    ambienceMode: mockSoundState.ambienceMode,
    musicSource: mockSoundState.musicSource,
    isPlaying: mockSoundState.isPlaying,
    volume: mockSoundState.volume,
    setAmbienceMode: mockSetAmbienceMode,
    setMusicSource: mockSetMusicSource,
    setVolume: mockSetVolume,
    stopAll: mockStopAll,
  }),
}));

let mockNowPlayingState = {
  stations: {} as Record<string, any>,
  isOffline: false,
  lastUpdated: null as number | null,
  getStation: (_code: string) => null as any,
};

jest.mock('@/hooks/useNowPlaying', () => ({
  useNowPlaying: () => ({
    stations: mockNowPlayingState.stations,
    isOffline: mockNowPlayingState.isOffline,
    lastUpdated: mockNowPlayingState.lastUpdated,
    getStation: mockNowPlayingState.getStation,
    refresh: jest.fn(),
  }),
}));

describe('SidebarSoundPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSoundState = {
      ambienceMode: 'none',
      musicSource: 'none',
      isPlaying: false,
      volume: 0.6,
    };
    mockNowPlayingState = {
      stations: {},
      isOffline: false,
      lastUpdated: null,
      getStation: (_code: string) => null as any,
    };
  });

  it('renders idle radio selector when nothing is playing', () => {
    render(<SidebarSoundPanel />);
    expect(screen.getByText('Radio')).toBeInTheDocument();
  });

  it('shows popover with ambience and music options when clicked', () => {
    render(<SidebarSoundPanel />);
    fireEvent.click(screen.getByText('Radio'));
    expect(screen.getByText('Ambience')).toBeInTheDocument();
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('Brown Noise')).toBeInTheDocument();
    expect(screen.getByText('Pentatonic')).toBeInTheDocument();
  });

  it('calls setAmbienceMode when an ambience option is selected', () => {
    render(<SidebarSoundPanel />);
    fireEvent.click(screen.getByText('Radio'));
    fireEvent.click(screen.getByText('Rain'));
    expect(mockSetAmbienceMode).toHaveBeenCalledWith('rain');
  });

  it('calls setMusicSource when a music option is selected', () => {
    render(<SidebarSoundPanel />);
    fireEvent.click(screen.getByText('Radio'));
    fireEvent.click(screen.getByText('Runtime Loop'));
    expect(mockSetMusicSource).toHaveBeenCalledWith('runtime_loop');
  });

  it('shows label when ambience is playing (non-stream)', () => {
    mockSoundState = { ambienceMode: 'rain', musicSource: 'none', isPlaying: true, volume: 0.6 };
    render(<SidebarSoundPanel />);
    expect(screen.getByText('Rain')).toBeInTheDocument();
  });

  it('shows label when pentatonic is playing (non-stream)', () => {
    mockSoundState = { ambienceMode: 'none', musicSource: 'pentatonic', isPlaying: true, volume: 0.6 };
    render(<SidebarSoundPanel />);
    expect(screen.getByText('Pentatonic')).toBeInTheDocument();
  });

  it('shows combined label when both ambience and music are playing', () => {
    mockSoundState = { ambienceMode: 'brown-noise', musicSource: 'pentatonic', isPlaying: true, volume: 0.6 };
    render(<SidebarSoundPanel />);
    expect(screen.getByText('Brown Noise + Pentatonic')).toBeInTheDocument();
  });

  it('calls stopAll when stop button is clicked', () => {
    mockSoundState = { ambienceMode: 'rain', musicSource: 'none', isPlaying: true, volume: 0.6 };
    render(<SidebarSoundPanel />);
    const stopButton = screen.getByTitle('Stop all sounds');
    fireEvent.click(stopButton);
    expect(mockStopAll).toHaveBeenCalled();
  });

  it('shows mini-player with station name and track when stream is playing', () => {
    mockSoundState = { ambienceMode: 'none', musicSource: 'runtime_loop', isPlaying: true, volume: 0.6 };
    mockNowPlayingState = {
      stations: {
        runtime_loop: {
          station: {
            id: 1,
            name: 'Runtime Loop',
            shortcode: 'runtime_loop',
            listen_url: 'https://radio.dcplaskett.com/listen/runtime_loop/radio.mp3',
          },
          listeners: { total: 5, unique: 3, current: 5 },
          now_playing: {
            song: {
              id: 'abc',
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
        },
      },
      isOffline: false,
      lastUpdated: Date.now(),
      getStation: (code: string) => code === 'runtime_loop' ? mockNowPlayingState.stations.runtime_loop : null,
    };
    render(<SidebarSoundPanel />);
    expect(screen.getByText('Runtime Loop')).toBeInTheDocument();
    expect(screen.getByText('Artist — Title')).toBeInTheDocument();
  });

  it('shows off-air state when AzuraCast is unreachable', () => {
    mockSoundState = { ambienceMode: 'none', musicSource: 'runtime_loop', isPlaying: true, volume: 0.6 };
    mockNowPlayingState = {
      stations: {},
      isOffline: true,
      lastUpdated: null,
      getStation: (_code: string) => null as any,
    };
    render(<SidebarSoundPanel />);
    expect(screen.getByText('Runtime Loop')).toBeInTheDocument();
  });

  it('shows switch station button when stream is playing', () => {
    mockSoundState = { ambienceMode: 'none', musicSource: 'runtime_loop', isPlaying: true, volume: 0.6 };
    mockNowPlayingState = {
      stations: {
        runtime_loop: {
          station: {
            id: 1,
            name: 'Runtime Loop',
            shortcode: 'runtime_loop',
            listen_url: 'https://radio.dcplaskett.com/listen/runtime_loop/radio.mp3',
          },
          listeners: { total: 5, unique: 3, current: 5 },
          now_playing: {
            song: { id: 'abc', text: 'Track', artist: 'A', title: 'T', art: null },
            elapsed: 0,
            duration: 100,
            played_at: 1700000000,
          },
          playing_next: null,
          song_history: [],
          is_online: true,
        },
      },
      isOffline: false,
      lastUpdated: Date.now(),
      getStation: (code: string) => code === 'runtime_loop' ? mockNowPlayingState.stations.runtime_loop : null,
    };
    render(<SidebarSoundPanel />);
    expect(screen.getByTitle('Switch station')).toBeInTheDocument();
  });

  it('switches station when switch button is clicked', () => {
    mockSoundState = { ambienceMode: 'none', musicSource: 'runtime_loop', isPlaying: true, volume: 0.6 };
    mockNowPlayingState = {
      stations: {
        runtime_loop: {
          station: {
            id: 1,
            name: 'Runtime Loop',
            shortcode: 'runtime_loop',
            listen_url: 'https://radio.dcplaskett.com/listen/runtime_loop/radio.mp3',
          },
          listeners: { total: 5, unique: 3, current: 5 },
          now_playing: {
            song: { id: 'abc', text: 'Track', artist: 'A', title: 'T', art: null },
            elapsed: 0,
            duration: 100,
            played_at: 1700000000,
          },
          playing_next: null,
          song_history: [],
          is_online: true,
        },
      },
      isOffline: false,
      lastUpdated: Date.now(),
      getStation: (code: string) => code === 'runtime_loop' ? mockNowPlayingState.stations.runtime_loop : null,
    };
    render(<SidebarSoundPanel />);
    fireEvent.click(screen.getByTitle('Switch station'));
    expect(mockSetMusicSource).toHaveBeenCalledWith('warm_boot');
  });

  it('shows volume slider in idle popover', () => {
    render(<SidebarSoundPanel />);
    fireEvent.click(screen.getByText('Radio'));
    const volumeSlider = screen.getByLabelText('Volume');
    expect(volumeSlider).toBeInTheDocument();
    expect(volumeSlider).toHaveAttribute('type', 'range');
  });

  it('calls setVolume when volume slider changes in idle popover', () => {
    render(<SidebarSoundPanel />);
    fireEvent.click(screen.getByText('Radio'));
    const volumeSlider = screen.getByLabelText('Volume');
    fireEvent.change(volumeSlider, { target: { value: '0.3' } });
    expect(mockSetVolume).toHaveBeenCalledWith(0.3);
  });

  it('shows volume slider when stream is playing', () => {
    mockSoundState = { ambienceMode: 'none', musicSource: 'runtime_loop', isPlaying: true, volume: 0.5 };
    mockNowPlayingState = {
      stations: {
        runtime_loop: {
          station: {
            id: 1,
            name: 'Runtime Loop',
            shortcode: 'runtime_loop',
            listen_url: 'https://radio.dcplaskett.com/listen/runtime_loop/radio.mp3',
          },
          listeners: { total: 5, unique: 3, current: 5 },
          now_playing: {
            song: { id: 'abc', text: 'Track', artist: 'A', title: 'T', art: null },
            elapsed: 0,
            duration: 100,
            played_at: 1700000000,
          },
          playing_next: null,
          song_history: [],
          is_online: true,
        },
      },
      isOffline: false,
      lastUpdated: Date.now(),
      getStation: (code: string) => code === 'runtime_loop' ? mockNowPlayingState.stations.runtime_loop : null,
    };
    render(<SidebarSoundPanel />);
    const volumeSlider = screen.getByLabelText('Volume');
    expect(volumeSlider).toBeInTheDocument();
    expect(volumeSlider).toHaveValue('0.5');
  });

  it('shows volume slider when non-stream audio is playing', () => {
    mockSoundState = { ambienceMode: 'rain', musicSource: 'none', isPlaying: true, volume: 0.7 };
    render(<SidebarSoundPanel />);
    const volumeSlider = screen.getByLabelText('Volume');
    expect(volumeSlider).toBeInTheDocument();
    expect(volumeSlider).toHaveValue('0.7');
  });
});
