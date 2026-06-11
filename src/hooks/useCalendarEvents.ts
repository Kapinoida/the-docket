'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CalendarEvent } from '@/lib/calendar';
import { startOfWeek, addDays, startOfMonth, endOfMonth, getDay, startOfDay } from 'date-fns';

function getDateRange(date: Date, viewType: 'day' | 'week' | 'month' | 'range', rangeEnd?: Date): { start: Date; end: Date } {
  if (viewType === 'range' && rangeEnd) {
    return { start: date, end: rangeEnd };
  }
  if (viewType === 'day') {
    const start = startOfDay(date);
    return { start, end: addDays(start, 2) };
  }
  if (viewType === 'week') {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    return { start, end: addDays(start, 13) };
  }
  // month
  const start = startOfMonth(date);
  const eom = endOfMonth(date);
  const startPad = getDay(start);
  const adjustedStart = new Date(start);
  adjustedStart.setDate(adjustedStart.getDate() - startPad);
  const endPad = 6 - getDay(eom);
  const adjustedEnd = new Date(eom);
  adjustedEnd.setDate(adjustedEnd.getDate() + endPad + 7);
  return { start: adjustedStart, end: adjustedEnd };
}

export function useCalendarEvents(
  date: Date,
  viewType: 'day' | 'week' | 'month' | 'range' = 'week',
  rangeEnd?: Date
) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const { start, end } = getDateRange(date, viewType, rangeEnd);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/v2/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`);
      if (res.ok) {
        setEvents(await res.json());
      }
    } catch (e) {
      console.error('Calendar events fetch error:', e);
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
    }
  }, [start.toISOString(), end.toISOString()]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const interval = setInterval(() => { fetchEvents(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const refetch = useCallback(() => {
    setLoading(true);
    return fetchEvents();
  }, [fetchEvents]);

  return { events, loading, refetch };
}

export function useCalendarEventsRange(start: Date, end: Date) {
  return useCalendarEvents(start, 'range', end);
}