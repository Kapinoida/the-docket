import { calculateNextDueDate, getNthDayOfMonth, rruleToRecurrenceRule, recurrenceRuleToRrule, shouldRecur } from '@/lib/recurrenceCalc';
import { RecurrenceRule } from '@/types';

function date(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12, 0, 0);
}

function dayOfWeek(d: Date): number {
  return d.getDay();
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

describe('calculateNextDueDate', () => {
  describe('daily', () => {
    it('advances by 1 day with interval 1', () => {
      const base = date(2026, 5, 15);
      const rule: RecurrenceRule = { type: 'daily', interval: 1 };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 5, 16))).toBe(true);
    });

    it('advances by 3 days with interval 3', () => {
      const base = date(2026, 5, 15);
      const rule: RecurrenceRule = { type: 'daily', interval: 3 };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 5, 18))).toBe(true);
    });

    it('crosses month boundaries', () => {
      const base = date(2026, 5, 30);
      const rule: RecurrenceRule = { type: 'daily', interval: 1 };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 6, 1))).toBe(true);
    });
  });

  describe('weekly — simple (no daysOfWeek)', () => {
    it('advances by 1 week with interval 1', () => {
      const base = date(2026, 5, 15);
      const rule: RecurrenceRule = { type: 'weekly', interval: 1 };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 5, 22))).toBe(true);
    });

    it('advances by 2 weeks with interval 2', () => {
      const base = date(2026, 5, 15);
      const rule: RecurrenceRule = { type: 'weekly', interval: 2 };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 5, 29))).toBe(true);
    });
  });

  describe('weekly — with daysOfWeek', () => {
    it('finds next day in same week (Mon → Wed)', () => {
      const base = date(2026, 5, 15);
      expect(dayOfWeek(base)).toBe(1);
      const rule: RecurrenceRule = { type: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 5, 17))).toBe(true);
    });

    it('finds next day in same week (Wed → Fri)', () => {
      const base = date(2026, 5, 17);
      expect(dayOfWeek(base)).toBe(3);
      const rule: RecurrenceRule = { type: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 5, 19))).toBe(true);
    });

    it('wraps to next week (Fri → Mon)', () => {
      const base = date(2026, 5, 19);
      expect(dayOfWeek(base)).toBe(5);
      const rule: RecurrenceRule = { type: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 5, 22))).toBe(true);
    });

    it('handles Saturday → next Monday', () => {
      const base = date(2026, 5, 20);
      expect(dayOfWeek(base)).toBe(6);
      const rule: RecurrenceRule = { type: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 5, 22))).toBe(true);
    });

    it('handles Sunday → Monday', () => {
      const base = date(2026, 5, 21);
      expect(dayOfWeek(base)).toBe(0);
      const rule: RecurrenceRule = { type: 'weekly', interval: 1, daysOfWeek: [1] };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 5, 22))).toBe(true);
    });

    it('single day: Mon → next Mon (7 days)', () => {
      const base = date(2026, 5, 15);
      expect(dayOfWeek(base)).toBe(1);
      const rule: RecurrenceRule = { type: 'weekly', interval: 1, daysOfWeek: [1] };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 5, 22))).toBe(true);
    });

    it('interval=2: Mon → Wed in same cycle', () => {
      const base = date(2026, 5, 15);
      expect(dayOfWeek(base)).toBe(1);
      const rule: RecurrenceRule = { type: 'weekly', interval: 2, daysOfWeek: [1, 3] };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 5, 17))).toBe(true);
    });

    it('interval=2: Wed → Mon of next cycle (12 days)', () => {
      const base = date(2026, 5, 17);
      expect(dayOfWeek(base)).toBe(3);
      const rule: RecurrenceRule = { type: 'weekly', interval: 2, daysOfWeek: [1, 3] };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 5, 29))).toBe(true);
    });

    it('interval=2: single day → 14 days ahead', () => {
      const base = date(2026, 5, 15);
      expect(dayOfWeek(base)).toBe(1);
      const rule: RecurrenceRule = { type: 'weekly', interval: 2, daysOfWeek: [1] };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 5, 29))).toBe(true);
    });

    it('interval=2: Fri → Mon+1week (12 days) for Mon/Wed rule', () => {
      const base = date(2026, 5, 19);
      expect(dayOfWeek(base)).toBe(5);
      const rule: RecurrenceRule = { type: 'weekly', interval: 2, daysOfWeek: [1, 3] };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 5, 29))).toBe(true);
    });
  });

  describe('monthly — same day', () => {
    it('advances by 1 month', () => {
      const base = date(2026, 5, 15);
      const rule: RecurrenceRule = { type: 'monthly', interval: 1 };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 6, 15))).toBe(true);
    });

    it('advances by 2 months', () => {
      const base = date(2026, 5, 15);
      const rule: RecurrenceRule = { type: 'monthly', interval: 2 };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 7, 15))).toBe(true);
    });

    it('clamps Jan 31 → Feb 28', () => {
      const base = date(2026, 0, 31);
      const rule: RecurrenceRule = { type: 'monthly', interval: 1 };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 1, 28))).toBe(true);
    });
  });

  describe('monthly — Nth day', () => {
    it('2nd Tuesday of next month', () => {
      const base = date(2026, 5, 15);
      const rule: RecurrenceRule = { type: 'monthly', interval: 1, weekOfMonth: 2, daysOfWeek: [2] };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 6, 14))).toBe(true);
    });

    it('last Friday of next month', () => {
      const base = date(2026, 5, 15);
      const rule: RecurrenceRule = { type: 'monthly', interval: 1, weekOfMonth: -1, daysOfWeek: [5] };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 6, 31))).toBe(true);
    });

    it('1st Monday of next month (July 2026)', () => {
      const base = date(2026, 5, 15);
      const rule: RecurrenceRule = { type: 'monthly', interval: 1, weekOfMonth: 1, daysOfWeek: [1] };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2026, 6, 6))).toBe(true);
    });
  });

  describe('yearly', () => {
    it('advances by 1 year', () => {
      const base = date(2026, 5, 15);
      const rule: RecurrenceRule = { type: 'yearly', interval: 1 };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2027, 5, 15))).toBe(true);
    });

    it('advances by 2 years', () => {
      const base = date(2026, 5, 15);
      const rule: RecurrenceRule = { type: 'yearly', interval: 2 };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2028, 5, 15))).toBe(true);
    });

    it('handles leap year Feb 29 → Feb 28', () => {
      const base = date(2024, 1, 29);
      const rule: RecurrenceRule = { type: 'yearly', interval: 1 };
      const next = calculateNextDueDate(base, rule);
      expect(sameCalendarDay(next, date(2025, 1, 28))).toBe(true);
    });
  });
});

