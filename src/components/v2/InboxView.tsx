
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Task, RecurrenceRule } from '../../types';
import { TaskItem } from './TaskItem';
import { Plus, Inbox as InboxIcon, ArrowRight, Play, SkipForward, CheckCircle, Calendar, ArrowRightCircle, Edit2, Trash2, X } from 'lucide-react';
import MoveToPageModal from './MoveToPageModal';
import { DatePickerPopover } from './DatePickerPopover';
import { TaskListSkeleton } from './Skeleton';
import { PullToRefresh } from './PullToRefresh';
import { useSync } from '@/contexts/SyncContext';
import { apiFetch, AuthError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useTaskEdit } from '@/contexts/TaskEditContext';

export default function InboxView() {
  const { tasks, initialLoading, refetch, updateLocalTask, removeLocalTask } = useSync();
  const { showToast } = useToast();
  const { openTaskEdit } = useTaskEdit();
  const [inputValue, setInputValue] = useState('');

  // Move Logic
  const [movingTask, setMovingTask] = useState<Task | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  // Processing mode state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedIds, setProcessedIds] = useState<Set<number>>(new Set());
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const scheduleButtonRef = useRef<HTMLButtonElement>(null);

  const inboxTasks = useMemo(
    () => tasks.filter(t => !t.page_name && t.status !== 'done' && t.content !== ''),
    [tasks]
  );

  const processingQueue = useMemo(
    () => inboxTasks.filter(t => !processedIds.has(t.id)),
    [inboxTasks, processedIds]
  );

  const currentTask = processingQueue[0] || null;
  const progress = {
    current: inboxTasks.length - processingQueue.length,
    total: inboxTasks.length
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    try {
      const task = await apiFetch<Task>('/api/v2/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: inputValue }),
      });

      setInputValue('');
      window.dispatchEvent(new CustomEvent('taskCreated', { detail: { task, source: 'inboxView' } }));
    } catch (error) {
      if (error instanceof AuthError) return;
      console.error('Failed to create task', error);
    }
  };

  const handleToggle = (id: number) => {
      updateLocalTask(id, { status: 'done' });

      apiFetch(`/api/v2/tasks/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ status: 'done' })
      }).then(() => {
          window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { taskId: id, updates: { status: 'done' }, source: 'inboxView' } }));
      }).catch((error) => {
          if (error instanceof AuthError) return;
          refetch();
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
          window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { taskId: id, updates, source: 'inboxView' } }));
      } catch (error) {
          if (error instanceof AuthError) return;
          console.error('Failed to update task', error);
          refetch();
      }
  };

  const handleDelete = async (id: number) => {
      removeLocalTask(id);
      try {
          await apiFetch(`/api/v2/tasks/${id}`, { method: 'DELETE' });
          window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { taskId: id, source: 'inboxView' } }));
      } catch (error) {
          if (error instanceof AuthError) return;
          console.error('Failed to delete task', error);
          refetch();
      }
  };

  const openMoveModal = (task: Task) => {
      setMovingTask(task);
      setIsMoveModalOpen(true);
  };

  const handleMoveToPage = async (pageId: number) => {
      if (!movingTask) return;

      try {
          await apiFetch(`/api/v2/tasks/${movingTask.id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ addToPageId: pageId })
          });

          setMovingTask(null);
          setIsMoveModalOpen(false);
          window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { taskId: movingTask.id, source: 'inboxView' } }));
          
          if (isProcessing) {
            setProcessedIds(prev => new Set(prev).add(movingTask.id));
          }
      } catch (e) {
          if (e instanceof AuthError) return;
          console.error("Failed to move task", e);
          showToast('Failed to move task', 'error');
      }
  };

  // Processing mode handlers
  const enterProcessingMode = () => {
    setIsProcessing(true);
    setProcessedIds(new Set());
  };

  const exitProcessingMode = () => {
    setIsProcessing(false);
    setProcessedIds(new Set());
    setShowSchedulePicker(false);
  };

  const advanceQueue = (taskId: number) => {
    setProcessedIds(prev => new Set(prev).add(taskId));
  };

  const handleDo = useCallback(() => {
    if (!currentTask) return;
    advanceQueue(currentTask.id);
  }, [currentTask]);

  const handleSkip = useCallback(() => {
    if (!currentTask) return;
    advanceQueue(currentTask.id);
  }, [currentTask]);

  const handleSchedule = useCallback(() => {
    if (!currentTask) return;
    setShowSchedulePicker(true);
  }, [currentTask]);

  const handleScheduleSelect = useCallback(async (date: Date | null, recurrence?: RecurrenceRule | null, endTime?: Date | null) => {
    if (!currentTask) return;
    
    setShowSchedulePicker(false);
    
    try {
      const updates: Partial<Task> = {
        due_date: date ? date.toISOString() : null,
        end_time: endTime ? endTime.toISOString() : null,
        recurrence_rule: recurrence || undefined
      };
      
      updateLocalTask(currentTask.id, updates);
      
      await apiFetch(`/api/v2/tasks/${currentTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      window.dispatchEvent(new CustomEvent('taskUpdated', { 
        detail: { taskId: currentTask.id, updates, source: 'inboxView' } 
      }));
      
      advanceQueue(currentTask.id);
    } catch (error) {
      if (error instanceof AuthError) return;
      console.error('Failed to schedule task', error);
      showToast('Failed to schedule task', 'error');
      refetch();
    }
  }, [currentTask, updateLocalTask, refetch, showToast]);

  const handleClarify = useCallback(() => {
    if (!currentTask) return;
    openTaskEdit(currentTask);
  }, [currentTask, openTaskEdit]);

  const handleDeleteTask = useCallback(async () => {
    if (!currentTask) return;
    
    const taskId = currentTask.id;
    removeLocalTask(taskId);
    
    try {
      await apiFetch(`/api/v2/tasks/${taskId}`, { method: 'DELETE' });
      window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { taskId, source: 'inboxView' } }));
      advanceQueue(taskId);
    } catch (error) {
      if (error instanceof AuthError) return;
      console.error('Failed to delete task', error);
      showToast('Failed to delete task', 'error');
      refetch();
    }
  }, [currentTask, removeLocalTask, refetch, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isProcessing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      const isEditable = activeElement?.tagName === 'INPUT' || 
                         activeElement?.tagName === 'TEXTAREA' || 
                         activeElement?.tagName === 'SELECT' ||
                         activeElement?.isContentEditable;
      
      if (isEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case 'j':
        case 'arrowdown':
          e.preventDefault();
          handleSkip();
          break;
        case 'k':
        case 'arrowup':
          e.preventDefault();
          break;
        case 'enter':
          e.preventDefault();
          handleClarify();
          break;
        case 'd':
          e.preventDefault();
          handleSchedule();
          break;
        case 'm':
          e.preventDefault();
          if (currentTask) {
            setMovingTask(currentTask);
            setIsMoveModalOpen(true);
          }
          break;
        case 'x':
          e.preventDefault();
          handleDeleteTask();
          break;
        case 'escape':
          e.preventDefault();
          exitProcessingMode();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, currentTask, handleSkip, handleClarify, handleSchedule, handleDeleteTask]);

  return (
    <div className="mx-auto p-8 font-sans">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center gap-2 md:gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-lg">
              <InboxIcon size={24} />
            </div>
            Inbox
          </h1>
          <p className="text-text-secondary mt-2 ml-14">Capture thoughts without context.</p>
        </div>
        
        {!isProcessing && inboxTasks.length > 0 && (
          <button
            onClick={enterProcessingMode}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Play size={16} />
            Process
          </button>
        )}
        
        {isProcessing && (
          <button
            onClick={exitProcessingMode}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <X size={16} />
            Exit
          </button>
        )}
      </div>

      {/* Processing Mode */}
      {isProcessing && (
        <div className="mb-8">
          {currentTask ? (
            <div className="bg-bg-secondary rounded-2xl border border-border-default p-6">
              {/* Progress */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-text-muted">
                  Needs a decision · {progress.current + 1} of {progress.total}
                </span>
                <span className="text-xs text-text-muted">
                  J/K to navigate · Enter to edit · D to schedule · M to move · X to delete · Esc to exit
                </span>
              </div>
              
              {/* Task Display */}
              <div className="mb-6">
                <div className="text-lg text-text-primary mb-2">{currentTask.content}</div>
                {currentTask.due_date && (
                  <div className="text-sm text-text-muted">
                    Due: {new Date(currentTask.due_date).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDo}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  <CheckCircle size={16} />
                  Keep Active
                </button>
                
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <SkipForward size={16} />
                  Skip
                </button>
                
                <div className="relative">
                  <button
                    ref={scheduleButtonRef}
                    onClick={handleSchedule}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Calendar size={16} />
                    Schedule
                  </button>
                  
                  {showSchedulePicker && (
                    <div className="absolute top-full left-0 mt-2 z-50">
                      <DatePickerPopover
                        date={currentTask.due_date ? new Date(currentTask.due_date) : null}
                        endTime={currentTask.end_time ? new Date(currentTask.end_time) : null}
                        recurrenceRule={currentTask.recurrence_rule}
                        onSelect={handleScheduleSelect}
                        onClose={() => setShowSchedulePicker(false)}
                        triggerRef={scheduleButtonRef}
                      />
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    setMovingTask(currentTask);
                    setIsMoveModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                >
                  <ArrowRightCircle size={16} />
                  Move
                </button>
                
                <button
                  onClick={handleClarify}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                  Clarify
                </button>
                
                <button
                  onClick={handleDeleteTask}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-bg-secondary rounded-2xl border border-dashed border-border-default">
              <div className="inline-block p-4 rounded-full bg-green-50 dark:bg-green-900/20 text-green-500 mb-3">
                <CheckCircle size={32} />
              </div>
              <div className="text-text-primary mb-2">All caught up!</div>
              <div className="text-sm text-text-muted mb-4">
                You&apos;ve processed all {progress.total} inbox items.
              </div>
              <button
                onClick={exitProcessingMode}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Back to List
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Add Input */}
      <form onSubmit={handleCreate} className="mb-8 relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
          <Plus size={20} />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add a task to inbox..."
          className="w-full pl-11 pr-4 py-4 bg-bg-primary border border-border-default rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-accent-blue transition-all text-lg placeholder:text-text-muted text-text-primary"
          autoFocus
        />
      </form>

      {/* Pull-to-refresh task list (only in normal mode) */}
      {!isProcessing && (
        <PullToRefresh onRefresh={handleRefresh} className="max-h-[50vh] md:max-h-none">
          <div className="space-y-3">
            {initialLoading ? (
              <TaskListSkeleton />
            ) : inboxTasks.length === 0 ? (
              <div className="text-center py-16 bg-bg-secondary rounded-2xl border border-dashed border-border-default">
                <div className="inline-block p-4 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 mb-3">
                    <InboxIcon size={32} />
                </div>
                <div className="text-text-muted mb-2">No tasks in Inbox</div>
                <div className="text-sm text-text-muted opacity-70">Enjoy your free time!</div>
              </div>
            ) : (
              inboxTasks.map(task => (
                <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onUpdate={(updates) => handleUpdate(task.id, updates)}
                    onMoveToPage={() => openMoveModal(task)}
                    onDelete={() => handleDelete(task.id)}
                    extraActions={
                        <button
                            onClick={() => openMoveModal(task)}
                            className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors ml-2 md:opacity-0 md:group-hover:opacity-100"
                            title="Move to Page"
                        >
                            <ArrowRight size={16} />
                        </button>
                    }
                />
              ))
            )}
          </div>
        </PullToRefresh>
      )}

      <MoveToPageModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onSelect={handleMoveToPage}
      />
    </div>
  );
}
