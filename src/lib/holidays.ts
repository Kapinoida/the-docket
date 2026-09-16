import Holidays from 'date-holidays';
import { isSameDay, isWithinInterval, startOfDay, parseISO } from 'date-fns';
import type { Holiday } from '@/types';

export type { Holiday } from '@/types';

const hd = new Holidays('US');

export function getHolidaysForYear(year: number): Holiday[] {
  const holidays = hd.getHolidays(year);
  return holidays
    .filter(h => h.type === 'public' || h.type === 'observance')
    .map(h => ({
      name: h.name,
      date: h.date.split(' ')[0],
      type: h.type,
    }));
}

export function getHolidaysInRange(start: Date, end: Date): Holiday[] {
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  
  const allHolidays = years.flatMap(year => getHolidaysForYear(year));
  
  return allHolidays.filter(h => {
    const holidayDate = parseISO(h.date);
    return isWithinInterval(holidayDate, { start: startOfDay(start), end: startOfDay(end) });
  });
}

export function getHolidaysForDay(date: Date): Holiday[] {
  const year = date.getFullYear();
  const holidays = getHolidaysForYear(year);
  return holidays.filter(h => isSameDay(parseISO(h.date), date));
}

export function isHoliday(date: Date): boolean {
  return getHolidaysForDay(date).length > 0;
}
