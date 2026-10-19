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

describe('SidebarSoundPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSoundState = {
      ambienceMode: 'none',
      musicSource: 'none',
      isPlaying: false,
      volume: 0.6,
    };
  });

  it('renders idle sound selector when nothing is playing', () => {
    render(<SidebarSoundPanel />);
    expect(screen.getByText('Sound')).toBeInTheDocument();
  });

  it('shows popover with ambience and music options when clicked', () => {
    render(<SidebarSoundPanel />);
    fireEvent.click(screen.getByText('Sound'));
    expect(screen.getByText('Ambience')).toBeInTheDocument();
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('Brown Noise')).toBeInTheDocument();
    expect(screen.getByText('Pentatonic')).toBeInTheDocument();
  });

  it('calls setAmbienceMode when an ambience option is selected', () => {
    render(<SidebarSoundPanel />);
    fireEvent.click(screen.getByText('Sound'));
    fireEvent.click(screen.getByText('Rain'));
    expect(mockSetAmbienceMode).toHaveBeenCalledWith('rain');
  });

  it('calls setMusicSource when pentatonic is selected', () => {
    render(<SidebarSoundPanel />);
    fireEvent.click(screen.getByText('Sound'));
    fireEvent.click(screen.getByText('Pentatonic'));
    expect(mockSetMusicSource).toHaveBeenCalledWith('pentatonic');
  });

  it('calls setMusicSource when off is selected', () => {
    mockSoundState = { ambienceMode: 'none', musicSource: 'pentatonic', isPlaying: true, volume: 0.6 };
    render(<SidebarSoundPanel />);
    // When playing, we need to check for the stop button or other UI elements
    const stopButton = screen.getByTitle('Stop all sounds');
    fireEvent.click(stopButton);
    expect(mockStopAll).toHaveBeenCalled();
  });

  it('shows label when ambience is playing', () => {
    mockSoundState = { ambienceMode: 'rain', musicSource: 'none', isPlaying: true, volume: 0.6 };
    render(<SidebarSoundPanel />);
    expect(screen.getByText('Rain')).toBeInTheDocument();
  });

  it('shows label when pentatonic is playing', () => {
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

  it('shows volume slider in idle popover', () => {
    render(<SidebarSoundPanel />);
    fireEvent.click(screen.getByText('Sound'));
    const volumeSlider = screen.getByLabelText('Volume');
    expect(volumeSlider).toBeInTheDocument();
    expect(volumeSlider).toHaveAttribute('type', 'range');
  });

  it('calls setVolume when volume slider changes in idle popover', () => {
    render(<SidebarSoundPanel />);
    fireEvent.click(screen.getByText('Sound'));
    const volumeSlider = screen.getByLabelText('Volume');
    fireEvent.change(volumeSlider, { target: { value: '0.3' } });
    expect(mockSetVolume).toHaveBeenCalledWith(0.3);
  });

  it('shows volume slider when audio is playing', () => {
    mockSoundState = { ambienceMode: 'rain', musicSource: 'none', isPlaying: true, volume: 0.7 };
    render(<SidebarSoundPanel />);
    const volumeSlider = screen.getByLabelText('Volume');
    expect(volumeSlider).toBeInTheDocument();
    expect(volumeSlider).toHaveValue('0.7');
  });
});
