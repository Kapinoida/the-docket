import React from 'react';
import { render, screen } from '@testing-library/react';
import TimerControls from '../TimerControls';

const mockTimer = {
  isActive: false,
  state: 'work' as const,
  sessionCount: 0,
  start: jest.fn(),
  pause: jest.fn(),
  skip: jest.fn(),
  reset: jest.fn(),
};

describe('TimerControls', () => {
  it('renders the semicircle with solid bg-bg-secondary', () => {
    render(<TimerControls timer={mockTimer} timeLeft={1500} totalDuration={1500} />);
    const semicircle = document.getElementById('timer-controls-semicircle');
    expect(semicircle).not.toBeNull();
    expect(semicircle!.className).toContain('bg-bg-secondary');
  });

  it('preserves semicircle geometry classes', () => {
    render(<TimerControls timer={mockTimer} timeLeft={1500} totalDuration={1500} />);
    const semicircle = document.getElementById('timer-controls-semicircle');
    expect(semicircle!.className).toContain('rounded-t-[130px]');
    expect(semicircle!.className).toContain('z-0');
  });

  it('renders start, skip, and reset controls', () => {
    render(<TimerControls timer={mockTimer} timeLeft={1500} totalDuration={1500} />);
    expect(screen.getByLabelText('Start')).toBeInTheDocument();
    expect(screen.getByLabelText('Skip')).toBeInTheDocument();
    expect(screen.getByLabelText('Reset')).toBeInTheDocument();
  });
});
