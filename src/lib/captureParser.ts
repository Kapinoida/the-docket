import { format } from 'date-fns';
import { extractDateFromContent, parseTaskDate } from './taskParser';

export interface ParsedCapture {
  dueDate: Date | null;
  matchedText: string | null;
}

const NATURAL_DATE_PATTERN =
  /(?:^|\s)(today|tomorrow|tom|next\s+(?:sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?)|(?:sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?)|in\s+\d+\s+days?|end\s+of\s+(?:week|month)|\d{4}-\d{2}-\d{2})(?:\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?\s*$/i;

function applyTime(date: Date, timeText: string | undefined): Date {
  if (!timeText) return date;

  const match = timeText.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return date;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase();
  if (minutes > 59) return date;

  if (meridiem) {
    if (hours < 1 || hours > 12) return date;
    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
  } else if (hours > 23) {
    return date;
  }

  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Parses scheduling language from a quick capture without changing the text
 * the user typed. The returned date is metadata sent alongside the content.
 */
export function parseCaptureText(text: string): ParsedCapture {
  const trimmed = text.trim();
  if (!trimmed) return { dueDate: null, matchedText: null };

  // Preserve the existing explicit syntax (@tomorrow / due next Friday).
  const explicit = extractDateFromContent(trimmed);
  if (explicit.date && explicit.dateString) {
    const explicitTime = explicit.dateString.match(/\s+at\s+(.+)$/i)?.[1];
    return {
      dueDate: applyTime(explicit.date, explicitTime),
      matchedText: explicit.dateString,
    };
  }

  const match = trimmed.match(NATURAL_DATE_PATTERN);
  if (!match) return { dueDate: null, matchedText: null };

  const dateText = match[1];
  const date = parseTaskDate(dateText);
  if (!date) return { dueDate: null, matchedText: null };

  const matchedText = match[0].trim();
  return {
    dueDate: applyTime(date, match[2]),
    matchedText,
  };
}

export function formatCaptureDate(date: Date): string {
  return format(date, date.getHours() === 12 && date.getMinutes() === 0 ? 'EEE, MMM d' : 'EEE, MMM d · h:mm a');
}
