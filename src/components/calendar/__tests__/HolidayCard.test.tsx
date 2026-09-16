import { render, screen } from '@testing-library/react';
import { HolidayCard } from '../HolidayCard';

describe('HolidayCard', () => {
  const holiday = {
    name: "New Year's Day",
    date: '2026-01-01',
    type: 'public',
  };

  it('renders holiday name in allday variant', () => {
    render(<HolidayCard holiday={holiday} variant="allday" />);
    expect(screen.getByText("New Year's Day")).toBeInTheDocument();
  });

  it('renders holiday name in compact variant', () => {
    render(<HolidayCard holiday={holiday} variant="compact" />);
    expect(screen.getByText("New Year's Day")).toBeInTheDocument();
  });

  it('has correct styling for allday variant', () => {
    const { container } = render(<HolidayCard holiday={holiday} variant="allday" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-red-50');
    expect(card.className).toContain('text-red-600');
  });

  it('has correct styling for compact variant', () => {
    const { container } = render(<HolidayCard holiday={holiday} variant="compact" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-red-50');
    expect(card.className).toContain('text-red-600');
  });

  it('displays calendar icon', () => {
    const { container } = render(<HolidayCard holiday={holiday} variant="allday" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has title attribute with holiday name', () => {
    const { container } = render(<HolidayCard holiday={holiday} variant="allday" />);
    const card = container.firstChild as HTMLElement;
    expect(card.getAttribute('title')).toBe("New Year's Day");
  });

  it('is non-interactive (no onClick handler)', () => {
    const onClick = jest.fn();
    const { container } = render(<HolidayCard holiday={holiday} variant="allday" />);
    const card = container.firstChild as HTMLElement;
    card.click();
    expect(onClick).not.toHaveBeenCalled();
  });
});
