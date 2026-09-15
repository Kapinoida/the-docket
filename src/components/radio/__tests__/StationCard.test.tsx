import { render, screen, fireEvent } from '@testing-library/react';
import StationCard from '../StationCard';
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
  playing_next: null,
  song_history: [],
};

describe('StationCard', () => {
  const mockOnPlay = jest.fn();
  const mockOnStop = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders station name and description', () => {
    render(
      <StationCard
        station={mockStation}
        nowPlaying={null}
        isPlaying={false}
        isOffline={false}
        onPlay={mockOnPlay}
        onStop={mockOnStop}
      />
    );
    expect(screen.getByText('Runtime Loop')).toBeInTheDocument();
    expect(screen.getByText('Ambient electronic loops')).toBeInTheDocument();
  });

  it('shows play button when not playing', () => {
    render(
      <StationCard
        station={mockStation}
        nowPlaying={null}
        isPlaying={false}
        isOffline={false}
        onPlay={mockOnPlay}
        onStop={mockOnStop}
      />
    );
    expect(screen.getByTitle('Play')).toBeInTheDocument();
  });

  it('shows stop button when playing', () => {
    render(
      <StationCard
        station={mockStation}
        nowPlaying={mockNowPlaying}
        isPlaying={true}
        isOffline={false}
        onPlay={mockOnPlay}
        onStop={mockOnStop}
      />
    );
    expect(screen.getByTitle('Stop')).toBeInTheDocument();
  });

  it('calls onPlay when play button is clicked', () => {
    render(
      <StationCard
        station={mockStation}
        nowPlaying={null}
        isPlaying={false}
        isOffline={false}
        onPlay={mockOnPlay}
        onStop={mockOnStop}
      />
    );
    fireEvent.click(screen.getByTitle('Play'));
    expect(mockOnPlay).toHaveBeenCalled();
  });

  it('calls onStop when stop button is clicked', () => {
    render(
      <StationCard
        station={mockStation}
        nowPlaying={mockNowPlaying}
        isPlaying={true}
        isOffline={false}
        onPlay={mockOnPlay}
        onStop={mockOnStop}
      />
    );
    fireEvent.click(screen.getByTitle('Stop'));
    expect(mockOnStop).toHaveBeenCalled();
  });

  it('shows listener count', () => {
    render(
      <StationCard
        station={mockStation}
        nowPlaying={mockNowPlaying}
        isPlaying={false}
        isOffline={false}
        onPlay={mockOnPlay}
        onStop={mockOnStop}
      />
    );
    expect(screen.getByText('5 listeners')).toBeInTheDocument();
  });

  it('shows offline state', () => {
    render(
      <StationCard
        station={mockStation}
        nowPlaying={null}
        isPlaying={false}
        isOffline={true}
        onPlay={mockOnPlay}
        onStop={mockOnStop}
      />
    );
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('shows now playing track info', () => {
    render(
      <StationCard
        station={mockStation}
        nowPlaying={mockNowPlaying}
        isPlaying={false}
        isOffline={false}
        onPlay={mockOnPlay}
        onStop={mockOnStop}
      />
    );
    expect(screen.getByText('Artist — Title')).toBeInTheDocument();
  });

  it('shows album art when available', () => {
    render(
      <StationCard
        station={mockStation}
        nowPlaying={mockNowPlaying}
        isPlaying={false}
        isOffline={false}
        onPlay={mockOnPlay}
        onStop={mockOnStop}
      />
    );
    const img = screen.getByAltText('Album art');
    expect(img).toHaveAttribute('src', 'https://example.com/art.jpg');
  });
});
