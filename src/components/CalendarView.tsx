'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Task } from '@/types';
import { ChevronLeft, ChevronRight, Plus, Clock, Calendar, AlertCircle, ListTodo, Pencil, X } from 'lucide-react';
import { startOfWeek, addDays, isSameDay, isBefore, startOfDay, format, isToday, startOfMonth, endOfMonth, getDay } from 'date-fns';
import { parseLocalDateNode } from '@/lib/dateUtils';
import { CalendarEvent, eventColorStyle, isTrulyAllDay, hexToRgb } from '@/lib/calendar';
import { EventCard } from '@/components/calendar/EventCard';
import { CalendarTaskBlock } from '@/components/calendar/CalendarTaskBlock';
import { CalendarTaskCard } from '@/components/calendar/CalendarTaskCard';
import { useCalendarSources } from '@/hooks/useCalendarSources';
import { useSync } from '@/contexts/SyncContext';
import { UnscheduledTaskPanel, UnscheduledTaskDrawer } from '@/components/calendar/UnscheduledTaskPanel';
import { useTaskEdit } from '@/contexts/TaskEditContext';
import { useToast } from '@/contexts/ToastContext';
import { apiFetch, AuthError } from '@/lib/api';
import { getTaskDurationMinutes, sameDayClampDragStart } from '@/lib/taskTime';
import { PullToRefresh } from './v2/PullToRefresh';
import AddCalendarModal from './modals/AddCalendarModal';
import EventDetailModal from './modals/EventDetailModal';

type ViewType = 'week' | 'month' | 'day';

