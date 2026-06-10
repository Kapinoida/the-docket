'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Task } from '@/types/v2';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, Clock, Calendar, AlertCircle } from 'lucide-react';
import { startOfWeek, addDays, isSameDay, isBefore, startOfDay, format, isToday, isSameMonth, startOfMonth, endOfMonth, getDay } from 'date-fns';
import { parseLocalDateNode } from '@/lib/dateUtils';
import { PullToRefresh } from './v2/PullToRefresh';
import AddCalendarModal from './modals/AddCalendarModal';
import EventDetailModal from './modals/EventDetailModal';

type ViewType = 'week' | 'month' | 'day';

// Shared helper: generate color from hex
const eventColorStyle = (color?: string) => {
  const c = color || '#7c3aed';
  return { backgroundColor: `${c}18`, borderColor: `${c}40`, color: c };
};

interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location: string;
  calendar_name: string;
  calendar_color?: string;
}

const isTrulyAllDay = (event: CalendarEvent) => {
  if (event.is_all_day) return true;
  if (typeof event.start_time === 'string' && event.start_time.endsWith('T00:00:00.000Z')) {
    const dur = new Date(event.end_time).getTime() - new Date(event.start_time).getTime();
    if (dur === 24 * 60 * 60 * 1000) return true;
  }
  return false;
};

