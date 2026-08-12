import { render, screen } from '@testing-library/react';
import ConflictPanel from '../ConflictPanel';
import { ConflictPair } from '@/types';

const mockConflicts: ConflictPair[] = [
  {
    id: 1,
    conflict_id: 2,
    title: 'Match A',
    conflict_title: 'Match B',
    start_time: '2026-08-11T20:00:00Z',
    end_time: '2026-08-11T22:30:00Z',
    conflict_start: '2026-08-11T21:00:00Z',
    conflict_end: '2026-08-11T23:30:00Z',
  },
];

describe('ConflictPanel', () => {
  it('renders nothing when no conflicts', () => {
    const { container } = render(<ConflictPanel conflicts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders conflict count', () => {
    render(<ConflictPanel conflicts={mockConflicts} />);
    expect(screen.getByText(/1 overlapping recording/)).toBeInTheDocument();
  });

  it('renders conflict titles', () => {
    render(<ConflictPanel conflicts={mockConflicts} />);
    expect(screen.getByText('Match A')).toBeInTheDocument();
    expect(screen.getByText('Match B')).toBeInTheDocument();
  });

  it('renders conflict times', () => {
    render(<ConflictPanel conflicts={mockConflicts} />);
    const timeElements = screen.getAllByText(/PM/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('renders plural for multiple conflicts', () => {
    const multipleConflicts = [...mockConflicts, ...mockConflicts];
    render(<ConflictPanel conflicts={multipleConflicts} />);
    expect(screen.getByText(/2 overlapping recordings/)).toBeInTheDocument();
  });
});