export default function CalendarViewV2() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewType, setViewType] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cal_view_type');
      return (saved as ViewType) || 'week';
    }
    return 'week';
  });
  const { tasks, events, initialLoading, refetch, updateLocalTask } = useSync();
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [isAddCalendarOpen, setIsAddCalendarOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<{ id: number; name: string; url: string; color: string; mode: 'ical' | 'caldav' } | null>(null);
  const [isUnscheduledPanelOpen, setIsUnscheduledPanelOpen] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { calendars, refetch: refetchCalendars } = useCalendarSources();
  const { openTaskEdit } = useTaskEdit();
  const { showToast } = useToast();

  const handleOpenTaskEdit = useCallback((task: Task) => {
    openTaskEdit(task);
  }, [openTaskEdit]);

  // Persist state (view type only — calendar always opens to today)
  useEffect(() => { localStorage.setItem('cal_view_type', viewType); }, [viewType]);

  // Fetch tasks
  const handleRefresh = async () => {
    await refetch();
  };

  const handleDataChanged = () => {
    refetch();
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
    updateLocalTask(taskId, { status: newStatus });
    try {
      await apiFetch(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) { if (e instanceof AuthError) { return; } refetch(); }
    window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { taskId, source: 'calendar' } }));
  };

  const handleDropTask = async (taskId: number, targetDay: Date) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    updateLocalTask(taskId, { due_date: targetDay.toISOString() });
    try {
      await apiFetch(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due_date: targetDay.toISOString() }),
      });
    } catch (e) {
      if (e instanceof AuthError) { return; }
      showToast('Failed to move task', 'error');
    }
    window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { taskId, source: 'calendar' } }));
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
            <div className="text-sm font-semibold text-text-primary min-w-[100px] md:min-w-[140px] text-center">
              {viewType === 'week' ? format(currentDate, "'Week of' MMM d") : viewType === 'day' ? format(currentDate, 'EEEE, MMMM d, yyyy') : format(currentDate, 'MMMM yyyy')}
            </div>
            <button onClick={() => navigate('next')} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center"><ChevronRight size={16} /></button>
          </div>

          <button onClick={resetToToday} className="px-3 md:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm min-h-[36px]">Today</button>
          <button onClick={() => setIsUnscheduledPanelOpen(v => !v)} className={`px-3 py-2 flex items-center gap-1.5 text-sm rounded-lg transition-colors min-h-[36px] ${isUnscheduledPanelOpen ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-800 text-text-primary hover:bg-gray-200 dark:hover:bg-gray-700'}`} title="Task Panel">
            <ListTodo size={14} /> <span className="hidden md:inline">Tasks</span>
          </button>
          <button onClick={() => setIsAddCalendarOpen(true)} className="px-3 py-2 flex items-center gap-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-text-primary rounded-lg transition-colors min-h-[36px]" title="Add Calendar Subscription">
            <Plus size={14} /> <span className="hidden md:inline">Add Calendar</span>
          </button>
        </div>
      </div>

      {/* Calendar list pills */}
      {calendars.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {calendars.map(cal => (
            <div
              key={cal.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{
                backgroundColor: `rgba(${hexToRgb(cal.color || '#7c3aed').r}, ${hexToRgb(cal.color || '#7c3aed').g}, ${hexToRgb(cal.color || '#7c3aed').b}, 0.15)`,
                borderColor: `rgba(${hexToRgb(cal.color || '#7c3aed').r}, ${hexToRgb(cal.color || '#7c3aed').g}, ${hexToRgb(cal.color || '#7c3aed').b}, 0.3)`,
                color: cal.color || '#7c3aed',
              }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color || '#7c3aed' }} />
              <span>{cal.name}</span>
              <button
                onClick={() => {
                  const mode = cal.server_url?.includes('.ics') || cal.calendar_url?.includes('.ics') ? 'ical' as const : 'caldav' as const;
                  setEditingCalendar({ id: cal.id, name: cal.name, url: cal.calendar_url || cal.server_url, color: cal.color || '#7c3aed', mode });
                  setIsAddCalendarOpen(true);
                }}
                className="ml-0.5 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-60 hover:opacity-100"
                title="Edit calendar"
              >
                <Pencil size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pull-to-refresh wrapper */}
      <PullToRefresh onRefresh={handleRefresh} className={viewType === 'day' ? 'md:max-h-none' : 'max-h-[60vh] md:max-h-none'}>
        {/* Overdue Section */}
        {overdueTasks.length > 0 && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-3 md:p-4">
            <h3 className="text-red-700 dark:text-red-300 font-medium text-sm flex items-center gap-2 mb-3">
              <AlertCircle size={16} /> Overdue <span className="bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-full text-xs font-bold">{overdueTasks.length}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {overdueTasks.map(t => <CalendarTaskCard key={t.id} task={t} onToggle={handleTaskToggle} onClick={handleOpenTaskEdit} variant="overdue" />)}
            </div>
          </div>
        )}

        {/* ===== MOBILE: Week = day strip + detail, Month = compact grid, Day = time grid ===== */}
        <div className="md:hidden space-y-4">
          {viewType === 'day' ? (
            <div className="overflow-y-auto styled-scrollbar rounded-xl" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <DayView day={currentDate} events={events} tasks={tasks} onEventClick={handleEventClick} onEventMoved={() => handleDataChanged()} onTaskToggle={handleTaskToggle} onTaskClick={handleOpenTaskEdit} />
            </div>
          ) : viewType === 'week' ? (
            <>
              {/* Week: Horizontal day strip */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                {gridDays.map(day => (
                  <DayChip key={day.toISOString()} day={day} selected={isSameDay(day, selectedDay)} onSelect={setSelectedDay} />
                ))}
              </div>
              {/* Selected day detail */}
              <DayDetailPanel day={selectedDay} items={selectedItems} onEventClick={handleEventClick} onTaskToggle={handleTaskToggle} onTaskClick={handleOpenTaskEdit} />
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
              <DayDetailPanel day={selectedDay} items={getItemsForDay(selectedDay)} onEventClick={handleEventClick} onTaskToggle={handleTaskToggle} onTaskClick={handleOpenTaskEdit} />
            </>
          )}
        </div>

        {/* ===== DESKTOP & TABLET: Grid View + Task Panel ===== */}
        <div className="hidden md:flex gap-4 pb-4">
          <div className="flex-1 min-w-0">
{viewType === 'day' ? (
              <div className="overflow-y-auto styled-scrollbar" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                <DayView day={currentDate} events={events} tasks={tasks} onEventClick={handleEventClick} onEventMoved={() => handleDataChanged()} onTaskToggle={handleTaskToggle} onTaskClick={handleOpenTaskEdit} />
              </div>
            ) : viewType === 'week' ? (
              <div className="grid grid-cols-7 gap-3 min-w-[600px]">
                {gridDays.map(day => (
                  <DesktopWeekDay key={day.toISOString()} day={day} items={getItemsForDay(day)} onToggle={handleTaskToggle} onEventClick={handleEventClick} onDropTask={(taskId, targetDay) => { handleDropTask(taskId, targetDay); }} onTaskClick={handleOpenTaskEdit} />
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
                    <DesktopMonthDay key={day.toISOString()} day={day} currentMonth={currentDate.getMonth()} items={getItemsForDay(day)} onToggle={handleTaskToggle} onEventClick={handleEventClick} onDropTask={(taskId, targetDay) => { handleDropTask(taskId, targetDay); }} onTaskClick={handleOpenTaskEdit} />
                  ))}
                </div>
              </div>
            )}
          </div>
          {isUnscheduledPanelOpen && (
            <div className="w-72 shrink-0 border border-border-default rounded-xl bg-bg-primary overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              <UnscheduledTaskPanel isOpen={true} onClose={() => setIsUnscheduledPanelOpen(false)} onTaskScheduled={() => handleDataChanged()} />
            </div>
          )}
        </div>
      </PullToRefresh>

      {initialLoading && <div className="text-center py-4 text-text-muted text-sm">Loading calendar...</div>}

      {/* Modals */}
      <AddCalendarModal
        key={editingCalendar?.id || 'new'}
        isOpen={isAddCalendarOpen}
        editCalendar={editingCalendar ?? undefined}
        onClose={() => { setIsAddCalendarOpen(false); setEditingCalendar(null); }}
        onSuccess={() => { handleDataChanged(); apiFetch('/api/caldav/sync', { method: 'POST' }).catch(e => { if (!(e instanceof AuthError)) console.error(e); }); }}
      />
      <EventDetailModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent as any}
      />

      {/* Mobile: Bottom drawer for unscheduled tasks */}
      <UnscheduledTaskDrawer
        isOpen={isUnscheduledPanelOpen}
        onClose={() => setIsUnscheduledPanelOpen(false)}
        onTaskScheduled={() => handleDataChanged()}
      />
    </div>
  );
}

