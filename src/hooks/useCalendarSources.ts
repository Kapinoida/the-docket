'use client';

import { useState, useEffect } from 'react';
import { CalendarSource } from '@/lib/calendar';

export function useCalendarSources() {
  const [calendars, setCalendars] = useState<CalendarSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/caldav/config')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setCalendars(data.filter((c: any) => c.resource_type === 'event_calendar'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refetch = () => {
    setLoading(true);
    fetch('/api/caldav/config')
      .then(r => r.ok ? r.json() : [])
      .then(data => setCalendars(data.filter((c: any) => c.resource_type === 'event_calendar')))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  return { calendars, loading, refetch };
}