import { render, screen } from '@testing-library/react';
import SongHistory from '../SongHistory';
import type { AzuraCastStation } from '@/types/azuracast';

const mockNowPlayingWithHistory: AzuraCastStation = {
  id: 1,
  name: 'Runtime Loop',
  shortcode: 'runtime_loop',
  listen_url: 'https://radio.dcplaskett.com/listen/runtime_loop/radio.mp3',
  listeners: { total: 5, unique: 3, current: 5 },
  now_playing: {
    song: {
      id: 'abc',
      text: 'Current Track',
      artist: 'Current Artist',
      title: 'Current Title',
      art: null,
    },
    elapsed: 30,
    duration: 180,
  },
  playing_next: null,
  song_history: [
    {
      song: {
        id: 'hist1',
        text: 'Previous Artist 1 — Previous Title 1',
        artist: 'Previous Artist 1',
        title: 'Previous Title 1',
        art: 'https://example.com/art1.jpg',
      },
      played_at: Math.floor(Date.now() / 1000) - 300,
    },
    {
      song: {
        id: 'hist2',
        text: 'Previous Artist 2 — Previous Title 2',
        artist: 'Previous Artist 2',
        title: 'Previous Title 2',
        art: null,
      },
      played_at: Math.floor(Date.now() / 1000) - 600,
    },
  ],
};

const mockNowPlayingEmpty: AzuraCastStation = {
  id: 1,
  name: 'Runtime Loop',
  shortcode: 'runtime_loop',
  listen_url: 'https://radio.dcplaskett.com/listen/runtime_loop/radio.mp3',
  listeners: { total: 5, unique: 3, current: 5 },
  now_playing: {
    song: {
      id: 'abc',
      text: 'Current Track',
      artist: 'Current Artist',
      title: 'Current Title',
      art: null,
    },
    elapsed: 30,
    duration: 180,
  },
  playing_next: null,
  song_history: [],
};

describe('SongHistory', () => {
  it('renders song history items', () => {
    render(<SongHistory nowPlaying={mockNowPlayingWithHistory} />);
    expect(screen.getByText('Previous Artist 1 — Previous Title 1')).toBeInTheDocument();
    expect(screen.getByText('Previous Artist 2 — Previous Title 2')).toBeInTheDocument();
  });

  it('shows empty state when no history', () => {
    render(<SongHistory nowPlaying={mockNowPlayingEmpty} />);
    expect(screen.getByText('No history available yet')).toBeInTheDocument();
  });

  it('shows section header', () => {
    render(<SongHistory nowPlaying={mockNowPlayingWithHistory} />);
    expect(screen.getByText('Song History')).toBeInTheDocument();
  });

  it('shows album art when available', () => {
    render(<SongHistory nowPlaying={mockNowPlayingWithHistory} />);
    const img = screen.getByAltText('');
    expect(img).toHaveAttribute('src', 'https://example.com/art1.jpg');
  });
});
