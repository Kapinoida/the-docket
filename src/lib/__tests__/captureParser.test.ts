import { formatCaptureDate, parseCaptureText } from '@/lib/captureParser';

describe('parseCaptureText', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 9, 9, 30));
  });

  afterEach(() => jest.useRealTimers());

  it('parses a natural trailing date without changing the captured text', () => {
    const result = parseCaptureText('Call the dentist tomorrow');

    expect(result.matchedText).toBe('tomorrow');
    expect(result.dueDate).toEqual(new Date(2026, 10, 10, 12, 0));
  });

  it('parses a weekday and time', () => {
    const result = parseCaptureText('Submit report next Friday at 3pm');

    expect(result.matchedText).toBe('next Friday at 3pm');
    expect(result.dueDate?.getDay()).toBe(5);
    expect(result.dueDate?.getHours()).toBe(15);
    expect(result.dueDate?.getMinutes()).toBe(0);
  });

  it('supports the existing explicit syntax', () => {
    const result = parseCaptureText('Buy milk @tomorrow');

    expect(result.matchedText).toBe('@tomorrow');
    expect(result.dueDate).toEqual(new Date(2026, 10, 10, 12, 0));
  });

  it('does not interpret text without a supported scheduling phrase', () => {
    expect(parseCaptureText('Think about tomorrow sometime').dueDate).toBeNull();
    expect(parseCaptureText('Buy milk').dueDate).toBeNull();
  });

  it('formats dates with or without a time', () => {
    expect(formatCaptureDate(new Date(2026, 10, 10, 12, 0))).toBe('Tue, Nov 10');
    expect(formatCaptureDate(new Date(2026, 10, 10, 15, 30))).toBe('Tue, Nov 10 · 3:30 PM');
  });
});
