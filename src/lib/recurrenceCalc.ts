import { 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears, 
  startOfMonth, 
  endOfMonth, 
  getDay,
} from 'date-fns';
import { RecurrenceRule } from '@/types';

export function calculateNextDueDate(baseDate: Date, rule: RecurrenceRule): Date {
  const interval = rule.interval || 1;

  switch (rule.type) {
    case 'daily':
      return addDays(baseDate, interval);
    
    case 'weekly': {
      if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) {
        return addWeeks(baseDate, interval);
      }

      const days = [...rule.daysOfWeek].sort((a, b) => a - b);
      const currentDay = getDay(baseDate);

      const nextDayThisWeek = days.find(d => d > currentDay);
      if (nextDayThisWeek !== undefined) {
        return addDays(baseDate, nextDayThisWeek - currentDay);
      }

      const daysAhead = (7 - currentDay + days[0]) + (interval - 1) * 7;
      return addDays(baseDate, daysAhead);
    }

    case 'monthly': {
      const tentativeDate = addMonths(baseDate, interval);
      
      if (rule.weekOfMonth && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
         return getNthDayOfMonth(tentativeDate, rule.weekOfMonth, rule.daysOfWeek);
      }
      
      return tentativeDate;
    }

    case 'yearly':
      return addYears(baseDate, interval);
      
    default:
      return addDays(baseDate, interval);
  }
}

export function getNthDayOfMonth(date: Date, n: number, validDays: number[]): Date {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  
  const candidates: Date[] = [];
  
  let current = monthStart;
  while (current <= monthEnd) {
     if (validDays.includes(getDay(current))) {
         candidates.push(new Date(current));
     }
     current = addDays(current, 1);
  }
  
  if (candidates.length === 0) return date;
  
  if (n > 0) {
      const index = n - 1;
      return candidates[index] || candidates[candidates.length - 1];
  } else {
      const index = candidates.length + n;
      return candidates[index] || candidates[0];
  }
}

const RRULE_DAY_MAP: Record<number, string> = {
  0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA',
};
const RRULE_DAY_REVERSE: Record<string, number> = {
  'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6,
};

export function rruleToRecurrenceRule(rrule: string): RecurrenceRule | null {
  const parts = rrule.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, val] = part.split('=');
    if (key && val) acc[key] = val;
    return acc;
  }, {});

  const freq = parts['FREQ'];
  if (!freq) return null;

  const interval = parts['INTERVAL'] ? parseInt(parts['INTERVAL'], 10) : 1;
  if (isNaN(interval) || interval < 1) return null;

  const rule: RecurrenceRule = { type: 'daily', interval };

  switch (freq) {
    case 'DAILY':
      rule.type = 'daily';
      break;
    case 'WEEKLY':
      rule.type = 'weekly';
      if (parts['BYDAY']) {
        rule.daysOfWeek = parts['BYDAY']
          .split(',')
          .map(d => RRULE_DAY_REVERSE[d.trim()] ?? -1)
          .filter(d => d >= 0);
      }
      break;
    case 'MONTHLY':
      rule.type = 'monthly';
      if (parts['BYDAY'] && parts['BYSETPOS']) {
        const pos = parseInt(parts['BYSETPOS'], 10);
        if (!isNaN(pos)) {
          rule.weekOfMonth = pos === -1 ? -1 : pos;
          rule.daysOfWeek = parts['BYDAY']
            .split(',')
            .map(d => RRULE_DAY_REVERSE[d.trim()] ?? -1)
            .filter(d => d >= 0);
        }
      }
      break;
    case 'YEARLY':
      rule.type = 'yearly';
      break;
    default:
      return null;
  }

  if (parts['COUNT']) {
    const count = parseInt(parts['COUNT'], 10);
    if (!isNaN(count) && count > 0) {
      rule.count = count;
    }
  }

  if (parts['UNTIL']) {
    rule.until = parts['UNTIL'];
  }

  return rule;
}

export function recurrenceRuleToRrule(rule: RecurrenceRule): string {
  const parts: string[] = [];

  switch (rule.type) {
    case 'daily':
      parts.push('FREQ=DAILY');
      break;
    case 'weekly':
      parts.push('FREQ=WEEKLY');
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        parts.push('BYDAY=' + rule.daysOfWeek.map(d => RRULE_DAY_MAP[d] || 'MO').join(','));
      }
      break;
    case 'monthly':
      parts.push('FREQ=MONTHLY');
      if (rule.weekOfMonth && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        parts.push('BYDAY=' + rule.daysOfWeek.map(d => RRULE_DAY_MAP[d] || 'MO').join(','));
        parts.push('BYSETPOS=' + rule.weekOfMonth);
      }
      break;
    case 'yearly':
      parts.push('FREQ=YEARLY');
      break;
  }

  if (rule.interval && rule.interval > 1) {
    parts.push('INTERVAL=' + rule.interval);
  }

  if (rule.count) {
    parts.push('COUNT=' + rule.count);
  }

  if (rule.until) {
    parts.push('UNTIL=' + rule.until);
  }

  return parts.join(';');
}

export function shouldRecur(rule: RecurrenceRule, nextDate: Date): boolean {
  if (rule.until) {
    let untilDate: Date;
    const untilStr = rule.until;
    if (/^\d{8}$/.test(untilStr)) {
      untilDate = new Date(
        parseInt(untilStr.slice(0, 4)),
        parseInt(untilStr.slice(4, 6)) - 1,
        parseInt(untilStr.slice(6, 8)),
        23, 59, 59
      );
    } else if (/^\d{8}T\d{6}Z$/.test(untilStr)) {
      untilDate = new Date(
        parseInt(untilStr.slice(0, 4)),
        parseInt(untilStr.slice(4, 6)) - 1,
        parseInt(untilStr.slice(6, 8)),
        parseInt(untilStr.slice(9, 11)),
        parseInt(untilStr.slice(11, 13)),
        parseInt(untilStr.slice(13, 15))
      );
    } else {
      untilDate = new Date(untilStr);
    }
    if (!isNaN(untilDate.getTime()) && nextDate > untilDate) return false;
  }
  return true;
}