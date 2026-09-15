import { render, screen } from '@testing-library/react';
import NowPlayingPanel from '../NowPlayingPanel';
import type { RadioStation } from '@/lib/radioStations';
import type { AzuraCastStation } from '@/types/azuracast';

const mockStation: RadioStation = {
  shortcode: 'runtime_loop',
  displayName: 'Runtime Loop',
  listenUrl: 'https://radio.dcplaskett.com/listen/runtime_loop/radio.mp3',
  description: 'Ambient electronic loops',
};

const mockNowPlaying: AzuraCastStation = {
  id: 1,
  name: 'Runtime Loop',
  shortcode: 'runtime_loop',
  listen_url: 'https://radio.dcplaskett.com/listen/runtime_loop/radio.mp3',
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
  },
  playing_next: {
    song: {
      id: 'def',
      text: 'Next Artist — Next Title',
      artist: 'Next Artist',
      title: 'Next Title',
      art: null,
    },
  },
  song_history: [],
};

describe('NowPlayingPanel', () => {
  it('renders station name and track info', () => {
    render(
      <NowPlayingPanel
        station={mockStation}
        nowPlaying={mockNowPlaying}
        isOffline={false}
      />
    );
    expect(screen.getByText('Runtime Loop')).toBeInTheDocument();
    expect(screen.getByText('Artist — Title')).toBeInTheDocument();
  });

  it('shows listener count', () => {
    render(
      <NowPlayingPanel
        station={mockStation}
        nowPlaying={mockNowPlaying}
        isOffline={false}
      />
    );
    expect(screen.getByText('5 listeners')).toBeInTheDocument();
  });

  it('shows elapsed and duration time', () => {
    render(
      <NowPlayingPanel
        station={mockStation}
        nowPlaying={mockNowPlaying}
        isOffline={false}
      />
    );
    expect(screen.getByText('0:30 / 3:00')).toBeInTheDocument();
  });

  it('shows next track when available', () => {
    render(
      <NowPlayingPanel
        station={mockStation}
        nowPlaying={mockNowPlaying}
        isOffline={false}
      />
    );
    expect(screen.getByText('Next Artist — Next Title')).toBeInTheDocument();
  });

  it('shows offline state', () => {
    render(
      <NowPlayingPanel
        station={mockStation}
        nowPlaying={mockNowPlaying}
        isOffline={true}
      />
    );
    expect(screen.getByText('Station Offline')).toBeInTheDocument();
    expect(screen.getByText('Runtime Loop is currently unreachable')).toBeInTheDocument();
  });

  it('shows album art when available', () => {
    render(
      <NowPlayingPanel
        station={mockStation}
        nowPlaying={mockNowPlaying}
        isOffline={false}
      />
    );
    const img = screen.getByAltText('Album art');
    expect(img).toHaveAttribute('src', 'https://example.com/art.jpg');
  });
});