describe('getNthDayOfMonth', () => {
  it('finds 1st Monday of June 2026', () => {
    const result = getNthDayOfMonth(date(2026, 5, 1), 1, [1]);
    expect(sameCalendarDay(result, date(2026, 5, 1))).toBe(true);
  });

  it('finds 2nd Tuesday of June 2026', () => {
    const result = getNthDayOfMonth(date(2026, 5, 1), 2, [2]);
    expect(sameCalendarDay(result, date(2026, 5, 9))).toBe(true);
  });

  it('finds 3rd Wednesday of June 2026', () => {
    const result = getNthDayOfMonth(date(2026, 5, 1), 3, [3]);
    expect(sameCalendarDay(result, date(2026, 5, 17))).toBe(true);
  });

  it('finds 4th Thursday of June 2026', () => {
    const result = getNthDayOfMonth(date(2026, 5, 1), 4, [4]);
    expect(sameCalendarDay(result, date(2026, 5, 25))).toBe(true);
  });

  it('finds last Friday of June 2026', () => {
    const result = getNthDayOfMonth(date(2026, 5, 1), -1, [5]);
    expect(sameCalendarDay(result, date(2026, 5, 26))).toBe(true);
  });

  it('falls back to last occurrence when 5th day does not exist', () => {
    const result = getNthDayOfMonth(date(2026, 5, 1), 5, [1]);
    expect(sameCalendarDay(result, date(2026, 5, 29))).toBe(true);
  });

  it('returns 2nd-to-last for n=-2 with 4 candidates', () => {
    const result = getNthDayOfMonth(date(2026, 5, 1), -2, [2]);
    expect(sameCalendarDay(result, date(2026, 5, 23))).toBe(true);
  });

  it('falls back to first when negative index underflows', () => {
    const result = getNthDayOfMonth(date(2026, 5, 1), -5, [2]);
    expect(sameCalendarDay(result, date(2026, 5, 2))).toBe(true);
  });

  it('handles multiple valid days — picks 1st Monday OR Tuesday', () => {
    const result = getNthDayOfMonth(date(2026, 5, 1), 1, [1, 2]);
    expect(sameCalendarDay(result, date(2026, 5, 1))).toBe(true);
  });

  it('handles multiple valid days — picks 2nd occurrence of Mon or Tue', () => {
    const result = getNthDayOfMonth(date(2026, 5, 1), 2, [1, 2]);
    expect(sameCalendarDay(result, date(2026, 5, 2))).toBe(true);
  });

  it('returns input date when no matching days exist', () => {
    const input = date(2026, 5, 15);
    const result = getNthDayOfMonth(input, 1, []);
    expect(sameCalendarDay(result, input)).toBe(true);
  });
});