// --- Shared: Day detail panel (mobile) ---
function DayDetailPanel({ day, items, onEventClick, onTaskToggle, onTaskClick }: { day: Date; items: { tasks: Task[]; events: CalendarEvent[] }; onEventClick?: (e: CalendarEvent) => void; onTaskToggle?: (id: number, e: React.MouseEvent) => void; onTaskClick?: (task: Task) => void }) {
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
          {items.events.map(e => (
            <EventCard key={`evt-${e.id}`} event={e} onClick={onEventClick} />
          ))}
          {items.tasks.map(t => (
            <CalendarTaskCard key={`task-${t.id}`} task={t} onToggle={(id, e) => onTaskToggle?.(id, e)} onClick={onTaskClick} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Desktop Week Day Cell ---
function DesktopWeekDay({ day, items, onToggle, onEventClick, onDropTask, onTaskClick }: { day: Date; items: { tasks: Task[]; events: CalendarEvent[] }; onToggle: (id: number, e: React.MouseEvent) => void; onEventClick?: (e: CalendarEvent) => void; onDropTask?: (taskId: number, targetDay: Date) => void; onTaskClick?: (task: Task) => void }) {
  const isTodayDate = isToday(day);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`flex flex-col gap-2 min-h-[200px] transition-colors ${isTodayDate ? 'bg-blue-50/50 dark:bg-blue-900/5 rounded-xl -mx-2 px-2 ring-1 ring-blue-100 dark:ring-blue-900/30' : ''} ${isDragOver ? 'ring-2 ring-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const dropData = e.dataTransfer.getData('text/plain');
        const taskMatch = dropData.match(/^task-(\d+)$/);
        if (taskMatch) {
          const taskId = parseInt(taskMatch[1]);
          onDropTask?.(taskId, day);
        }
        const appData = e.dataTransfer.getData('application/task-id');
        if (appData) {
          onDropTask?.(parseInt(appData), day);
        }
      }}
    >
      <div className="text-center mb-1">
        <div className={`text-xs font-medium uppercase tracking-wider ${isTodayDate ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{format(day, 'EEE')}</div>
        <div className={`text-lg font-bold ${isTodayDate ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'}`}>{format(day, 'd')}</div>
      </div>
      <div className="flex flex-col gap-1.5 flex-1">
        {items.events.map((e: CalendarEvent) => (
          <EventCard key={`evt-${e.id}`} event={e} onClick={onEventClick} />
        ))}
        {items.tasks.map((t: Task) => (
          <CalendarTaskCard key={`task-${t.id}`} task={t} onToggle={onToggle} onClick={onTaskClick} variant="default" draggable />
        ))}
        {items.tasks.length === 0 && items.events.length === 0 && <div className="h-full border-t border-transparent" />}
      </div>
    </div>
  );
}

// --- Desktop Month Day Cell ---
function DesktopMonthDay({ day, items, currentMonth, onToggle, onEventClick, onDropTask, onTaskClick }: { day: Date; items: { tasks: Task[]; events: CalendarEvent[] }; currentMonth: number; onToggle: (id: number, e: React.MouseEvent) => void; onEventClick?: (e: CalendarEvent) => void; onDropTask?: (taskId: number, targetDay: Date) => void; onTaskClick?: (task: Task) => void }) {
  const isTodayDate = isToday(day);
  const inMonth = day.getMonth() === currentMonth;
  const total = items.tasks.length + items.events.length;
  const doneCount = items.tasks.filter(t => t.status === 'done').length;
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`min-h-[100px] p-2 transition-colors ${
        isDragOver ? 'ring-2 ring-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' :
        isTodayDate ? 'bg-blue-50 dark:bg-blue-900/20' :
        inMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-850 opacity-50'
      }`}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const dropData = e.dataTransfer.getData('text/plain');
        const taskMatch = dropData.match(/^task-(\d+)$/);
        if (taskMatch) {
          const taskId = parseInt(taskMatch[1]);
          onDropTask?.(taskId, day);
        }
        const appData = e.dataTransfer.getData('application/task-id');
        if (appData) {
          onDropTask?.(parseInt(appData), day);
        }
      }}
    >
      <div className={`text-sm font-semibold mb-1 ${isTodayDate ? 'text-blue-600 dark:text-blue-400' : inMonth ? 'text-text-primary' : 'text-text-muted'}`}>
        {format(day, 'd')}
        {isTodayDate && <span className="ml-1 text-[10px] font-normal text-blue-500">Today</span>}
      </div>
      <div className="space-y-0.5">
        {items.events.slice(0, 3).map(e => (
          <EventCard key={`evt-${e.id}`} event={e} onClick={onEventClick} variant="compact" />
        ))}
        {items.tasks.slice(0, 3).map(t => (
          <CalendarTaskCard key={`task-${t.id}`} task={t} onToggle={onToggle} onClick={onTaskClick} variant="compact" draggable />
        ))}
        {total > 3 && <div className="text-[10px] text-text-muted pl-1">+{total - 3} more</div>}
        {total === 0 && <div className="h-8" />}
      </div>
    </div>
  );
}

