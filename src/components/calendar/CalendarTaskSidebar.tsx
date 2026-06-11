'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task } from '@/types/v2';
import { X, Calendar, GripVertical, CheckCircle2, Circle, Plus } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { parseLocalDateNode } from '@/lib/dateUtils';
import { v2TaskToLegacy } from '@/lib/calendar';
import { useTaskEdit } from '@/contexts/TaskEditContext';

interface CalendarTaskSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalendarTaskSidebar({ isOpen, onClose }: CalendarTaskSidebarProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [quickAddDate, setQuickAddDate] = useState<'today' | 'tomorrow' | 'none'>('today');
  const { openTaskEdit } = useTaskEdit();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v2/tasks');
      if (res.ok) {
        setTasks(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch tasks', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchTasks();
  }, [isOpen, fetchTasks]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddValue.trim()) return;

    const dueDate = new Date();
    if (quickAddDate === 'today') {
      dueDate.setHours(12, 0, 0, 0);
    } else if (quickAddDate === 'tomorrow') {
      dueDate.setDate(dueDate.getDate() + 1);
      dueDate.setHours(12, 0, 0, 0);
    }

    try {
      const res = await fetch('/api/v2/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: quickAddValue.trim(),
          ...(quickAddDate !== 'none' ? { dueDate: dueDate.toISOString() } : {}),
        }),
      });
      if (res.ok) {
        setQuickAddValue('');
        fetchTasks();
      }
    } catch (e) {
      console.error('Failed to create task', e);
    }
  };

  const handleToggle = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await fetch(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (newStatus === 'done') {
        setTimeout(() => fetchTasks(), 1500);
      }
    } catch {
      fetchTasks();
    }
  };

  const handleDragStart = (task: Task, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `task-${task.id}`);
    e.dataTransfer.setData('application/task-id', String(task.id));
  };

  const handleTaskClick = (task: Task) => {
    openTaskEdit(v2TaskToLegacy(task));
  };

  const incompleteTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');

  incompleteTasks.sort((a, b) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const aDate = a.due_date ? parseLocalDateNode(a.due_date) as Date : null;
    const bDate = b.due_date ? parseLocalDateNode(b.due_date) as Date : null;

    const aOverdue = aDate && isPast(aDate) && !isToday(aDate) ? 0 : 1;
    const bOverdue = bDate && isPast(bDate) && !isToday(bDate) ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;

    const aToday = aDate && isToday(aDate) ? 0 : 1;
    const bToday = bDate && isToday(bDate) ? 0 : 1;
    if (aToday !== bToday) return aToday - bToday;

    const aTomorrow = aDate && isTomorrow(aDate) ? 0 : 1;
    const bTomorrow = bDate && isTomorrow(bDate) ? 0 : 1;
    if (aTomorrow !== bTomorrow) return aTomorrow - bTomorrow;

    if (aDate && bDate) return aDate.getTime() - bDate.getTime();
    if (aDate) return -1;
    if (bDate) return 1;
    return 0;
  });

  const formatDueLabel = (dateStr: string | Date | null) => {
    if (!dateStr) return null;
    try {
      const date = parseLocalDateNode(dateStr) as Date;
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      if (isPast(date) && !isToday(date)) return `Overdue · ${format(date, 'MMM d')}`;
      return format(date, 'MMM d');
    } catch {
      return null;
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 bottom-0 left-0 md:top-0 md:left-auto md:w-[360px] bg-bg-primary border-l border-border-default shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default shrink-0">
          <h2 className="text-base font-semibold text-text-primary">Tasks</h2>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-bg-tertiary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Add */}
        <form onSubmit={handleQuickAdd} className="px-3 pt-3 pb-2 border-b border-border-default">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-text-muted shrink-0" />
            <input
              type="text"
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              placeholder="Quick add task..."
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            />
            <select
              value={quickAddDate}
              onChange={(e) => setQuickAddDate(e.target.value as any)}
              className="text-[10px] px-1.5 py-0.5 rounded border border-border-default bg-bg-secondary text-text-muted"
            >
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="none">No date</option>
            </select>
          </div>
        </form>

        <div className="flex-1 overflow-y-auto p-3 styled-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
              <div className="w-5 h-5 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
              <p className="text-xs">Loading...</p>
            </div>
          ) : incompleteTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2 opacity-60">
              <Calendar size={24} />
              <p className="text-xs">No tasks found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {incompleteTasks.map(task => {
                const dueLabel = formatDueLabel(task.due_date);
                const isOverdue = task.due_date && (() => {
                  const d = parseLocalDateNode(task.due_date) as Date;
                  return isPast(d) && !isToday(d);
                })();

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(task, e)}
                    onClick={() => handleTaskClick(task)}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border bg-bg-secondary hover:bg-bg-tertiary cursor-grab active:cursor-grabbing transition-all group ${
                      isOverdue ? 'border-red-200 dark:border-red-900/40' : 'border-border-default'
                    }`}
                  >
                    <div className="mt-0.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <GripVertical size={14} />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggle(task.id); }}
                      className="mt-0.5 shrink-0 text-text-muted hover:text-green-500 transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center"
                    >
                      <Circle size={16} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary leading-snug">{task.content || 'Untitled Task'}</p>
                      {dueLabel && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-px rounded border ${
                            isOverdue ? 'border-red-300 dark:border-red-800 text-red-600 dark:text-red-400' : 'border-border-default text-text-muted'
                          }`}>
                            <Calendar size={10} />
                            {dueLabel}
                          </span>
                        </div>
                      )}
                      {task.page_name && (
                        <span className="inline-block text-[10px] px-1.5 py-px rounded bg-gray-100 dark:bg-gray-800 text-text-muted mt-1">
                          {task.page_name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {completedTasks.length > 0 && (
                <>
                  <div className="pt-3 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Completed ({completedTasks.length})</span>
                  </div>
                  {completedTasks.slice(0, 5).map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border-default bg-bg-secondary opacity-60 hover:opacity-80 transition-all"
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggle(task.id); }}
                        className="mt-0.5 shrink-0 min-w-[24px] min-h-[24px] flex items-center justify-center"
                      >
                        <CheckCircle2 size={16} className="text-green-500" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-muted leading-snug line-through">{task.content || 'Untitled Task'}</p>
                      </div>
                    </div>
                  ))}
                  {completedTasks.length > 5 && (
                    <p className="text-xs text-text-muted text-center py-1">+ {completedTasks.length - 5} more completed</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}