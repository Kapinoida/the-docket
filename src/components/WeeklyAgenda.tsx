'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/types/v2';
import { Calendar as CalendarIcon } from 'lucide-react';

interface CalendarEvent {
  id: string | number;
  title: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location?: string;
  calendar_name?: string;
  type: 'event';
}

type AgendaItem = (Task & { type: 'task' }) | CalendarEvent;

interface WeeklyAgendaProps {
  onTaskSelect?: (task: Task) => void;
  onTaskComplete?: (taskId: number) => void;
}

export default function WeeklyAgenda({ onTaskSelect, onTaskComplete }: WeeklyAgendaProps) {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyData();
  }, []);

  const fetchWeeklyData = async () => {
    try {
      const now = new Date();
      // Start of week (Sunday)
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      // End of week (next Sunday)
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [tasksRes, eventsRes] = await Promise.all([
        fetch('/api/v2/tasks'),
        fetch(`/api/v2/calendar/events?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`)
      ]);

      let weeklyItems: AgendaItem[] = [];

      // Process Tasks
      if (tasksRes.ok) {
        const allTasks: Task[] = await tasksRes.json();
        const taskItems = allTasks
          .filter(task => {
            if (task.status === 'done') return false;
            if (!task.due_date) return false;
            const dueDate = new Date(task.due_date);
            return dueDate <= weekEnd; // Include overdue
          })
          .map(t => ({ ...t, type: 'task' as const }));
        weeklyItems = [...weeklyItems, ...taskItems];
      }

      // Process Events
      if (eventsRes.ok) {
        const events: any[] = await eventsRes.json();
        const eventItems = events.map((e: any) => ({
          ...e,
          type: 'event' as const
        }));
        weeklyItems = [...weeklyItems, ...eventItems];
      }

      // Sort by date/time
      weeklyItems.sort((a, b) => {
        const dateA = a.type === 'task' ? new Date(a.due_date!) : new Date(a.start_time);
        const dateB = b.type === 'task' ? new Date(b.due_date!) : new Date(b.start_time);
        return dateA.getTime() - dateB.getTime();
      });
        
      setItems(weeklyItems);
    } catch (error) {
      console.error('Error fetching weekly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = async (taskId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const response = await fetch(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
      });
      
      if (response.ok) {
        setItems(prev => prev.filter(item => item.id !== taskId));
        onTaskComplete?.(taskId);
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const formatTime = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return 'Today';
    
    // Check if tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-bg-tertiary animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <p>No items scheduled for this week</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
      {items.map(item => {
        if (item.type === 'task') {
          const isOverdue = item.due_date ? new Date(item.due_date) < new Date() && new Date(item.due_date).toDateString() !== new Date().toDateString() : false;
          
          return (
            <div 
              key={`task-${item.id}`}
              className={`p-3 rounded-lg border transition-colors ${
                isOverdue 
                  ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' 
                  : 'border-border-subtle hover:bg-bg-tertiary'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={(e) => handleTaskComplete(item.id, e as any)}
                  className="w-4 h-4 text-accent-green bg-bg-primary border-border-default rounded focus:ring-accent-green focus:ring-2 mt-0.5"
                  title="Mark as complete"
                />
                <div 
                  className="flex-1 min-w-0 cursor-pointer -m-1 p-1 rounded"
                  onClick={() => onTaskSelect?.(item)}
                >
                  <p className={`text-sm font-medium truncate ${
                    isOverdue ? 'text-red-800 dark:text-red-200' : 'text-text-primary'
                  }`}>
                    {item.content}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      isOverdue 
                        ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200' 
                        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    }`}>
                      {isOverdue ? 'Overdue' : formatDate(item.due_date!)}
                    </span>
                    {item.context ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 max-w-[150px] truncate" title={`From: ${item.context.title}`}>
                        {item.context.title}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        Inbox
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          // Event
          return (
            <div 
              key={`event-${item.id}`}
              className="p-3 rounded-lg border border-border-subtle hover:bg-bg-tertiary transition-colors flex items-start gap-3"
            >
               <div className="mt-0.5 p-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
                 <CalendarIcon size={14} />
               </div>
               <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">
                        {formatDate(item.start_time)}
                    </span>
                    <span>•</span>
                    <span>
                      {item.is_all_day ? 'All Day' : `${formatTime(item.start_time)} - ${formatTime(item.end_time)}`}
                    </span>
                    {item.location && (
                        <>
                            <span>•</span>
                            <span className="truncate max-w-[100px]">{item.location}</span>
                        </>
                    )}
                  </div>
               </div>
            </div>
          );
        }
      })}
    </div>
  );
}