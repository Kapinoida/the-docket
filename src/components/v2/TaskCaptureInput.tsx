'use client';

import { useState, useRef, useEffect } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { parseCaptureText, formatCaptureDate } from '@/lib/captureParser';

interface TaskCaptureInputProps {
  source: 'inbox' | 'today' | 'capture' | 'sidebar' | 'calendar';
  placeholder?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  value: string;
  onChange: (value: string, parsedDate: Date | null) => void;
  onSubmit?: () => void;
  calendarSelection?: 'today' | 'tomorrow' | 'none';
  onCalendarSelectionChange?: (selection: 'today' | 'tomorrow' | 'none') => void;
}

export default function TaskCaptureInput({
  source,
  placeholder = 'Add a task...',
  multiline = false,
  autoFocus = false,
  className = '',
  disabled = false,
  value,
  onChange,
  onSubmit,
  calendarSelection = 'today',
  onCalendarSelectionChange,
}: TaskCaptureInputProps) {
  const [parsedDate, setParsedDate] = useState<Date | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputElementRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus) {
      if (multiline) {
        inputRef.current?.focus();
      } else {
        inputElementRef.current?.focus();
      }
    }
  }, [autoFocus, multiline]);

  // Parse dates as user types
  const handleChange = (newValue: string) => {
    let newParsedDate: Date | null = null;
    
    if (source !== 'inbox' && source !== 'calendar') {
      // Parse natural language dates for sources that support it
      const parsed = parseCaptureText(newValue);
      newParsedDate = parsed.dueDate;
      setParsedDate(newParsedDate);
    }
    
    onChange(newValue, newParsedDate);
  };

  // Get the effective due date based on source and calendar selection
  const getEffectiveDueDate = (): Date | null | undefined => {
    if (source === 'inbox') {
      return undefined; // No date parsing for inbox
    }
    if (source === 'calendar') {
      // Calendar uses the selector
      if (calendarSelection === 'none') return null;
      if (calendarSelection === 'today') {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        return today;
      }
      if (calendarSelection === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0);
        return tomorrow;
      }
    }
    if (source === 'today') {
      // Today defaults to today noon if no date is parsed
      return parsedDate || (() => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        return today;
      })();
    }
    // For capture and sidebar, use parsed date (may be null)
    return parsedDate;
  };

  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit();
    }
  };

  // Calendar selector for calendar source
  const CalendarSelector = () => {
    if (source !== 'calendar' || !onCalendarSelectionChange) return null;
    
    return (
      <select
        value={calendarSelection}
        onChange={(e) => onCalendarSelectionChange(e.target.value as 'today' | 'tomorrow' | 'none')}
        className="text-xs px-2 py-1 rounded border border-border-default bg-bg-secondary text-text-muted"
      >
        <option value="today">Today</option>
        <option value="tomorrow">Tomorrow</option>
        <option value="none">No date</option>
      </select>
    );
  };

  const baseInputClasses = `w-full pl-10 pr-4 py-3 bg-bg-secondary border border-transparent rounded-xl focus:bg-bg-primary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-base placeholder:text-text-muted text-text-primary ${className}`;

  return (
    <div>
      <form onSubmit={handleFormSubmit}>
        <div className="relative">
          {multiline ? (
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder}
              rows={3}
              disabled={disabled}
              className={`${baseInputClasses} resize-y`}
              autoFocus={autoFocus}
            />
          ) : (
            <input
              ref={inputElementRef}
              type="text"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className={baseInputClasses}
              autoFocus={autoFocus}
            />
          )}
        </div>
      </form>
      
      {(source !== 'inbox' && source !== 'today') && (
        <div className="flex items-center gap-2 mt-2">
          <DatePreview />
          <CalendarSelector />
        </div>
      )}
    </div>
  );
}

// Export helper to get the effective due date
export function getTaskDueDate(source: 'inbox' | 'today' | 'capture' | 'sidebar' | 'calendar', parsedDate: Date | null, calendarSelection?: 'today' | 'tomorrow' | 'none'): Date | null | undefined {
  if (source === 'inbox') {
    return undefined;
  }
  if (source === 'calendar') {
    if (!calendarSelection || calendarSelection === 'none') return null;
    if (calendarSelection === 'today') {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      return today;
    }
    if (calendarSelection === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      return tomorrow;
    }
  }
  if (source === 'today') {
    return parsedDate || (() => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      return today;
    })();
  }
  return parsedDate;
}
