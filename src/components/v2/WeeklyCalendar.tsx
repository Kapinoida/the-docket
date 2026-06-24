'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task } from '@/types';
import { CalendarEvent, eventColorStyle, isTrulyAllDay } from '@/lib/calendar';
import { startOfWeek, addDays, isSameDay, isBefore, startOfDay, format, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { parseLocalDateNode } from '@/lib/dateUtils';
import { EventCard } from '@/components/calendar/EventCard';
import { CalendarTaskCard } from '@/components/calendar/CalendarTaskCard';
import { useCalendarEventsRange } from '@/hooks/useCalendarEvents';
import { useTaskEdit } from '@/contexts/TaskEditContext';
import EventDetailModal from '../modals/EventDetailModal';

interface WeeklyCalendarProps {
  onTaskComplete?: (taskId: number) => void;
}

export default function WeeklyCalendar({ onTaskComplete }: WeeklyCalendarProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentStart, setCurrentStart] = useState(startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [tasksLoading, setTasksLoading] = useState(true);
  const { openTaskEdit } = useTaskEdit();

  const handleOpenTaskEdit = useCallback((task: Task) => {
    openTaskEdit(task);
  }, [openTaskEdit]);

  const windowEnd = addDays(currentStart, 7);
  const { events, loading: eventsLoading, refetch: refetchEvents } = useCalendarEventsRange(currentStart, windowEnd);
  const loading = tasksLoading || eventsLoading;

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/v2/tasks');
      if (res.ok) setTasks(await res.json());
    } catch (e) {
      console.error('Tasks fetch error:', e);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    const interval = setInterval(() => { fetchTasks(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Cross-view sync
  useEffect(() => {
    const sync = () => { fetchTasks(); refetchEvents(); };
    window.addEventListener('taskCreated', sync);
    window.addEventListener('taskUpdated', sync);
    window.addEventListener('taskDeleted', sync);
    return () => {
      window.removeEventListener('taskCreated', sync);
      window.removeEventListener('taskUpdated', sync);
      window.removeEventListener('taskDeleted', sync);
    };
  }, [fetchTasks, refetchEvents]);

  const handleTaskComplete = async (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      const response = await fetch(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
      });
      if (response.ok) {
        onTaskComplete?.(taskId);
      } else {
        fetchTasks();
      }
    } catch (err) {
      console.error("Failed to complete task", err);
    }
  };

  const nextWeek = () => setCurrentStart(addDays(currentStart, 7));
  const prevWeek = () => setCurrentStart(addDays(currentStart, -7));
  const resetToToday = () => {
    const today = startOfDay(new Date());
    setCurrentStart(today);
    setSelectedDay(today);
  };

  const today = startOfDay(new Date());

  const overdueTasks = tasks.filter(task =>
    task.status !== 'done' &&
    task.due_date &&
    isBefore(parseLocalDateNode(task.due_date) as Date, today)
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentStart, i));

  const getItemsForDay = (date: Date) => {
    const dayTasks = tasks.filter(task =>
      task.status !== 'done' &&
      task.due_date &&
      isSameDay(parseLocalDateNode(task.due_date) as Date, date)
    );

    const dayEvents = events.filter(event => {
      const eventDate = isTrulyAllDay(event) ? (parseLocalDateNode(event.start_time) as Date) : new Date(event.start_time);
      return isSameDay(eventDate, date);
    });

    return { tasks: dayTasks, events: dayEvents };
  };

  const handleTaskToggle = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    handleTaskComplete(taskId, e);
  };

  // --- Shared: Day chip used in both mobile strip and within day detail ---
  const DayChip = ({ day, onSelect, selected }: { day: Date; onSelect?: (d: Date) => void; selected?: boolean }) => {
    const isTodayDate = isToday(day);
    const { tasks: dayTasks, events: dayEvents } = getItemsForDay(day);
    const totalItems = dayTasks.length + dayEvents.length;

    return (
      <button
        onClick={() => onSelect?.(day)}
        className={`flex-shrink-0 flex flex-col items-center justify-center w-12 h-16 rounded-xl transition-colors ${
          selected
            ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400 dark:ring-blue-500'
            : isTodayDate
              ? 'bg-blue-50 dark:bg-blue-900/10'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${isTodayDate ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
          {format(day, 'EEE')}
        </span>
        <span className={`text-base font-bold ${isTodayDate ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'}`}>
          {format(day, 'd')}
        </span>
        {totalItems > 0 && (
          <span className={`text-[10px] font-medium px-1 rounded-full min-w-[16px] text-center ${
            selected ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}>
            {totalItems}
          </span>
        )}
      </button>
    );
  };

  const selectedItems = getItemsForDay(selectedDay);

  if (loading && tasks.length === 0 && events.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-400">Loading schedule...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          {isSameDay(currentStart, today) ? (
            <span>Next 7 Days</span>
          ) : (
            <span>Starting {format(currentStart, 'MMM do')}</span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {!isSameDay(currentStart, today) && (
            <button
              onClick={resetToToday}
              className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Today
            </button>
          )}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button onClick={prevWeek} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextWeek} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Overdue Section */}
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-3 md:p-4">
          <h3 className="text-red-700 dark:text-red-300 font-medium text-sm flex items-center gap-2 mb-3">
            <AlertCircle size={16} />
            Overdue Tasks
            <span className="bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-full text-xs font-bold">{overdueTasks.length}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {overdueTasks.map(task => (
              <CalendarTaskCard key={task.id} task={task} onToggle={handleTaskToggle} variant="overdue" onClick={handleOpenTaskEdit} />
            ))}
          </div>
        </div>
      )}

      {/* === MOBILE: Day strip + selected day detail === */}
      <div className="md:hidden space-y-4">
        {/* Horizontal scrollable day strip */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          {weekDays.map(day => (
            <DayChip
              key={day.toISOString()}
              day={day}
              selected={isSameDay(day, selectedDay)}
              onSelect={setSelectedDay}
            />
          ))}
        </div>

        {/* Selected day detail */}
        <div className={`rounded-xl p-3 ${isToday(selectedDay) ? 'bg-blue-50/50 dark:bg-blue-900/5 ring-1 ring-blue-100 dark:ring-blue-900/30' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {format(selectedDay, 'EEEE')}
              </span>
              <span className="ml-2 text-lg font-bold text-gray-800 dark:text-gray-200">
                {format(selectedDay, 'MMMM d')}
              </span>
            </div>
            {isToday(selectedDay) && (
              <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">Today</span>
            )}
          </div>

          {selectedItems.tasks.length === 0 && selectedItems.events.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nothing scheduled</p>
          ) : (
            <div className="space-y-2">
              {selectedItems.events.map(e => (
                <EventCard key={`evt-${e.id}`} event={e} onClick={() => setSelectedEvent(e)} />
              ))}
              {selectedItems.tasks.map(t => (
                <CalendarTaskCard key={t.id} task={t} onToggle={handleTaskToggle} onClick={handleOpenTaskEdit} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* === DESKTOP: 7-column grid === */}
      <div className="hidden md:grid grid-cols-7 gap-4 min-h-[300px]">
        {weekDays.map(day => {
          const { tasks: dayTasks, events: dayEvents } = getItemsForDay(day);
          const isTodayDate = isToday(day);

          return (
            <div key={day.toISOString()} className={`flex flex-col gap-2 ${isTodayDate ? 'bg-blue-50/50 dark:bg-blue-900/5 rounded-xl -m-2 p-2 ring-1 ring-blue-100 dark:ring-blue-900/30' : ''}`}>
              <div className="text-center md:text-left mb-1">
                <div className={`text-xs font-medium uppercase tracking-wider ${isTodayDate ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                  {format(day, 'EEE')}
                </div>
                <div className={`text-lg font-bold ${isTodayDate ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'}`}>
                  {format(day, 'd')}
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {dayEvents.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {dayEvents.map(e => (
                      <EventCard key={`evt-${e.id}`} event={e} onClick={() => setSelectedEvent(e)} />
                    ))}
                  </div>
                )}
                {dayTasks.map(t => (
<CalendarTaskCard key={t.id} task={t} onToggle={handleTaskToggle} onClick={handleOpenTaskEdit} />
                  ))}
                {dayTasks.length === 0 && dayEvents.length === 0 && (
                  <div className="h-full border-t border-transparent" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <EventDetailModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
      />
    </div>
  );
}