describe('rruleToRecurrenceRule', () => {
  it('parses FREQ=DAILY', () => {
    const rule = rruleToRecurrenceRule('FREQ=DAILY');
    expect(rule).toEqual({ type: 'daily', interval: 1 });
  });

  it('parses FREQ=DAILY with INTERVAL', () => {
    const rule = rruleToRecurrenceRule('FREQ=DAILY;INTERVAL=3');
    expect(rule).toEqual({ type: 'daily', interval: 3 });
  });

  it('parses FREQ=WEEKLY', () => {
    const rule = rruleToRecurrenceRule('FREQ=WEEKLY');
    expect(rule).toEqual({ type: 'weekly', interval: 1 });
  });

  it('parses FREQ=WEEKLY with BYDAY', () => {
    const rule = rruleToRecurrenceRule('FREQ=WEEKLY;BYDAY=MO,WE,FR');
    expect(rule).toEqual({ type: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] });
  });

  it('parses FREQ=WEEKLY with INTERVAL and BYDAY', () => {
    const rule = rruleToRecurrenceRule('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE');
    expect(rule).toEqual({ type: 'weekly', interval: 2, daysOfWeek: [1, 3] });
  });

  it('parses FREQ=MONTHLY', () => {
    const rule = rruleToRecurrenceRule('FREQ=MONTHLY');
    expect(rule).toEqual({ type: 'monthly', interval: 1 });
  });

  it('parses FREQ=MONTHLY with BYDAY and BYSETPOS', () => {
    const rule = rruleToRecurrenceRule('FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2');
    expect(rule).toEqual({ type: 'monthly', interval: 1, weekOfMonth: 2, daysOfWeek: [2] });
  });

  it('parses FREQ=MONTHLY with BYDAY and BYSETPOS=-1 (last)', () => {
    const rule = rruleToRecurrenceRule('FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1');
    expect(rule).toEqual({ type: 'monthly', interval: 1, weekOfMonth: -1, daysOfWeek: [5] });
  });

  it('parses FREQ=YEARLY', () => {
    const rule = rruleToRecurrenceRule('FREQ=YEARLY');
    expect(rule).toEqual({ type: 'yearly', interval: 1 });
  });

  it('returns null for unknown FREQ', () => {
    const rule = rruleToRecurrenceRule('FREQ=HOURLY');
    expect(rule).toBeNull();
  });

  it('returns null for empty string', () => {
    const rule = rruleToRecurrenceRule('');
    expect(rule).toBeNull();
  });

  it('ignores unknown BYDAY tokens', () => {
    const rule = rruleToRecurrenceRule('FREQ=WEEKLY;BYDAY=MO,XX');
    expect(rule).toEqual({ type: 'weekly', interval: 1, daysOfWeek: [1] });
  });
});