// --- Day View ---
const HOUR_HEIGHT = 64;
const LEFT_GUTTER = 48;
const COLUMN_GAP = 1;
const ALL_DAY_LIMIT = 4;

function DayView({ day, events, tasks, onEventClick, onEventMoved, onTaskToggle, onTaskClick }: {
  day: Date;
  events: CalendarEvent[];
  tasks: Task[];
  onEventClick?: (e: CalendarEvent) => void;
  onEventMoved?: () => void;
  onTaskToggle?: (taskId: number, e: React.MouseEvent) => void;
  onTaskClick?: (task: Task) => void;
}) {
  const [showAllHours, setShowAllHours] = useState(false);
  const [showAllAllDay, setShowAllAllDay] = useState(false);

  const HOUR_START = showAllHours ? 0 : 6;
  const HOUR_END = showAllHours ? 24 : 22;
  const totalHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT;
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);

  // Convert grid-Y (px from grid top) ↔ absolute minutes since midnight.
  // Grid top corresponds to HOUR_START, so add/subtract the offset.
  const gridYToMinutes = (y: number) => Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15 + HOUR_START * 60;
  const minutesToGridY = (absMinutes: number) => ((absMinutes - HOUR_START * 60) / 60) * HOUR_HEIGHT;

  const now = new Date();
  const isToday_ = isToday(day);
  const currentMinuteOffset = isToday_
    ? now.getHours() * 60 + now.getMinutes()
    : -1;

  // Task creation state
  const [creatingAt, setCreatingAt] = useState<{ time: Date; y: number } | null>(null);
  const [creatingValue, setCreatingValue] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const [dragEvent, setDragEvent] = useState<CalendarEvent | null>(null);
  const [dragTask, setDragTask] = useState<Task | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  // Drop-snapping indicator (y position on grid + formatted label)
  const [dragIndicator, setDragIndicator] = useState<{ y: number; label: string } | null>(null);
  const lastTouchY = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const { showToast } = useToast();

  // Filter events for this day
  const dayEvents = events.filter(e => {
    const eventDate = isTrulyAllDay(e)
      ? (parseLocalDateNode(e.start_time) as Date)
      : new Date(e.start_time);
    return isSameDay(eventDate, day);
  });

  const allDayEvents = dayEvents.filter(e => isTrulyAllDay(e));
  const timedEvents = dayEvents.filter(e => !isTrulyAllDay(e));

  // Filter tasks for this day
  const dayTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false;
    const taskDate = parseLocalDateNode(t.due_date) as Date;
    return isSameDay(taskDate, day);
  });

  const timedTasks = dayTasks.filter(t => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0 || !!t.end_time;
  });

  const allDayTasks = dayTasks.filter(t => !timedTasks.includes(t));

  // Combined all-day items (events first, then tasks) with collapse/expand
  const allDayCombined = useMemo(() => [
    ...allDayEvents.map(e => ({ kind: 'event' as const, item: e })),
    ...allDayTasks.map(t => ({ kind: 'task' as const, item: t })),
  ], [allDayEvents, allDayTasks]);
  const displayedAllDay = showAllAllDay ? allDayCombined : allDayCombined.slice(0, ALL_DAY_LIMIT);
  const allDayOverflow = allDayCombined.length - ALL_DAY_LIMIT;

  // Count items hidden by off-hours truncation (in 12am-6am or 10pm-12am bands)
  const hiddenTimedItems = useMemo(() => {
    if (showAllHours) return 0;
    const inHiddenRange = (minutes: number) => minutes < 6 * 60 || minutes >= 22 * 60;
    const hiddenEvents = timedEvents.filter(e => {
      const s = new Date(e.start_time);
      return inHiddenRange(s.getHours() * 60 + s.getMinutes());
    }).length;
    const hiddenTasks = timedTasks.filter(t => {
      const d = parseLocalDateNode(t.due_date!) as Date;
      return inHiddenRange(d.getHours() * 60 + d.getMinutes());
    }).length;
    return hiddenEvents + hiddenTasks;
  }, [showAllHours, timedEvents, timedTasks]);

  const itemLayouts = useMemo(() => {
    const items = [
      ...timedEvents.map(e => ({
        key: `evt-${e.id}`,
        startMs: new Date(e.start_time).getTime(),
        endMs: new Date(e.end_time).getTime(),
      })),
      ...timedTasks.map(t => {
        const startMs = (parseLocalDateNode(t.due_date!) as Date).getTime();
        const durationMin = getTaskDurationMinutes(t);
        return {
          key: `task-${t.id}`,
          startMs,
          endMs: startMs + durationMin * 60000,
        };
      }),
    ];
    const sorted = [...items].sort((a, b) => a.startMs - b.startMs);
    const colMap = new Map<string, number>();
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const used = new Set<number>();
      for (let j = 0; j < i; j++) {
        const other = sorted[j];
        if (item.startMs < other.endMs && item.endMs > other.startMs) {
          used.add(colMap.get(other.key)!);
        }
      }
      let col = 0;
      while (used.has(col)) col++;
      colMap.set(item.key, col);
    }
    const itemMap = new Map(items.map(i => [i.key, i]));
    const result = new Map<string, { column: number; total: number }>();
    for (const item of items) {
      let maxCol = 0;
      for (const [otherKey, col] of colMap) {
        if (otherKey === item.key) continue;
        const other = itemMap.get(otherKey)!;
        if (item.startMs < other.endMs && item.endMs > other.startMs) {
          maxCol = Math.max(maxCol, col);
        }
      }
      result.set(item.key, {
        column: colMap.get(item.key) ?? 0,
        total: Math.max(maxCol + 1, (colMap.get(item.key) ?? 0) + 1),
      });
    }
    return result;
  }, [timedEvents, timedTasks]);

  return (
    <div className="mt-2">
      {/* All-day events + tasks row */}
      {allDayCombined.length > 0 && (
        <div className="mb-2 border border-border-subtle rounded-lg bg-bg-secondary/60 px-2 py-1.5">
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted shrink-0 w-12 pt-1">
              All-day
            </span>
            <div className="flex flex-1 flex-wrap gap-1.5 min-w-0">
              {displayedAllDay.map(({ kind, item }) => {
                if (kind === 'event') {
                  const e = item as CalendarEvent;
                  return <EventCard key={`allday-${e.id}`} event={e} onClick={onEventClick} variant="allday" />;
                }
                const t = item as Task;
                return (
                  <div
                    key={`allday-task-${t.id}`}
                    draggable
                    onDragStart={(e) => {
                      setDragTask(t);
                      setDragEvent(null);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', `task-${t.id}`);
                    }}
                    onDragEnd={() => { setDragTask(null); setDragIndicator(null); }}
                    onClick={() => onTaskClick?.(t)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs cursor-pointer transition-opacity hover:opacity-80 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 text-text-primary max-w-full"
                  >
                    <span className="opacity-60">✓</span>
                    <span className="truncate max-w-[200px]">{t.content}</span>
                  </div>
                );
              })}
            </div>
            {allDayOverflow > 0 && (
              <button
                onClick={() => setShowAllAllDay(v => !v)}
                className="shrink-0 text-[10px] px-2 py-1 rounded-md border border-border-subtle bg-bg-tertiary text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors mt-0.5"
              >
                {showAllAllDay ? 'Collapse' : `+${allDayOverflow} more`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Off-hours toggle */}
      <div className="flex justify-end mb-1.5 px-1">
        <button
          onClick={() => setShowAllHours(v => !v)}
          className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border transition-colors ${
            showAllHours
              ? 'bg-bg-tertiary text-text-primary border-border-default'
              : 'bg-bg-secondary text-text-muted border-border-subtle hover:bg-bg-tertiary'
          }`}
          title={showAllHours ? 'Hide off-hours (12am–6am, 10pm–12am)' : 'Show all 24 hours'}
        >
          <Clock size={11} />
          {showAllHours ? '6am–10pm view' : '24 hours'}
          {hiddenTimedItems > 0 && !showAllHours && (
            <span className="ml-1 px-1 rounded-full bg-amber-200 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-medium leading-none">
              {hiddenTimedItems} hidden
            </span>
          )}
        </button>
      </div>

      {/* Time grid */}
<div ref={gridRef} className="relative rounded-xl border border-border-subtle bg-bg-primary overflow-hidden"
        style={{ minHeight: totalHeight }}
onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target !== gridRef.current && !target.classList.contains('hour-row-bg')) return;
              const rect = gridRef.current!.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const minutes = gridYToMinutes(y);
              const clampedMinutes = Math.max(HOUR_START * 60, Math.min(minutes, HOUR_END * 60 - 15));
              const newDate = new Date(day);
              newDate.setHours(Math.floor(clampedMinutes / 60), clampedMinutes % 60, 0, 0);
              setCreatingAt({ time: newDate, y: minutesToGridY(clampedMinutes) });
              setCreatingValue('');
              setTimeout(() => createInputRef.current?.focus(), 50);
            }}
           onDragOver={(e) => {
             e.preventDefault();
             e.dataTransfer.dropEffect = 'move';
             // Live snap indicator: compute where the item would land
             const rect = gridRef.current?.getBoundingClientRect();
             if (rect) {
               const y = e.clientY - rect.top - (dragOffsetY || 0);
               const absMin = gridYToMinutes(y);
               const clamped = Math.max(HOUR_START * 60, Math.min(absMin, HOUR_END * 60 - 15));
               const h = Math.floor(clamped / 60);
               const m = clamped % 60;
               const label = format(new Date(2024, 0, 1, h, m), 'h:mm a');
               setDragIndicator({ y: minutesToGridY(clamped), label });
             }
           }}
           onDragLeave={() => setDragIndicator(null)}
           onDrop={(e) => {
             e.preventDefault();

const gridRect = e.currentTarget.getBoundingClientRect();
              const dropY = e.clientY - gridRect.top - (dragOffsetY || 0);
              const dropMinutes = gridYToMinutes(dropY);
              const clampedMinutes = Math.max(HOUR_START * 60, Math.min(dropMinutes, HOUR_END * 60 - 15));

if (dragTask) {
                // Dropping a task → set its due time, preserving any end_time duration
                const durationMin = getTaskDurationMinutes(dragTask);
                const clampedStart = sameDayClampDragStart(
                  Math.floor(clampedMinutes / 60) * 60 + clampedMinutes % 60,
                  durationMin,
                  HOUR_START,
                  HOUR_END
                );
                const newDue = new Date(day);
                newDue.setHours(Math.floor(clampedStart / 60), clampedStart % 60, 0, 0);
                const bodyPayload: { due_date: string; end_time?: string } = { due_date: newDue.toISOString() };
                if (dragTask.end_time) {
                  const newEnd = new Date(newDue.getTime() + durationMin * 60000);
                  bodyPayload.end_time = newEnd.toISOString();
                }

                apiFetch(`/api/v2/tasks/${dragTask.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(bodyPayload),
                }).catch(err => { if (err instanceof AuthError) { return; } console.error('Task drop failed:', err); showToast('Failed to move task', 'error'); });

                setDragTask(null);
                setDragOffsetY(0);
                setDragIndicator(null);
                setTimeout(() => onEventMoved?.(), 500);
                return;
              }

              if (!dragEvent) {
                // Handle external task drop from sidebar (no state set)
                let taskId: number | null = null;
                const dropData = e.dataTransfer.getData('text/plain');
                const taskMatch = dropData.match(/^task-(\d+)$/);
                if (taskMatch) {
                  taskId = parseInt(taskMatch[1]);
                } else {
                  const appData = e.dataTransfer.getData('application/task-id');
                  if (appData) {
                    taskId = parseInt(appData);
                  }
                }
if (taskId !== null) {
                   const task = tasks.find(t => t.id === taskId);
                   if (task) {
                     const durationMin = getTaskDurationMinutes(task);
                     const clampedStart = sameDayClampDragStart(clampedMinutes, durationMin, HOUR_START, HOUR_END);
                     const newDue = new Date(day);
                     newDue.setHours(Math.floor(clampedStart / 60), clampedStart % 60, 0, 0);
                     const bodyPayload: { due_date: string; end_time?: string } = { due_date: newDue.toISOString() };
                     if (task.end_time) {
                       const newEnd = new Date(newDue.getTime() + durationMin * 60000);
                       bodyPayload.end_time = newEnd.toISOString();
                     }
                     apiFetch(`/api/v2/tasks/${taskId}`, {
                       method: 'PUT',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify(bodyPayload),
                     }).catch(err => { if (err instanceof AuthError) { return; } console.error('Task drop failed:', err); showToast('Failed to move task', 'error'); });
                     setTimeout(() => onEventMoved?.(), 500);
                   }
                 }
                return;
              }

             const durationMinutes = Math.max(
               (new Date(dragEvent.end_time).getTime() - new Date(dragEvent.start_time).getTime()) / 60000,
               15
             );

             const newStart = new Date(day);
             newStart.setHours(Math.floor(clampedMinutes / 60), clampedMinutes % 60, 0, 0);
             const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);

// Optimistic: fire PATCH, parent will re-fetch on next poll
              apiFetch(`/api/v2/calendar/events/${dragEvent.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
                   start_time: newStart.toISOString(),
                   end_time: newEnd.toISOString(),
                 }),
               }).catch(err => { if (err instanceof AuthError) { return; } console.error('Drag update failed:', err); showToast('Failed to update event', 'error'); });

             setDragEvent(null);
             setDragOffsetY(0);
             setDragIndicator(null);
            setTimeout(() => onEventMoved?.(), 500); // brief delay for CalDAV to persist
           }}
        >
        {/* Hour rows */}
        {hours.map(hour => (
          <div 
            key={hour}
            className="absolute left-0 right-0 border-t border-border-subtle/30 hour-row-bg cursor-pointer"
            style={{ top: (hour - HOUR_START) * HOUR_HEIGHT, height: HOUR_HEIGHT, zIndex: 0 }}
          >
            <span className="absolute -top-3 left-2 text-xs text-text-muted bg-bg-primary px-1 pointer-events-none">
              {format(new Date(2024, 0, 1, hour), 'h a')}
            </span>
          </div>
        ))}

        {/* Current time indicator */}
        {currentMinuteOffset >= 0 && currentMinuteOffset >= HOUR_START * 60 && currentMinuteOffset <= HOUR_END * 60 && (
          <div
            className="absolute left-0 right-0 z-10 pointer-events-none"
            style={{ top: minutesToGridY(currentMinuteOffset) }}
          >
            <div className="absolute left-12 right-1 border-t-2 border-red-500" />
            <div className="absolute left-[44px] -top-1.5 w-3 h-3 rounded-full bg-red-500" />
          </div>
        )}

        {/* Drag-snap indicator */}
        {dragIndicator && (
          <div
            className="absolute left-0 right-0 z-[15] pointer-events-none"
            style={{ top: dragIndicator.y }}
          >
            <div className="absolute left-12 right-1 border-t-2 border-dashed border-indigo-400" />
            <div className="absolute left-[44px] -top-3 w-3 h-3 rounded-full bg-indigo-400 ring-2 ring-indigo-400/30" />
            <span className="absolute -top-3 left-12 ml-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 bg-bg-primary px-1.5 rounded shadow-sm">
              {dragIndicator.label}
            </span>
          </div>
        )}

        {/* Event blocks */}
        {timedEvents.map(event => {
          const start = new Date(event.start_time);
          const end = new Date(event.end_time);
          const startMinutes = start.getHours() * 60 + start.getMinutes();
          const endMinutes = end.getHours() * 60 + end.getMinutes();
          const durationMinutes = Math.max(endMinutes - startMinutes, 15);
          const top = minutesToGridY(startMinutes);
          const height = (durationMinutes / 60) * HOUR_HEIGHT;
          const colors = eventColorStyle(event.calendar_color);
          const layout = itemLayouts.get(`evt-${event.id}`) ?? { column: 0, total: 1 };
          const leftOffset = `calc(${LEFT_GUTTER}px + ${layout.column} * ((100% - ${LEFT_GUTTER}px) / ${layout.total}))`;
          const colWidth = `calc((100% - ${LEFT_GUTTER}px - ${COLUMN_GAP * (layout.total - 1)}px) / ${layout.total})`;

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
                setDragIndicator(null);
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
                  // Live snap indicator for touch drag
                  const rect = gridRef.current?.getBoundingClientRect();
                  if (rect) {
                    const y = lastTouchY.current - rect.top - dragOffsetY;
                    const absMin = gridYToMinutes(y);
                    const clamped = Math.max(HOUR_START * 60, Math.min(absMin, HOUR_END * 60 - 15));
                    const h = Math.floor(clamped / 60);
                    const m = clamped % 60;
                    setDragIndicator({ y: minutesToGridY(clamped), label: format(new Date(2024, 0, 1, h, m), 'h:mm a') });
                  }
                }
              }}
              onTouchEnd={() => {
                if (dragEvent?.id !== event.id) return;
                const gridRect = gridRef.current?.getBoundingClientRect();
                if (!gridRect) { setDragEvent(null); return; }
                
                const dropY = lastTouchY.current - gridRect.top - dragOffsetY;
                const dropMinutes = gridYToMinutes(dropY);
                const clampedMinutes = Math.max(HOUR_START * 60, Math.min(dropMinutes, HOUR_END * 60 - 15));

                const durationMinutes = Math.max(
                  (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000,
                  15
                );

                const newStart = new Date(day);
                newStart.setHours(Math.floor(clampedMinutes / 60), clampedMinutes % 60, 0, 0);
                const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);

apiFetch(`/api/v2/calendar/events/${event.id}`, {
                   method: 'PATCH',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ start_time: newStart.toISOString(), end_time: newEnd.toISOString() }),
                 }).catch(err => { if (err instanceof AuthError) { return; } console.error('Touch drag update failed:', err); showToast('Failed to update event', 'error'); });

                setDragEvent(null);
                setDragOffsetY(0);
                setDragIndicator(null);
                setTimeout(() => onEventMoved?.(), 500);
              }}
              onClick={() => onEventClick?.(event)}
              className={`absolute z-20 rounded px-2 py-1 border cursor-pointer overflow-hidden transition-shadow ${
                dragEvent?.id === event.id ? 'ring-2 ring-indigo-400' : 'hover:shadow-lg'
              }`}
              style={{
                top,
                height,
                left: leftOffset,
                width: colWidth,
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

        {/* Timed tasks */}
        {timedTasks.map(t => {
          if (!t.due_date) return null;
          const d = parseLocalDateNode(t.due_date) as Date;
          const startMinutes = d.getHours() * 60 + d.getMinutes();
          const durationMin = getTaskDurationMinutes(t);
          const taskTop = minutesToGridY(startMinutes);
          const taskHeight = (durationMin / 60) * HOUR_HEIGHT;
          const layout = itemLayouts.get(`task-${t.id}`) ?? { column: 0, total: 1 };
          const leftOffset = `calc(${LEFT_GUTTER}px + ${layout.column} * ((100% - ${LEFT_GUTTER}px) / ${layout.total}))`;
          const colWidth = `calc((100% - ${LEFT_GUTTER}px - ${COLUMN_GAP * (layout.total - 1)}px) / ${layout.total})`;

          return (
            <CalendarTaskBlock
              key={`task-${t.id}`}
              task={t}
              day={day}
              hourHeight={HOUR_HEIGHT}
              top={taskTop}
              left={leftOffset}
              width={colWidth}
              blockHeight={taskHeight}
              onToggle={onTaskToggle}
              onClick={onTaskClick}
              onDragStart={(task, e) => {
                setDragTask(task);
                setDragEvent(null);
                const rect = e.currentTarget.getBoundingClientRect();
                setDragOffsetY(e.clientY - rect.top);
              }}
              onDragEnd={() => {
                setDragTask(null);
                setDragOffsetY(0);
                setDragIndicator(null);
              }}
            />
          );
        })}

        {/* Inline task creator */}
        {creatingAt && (
          <div
            className="absolute left-12 right-1 z-30 rounded-md border-2 border-indigo-400 bg-indigo-500/20 overflow-hidden shadow-lg"
            style={{ top: creatingAt.y, minHeight: HOUR_HEIGHT }}
          >
            <div className="flex items-center gap-2 px-2 py-1">
              <span className="text-[10px] font-medium text-indigo-300 whitespace-nowrap">
                {format(creatingAt.time, 'h:mm a')}
              </span>
              <input
                ref={createInputRef}
                type="text"
                value={creatingValue}
                onChange={(e) => setCreatingValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && creatingValue.trim()) {
                    apiFetch('/api/v2/tasks', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ content: creatingValue.trim(), dueDate: creatingAt.time.toISOString() }),
                    })
                      .then(() => { onEventMoved?.(); window.dispatchEvent(new CustomEvent('taskCreated', { detail: { source: 'calendar' } })); })
                      .catch(err => { if (err instanceof AuthError) { return; } console.error('Task creation failed:', err); showToast('Failed to create task', 'error'); });
                    setCreatingAt(null);
                    setCreatingValue('');
                  } else if (e.key === 'Escape') {
                    setCreatingAt(null);
                    setCreatingValue('');
                  }
                }}
                onBlur={() => {
                  if (creatingValue.trim()) {
                    apiFetch('/api/v2/tasks', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ content: creatingValue.trim(), dueDate: creatingAt.time.toISOString() }),
                    })
                      .then(() => { onEventMoved?.(); window.dispatchEvent(new CustomEvent('taskCreated', { detail: { source: 'calendar' } })); })
                      .catch(err => { if (err instanceof AuthError) { return; } console.error('Task creation failed:', err); showToast('Failed to create task', 'error'); });
                  }
                  setCreatingAt(null);
                  setCreatingValue('');
                }}
                placeholder="Add task..."
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-indigo-300/70 min-w-0"
              />
            </div>
          </div>
        )}
      </div>

      {/* Drag-to-unschedule drop zone (floating, mobile + desktop) */}
      {dragTask && (
        <div
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          onDrop={(e) => {
            e.preventDefault();
            const dropData = e.dataTransfer.getData('text/plain');
            const match = dropData.match(/^task-(\d+)$/);
            let taskId: number | null = match ? parseInt(match[1]) : null;
            if (taskId === null) {
              const appData = e.dataTransfer.getData('application/task-id');
              if (appData) taskId = parseInt(appData);
            }
            if (taskId !== null) {
              apiFetch(`/api/v2/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ due_date: null, end_time: null }),
              })
                .then(() => {
                  onEventMoved?.();
                  window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { taskId, source: 'calendar' } }));
                })
                .catch(err => { if (err instanceof AuthError) { return; } console.error('Unschedule drop failed:', err); showToast('Failed to unschedule task', 'error'); });
            }
            setDragTask(null);
            setDragOffsetY(0);
            setDragIndicator(null);
          }}
          className="fixed left-1/2 -translate-x-1/2 z-50 bottom-4 md:bottom-8 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-red-400 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 shadow-lg pointer-events-auto"
        >
          <X size={16} />
          <span className="text-sm font-medium">Drop here to remove date</span>
        </div>
      )}
    </div>
  );
}
