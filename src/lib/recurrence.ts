import { 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears, 
  startOfMonth, 
  endOfMonth, 
  getDate, 
  getDay, 
  setDate,
  isSameMonth
} from 'date-fns';
import { RecurrenceRule } from '@/types/v2';

export function calculateNextDueDate(baseDate: Date, rule: RecurrenceRule): Date {
  const interval = rule.interval || 1;
  let nextDate = new Date(baseDate);

  switch (rule.type) {
    case 'daily':
      return addDays(baseDate, interval);
    
    case 'weekly':
      // Simple interval
      if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) {
        return addWeeks(baseDate, interval);
      }
      // If daysOfWeek is specified (e.g., Mon, Wed), find the next occurrence
      // This is complex for "Every 2 weeks on Mon, Wed".
      // Simplified approach: If simple interval, just add weeks.
      // If specifying days, we usually mean "Next valid day".
      // Let's stick to simple "Every X weeks" for now unless user asks for multiple days/week.
      // User asked for "Every 2 weeks", that's covered by interval.
      return addWeeks(baseDate, interval);

    case 'monthly':
      // Base monthly add
      let tentativeDate = addMonths(baseDate, interval);
      
      // Handle "Nth [Day] of Month"
      if (rule.weekOfMonth && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
         return getNthDayOfMonth(tentativeDate, rule.weekOfMonth, rule.daysOfWeek);
      }
      
      // Handle "Same day of month" (e.g. 25th)
      // addMonths automatically handles 31st -> 30th/28th clamping.
      return tentativeDate;

    case 'yearly':
      return addYears(baseDate, interval);
      
    default:
      return addDays(baseDate, interval);
  }
}

function getNthDayOfMonth(date: Date, n: number, validDays: number[]): Date {
  // n: 1 = 1st, 2 = 2nd, -1 = Last
  // validDays: 0-6 (Sun-Sat)
  
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  
  const candidates: Date[] = [];
  
  // Collect all matching days in the month
  let current = monthStart;
  while (current <= monthEnd) {
     if (validDays.includes(getDay(current))) {
         candidates.push(new Date(current));
     }
     current = addDays(current, 1);
  }
  
  if (candidates.length === 0) return date; // Fallback
  
  if (n > 0) {
      // 1-based index
      const index = n - 1;
      return candidates[index] || candidates[candidates.length - 1]; // Fallback to last if overflow
  } else {
      // Negative index (from end)
      // -1 = last, -2 = second to last
      const index = candidates.length + n;
      return candidates[index] || candidates[0]; // Fallback to first if underflow
  }
}
