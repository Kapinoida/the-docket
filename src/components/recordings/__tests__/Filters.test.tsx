import { render, screen } from '@testing-library/react';
import Filters from '../Filters';

describe('Filters', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all filter selects', () => {
    render(
      <Filters
        status={undefined}
        league={undefined}
        dateRange={undefined}
        onStatusChange={mockOnChange}
        onLeagueChange={mockOnChange}
        onDateRangeChange={mockOnChange}
      />
    );
    expect(screen.getByText('All Statuses')).toBeInTheDocument();
    expect(screen.getByText('All Leagues')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();
  });

  it('does not render clear button when no filters active', () => {
    render(
      <Filters
        status={undefined}
        league={undefined}
        dateRange={undefined}
        onStatusChange={mockOnChange}
        onLeagueChange={mockOnChange}
        onDateRangeChange={mockOnChange}
      />
    );
    expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();
  });

  it('renders clear button when status filter active', () => {
    render(
      <Filters
        status="pending"
        league={undefined}
        dateRange={undefined}
        onStatusChange={mockOnChange}
        onLeagueChange={mockOnChange}
        onDateRangeChange={mockOnChange}
      />
    );
    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  it('renders clear button when league filter active', () => {
    render(
      <Filters
        status={undefined}
        league="eng.1"
        dateRange={undefined}
        onStatusChange={mockOnChange}
        onLeagueChange={mockOnChange}
        onDateRangeChange={mockOnChange}
      />
    );
    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  it('renders clear button when dateRange filter active', () => {
    render(
      <Filters
        status={undefined}
        league={undefined}
        dateRange="today"
        onStatusChange={mockOnChange}
        onLeagueChange={mockOnChange}
        onDateRangeChange={mockOnChange}
      />
    );
    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  it('has minimum touch target height', () => {
    render(
      <Filters
        status={undefined}
        league={undefined}
        dateRange={undefined}
        onStatusChange={mockOnChange}
        onLeagueChange={mockOnChange}
        onDateRangeChange={mockOnChange}
      />
    );
    const selects = screen.getAllByRole('combobox');
    selects.forEach((select) => {
      expect(select).toHaveClass('min-h-[44px]');
    });
  });
});