describe('recurrenceRuleToRrule', () => {
  it('converts daily rule', () => {
    expect(recurrenceRuleToRrule({ type: 'daily', interval: 1 })).toBe('FREQ=DAILY');
  });

  it('converts daily rule with interval', () => {
    expect(recurrenceRuleToRrule({ type: 'daily', interval: 3 })).toBe('FREQ=DAILY;INTERVAL=3');
  });

  it('converts weekly rule without days', () => {
    expect(recurrenceRuleToRrule({ type: 'weekly', interval: 1 })).toBe('FREQ=WEEKLY');
  });

  it('converts weekly rule with daysOfWeek', () => {
    expect(recurrenceRuleToRrule({ type: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] })).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
  });

  it('converts weekly rule with interval and days', () => {
    expect(recurrenceRuleToRrule({ type: 'weekly', interval: 2, daysOfWeek: [1, 3] })).toBe('FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=2');
  });

  it('converts monthly rule without Nth day', () => {
    expect(recurrenceRuleToRrule({ type: 'monthly', interval: 1 })).toBe('FREQ=MONTHLY');
  });

  it('converts monthly rule with weekOfMonth and days', () => {
    expect(recurrenceRuleToRrule({ type: 'monthly', interval: 1, weekOfMonth: 2, daysOfWeek: [2] })).toBe('FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2');
  });

  it('converts monthly rule with last week', () => {
    expect(recurrenceRuleToRrule({ type: 'monthly', interval: 1, weekOfMonth: -1, daysOfWeek: [5] })).toBe('FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1');
  });

  it('converts yearly rule', () => {
    expect(recurrenceRuleToRrule({ type: 'yearly', interval: 1 })).toBe('FREQ=YEARLY');
  });

  it('converts yearly rule with interval', () => {
    expect(recurrenceRuleToRrule({ type: 'yearly', interval: 2 })).toBe('FREQ=YEARLY;INTERVAL=2');
  });
});

describe('RRULE round-trip', () => {
  it('round-trips weekly with BYDAY', () => {
    const rrule = 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE';
    const rule = rruleToRecurrenceRule(rrule)!;
    const back = recurrenceRuleToRrule(rule);
    expect(rruleToRecurrenceRule(back)).toEqual(rule);
  });

  it('round-trips monthly with BYSETPOS', () => {
    const rrule = 'FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2';
    const rule = rruleToRecurrenceRule(rrule)!;
    const back = recurrenceRuleToRrule(rule);
    expect(rruleToRecurrenceRule(back)).toEqual(rule);
  });

  it('round-trips daily', () => {
    const rrule = 'FREQ=DAILY;INTERVAL=5';
    const rule = rruleToRecurrenceRule(rrule)!;
    const back = recurrenceRuleToRrule(rule);
    expect(rruleToRecurrenceRule(back)).toEqual(rule);
  });
});

describe('shouldRecur', () => {
  it('returns true when no end condition is set', () => {
    const rule: RecurrenceRule = { type: 'daily', interval: 1 };
    const nextDate = date(2026, 6, 20);
    expect(shouldRecur(rule, nextDate)).toBe(true);
  });

  it('returns true when count is set (count is handled by spawnNextRecurrence)', () => {
    const rule: RecurrenceRule = { type: 'daily', interval: 1, count: 5 };
    const nextDate = date(2026, 6, 20);
    expect(shouldRecur(rule, nextDate)).toBe(true);
  });

  it('returns true when until date is after next date', () => {
    const rule: RecurrenceRule = { type: 'daily', interval: 1, until: '20261231' };
    const nextDate = date(2026, 6, 20);
    expect(shouldRecur(rule, nextDate)).toBe(true);
  });

  it('returns true when until date equals next date', () => {
    const rule: RecurrenceRule = { type: 'daily', interval: 1, until: '20260720' };
    const nextDate = date(2026, 6, 20);
    expect(shouldRecur(rule, nextDate)).toBe(true);
  });

  it('returns false when until date is before next date', () => {
    const rule: RecurrenceRule = { type: 'daily', interval: 1, until: '20260719' };
    const nextDate = date(2026, 6, 20);
    expect(shouldRecur(rule, nextDate)).toBe(false);
  });
});

