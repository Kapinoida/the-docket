'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/types/v2';
import { startOfWeek, addDays, isSameDay, isBefore, startOfDay, format, isToday, isTomorrow, isPast } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { parseLocalDateNode } from '../../lib/dateUtils';

// Shared helper: generate color from hex
const eventColorStyle = (color?: string) => {
  const c = color || '#7c3aed';
  return { backgroundColor: `${c}18`, borderColor: `${c}40`, color: c };
};

interface WeeklyCalendarProps {
  onTaskSelect?: (task: Task) => void;
  onTaskComplete?: (taskId: number) => void;
}

export default function WeeklyCalendar({ onTaskSelect, onTaskComplete }: WeeklyCalendarProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [currentStart, setCurrentStart] = useState(startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [currentStart]);

  // Auto-poll every 30s for live updates
  useEffect(() => {
    const interval = setInterval(() => { fetchData(); }, 30000);
    return () => clearInterval(interval);
  }, [currentStart]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const windowEnd = addDays(currentStart, 7);

      const [tasksRes, eventsRes] = await Promise.all([
        fetch('/api/v2/tasks'),
        fetch(`/api/v2/calendar/events?start=${currentStart.toISOString()}&end=${windowEnd.toISOString()}`)
      ]);

      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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
        fetchData();
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

  const isTrulyAllDay = (event: any) => {
    if (event.is_all_day) return true;
    if (typeof event.start_time === 'string' && event.start_time.endsWith('T00:00:00.000Z')) {
      const dur = new Date(event.end_time).getTime() - new Date(event.start_time).getTime();
      if (dur === 24 * 60 * 60 * 1000) return true;
    }
    return false;
  };

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

  const renderTaskCard = (task: Task, isOverdue = false) => (
    <div
      key={`task-${task.id}`}
      onClick={() => onTaskSelect?.(task)}
      className={`group relative p-2.5 rounded-md border text-sm cursor-pointer transition-all hover:shadow-sm ${
        isOverdue
          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800'
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => handleTaskComplete(task.id, e)}
          className={`p-1 -m-1 min-w-[32px] min-h-[32px] flex items-center justify-center text-gray-300 hover:text-green-500 transition-colors ${isOverdue ? 'text-red-300 hover:text-red-500' : ''}`}
        >
          <Circle size={16} strokeWidth={2} />
        </button>
        <span className={`line-clamp-2 ${isOverdue ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-200'}`}>
          {task.content || 'Untitled Task'}
        </span>
      </div>
    </div>
  );

  const renderEventCard = (event: any) => {
    const colors = eventColorStyle(event.calendar_color);
    return (
    <div
      key={`event-${event.id}`}
      className="p-1.5 px-2.5 rounded text-xs border mb-1"
      style={{ backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, color: colors.color }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs opacity-75 whitespace-nowrap">
          {!isTrulyAllDay(event) && format(new Date(event.start_time), 'h:mm a')}
        </span>
        <span className="font-medium truncate">{event.title}</span>
      </div>
    </div>
  )};

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
            {overdueTasks.map(task => renderTaskCard(task, true))}
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
              {selectedItems.events.map(e => renderEventCard(e))}
              {selectedItems.tasks.map(t => renderTaskCard(t))}
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
                    {dayEvents.map(e => renderEventCard(e))}
                  </div>
                )}
                {dayTasks.map(t => renderTaskCard(t))}
                {dayTasks.length === 0 && dayEvents.length === 0 && (
                  <div className="h-full border-t border-transparent" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
