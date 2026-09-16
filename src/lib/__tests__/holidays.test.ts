import { getHolidaysForYear, getHolidaysInRange, getHolidaysForDay, isHoliday } from '../holidays';
import { parseISO } from 'date-fns';

describe('getHolidaysForYear', () => {
  it('returns holidays for a given year', () => {
    const holidays = getHolidaysForYear(2026);
    expect(holidays.length).toBeGreaterThan(0);
    expect(holidays[0]).toHaveProperty('name');
    expect(holidays[0]).toHaveProperty('date');
    expect(holidays[0]).toHaveProperty('type');
  });

  it('includes major US holidays', () => {
    const holidays = getHolidaysForYear(2026);
    const names = holidays.map(h => h.name);
    expect(names).toContain("New Year's Day");
    expect(names).toContain('Independence Day');
    expect(names).toContain('Christmas Day');
  });

  it('returns dates in YYYY-MM-DD format', () => {
    const holidays = getHolidaysForYear(2026);
    holidays.forEach(h => {
      expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

describe('getHolidaysInRange', () => {
  it('returns holidays within a date range', () => {
    const start = new Date(2026, 0, 1); // Jan 1, 2026
    const end = new Date(2026, 0, 31); // Jan 31, 2026
    const holidays = getHolidaysInRange(start, end);
    expect(holidays.length).toBeGreaterThan(0);
    holidays.forEach(h => {
      const date = parseISO(h.date);
      expect(date >= start).toBe(true);
      expect(date <= end).toBe(true);
    });
  });

  it('returns empty array for range with no holidays', () => {
    const start = new Date(2026, 2, 2); // Mar 2, 2026
    const end = new Date(2026, 2, 10); // Mar 10, 2026
    const holidays = getHolidaysInRange(start, end);
    expect(holidays).toEqual([]);
  });

  it('handles multi-year ranges', () => {
    const start = new Date(2025, 11, 1); // Dec 1, 2025
    const end = new Date(2026, 0, 31); // Jan 31, 2026
    const holidays = getHolidaysInRange(start, end);
    expect(holidays.length).toBeGreaterThan(0);
  });
});

describe('getHolidaysForDay', () => {
  it('returns holidays for a specific day', () => {
    const newYearsDay = new Date(2026, 0, 1); // Jan 1, 2026
    const holidays = getHolidaysForDay(newYearsDay);
    expect(holidays.length).toBeGreaterThan(0);
    expect(holidays.some(h => h.name === "New Year's Day")).toBe(true);
  });

  it('returns empty array for day with no holidays', () => {
    const randomDay = new Date(2026, 2, 15); // Mar 15, 2026
    const holidays = getHolidaysForDay(randomDay);
    expect(holidays).toEqual([]);
  });
});

describe('isHoliday', () => {
  it('returns true for a holiday', () => {
    const newYearsDay = new Date(2026, 0, 1); // Jan 1, 2026
    expect(isHoliday(newYearsDay)).toBe(true);
  });

  it('returns false for a non-holiday', () => {
    const randomDay = new Date(2026, 2, 15); // Mar 15, 2026
    expect(isHoliday(randomDay)).toBe(false);
  });
});
