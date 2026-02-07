'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/types/v2';
import { startOfWeek, addDays, isSameDay, isBefore, startOfDay, format, isToday, isTomorrow, isPast } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Circle } from 'lucide-react';

interface WeeklyCalendarProps {
  onTaskSelect?: (task: Task) => void;
  onTaskComplete?: (taskId: number) => void;
}

export default function WeeklyCalendar({ onTaskSelect, onTaskComplete }: WeeklyCalendarProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [currentStart, setCurrentStart] = useState(startOfDay(new Date()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [currentStart]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Calculate end of the 7-day window
      const windowEnd = addDays(currentStart, 7);
      
      const [tasksRes, eventsRes] = await Promise.all([
        fetch('/api/v2/tasks'),
        fetch(`/api/v2/calendar/events?start=${currentStart.toISOString()}&end=${windowEnd.toISOString()}`)
      ]);

      if (tasksRes.ok) {
        setTasks(await tasksRes.json());
      }
      
      if (eventsRes.ok) {
        setEvents(await eventsRes.json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = async (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
        // Optimistic update
        setTasks(prev => prev.filter(t => t.id !== taskId));
        
        const response = await fetch(`/api/v2/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'done' })
        });
        
        if (response.ok) {
            onTaskComplete?.(taskId);
        } else {
            // Revert optimism if needed (simple app: fetch again or ignore)
            fetchData();
        }
    } catch (err) {
        console.error("Failed to complete task", err);
    }
  };

  const nextWeek = () => setCurrentStart(addDays(currentStart, 7));
  const prevWeek = () => setCurrentStart(addDays(currentStart, -7));
  const resetToToday = () => setCurrentStart(startOfDay(new Date()));

  // Filter Tasks
  const today = startOfDay(new Date());
  
  const overdueTasks = tasks.filter(task => 
    task.status !== 'done' && 
    task.due_date && 
    isBefore(new Date(task.due_date), today)
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentStart, i));

  const getItemsForDay = (date: Date) => {
    const dayTasks = tasks.filter(task => 
      task.status !== 'done' && 
      task.due_date && 
      isSameDay(new Date(task.due_date), date)
    );
    
    const dayEvents = events.filter(event => 
      isSameDay(new Date(event.start_time), date)
    );
    
    return { tasks: dayTasks, events: dayEvents };
  };

  const renderTaskCard = (task: Task, isOverdue = false) => (
    <div 
        key={`task-${task.id}`}
        onClick={() => onTaskSelect?.(task)}
        className={`group relative p-2 rounded-md border text-sm cursor-pointer transition-all hover:shadow-sm ${
            isOverdue 
            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' 
            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800'
        }`}
    >
        <div className="flex items-start gap-2">
            <button
                onClick={(e) => handleTaskComplete(task.id, e)}
                className={`mt-0.5 text-gray-300 hover:text-green-500 transition-colors ${isOverdue ? 'text-red-300 hover:text-red-500' : ''}`}
            >
                <Circle size={14} strokeWidth={2} />
            </button>
            <span className={`line-clamp-2 ${isOverdue ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-200'}`}>
                {task.content || 'Untitled Task'}
            </span>
        </div>
    </div>
  );
  
  const renderEventCard = (event: any) => (
    <div 
      key={`event-${event.id}`}
      className="p-1 px-2 rounded text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/30 mb-1"
    >
      <div className="flex items-center gap-1">
        <span className="text-[10px] opacity-75 whitespace-nowrap">
          {!event.is_all_day && format(new Date(event.start_time), 'h:mm a')}
        </span>
        <span className="font-medium truncate">{event.title}</span>
      </div>
    </div>
  );

  if (loading && tasks.length === 0 && events.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">Loading schedule...</div>;

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
                        className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                    >
                        Today
                    </button>
                )}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button onClick={prevWeek} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded shadow-sm"><ChevronLeft size={16} /></button>
                    <button onClick={nextWeek} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded shadow-sm"><ChevronRight size={16} /></button>
                </div>
            </div>
        </div>

        {/* Overdue Section */}
        {overdueTasks.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-4">
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

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 min-h-[300px]">
            {weekDays.map(day => {
                const { tasks: dayTasks, events: dayEvents } = getItemsForDay(day);
                const isTodayDate = isToday(day);
                
                return (
                    <div key={day.toISOString()} className={`flex flex-col gap-2 min-w-[140px] md:min-w-0 ${isTodayDate ? 'bg-blue-50/50 dark:bg-blue-900/5 rounded-xl -m-2 p-2 ring-1 ring-blue-100 dark:ring-blue-900/30' : ''}`}>
                        {/* Day Header */}
                        <div className="text-center md:text-left mb-1">
                            <div className={`text-xs font-medium uppercase tracking-wider ${isTodayDate ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                                {format(day, 'EEE')}
                            </div>
                            <div className={`text-lg font-bold ${isTodayDate ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'}`}>
                                {format(day, 'd')}
                            </div>
                        </div>

                        {/* Content List for Day */}
                        <div className="flex flex-col gap-2 flex-1">
                            {/* Events First */}
                            {dayEvents.length > 0 && (
                                <div className="flex flex-col gap-1">
                                    {dayEvents.map(e => renderEventCard(e))}
                                </div>
                            )}
                            
                            {/* Tasks */}
                            {dayTasks.map(t => renderTaskCard(t))}
                            
                            {/* Empty State */}
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