export default function CalendarViewV2() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cal_current_date');
      return saved ? new Date(saved) : new Date();
    }
    return new Date();
  });
  const [viewType, setViewType] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cal_view_type');
      return (saved as ViewType) || 'week';
    }
    return 'week';
  });
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [isAddCalendarOpen, setIsAddCalendarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Persist state
  useEffect(() => { localStorage.setItem('cal_current_date', currentDate.toISOString()); }, [currentDate]);
  useEffect(() => { localStorage.setItem('cal_view_type', viewType); }, [viewType]);

  const fetchData = useCallback(async () => {
    if (loading && tasks.length > 0) return; // Skip if already loaded and not a refresh
    try {
      let start: Date, end: Date;
      if (viewType === 'week') {
        start = startOfWeek(currentDate, { weekStartsOn: 0 });
        end = addDays(start, 13); // 2 weeks for padding
      } else if (viewType === 'day') {
        start = startOfDay(currentDate);
        end = addDays(start, 2); // today + tomorrow for overnight events
      } else {
        start = startOfMonth(currentDate);
        const eom = endOfMonth(currentDate);
        // Pad to full weeks
        const startPad = getDay(start);
        start.setDate(start.getDate() - startPad);
        const endPad = 6 - getDay(eom);
        end = new Date(eom);
        end.setDate(end.getDate() + endPad + 7); // extra week padding
      }

      const [tasksRes, eventsRes] = await Promise.all([
        fetch('/api/v2/tasks'),
        fetch(`/api/v2/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`)
      ]);
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
    } catch (e) {
      console.error('Calendar fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewType, loading, tasks.length]);

  useEffect(() => { fetchData(); }, [currentDate, viewType]);

  // Auto-poll for live updates every 30s
  useEffect(() => {
    const interval = setInterval(() => { fetchData(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchData();
  };

  const navigate = (dir: 'prev' | 'next') => {
    const d = new Date(currentDate);
    if (viewType === 'week') d.setDate(d.getDate() + (dir === 'next' ? 7 : -7));
    else if (viewType === 'day') d.setDate(d.getDate() + (dir === 'next' ? 1 : -1));
    else d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
    setCurrentDate(d);
  };

  const resetToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(startOfDay(today));
  };

  const handleTaskToggle = async (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await fetch(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch { fetchData(); }
  };

  const getItemsForDay = (date: Date) => {
    const dayTasks = tasks.filter(t =>
      t.status !== 'done' && t.due_date && isSameDay(parseLocalDateNode(t.due_date) as Date, date)
    );
    const dayEvents = events.filter(e => {
      const eventDate = isTrulyAllDay(e) ? (parseLocalDateNode(e.start_time) as Date) : new Date(e.start_time);
      return isSameDay(eventDate, date);
    });
    return { tasks: dayTasks, events: dayEvents };
  };

  // --- Calendar Grid Data ---
  const gridDays = useMemo(() => {
    if (viewType === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    } else if (viewType === 'day') {
      return [currentDate];
    } else {
      const start = startOfMonth(currentDate);
      const eom = endOfMonth(currentDate);
      const startPad = getDay(start);
      const endPad = 6 - getDay(eom);
      const firstDay = new Date(start);
      firstDay.setDate(firstDay.getDate() - startPad);
      const lastDay = new Date(eom);
      lastDay.setDate(lastDay.getDate() + endPad);
      const days: Date[] = [];
      let cur = new Date(firstDay);
      while (cur <= lastDay) {
        days.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      return days;
    }
  }, [currentDate, viewType]);

  const today = startOfDay(new Date());
  const overdueTasks = tasks.filter(t =>
    t.status !== 'done' && t.due_date && isBefore(parseLocalDateNode(t.due_date) as Date, today)
  );

  // --- Shared: Day chip (used in mobile strips) ---
  const DayChip = ({ day, onSelect, selected }: { day: Date; onSelect?: (d: Date) => void; selected?: boolean }) => {
    const { tasks: dTasks, events: dEvents } = getItemsForDay(day);
    const total = dTasks.length + dEvents.length;
    const isTodayDate = isToday(day);
    return (
      <button
        onClick={() => onSelect?.(day)}
        className={`flex-shrink-0 flex flex-col items-center justify-center w-12 h-16 rounded-xl transition-colors min-h-[44px] ${
          selected ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400 dark:ring-blue-500' :
          isTodayDate ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <span className={`text-[11px] font-semibold uppercase ${isTodayDate ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{format(day, 'EEE')}</span>
        <span className={`text-base font-bold ${isTodayDate ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'}`}>{format(day, 'd')}</span>
        {total > 0 && (
          <span className={`text-[10px] font-medium px-1 rounded-full min-w-[16px] text-center ${selected ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
            {total}
          </span>
        )}
      </button>
    );
  };

  // --- Event card ---
  const EventCard = ({ event, onClick }: { event: CalendarEvent; onClick?: (e: CalendarEvent) => void }) => {
    const colors = eventColorStyle(event.calendar_color);
    return (
    <div
      onClick={() => onClick?.(event)}
      className={`p-1.5 px-2.5 rounded text-xs border ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      style={{ backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, color: colors.color }}
    >
      <div className="flex items-center gap-1.5">
        {!isTrulyAllDay(event) && <span className="text-xs opacity-75 whitespace-nowrap">{format(new Date(event.start_time), 'h:mm a')}</span>}
        <span className="font-medium truncate">{event.title}</span>
      </div>
    </div>
  )};

  // --- Task card ---
  const TaskCard = ({ task, isOverdue = false }: { task: Task; isOverdue?: boolean }) => (
    <div className={`p-2.5 rounded-md border text-sm cursor-pointer transition-all hover:shadow-sm ${
      isOverdue ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' :
      task.status === 'done' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 line-through' :
      'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800'
    }`}>
      <div className="flex items-start gap-2">
        <button onClick={(e) => handleTaskToggle(task.id, e)} className="min-w-[32px] min-h-[32px] flex items-center justify-center text-gray-300 hover:text-green-500 transition-colors">
          {task.status === 'done' ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} />}
        </button>
        <span className="line-clamp-2 text-gray-700 dark:text-gray-200">{task.content || 'Untitled Task'}</span>
      </div>
    </div>
  );

  const selectedItems = getItemsForDay(selectedDay);
  const handleEventClick = (event: CalendarEvent) => setSelectedEvent(event);

  return (
    <div className="mx-auto px-4 py-6 md:p-8 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Calendar size={20} />
            </div>
            Calendar
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button onClick={() => setViewType('week')} className={`px-3 py-1.5 text-sm rounded-md transition-colors min-h-[36px] ${viewType === 'week' ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm' : 'text-text-muted'}`}>Week</button>
            <button onClick={() => setViewType('month')} className={`px-3 py-1.5 text-sm rounded-md transition-colors min-h-[36px] ${viewType === 'month' ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm' : 'text-text-muted'}`}>Month</button>
            <button onClick={() => { setViewType('day'); setSelectedDay(startOfDay(currentDate)); }} className={`px-3 py-1.5 text-sm rounded-md transition-colors min-h-[36px] ${viewType === 'day' ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm' : 'text-text-muted'}`}>Day</button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button onClick={() => navigate('prev')} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center"><ChevronLeft size={16} /></button>
            <div className="text-sm font-semibold text-text-primary min-w-[140px] text-center">
              {viewType === 'week' ? format(currentDate, "'Week of' MMM d") : viewType === 'day' ? format(currentDate, 'EEEE, MMMM d, yyyy') : format(currentDate, 'MMMM yyyy')}
            </div>
            <button onClick={() => navigate('next')} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center"><ChevronRight size={16} /></button>
          </div>

          <button onClick={resetToToday} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm min-h-[36px]">Today</button>
          <button onClick={() => setIsAddCalendarOpen(true)} className="px-3 py-2 flex items-center gap-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-text-primary rounded-lg transition-colors min-h-[36px]" title="Add Calendar Subscription">
            <Plus size={14} /> Add Calendar
          </button>
        </div>
      </div>

      {/* Pull-to-refresh wrapper */}
      <PullToRefresh onRefresh={handleRefresh} className="max-h-[60vh] md:max-h-none">
        {/* Overdue Section */}
        {overdueTasks.length > 0 && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-3 md:p-4">
            <h3 className="text-red-700 dark:text-red-300 font-medium text-sm flex items-center gap-2 mb-3">
              <AlertCircle size={16} /> Overdue <span className="bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-full text-xs font-bold">{overdueTasks.length}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {overdueTasks.map(t => <TaskCard key={t.id} task={t} isOverdue />)}
            </div>
          </div>
        )}

        {/* ===== MOBILE: Week = day strip + detail, Month = compact grid, Day = time grid ===== */}
        <div className="md:hidden space-y-4">
          {viewType === 'day' ? (
            <DayView day={currentDate} events={events} tasks={tasks} onEventClick={handleEventClick} onEventMoved={() => fetchData()} />
          ) : viewType === 'week' ? (
            <>
              {/* Week: Horizontal day strip */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                {gridDays.map(day => (
                  <DayChip key={day.toISOString()} day={day} selected={isSameDay(day, selectedDay)} onSelect={setSelectedDay} />
                ))}
              </div>
              {/* Selected day detail */}
              <DayDetailPanel day={selectedDay} items={selectedItems} onEventClick={handleEventClick} />
            </>
          ) : (
            <>
              {/* Month: compact 7-column calendar grid */}
              <div className="mb-2 text-center text-sm font-semibold text-text-primary">
                {format(currentDate, 'MMMM yyyy')}
              </div>
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-text-muted py-1">{d}</div>
                ))}
              </div>
              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-1">
                {gridDays.map(day => {
                  const { tasks: dTasks, events: dEvents } = getItemsForDay(day);
                  const total = dTasks.length + dEvents.length;
                  const isTodayDate = isToday(day);
                  const inMonth = day.getMonth() === currentDate.getMonth();
                  const isSelected = isSameDay(day, selectedDay);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(day)}
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors min-h-[40px] ${
                        isSelected ? 'bg-blue-500 text-white ring-2 ring-blue-300' :
                        isTodayDate ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold' :
                        inMonth ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-text-primary' :
                        'text-text-muted opacity-40'
                      }`}
                    >
                      <span className="text-sm leading-tight">{format(day, 'd')}</span>
                      {total > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dEvents.length > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-400'}`} />}
                          {dTasks.length > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-400'}`} />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Selected day detail below grid */}
              <DayDetailPanel day={selectedDay} items={getItemsForDay(selectedDay)} onEventClick={handleEventClick} />
            </>
          )}
        </div>

        {/* ===== DESKTOP & TABLET: Grid View ===== */}
        <div className="hidden md:block pb-4">
          {viewType === 'day' ? (
            <DayView day={currentDate} events={events} tasks={tasks} onEventClick={handleEventClick} onEventMoved={() => fetchData()} />
          ) : viewType === 'week' ? (
            <div className="grid grid-cols-7 gap-3 min-w-[800px]">
              {gridDays.map(day => (
                <DesktopWeekDay key={day.toISOString()} day={day} items={getItemsForDay(day)} onToggle={handleTaskToggle} onEventClick={handleEventClick} />
              ))}
            </div>
          ) : (
            /* Month: responsive 7-column calendar grid */
            <div>
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-2">
                {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => (
                  <div key={d} className="text-center text-xs font-semibold uppercase tracking-wider text-text-muted py-2">{d.slice(0,3)}</div>
                ))}
              </div>
              {/* Month cells */}
              <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                {gridDays.map(day => (
                  <DesktopMonthDay key={day.toISOString()} day={day} currentMonth={currentDate.getMonth()} items={getItemsForDay(day)} onToggle={handleTaskToggle} onEventClick={handleEventClick} />
                ))}
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>

      {loading && <div className="text-center py-4 text-text-muted text-sm">Loading calendar...</div>}

      {/* Modals */}
      <AddCalendarModal
        isOpen={isAddCalendarOpen}
        onClose={() => setIsAddCalendarOpen(false)}
        onSuccess={() => { fetchData(); fetch('/api/caldav/sync', { method: 'POST' }).catch(console.error); }}
      />
      <EventDetailModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent as any}
      />
    </div>
  );
}

// --- Shared: Day detail panel (mobile) ---
function DayDetailPanel({ day, items, onEventClick }: { day: Date; items: { tasks: Task[]; events: CalendarEvent[] }; onEventClick?: (e: CalendarEvent) => void }) {
  return (
    <div className={`rounded-xl p-4 ${isToday(day) ? 'bg-blue-50/50 dark:bg-blue-900/5 ring-1 ring-blue-100 dark:ring-blue-900/30' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{format(day, 'EEEE')}</span>
          <span className="ml-2 text-lg font-bold text-gray-800 dark:text-gray-200">{format(day, 'MMMM d')}</span>
        </div>
        {isToday(day) && <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">Today</span>}
      </div>
      {items.tasks.length === 0 && items.events.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Nothing scheduled</p>
      ) : (
        <div className="space-y-2">
          {items.events.map(e => {
            const colors = eventColorStyle(e.calendar_color);
            return (
            <div
              key={`evt-${e.id}`}
              onClick={() => onEventClick?.(e)}
              className="p-1.5 px-2.5 rounded text-xs border cursor-pointer hover:opacity-80"
              style={{ backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, color: colors.color }}
            >
              <div className="flex items-center gap-1.5">
                {!(e.is_all_day) && <span className="text-xs opacity-75 whitespace-nowrap">{format(new Date(e.start_time), 'h:mm a')}</span>}
                <span className="font-medium truncate">{e.title}</span>
              </div>
            </div>
          )})}
          {items.tasks.map(t => (
            <div key={`task-${t.id}`} className={`p-2.5 rounded-md border text-sm ${t.status === 'done' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 line-through' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
              <div className="flex items-start gap-2">
                <span className={`line-clamp-2 ${t.status === 'done' ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-200'}`}>{t.content || 'Untitled Task'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Desktop Week Day Cell ---
function DesktopWeekDay({ day, items, onToggle, onEventClick }: { day: Date; items: { tasks: Task[]; events: CalendarEvent[] }; onToggle: (id: number, e: React.MouseEvent) => void; onEventClick?: (e: CalendarEvent) => void }) {
  const isTodayDate = isToday(day);
  return (
    <div className={`flex flex-col gap-2 min-h-[200px] ${isTodayDate ? 'bg-blue-50/50 dark:bg-blue-900/5 rounded-xl -mx-2 px-2 ring-1 ring-blue-100 dark:ring-blue-900/30' : ''}`}>
      <div className="text-center mb-1">
        <div className={`text-xs font-medium uppercase tracking-wider ${isTodayDate ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{format(day, 'EEE')}</div>
        <div className={`text-lg font-bold ${isTodayDate ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'}`}>{format(day, 'd')}</div>
      </div>
      <div className="flex flex-col gap-1.5 flex-1">
        {items.events.map((e: CalendarEvent) => {
          const colors = eventColorStyle(e.calendar_color);
          return (
          <div
            key={`evt-${e.id}`}
            onClick={() => onEventClick?.(e)}
            className="p-1.5 px-2.5 rounded text-xs border cursor-pointer hover:opacity-80"
            style={{ backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, color: colors.color }}
          >
            <div className="flex items-center gap-1.5">
              {!isTrulyAllDay(e) && <span className="text-xs opacity-75 whitespace-nowrap">{format(new Date(e.start_time), 'h:mm a')}</span>}
              <span className="font-medium truncate">{e.title}</span>
            </div>
          </div>
        )})}
        {items.tasks.map((t: Task) => (
          <div key={`task-${t.id}`} className={`p-1.5 rounded text-xs border ${t.status === 'done' ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30 line-through' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-200'}`}>
            <div className="flex items-start gap-1">
              <button onClick={(e) => onToggle(t.id, e)} className="min-w-[24px] min-h-[24px] flex items-center justify-center text-gray-300 hover:text-green-500">
                {t.status === 'done' ? <CheckCircle2 size={14} className="text-green-500" /> : <Circle size={14} />}
              </button>
              <span className="line-clamp-1 text-gray-700 dark:text-gray-200">{t.content}</span>
            </div>
          </div>
        ))}
        {items.tasks.length === 0 && items.events.length === 0 && <div className="h-full border-t border-transparent" />}
      </div>
    </div>
  );
}

// --- Desktop Month Day Cell ---
function DesktopMonthDay({ day, items, currentMonth, onToggle, onEventClick }: { day: Date; items: { tasks: Task[]; events: CalendarEvent[] }; currentMonth: number; onToggle: (id: number, e: React.MouseEvent) => void; onEventClick?: (e: CalendarEvent) => void }) {
  const isTodayDate = isToday(day);
  const inMonth = day.getMonth() === currentMonth;
  const total = items.tasks.length + items.events.length;
  const doneCount = items.tasks.filter(t => t.status === 'done').length;

  return (
    <div className={`min-h-[100px] p-2 bg-white dark:bg-gray-800 transition-colors ${
      isTodayDate ? 'bg-blue-50 dark:bg-blue-900/20' :
      inMonth ? '' : 'bg-gray-50 dark:bg-gray-850 opacity-50'
    }`}>
      <div className={`text-sm font-semibold mb-1 ${isTodayDate ? 'text-blue-600 dark:text-blue-400' : inMonth ? 'text-text-primary' : 'text-text-muted'}`}>
        {format(day, 'd')}
        {isTodayDate && <span className="ml-1 text-[10px] font-normal text-blue-500">Today</span>}
      </div>
      <div className="space-y-0.5">
        {items.events.slice(0, 3).map(e => {
          const colors = eventColorStyle(e.calendar_color);
          return (
          <div
            key={`evt-${e.id}`}
            onClick={() => onEventClick?.(e)}
            className="p-0.5 px-1.5 rounded text-[10px] truncate cursor-pointer hover:opacity-80"
            style={{ backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, color: colors.color }}
          >
            {!isTrulyAllDay(e) && <span className="opacity-60 mr-1">{format(new Date(e.start_time), 'h:mm a')}</span>}
            {e.title}
          </div>
        )})}
        {items.tasks.slice(0, 3).map(t => (
          <div key={`task-${t.id}`} className={`p-0.5 px-1.5 rounded text-[10px] truncate ${t.status === 'done' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 line-through' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            {t.content}
          </div>
        ))}
        {total > 3 && <div className="text-[10px] text-text-muted pl-1">+{total - 3} more</div>}
        {total === 0 && <div className="h-8" />}
      </div>
    </div>
  );
}

// --- Day View ---
function DayView({ day, events, tasks, onEventClick, onEventMoved }: {
  day: Date;
  events: CalendarEvent[];
  tasks: Task[];
  onEventClick?: (e: CalendarEvent) => void;
  onEventMoved?: () => void;
}) {
  const HOUR_HEIGHT = 64;
  const HOUR_START = 0;
  const HOUR_END = 24;
  const totalHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT;
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);

  const now = new Date();
  const isToday_ = isToday(day);
  const currentMinuteOffset = isToday_
    ? now.getHours() * 60 + now.getMinutes()
    : -1;

  // Drag state
  const [dragEvent, setDragEvent] = useState<CalendarEvent | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const lastTouchY = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // Filter events for this day
  const dayEvents = events.filter(e => {
    const eventDate = isTrulyAllDay(e)
      ? (parseLocalDateNode(e.start_time) as Date)
      : new Date(e.start_time);
    return isSameDay(eventDate, day);
  });

  const allDayEvents = dayEvents.filter(e => isTrulyAllDay(e));
  const timedEvents = dayEvents.filter(e => !isTrulyAllDay(e));

  return (
    <div className="mt-2">
      {/* All-day events row */}
      {allDayEvents.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 px-1">
          {allDayEvents.map(e => {
            const colors = eventColorStyle(e.calendar_color);
            return (
              <div
                key={`allday-${e.id}`}
                onClick={() => onEventClick?.(e)}
                className="px-2 py-1 rounded text-xs border cursor-pointer hover:opacity-80"
                style={{ backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, color: colors.color }}
              >
                {e.title}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div ref={gridRef} className="relative rounded-xl border border-border-subtle bg-bg-primary overflow-hidden" 
           style={{ height: totalHeight }}
           onDragOver={(e) => {
             e.preventDefault();
             e.dataTransfer.dropEffect = 'move';
           }}
           onDrop={(e) => {
             e.preventDefault();
             if (!dragEvent) return;

             const gridRect = e.currentTarget.getBoundingClientRect();
             const dropY = e.clientY - gridRect.top - dragOffsetY;
             const dropMinutes = Math.round((dropY / HOUR_HEIGHT) * 60 / 15) * 15;
             const clampedMinutes = Math.max(0, Math.min(dropMinutes, 24 * 60 - 15));

             const durationMinutes = Math.max(
               (new Date(dragEvent.end_time).getTime() - new Date(dragEvent.start_time).getTime()) / 60000,
               15
             );

             const newStart = new Date(day);
             newStart.setHours(Math.floor(clampedMinutes / 60), clampedMinutes % 60, 0, 0);
             const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);

             // Optimistic: fire PATCH, parent will re-fetch on next poll
             fetch(`/api/v2/calendar/events/${dragEvent.id}`, {
               method: 'PATCH',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 start_time: newStart.toISOString(),
                 end_time: newEnd.toISOString(),
               }),
             }).catch(err => console.error('Drag update failed:', err));

             setDragEvent(null);
             setDragOffsetY(0);
            setTimeout(() => onEventMoved?.(), 500); // brief delay for CalDAV to persist
           }}
        >
        {/* Hour rows */}
        {hours.map(hour => (
          <div 
            key={hour}
            className="absolute left-0 right-0 border-t border-border-subtle"
            style={{ top: (hour - HOUR_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          >
            <span className="absolute -top-3 left-2 text-xs text-text-muted bg-bg-primary px-1">
              {format(new Date(2024, 0, 1, hour), 'h a')}
            </span>
          </div>
        ))}

        {/* Current time indicator */}
        {currentMinuteOffset >= 0 && (
          <div 
            className="absolute left-0 right-0 z-10 pointer-events-none"
            style={{ top: (currentMinuteOffset / 60) * HOUR_HEIGHT }}
          >
            <div className="absolute left-12 right-1 border-t-2 border-red-500" />
            <div className="absolute left-[44px] -top-1.5 w-3 h-3 rounded-full bg-red-500" />
          </div>
        )}

        {/* Event blocks */}
        {timedEvents.map(event => {
          const start = new Date(event.start_time);
          const end = new Date(event.end_time);
          const startMinutes = start.getHours() * 60 + start.getMinutes();
          const endMinutes = end.getHours() * 60 + end.getMinutes();
          const durationMinutes = Math.max(endMinutes - startMinutes, 15);
          const top = (startMinutes / 60) * HOUR_HEIGHT;
          const height = (durationMinutes / 60) * HOUR_HEIGHT;
          const colors = eventColorStyle(event.calendar_color);

          return (
            <div
              key={`evt-${event.id}`}
              draggable
              onDragStart={(e) => {
                setDragEvent(event);
                const rect = e.currentTarget.getBoundingClientRect();
                setDragOffsetY(e.clientY - rect.top);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(event.id));
              }}
              onDragEnd={() => {
                setDragEvent(null);
                setDragOffsetY(0);
              }}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  const touch = e.touches[0];
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDragEvent(event);
                  setDragOffsetY(touch.clientY - rect.top);
                  lastTouchY.current = touch.clientY;
                }
              }}
              onTouchMove={(e) => {
                if (dragEvent?.id === event.id && e.touches.length === 1) {
                  e.preventDefault();
                  lastTouchY.current = e.touches[0].clientY;
                }
              }}
              onTouchEnd={() => {
                if (dragEvent?.id !== event.id) return;
                const gridRect = gridRef.current?.getBoundingClientRect();
                if (!gridRect) { setDragEvent(null); return; }
                
                const dropY = lastTouchY.current - gridRect.top - dragOffsetY;
                const dropMinutes = Math.round((dropY / HOUR_HEIGHT) * 60 / 15) * 15;
                const clampedMinutes = Math.max(0, Math.min(dropMinutes, 24 * 60 - 15));

                const durationMinutes = Math.max(
                  (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000,
                  15
                );

                const newStart = new Date(day);
                newStart.setHours(Math.floor(clampedMinutes / 60), clampedMinutes % 60, 0, 0);
                const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);

                fetch(`/api/v2/calendar/events/${event.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ start_time: newStart.toISOString(), end_time: newEnd.toISOString() }),
                }).catch(err => console.error('Touch drag update failed:', err));

                setDragEvent(null);
                setDragOffsetY(0);
                setTimeout(() => onEventMoved?.(), 500);
              }}
              onClick={() => onEventClick?.(event)}
              className={`absolute left-12 right-1 z-10 rounded px-2 py-1 border cursor-pointer overflow-hidden ${
                dragEvent?.id === event.id ? 'opacity-40' : 'hover:opacity-80'
              }`}
              style={{
                top,
                height,
                backgroundColor: colors.backgroundColor,
                borderColor: colors.borderColor,
                color: colors.color,
              }}
            >
              <div className="text-xs font-medium truncate leading-tight">{event.title}</div>
              {height > 40 && (
                <div className="text-[10px] opacity-75 leading-tight mt-0.5">
                  {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
