'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Task } from '@/types/v2';
import { X, GripVertical, CheckCircle2, Circle, Plus, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { parseLocalDateNode } from '@/lib/dateUtils';
import { v2TaskToLegacy } from '@/lib/calendar';
import { useTaskEdit } from '@/contexts/TaskEditContext';

interface UnscheduledTaskPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskScheduled?: () => void;
}

export function UnscheduledTaskPanel({ isOpen, onClose, onTaskScheduled }: UnscheduledTaskPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [showScheduled, setShowScheduled] = useState(false);
  const { openTaskEdit } = useTaskEdit();
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/v2/tasks');
      if (res.ok) setTasks(await res.json());
    } catch (e) {
      console.error('Failed to fetch tasks', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchTasks();
  }, [isOpen, fetchTasks]);

  const unscheduledTasks = tasks.filter(t => !t.due_date && t.status !== 'done');
  const scheduledTasks = tasks.filter(t => t.due_date && t.status !== 'done');

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddValue.trim()) return;
    try {
      const res = await fetch('/api/v2/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: quickAddValue.trim() }),
      });
      if (res.ok) {
        setQuickAddValue('');
        fetchTasks();
        inputRef.current?.focus();
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
      if (newStatus === 'done') setTimeout(() => fetchTasks(), 1500);
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

  const formatScheduledLabel = (dateStr: string | Date | null) => {
    if (!dateStr) return null;
    try {
      const date = parseLocalDateNode(dateStr) as Date;
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      if (isPast(date) && !isToday(date)) return `Overdue`;
      return format(date, 'MMM d');
    } catch { return null; }
  };

  const groupedScheduled = scheduledTasks.reduce((acc, task) => {
    const label = task.due_date ? formatScheduledLabel(task.due_date) || 'Someday' : 'No date';
    if (!acc[label]) acc[label] = [];
    acc[label].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const groupOrder = ['Overdue', 'Today', 'Tomorrow'];
  const sortedGroups = Object.entries(groupedScheduled).sort(([a], [b]) => {
    const ai = groupOrder.indexOf(a);
    const bi = groupOrder.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Quick Add */}
      <div className="px-3 pt-3 pb-2 border-b border-border-default">
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
          <Plus size={16} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={quickAddValue}
            onChange={(e) => setQuickAddValue(e.target.value)}
            placeholder="Add unscheduled task..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </form>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2 styled-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-text-muted">
            <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
            <p className="text-xs">Loading...</p>
          </div>
        ) : unscheduledTasks.length === 0 && scheduledTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-text-muted gap-2 opacity-60">
            <Calendar size={20} />
            <p className="text-xs">No tasks</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {unscheduledTasks.length > 0 && (
              <>
                <div className="flex items-center justify-between px-1 pt-1 pb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Unscheduled ({unscheduledTasks.length})
                  </span>
                </div>
                {unscheduledTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(task, e)}
                    onClick={() => handleTaskClick(task)}
                    className="flex items-start gap-2 p-2 rounded-md border border-border-default bg-bg-secondary hover:bg-bg-tertiary cursor-grab active:cursor-grabbing transition-all group"
                  >
                    <div className="mt-0.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <GripVertical size={14} />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggle(task.id); }}
                      className="mt-0.5 shrink-0 text-text-muted hover:text-green-500 transition-colors min-w-[20px] min-h-[20px] flex items-center justify-center"
                    >
                      <Circle size={14} />
                    </button>
                    <span className="text-sm text-text-primary line-clamp-2 flex-1 min-w-0">
                      {task.content || 'Untitled Task'}
                    </span>
                  </div>
                ))}
              </>
            )}

            {scheduledTasks.length > 0 && (
              <>
                <button
                  onClick={() => setShowScheduled(!showScheduled)}
                  className="flex items-center justify-between w-full px-1 pt-3 pb-1.5"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Scheduled ({scheduledTasks.length})
                  </span>
                  {showScheduled ? <ChevronUp size={12} className="text-text-muted" /> : <ChevronDown size={12} className="text-text-muted" />}
                </button>
                {showScheduled && sortedGroups.map(([label, groupTasks]) => (
                  <div key={label} className="mb-2">
                    <div className="px-1 pb-0.5">
                      <span className={`text-[10px] font-medium ${
                        label === 'Overdue' ? 'text-red-500' : label === 'Today' ? 'text-blue-500' : 'text-text-muted'
                      }`}>{label}</span>
                    </div>
                    {groupTasks.map(task => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(task, e)}
                        onClick={() => handleTaskClick(task)}
                        className="flex items-start gap-2 p-2 rounded-md border border-border-default bg-bg-secondary hover:bg-bg-tertiary cursor-grab active:cursor-grabbing transition-all group"
                      >
                        <div className="mt-0.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <GripVertical size={14} />
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggle(task.id); }}
                          className="mt-0.5 shrink-0 min-w-[20px] min-h-[20px] flex items-center justify-center"
                        >
                          {task.status === 'done' ? (
                            <CheckCircle2 size={14} className="text-green-500" />
                          ) : (
                            <Circle size={14} className="text-text-muted" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm text-text-primary line-clamp-1 ${task.status === 'done' ? 'line-through opacity-50' : ''}`}>
                            {task.content || 'Untitled Task'}
                          </p>
                          {task.due_date && (
                            <span className={`text-[10px] ${
                              label === 'Overdue' ? 'text-red-500' : 'text-text-muted'
                            }`}>
                              {format(parseLocalDateNode(task.due_date) as Date, 'MMM d, h:mm a')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Mobile bottom drawer version
export function UnscheduledTaskDrawer({ isOpen, onClose, onTaskScheduled }: UnscheduledTaskPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-bg-primary border-t border-border-default rounded-t-2xl shadow-2xl max-h-[60vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <h3 className="text-sm font-semibold text-text-primary">Tasks</h3>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <UnscheduledTaskPanel isOpen={true} onClose={onClose} onTaskScheduled={onTaskScheduled} />
        </div>
      </div>
    </>
  );
}