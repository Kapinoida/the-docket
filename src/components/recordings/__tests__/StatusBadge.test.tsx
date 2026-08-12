import { render, screen } from '@testing-library/react';
import StatusBadge from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders pending status', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders scheduled status', () => {
    render(<StatusBadge status="scheduled" />);
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('renders recording status with pulse', () => {
    render(<StatusBadge status="recording" />);
    const badge = screen.getByText('Recording');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('span')).toHaveClass('animate-pulse');
  });

  it('renders completed status', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders failed status', () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders cancelled status', () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<StatusBadge status="pending" className="custom-class" />);
    const badge = screen.getByText('Pending').closest('span');
    expect(badge).toHaveClass('custom-class');
  });
});