describe('rruleToRecurrenceRule with COUNT and UNTIL', () => {
  it('parses COUNT', () => {
    const rule = rruleToRecurrenceRule('FREQ=WEEKLY;INTERVAL=2;COUNT=5');
    expect(rule).toEqual({ type: 'weekly', interval: 2, count: 5 });
  });

  it('parses UNTIL as string', () => {
    const rule = rruleToRecurrenceRule('FREQ=DAILY;UNTIL=20261231T000000Z');
    expect(rule).toEqual({ type: 'daily', interval: 1, until: '20261231T000000Z' });
  });

  it('parses COUNT and UNTIL together (UNTIL takes precedence but both stored)', () => {
    const rule = rruleToRecurrenceRule('FREQ=WEEKLY;COUNT=10;UNTIL=20261231');
    expect(rule!.count).toBe(10);
    expect(rule!.until).toBe('20261231');
  });

  it('ignores invalid COUNT (zero)', () => {
    const rule = rruleToRecurrenceRule('FREQ=DAILY;COUNT=0');
    expect(rule!.count).toBeUndefined();
  });

  it('ignores invalid COUNT (negative)', () => {
    const rule = rruleToRecurrenceRule('FREQ=DAILY;COUNT=-1');
    expect(rule!.count).toBeUndefined();
  });

  it('preserves other fields with COUNT', () => {
    const rule = rruleToRecurrenceRule('FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2;COUNT=3');
    expect(rule).toEqual({ type: 'monthly', interval: 1, weekOfMonth: 2, daysOfWeek: [2], count: 3 });
  });
});

describe('recurrenceRuleToRrule with COUNT and UNTIL', () => {
  it('emits COUNT', () => {
    expect(recurrenceRuleToRrule({ type: 'weekly', interval: 1, count: 5 })).toBe('FREQ=WEEKLY;COUNT=5');
  });

  it('emits UNTIL', () => {
    expect(recurrenceRuleToRrule({ type: 'daily', interval: 1, until: '20261231' })).toBe('FREQ=DAILY;UNTIL=20261231');
  });

  it('emits both COUNT and UNTIL', () => {
    const rrule = recurrenceRuleToRrule({ type: 'weekly', interval: 2, count: 10, until: '20261231' });
    expect(rrule).toContain('COUNT=10');
    expect(rrule).toContain('UNTIL=20261231');
  });

  it('omits COUNT when undefined', () => {
    const rrule = recurrenceRuleToRrule({ type: 'daily', interval: 1 });
    expect(rrule).not.toContain('COUNT');
  });

  it('omits UNTIL when undefined', () => {
    const rrule = recurrenceRuleToRrule({ type: 'daily', interval: 1 });
    expect(rrule).not.toContain('UNTIL');
  });
});

describe('COUNT/UNTIL round-trip', () => {
  it('round-trips weekly with COUNT', () => {
    const rrule = 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=5';
    const rule = rruleToRecurrenceRule(rrule)!;
    const back = recurrenceRuleToRrule(rule);
    expect(rruleToRecurrenceRule(back)).toEqual(rule);
  });

  it('round-trips daily with UNTIL', () => {
    const rrule = 'FREQ=DAILY;UNTIL=20261231';
    const rule = rruleToRecurrenceRule(rrule)!;
    const back = recurrenceRuleToRrule(rule);
    expect(rruleToRecurrenceRule(back)).toEqual(rule);
  });
});