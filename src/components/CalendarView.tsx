'use client';

import { useState, useEffect, useMemo } from 'react';
import { TaskInstance } from '@/types';
import { isTaskOverdue, formatTaskDate } from '@/lib/taskParser';
import { ChevronLeft, ChevronRight, Calendar, Plus, CheckCircle2, Circle, Clock } from 'lucide-react';
import { useTaskEdit } from '@/contexts/TaskEditContext';
import AddCalendarModal from './modals/AddCalendarModal';
import EventDetailModal from './modals/EventDetailModal';

interface CalendarViewProps {
  onTaskSelect?: (task: TaskInstance) => void;
  onTaskComplete?: (taskId: string) => void;
}

interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location: string;
  calendar_name: string;
}

type ViewType = 'week' | 'month';

export default function CalendarView({ onTaskSelect, onTaskComplete }: CalendarViewProps) {
  const { openTaskEdit } = useTaskEdit();
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('week');
  const [draggedTask, setDraggedTask] = useState<TaskInstance | null>(null);
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null);
  const [draggedOverUnscheduled, setDraggedOverUnscheduled] = useState(false);
  
  // Modal States
  const [isAddCalendarOpen, setIsAddCalendarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [currentDate, viewType]);

  // ... (Existing useEffects)
  
  // ... (Existing handlers: fetchTasks, fetchEvents, handleTaskComplete, Drags)
  
  // Re-fetch events after adding calendar
  const handleCalendarAdded = () => {
    fetchEvents();
    // Maybe trigger a full sync?
    fetch('/api/caldav/sync', { method: 'POST' }).catch(console.error);
  };

  useEffect(() => {
    const handleTaskUpdate = () => fetchTasks();
    const handleTaskCreate = () => fetchTasks();
    const handleTaskDelete = () => fetchTasks();

    window.addEventListener('taskUpdated', handleTaskUpdate);
    window.addEventListener('taskCreated', handleTaskCreate);
    window.addEventListener('taskDeleted', handleTaskDelete);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
      window.removeEventListener('taskCreated', handleTaskCreate);
      window.removeEventListener('taskDeleted', handleTaskDelete);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/v2/tasks');
      if (response.ok) {
        const allTasks = await response.json();
        const mappedTasks = allTasks.map((t: any) => ({
             ...t,
             id: t.id.toString(),
             completed: t.status === 'done',
             dueDate: t.due_date ? new Date(t.due_date) : null,
             recurrenceRule: t.recurrence_rule
        }));
        setTasks(mappedTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    
    if (viewType === 'week') {
       start.setDate(start.getDate() - start.getDay()); 
       end.setDate(end.getDate() + (6 - end.getDay()));
    } else {
       start.setDate(1); 
       end.setMonth(end.getMonth() + 1);
       end.setDate(0); 
    }
    
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);

    try {
      const res = await fetch(`/api/v2/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTaskComplete = async (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const currentTask = tasks.find(task => task.id === taskId);
    if (!currentTask) return;
    const newCompletedStatus = !currentTask.completed;
    
    try {
      const response = await fetch(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newCompletedStatus ? 'done' : 'todo' })
      });
      if (response.ok) {
        setTasks(prev => prev.map(task => 
          task.id === taskId 
            ? { ...task, completed: newCompletedStatus, completedAt: newCompletedStatus ? new Date() : undefined } 
            : task
        ));
        onTaskComplete?.(taskId);
        fetchTasks();
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  const handleTaskDragStart = (e: React.DragEvent, task: TaskInstance) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleTaskDragEnd = () => {
    setDraggedTask(null);
    setDraggedOverDate(null);
    setDraggedOverUnscheduled(false);
  };

  const handleDayDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverDate(dateKey);
  };

  const handleDayDragLeave = () => {
    setDraggedOverDate(null);
  };

  const handleUnscheduledDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverUnscheduled(true);
  };

  const handleUnscheduledDragLeave = () => {
    setDraggedOverUnscheduled(false);
  };

  const handleDayDrop = async (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId || !draggedTask) return;
    const dropDate = new Date(dateKey);
    try {
      const response = await fetch(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due_date: dropDate.toISOString() })
      });
      if (response.ok) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, dueDate: dropDate } : task
        ));
      }
    } catch (error) {
      console.error('Error rescheduling task:', error);
    }
    setDraggedTask(null);
    setDraggedOverDate(null);
    setDraggedOverUnscheduled(false);
  };

  const handleUnscheduleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId || !draggedTask) return;
    try {
      const response = await fetch(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due_date: null })
      });
      if (response.ok) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, dueDate: null } : task
        ));
      }
    } catch (error) {
      console.error('Error unscheduling task:', error);
    }
    setDraggedTask(null);
    setDraggedOverDate(null);
    setDraggedOverUnscheduled(false);
  };

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (viewType === 'week') {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day);
      
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        days.push(date);
      }
      return days;
    } else {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());
      
      const days = [];
      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
      
      let current = new Date(startDate);
      while (current <= endDate) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      return days;
    }
  }, [currentDate, viewType]);

  const { tasksByDate, unscheduledTasks } = useMemo(() => {
    const grouped: { [key: string]: TaskInstance[] } = {};
    const unscheduled: TaskInstance[] = [];
    
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = new Date(task.dueDate).toDateString();
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      } else if (!task.completed) {
        unscheduled.push(task);
      }
    });
    
    return { tasksByDate: grouped, unscheduledTasks: unscheduled };
  }, [tasks]);

  const eventsByDate = useMemo(() => {
      const grouped: { [key: string]: CalendarEvent[] } = {};
      events.forEach(event => {
          const startDate = new Date(event.start_time).toDateString();
          if (!grouped[startDate]) grouped[startDate] = [];
          grouped[startDate].push(event);
      });
      return grouped;
  }, [events]);

  const navigateCalendar = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewType === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const formatDateHeader = (date: Date) => {
    if (viewType === 'week') {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } else {
      return date.getDate().toString();
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              Calendar
            </h2>
            <p className="text-text-secondary">
              Tasks and Events
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Add Calendar Button */}
             <button
                onClick={() => setIsAddCalendarOpen(true)}
                className="px-3 py-1 flex items-center gap-2 text-sm bg-bg-secondary hover:bg-bg-tertiary text-text-primary border border-border-subtle rounded-lg transition-colors"
                title="Add Calendar Subscription"
             >
                <Plus className="w-4 h-4" />
                <span>Add Calendar</span>
             </button>

            {/* View Toggle */}
            <div className="flex bg-bg-tertiary rounded-lg p-1">
            {/* ... (Existing View Toggle) ... */}
              <button
                onClick={() => setViewType('week')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewType === 'week'
                    ? 'bg-bg-primary text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewType('month')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewType === 'month'
                    ? 'bg-bg-primary text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Month
              </button>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-2">
               {/* ... (Existing Nav) ... */}
              <button
                onClick={() => navigateCalendar('prev')}
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-secondary"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="text-lg font-semibold text-text-primary min-w-[200px] text-center">
                {currentDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric',
                  ...(viewType === 'week' ? { day: 'numeric' } : {})
                })}
              </div>
              
              <button
                onClick={() => navigateCalendar('next')}
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-secondary"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        {/* ... (Unscheduled Tasks Section) ... */}
        {(unscheduledTasks.length > 0 || draggedTask?.dueDate) && (
           // ...
           <div 
            className={`mb-6 rounded-lg border p-4 transition-colors ${
              draggedOverUnscheduled 
                ? 'border-accent-blue bg-blue-50 dark:bg-blue-900/20' 
                : 'bg-bg-secondary border-border-default'
            }`}
            onDragOver={handleUnscheduledDragOver}
            onDragLeave={handleUnscheduledDragLeave}
            onDrop={handleUnscheduleDrop}
          >
             {/* ... content ... */}
             <div className="flex items-center gap-2 mb-3">
               {/* ... */}
               <h3 className="text-lg font-semibold text-text-primary">
                Unscheduled Tasks
              </h3>
              <span className="px-2 py-1 bg-bg-tertiary text-text-secondary text-xs rounded-full">
                {unscheduledTasks.length}
              </span>
             </div>
             {/* ... */}
             <p className="text-sm text-text-muted mb-3">
               {draggedOverUnscheduled && draggedTask?.dueDate
                 ? 'Drop here to unschedule this task'
                 : 'Drag these tasks to calendar days to schedule them, or drag scheduled tasks here to unschedule them'
               }
             </p>
             
             <div className="flex flex-wrap gap-2">
                {/* ... map tasks ... */}
                {unscheduledTasks.map(task => {
                 const isOverdue = isTaskOverdue(task);
                 const isDragging = draggedTask?.id === task.id;
                 return (
                   <div
                     key={task.id}
                     draggable={!task.completed}
                     onDragStart={(e) => handleTaskDragStart(e, task)}
                     onDragEnd={handleTaskDragEnd}
                     className={`p-2 rounded text-sm cursor-pointer transition-all inline-block ${
                       isDragging
                         ? 'opacity-50 transform rotate-1 scale-95'
                         : task.completed
                           ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 line-through'
                           : 'bg-bg-primary text-text-primary hover:bg-bg-tertiary border border-border-subtle'
                     }`}
                     onClick={() => !isDragging && openTaskEdit(task as any)}
                   >
                     {/* ... content ... */}
                     <div className="flex items-center gap-2">
                       <button
                         onClick={(e) => handleTaskComplete(task.id, e)}
                         className="text-text-muted hover:text-green-600 dark:hover:text-green-400 transition-colors"
                       >
                            {task.completed ? <CheckCircle2 size={16} className="text-green-600" /> : <Circle size={16} />}
                       </button>
                       <span className="leading-tight">
                         {task.content}
                       </span>
                       {task.sourceNote && (
                         <span className="text-xs text-text-muted">
                           📝
                         </span>
                       )}
                     </div>
                   </div>
                 );
               })}
               {/* ... */}
               {/* Drop zone indicator when dragging scheduled task over empty unscheduled section */}
               {draggedOverUnscheduled && draggedTask?.dueDate && unscheduledTasks.length === 0 && (
                 <div className="p-4 border-2 border-dashed border-blue-400 rounded text-sm text-blue-600 dark:text-blue-400 text-center flex-1">
                   Drop here to unschedule task
                 </div>
               )}
             </div>
           </div>
        )}

        {/* Calendar Grid */}
        <div className="overflow-x-auto pb-4">
          <div className={`grid gap-4 min-w-[800px] md:min-w-0 ${
            viewType === 'week' 
              ? 'grid-cols-7' 
              : 'grid-cols-7'
          }`}>
            {calendarData.map((date, index) => {
              const dateKey = date.toDateString();
              const dayTasks = tasksByDate[dateKey] || [];
              const dayEvents = eventsByDate[dateKey] || [];
              
              const isDragOver = draggedOverDate === dateKey;
              const today = isToday(date);
              const currentMonth = isCurrentMonth(date);
              
              return (
                <div
                  key={dateKey}
                  className={`min-h-32 p-3 border rounded-lg transition-colors ${
                    isDragOver
                      ? 'border-accent-blue bg-blue-50 dark:bg-blue-900/20'
                      : today
                        ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/10'
                        : currentMonth || viewType === 'week'
                          ? 'border-border-default bg-bg-primary'
                          : 'border-border-subtle bg-bg-secondary'
                  } ${
                    viewType === 'month' && !currentMonth ? 'opacity-50' : ''
                  }`}
                  onDragOver={(e) => handleDayDragOver(e, dateKey)}
                  onDragLeave={handleDayDragLeave}
                  onDrop={(e) => handleDayDrop(e, dateKey)}
                >
                  {/* Date Header */}
                  {/* ... */}
                   <div className={`text-sm font-medium mb-2 ${
                    today 
                      ? 'text-accent-blue' 
                      : currentMonth || viewType === 'week'
                        ? 'text-text-primary'
                        : 'text-text-muted'
                  }`}>
                    {formatDateHeader(date)}
                  </div>
                  
                  <div className="space-y-1">
                    {/* Events */}
                    {dayEvents.map(event => (
                        <div 
                            key={`evt-${event.id}`}
                            onClick={() => setSelectedEvent(event)}
                            className="p-1 px-2 rounded text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800/50 cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                        >
                            <div className="flex items-center gap-1">
                                {!event.is_all_day && (
                                    <span className="text-[10px] opacity-75 whitespace-nowrap">
                                        {new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                )}
                                <span className="font-medium truncate">{event.title}</span>
                            </div>
                        </div>
                    ))}
                  
                    {/* Tasks */}
                    {/* ... (Existing Task Mapping) */}
                    {dayTasks.map(task => {
                       const isOverdue = isTaskOverdue(task);
                       const isDragging = draggedTask?.id === task.id;
                      return (
                        <div
                          key={task.id}
                          draggable={!task.completed}
                          onDragStart={(e) => handleTaskDragStart(e, task)}
                          onDragEnd={handleTaskDragEnd}
                          className={`p-2 rounded text-xs cursor-pointer transition-all ${
                            isDragging
                              ? 'opacity-50 transform rotate-1 scale-95'
                              : task.completed
                                ? 'bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 line-through'
                                : isOverdue
                                  ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                                  : 'bg-bg-tertiary text-text-primary hover:bg-bg-accent'
                          }`}
                          onClick={() => !isDragging && openTaskEdit(task as any)}
                        >
                           <div className="flex items-start gap-1">
                             <button
                               onClick={(e) => handleTaskComplete(task.id, e)}
                               className="mt-0.5 text-text-muted hover:text-green-600 dark:hover:text-green-400 transition-colors"
                             >
                                 {task.completed ? <CheckCircle2 size={16} className="text-green-600" /> : <Circle size={16} />}
                             </button>
                             <span className="flex-1 leading-tight">
                               {task.content}
                             </span>
                           </div>
                        </div>
                      );
                    })}
                    
                    {/* Drop zone */}
                     {isDragOver && dayTasks.length === 0 && (
                      <div className="p-2 border-2 border-dashed border-blue-400 rounded text-xs text-blue-600 dark:text-blue-400 text-center">
                        Drop task here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modals */}
        <AddCalendarModal 
            isOpen={isAddCalendarOpen}
            onClose={() => setIsAddCalendarOpen(false)}
            onSuccess={handleCalendarAdded}
        />
        
        <EventDetailModal
            isOpen={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            event={selectedEvent}
        />

      </div>
    </div>
  );
}