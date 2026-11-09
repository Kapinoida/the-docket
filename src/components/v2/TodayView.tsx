"use client";

import React, { useState } from 'react';
import { Task } from '../../types';
import { CalendarEvent, isTrulyAllDay } from '@/lib/calendar';
import { EventCard } from '@/components/calendar/EventCard';
import { useSync } from '@/contexts/SyncContext';
import { TaskItem } from './TaskItem';
import { Clock, Calendar, Flag } from 'lucide-react';
import DailyJournalEditor from './DailyJournalEditor';
import { parseLocalDateNode } from '@/lib/dateUtils';
import { TaskListSkeleton } from './Skeleton';
import { PullToRefresh } from './PullToRefresh';
import EventDetailModal from '../modals/EventDetailModal';
import { apiFetch, AuthError } from '@/lib/api';
import { groupTasksByCommitment, sortTodayTasks } from '@/lib/todayPlanning';
import TaskCaptureInput from './TaskCaptureInput';

export default function TodayView() {
  const { tasks, events, initialLoading, refetch, updateLocalTask, removeLocalTask } = useSync();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleToggle = (id: number) => {
      const task = tasks.find(t => t.id === id);
      const newStatus = task?.status === 'done' ? 'todo' : 'done';
      updateLocalTask(id, { status: newStatus });
      apiFetch(`/api/v2/tasks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
      }).then(() => {
          window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { taskId: id, updates: { status: newStatus }, source: 'todayView' } }));
      }).catch(err => {
          if (err instanceof AuthError) { return; }
          console.error("Failed to mark done", err);
      });
  };

  const handleUpdate = async (id: number, updates: Partial<Task>) => {
      updateLocalTask(id, updates);
      try {
          await apiFetch(`/api/v2/tasks/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates)
          });
          window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { taskId: id, updates, source: 'todayView' } }));
      } catch (error) {
          if (error instanceof AuthError) { return; }
          console.error('Failed to update task', error);
          refetch();
      }
  };

  const handleDelete = async (id: number) => {
      removeLocalTask(id);
      try {
          await apiFetch(`/api/v2/tasks/${id}`, { method: 'DELETE' });
          window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { taskId: id, source: 'todayView' } }));
      } catch (error) {
          if (error instanceof AuthError) { return; }
          console.error('Failed to delete task', error);
          refetch();
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
      if (!t.due_date || t.status === 'done' || t.status === 'someday') return false;
      const dueStr = getCalendarDateStr(t.due_date);
      return dueStr < todayStr;
  });

  const todayTasks = tasks.filter(t => {
      if (!t.due_date || t.status === 'done' || t.status === 'someday') return false;
      const dueStr = getCalendarDateStr(t.due_date);
      return dueStr === todayStr;
  });

  const groupedTodayTasks = groupTasksByCommitment(todayTasks);
  const mustTasks = sortTodayTasks(groupedTodayTasks.must);
  const shouldTasks = sortTodayTasks(groupedTodayTasks.should);
  const couldTasks = sortTodayTasks(groupedTodayTasks.could);
  const unassignedTasks = sortTodayTasks(groupedTodayTasks.unassigned);

  const todayEvents = events.filter(event => {
    const eventDate = isTrulyAllDay(event) ? (parseLocalDateNode(event.start_time) as Date) : new Date(event.start_time);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const eventDay = new Date(eventDate);
    eventDay.setHours(0, 0, 0, 0);
    return eventDay.getTime() === todayDate.getTime();
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
      {/* Quick Add Input */}
      <div className="mb-10">
        <TaskCaptureInput
          source="today"
          placeholder="Add a task for today..."
          autoFocus
          className="group-focus-within:bg-bg-primary group-focus-within:border-accent-orange group-focus-within:ring-4 group-focus-within:ring-orange-500/10 text-lg"
        />
      </div>

      {/* Pull-to-refresh wrapper for task list */}
      <PullToRefresh onRefresh={handleRefresh} className="max-h-[50vh] md:max-h-none">
        {initialLoading ? (
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
                          {/* Must Section */}
                          {mustTasks.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-bold text-red-500 uppercase tracking-wide px-2">
                                <Flag size={14} /> Must
                              </div>
                              <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-1 border border-red-100 dark:border-red-800/30">
                                {mustTasks.map(task => (
                                  <TaskItem 
                                    key={task.id} 
                                    task={task} 
                                    onToggle={handleToggle} 
                                    onUpdate={(updates) => handleUpdate(task.id, updates)}
                                    onDelete={() => handleDelete(task.id)}
                                    showCommitment={true}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Should Section */}
                          {shouldTasks.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-bold text-orange-500 uppercase tracking-wide px-2">
                                <Flag size={14} /> Should
                              </div>
                              <div className="bg-orange-50 dark:bg-orange-900/10 rounded-2xl p-1 border border-orange-100 dark:border-orange-800/30">
                                {shouldTasks.map(task => (
                                  <TaskItem 
                                    key={task.id} 
                                    task={task} 
                                    onToggle={handleToggle} 
                                    onUpdate={(updates) => handleUpdate(task.id, updates)}
                                    onDelete={() => handleDelete(task.id)}
                                    showCommitment={true}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Could Section */}
                          {couldTasks.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-bold text-blue-500 uppercase tracking-wide px-2">
                                <Flag size={14} /> Could
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-1 border border-blue-100 dark:border-blue-800/30">
                                {couldTasks.map(task => (
                                  <TaskItem 
                                    key={task.id} 
                                    task={task} 
                                    onToggle={handleToggle} 
                                    onUpdate={(updates) => handleUpdate(task.id, updates)}
                                    onDelete={() => handleDelete(task.id)}
                                    showCommitment={true}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Unassigned Section */}
                          {unassignedTasks.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-bold text-text-muted uppercase tracking-wide px-2">
                                <Flag size={14} /> Unassigned
                              </div>
                              {unassignedTasks.map(task => (
                                <TaskItem 
                                  key={task.id} 
                                  task={task} 
                                  onToggle={handleToggle} 
                                  onUpdate={(updates) => handleUpdate(task.id, updates)}
                                  onDelete={() => handleDelete(task.id)}
                                  showCommitment={true}
                                />
                              ))}
                            </div>
                          )}
                          
                          {todayEvents.length > 0 && (
                            <div className="space-y-3 mt-4">
                              <div className="flex items-center gap-2 text-sm font-bold text-text-muted uppercase tracking-wide px-2">
                                <Calendar size={14} /> Events
                              </div>
                              <div className="rounded-xl p-3 border border-gray-100 dark:border-gray-800">
                                {todayEvents.map(event => (
                                  <EventCard key={`event-${event.id}`} event={event} onClick={() => setSelectedEvent(event)} />
                                ))}
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
        event={selectedEvent as any}
      />
    </div>
  );
}

function InboxIcon({ size }: any) {
    return <Clock size={size} />; 
}