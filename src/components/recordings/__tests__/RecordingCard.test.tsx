import { render, screen } from '@testing-library/react';
import RecordingCard from '../RecordingCard';
import { RecordingSchedule } from '@/types';

const mockRecording: RecordingSchedule = {
  id: 1,
  stream_id: '123',
  title: 'Chicago Fire FC vs Charlotte FC',
  league: 'usa.1',
  channel_name: 'ESPN',
  start_time: '2026-08-11T20:00:00Z',
  end_time: '2026-08-11T22:30:00Z',
  status: 'scheduled',
  source: 'fixture',
  output_path: null,
  file_size_bytes: null,
  error_message: null,
  metadata: {},
  created_at: '2026-08-10T12:00:00Z',
  updated_at: '2026-08-10T12:00:00Z',
};

describe('RecordingCard', () => {
  it('renders recording title', () => {
    render(<RecordingCard recording={mockRecording} />);
    expect(screen.getByText('Chicago Fire FC vs Charlotte FC')).toBeInTheDocument();
  });

  it('renders league name', () => {
    render(<RecordingCard recording={mockRecording} />);
    expect(screen.getByText('MLS')).toBeInTheDocument();
  });

  it('renders channel name', () => {
    render(<RecordingCard recording={mockRecording} />);
    expect(screen.getByText('ESPN')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<RecordingCard recording={mockRecording} />);
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('renders time range', () => {
    render(<RecordingCard recording={mockRecording} />);
    expect(screen.getByText(/Aug 11/)).toBeInTheDocument();
    expect(screen.getByText(/PM/)).toBeInTheDocument();
  });

  it('renders error message for failed recordings', () => {
    const failedRecording = {
      ...mockRecording,
      status: 'failed' as const,
      error_message: 'Connection timeout',
    };
    render(<RecordingCard recording={failedRecording} />);
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
  });

  it('does not render error message for non-failed recordings', () => {
    render(<RecordingCard recording={mockRecording} />);
    expect(screen.queryByText('Connection timeout')).not.toBeInTheDocument();
  });

  it('handles unknown league', () => {
    const unknownLeague = { ...mockRecording, league: 'unknown.league' };
    render(<RecordingCard recording={unknownLeague} />);
    expect(screen.getByText('unknown.league')).toBeInTheDocument();
  });

  it('handles null league', () => {
    const noLeague = { ...mockRecording, league: null };
    render(<RecordingCard recording={noLeague} />);
    expect(screen.queryByText('MLS')).not.toBeInTheDocument();
  });

  it('handles null channel name', () => {
    const noChannel = { ...mockRecording, channel_name: null };
    render(<RecordingCard recording={noChannel} />);
    expect(screen.queryByText('ESPN')).not.toBeInTheDocument();
  });
});
