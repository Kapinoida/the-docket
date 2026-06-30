
"use client";

import React, { useMemo, useState } from 'react';
import { Task } from '../../types';
import { TaskItem } from './TaskItem';
import { Plus, Inbox as InboxIcon, ArrowRight } from 'lucide-react';
import MoveToPageModal from './MoveToPageModal';
import { TaskListSkeleton } from './Skeleton';
import { PullToRefresh } from './PullToRefresh';
import { useSync } from '@/contexts/SyncContext';

export default function InboxView() {
  const { tasks, initialLoading, refetch, updateLocalTask, removeLocalTask } = useSync();
  const [inputValue, setInputValue] = useState('');

  // Move Logic
  const [movingTask, setMovingTask] = useState<Task | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  const inboxTasks = useMemo(
    () => tasks.filter(t => !t.page_name && t.status !== 'done' && t.content !== ''),
    [tasks]
  );

  const handleRefresh = async () => {
    await refetch();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    try {
      const res = await fetch('/api/v2/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: inputValue }),
      });

      if (res.ok) {
        const task = await res.json();
        setInputValue('');
        window.dispatchEvent(new CustomEvent('taskCreated', { detail: { task, source: 'inboxView' } }));
      }
    } catch (error) {
      console.error('Failed to create task', error);
    }
  };

  const handleToggle = (id: number) => {
      updateLocalTask(id, { status: 'done' });

      fetch(`/api/v2/tasks/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ status: 'done' })
      }).then(() => {
          window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { taskId: id, updates: { status: 'done' }, source: 'inboxView' } }));
      }).catch(() => refetch());
  };

const handleUpdate = async (id: number, updates: Partial<Task>) => {
      updateLocalTask(id, updates);

      try {
          await fetch(`/api/v2/tasks/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates)
          });
          window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { taskId: id, updates, source: 'inboxView' } }));
      } catch (error) {
          console.error('Failed to update task', error);
          refetch();
      }
  };

  const handleDelete = async (id: number) => {
      removeLocalTask(id);
      try {
          await fetch(`/api/v2/tasks/${id}`, { method: 'DELETE' });
          window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { taskId: id, source: 'inboxView' } }));
      } catch (error) {
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
          const res = await fetch(`/api/v2/tasks/${movingTask.id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ addToPageId: pageId })
          });

          if (res.ok) {
              setMovingTask(null);
              setIsMoveModalOpen(false);
              window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { taskId: movingTask.id, source: 'inboxView' } }));
          }
      } catch (e) {
          console.error("Failed to move task", e);
      }
  };

  return (
    <div className="mx-auto p-8 font-sans">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center gap-2 md:gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-lg">
            <InboxIcon size={24} />
          </div>
          Inbox
        </h1>
        <p className="text-text-secondary mt-2 ml-14">Capture thoughts without context.</p>
      </div>

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

      {/* Pull-to-refresh task list */}
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

      <MoveToPageModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onSelect={handleMoveToPage}
      />
    </div>
  );
}
