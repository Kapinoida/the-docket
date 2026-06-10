
"use client";

import React, { useEffect, useState } from 'react';
import { Task } from '../../types/v2';
import { TaskItem } from './TaskItem';
import { Clock, Plus, Calendar } from 'lucide-react';
import DailyJournalEditor from './DailyJournalEditor';
import { parseLocalDateNode } from '@/lib/dateUtils';
import { TaskListSkeleton } from './Skeleton';
import { PullToRefresh } from './PullToRefresh';
import EventDetailModal from '../modals/EventDetailModal';

// Shared helper: generate color from hex
const eventColorStyle = (color?: string) => {
  const c = color || '#7c3aed';
  return { backgroundColor: `${c}18`, borderColor: `${c}40`, color: c };
};

export default function TodayView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/v2/tasks?due=today');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch today tasks', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const startISOString = startOfToday.toISOString();
      const endISOString = endOfToday.toISOString();

      const res = await fetch(`/api/v2/calendar/events?start=${startISOString}&end=${endISOString}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch today events', error);
    }
  };

  const fetchAll = async () => {
    await Promise.all([fetchTasks(), fetchEvents()]);
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Auto-poll every 30s for live updates
  useEffect(() => {
    const interval = setInterval(() => { fetchAll(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAll();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    try {
      const dueDate = new Date();
      dueDate.setHours(12, 0, 0, 0);

      const res = await fetch('/api/v2/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            content: inputValue,
            dueDate: dueDate.toISOString()
        }),
      });

      if (res.ok) {
        setInputValue('');
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to create task', error);
    }
  };

  const handleToggle = (id: number) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      
      fetch(`/api/v2/tasks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'done' })
      }).catch(err => {
          console.error("Failed to mark done", err);
          fetchTasks();
      });
  };

  const handleUpdate = async (id: number, updates: Partial<Task>) => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

      try {
          await fetch(`/api/v2/tasks/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates)
          });
      } catch (error) {
          console.error('Failed to update task', error);
          fetchTasks(); 
      }
  };

  const handleDelete = async (id: number) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      try {
          await fetch(`/api/v2/tasks/${id}`, { method: 'DELETE' });
      } catch (error) {
          console.error('Failed to delete task', error);
          fetchTasks();
      }
  };

  const getCalendarDateStr = (dateVal: Date | string) => {
      if (typeof dateVal === 'string') {
          return dateVal.split('T')[0];
      }
      const d = new Date(dateVal);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const todayStr = getCalendarDateStr(new Date());

  const overdueTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      const dueStr = getCalendarDateStr(t.due_date);
      return dueStr < todayStr;
  });

  const todayTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      const dueStr = getCalendarDateStr(t.due_date);
      return dueStr === todayStr;
  });

  const isTrulyAllDay = (event: any) => {
    if (event.is_all_day) return true;
    if (typeof event.start_time === 'string' && event.start_time.endsWith('T00:00:00.000Z')) {
        const dur = new Date(event.end_time).getTime() - new Date(event.start_time).getTime();
        if (dur === 24 * 60 * 60 * 1000) return true;
    }
    return false;
  };

  const todayEvents = events.filter(event => {
    const eventDate = isTrulyAllDay(event) ? (parseLocalDateNode(event.start_time) as Date) : new Date(event.start_time);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDay = new Date(eventDate);
    eventDay.setHours(0, 0, 0, 0);
    return eventDay.getTime() === today.getTime();
  });

  return (
    <div className="mx-auto px-4 py-6 md:p-8 font-sans">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center gap-2 md:gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
            <Clock size={20} />
          </div>
          Today
          <span className="text-base md:text-lg font-normal text-text-muted ml-auto">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </h1>
      </div>

      {/* Quick Add */}
      <form onSubmit={handleCreate} className="mb-10 relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-orange transition-colors">
          <Plus size={20} />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add a task for today..."
          className="w-full pl-11 pr-4 py-3 bg-bg-secondary border border-transparent rounded-xl focus:bg-bg-primary focus:border-accent-orange focus:ring-4 focus:ring-orange-500/10 transition-all outline-none text-lg placeholder:text-text-muted text-text-primary"
          autoFocus
        />
      </form>

      {/* Pull-to-refresh wrapper for task list */}
      <PullToRefresh onRefresh={handleRefresh} className="max-h-[50vh] md:max-h-none">
        {isLoading ? (
            <TaskListSkeleton />
        ) : (
            <div className="space-y-8">
                {/* Overdue Section */}
                {overdueTasks.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-red-500 uppercase tracking-wide px-2">
                            <Calendar size={14} /> Overdue
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-1 border border-red-100 dark:border-red-800">
                          {overdueTasks.map(task => (
                              <TaskItem 
                                  key={task.id} 
                                  task={task} 
                                  onToggle={handleToggle} 
                                  onUpdate={(updates) => handleUpdate(task.id, updates)}
                                  onDelete={() => handleDelete(task.id)}
                              />
                          ))}
                        </div>
                    </div>
                )}

                {/* Today Section */}
                <div className="space-y-3">
                    {overdueTasks.length > 0 && (
                        <div className="flex items-center gap-2 text-sm font-bold text-text-muted uppercase tracking-wide px-2">
                            <Calendar size={14} /> Today
                        </div>
                    )}
                    
                    {todayTasks.length === 0 && overdueTasks.length === 0 && todayEvents.length === 0 ? (
                         <div className="text-center py-8">
                             <div className="inline-block p-4 rounded-full bg-green-50 dark:bg-green-900/20 text-green-500 mb-3">
                                 <InboxIcon size={32} />
                             </div>
                             <h3 className="text-text-primary font-medium">All caught up!</h3>
                             <p className="text-text-muted">No tasks or events due today.</p>
                         </div>
                    ) : (
                        <>
                          {todayTasks.length > 0 && todayTasks.map(task => (
                              <TaskItem 
                                key={task.id} 
                                task={task} 
                                onToggle={handleToggle} 
                                onUpdate={(updates) => handleUpdate(task.id, updates)}
                                onDelete={() => handleDelete(task.id)}
                              />
                          ))}
                          
                          {todayEvents.length > 0 && (
                            <div className="space-y-3 mt-4">
                              <div className="flex items-center gap-2 text-sm font-bold text-text-muted uppercase tracking-wide px-2">
                                <Calendar size={14} /> Events
                              </div>
                              <div className="rounded-xl p-3 border border-gray-100 dark:border-gray-800">
                                {todayEvents.map(event => {
                                  const colors = eventColorStyle(event.calendar_color);
                                  return (
                                  <div
                                    key={`event-${event.id}`}
                                    onClick={() => setSelectedEvent(event)}
                                    className="p-2 px-3 rounded text-sm border mb-2 last:mb-0 cursor-pointer hover:opacity-80"
                                    style={{ backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, color: colors.color }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs opacity-75 whitespace-nowrap">
                                        {!isTrulyAllDay(event) && new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      <span className="font-medium truncate">{event.title}</span>
                                    </div>
                                  </div>
                                )})}
                              </div>
                            </div>
                          )}
                        </>
                    )}
                </div>
            </div>
        )}
      </PullToRefresh>

      {/* Daily Journal Section */}
      <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-8">
        <DailyJournalEditor />
      </div>

      <EventDetailModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
      />
    </div>
  );
}

function InboxIcon({ size }: any) {
    return <Clock size={size} />; 
}
