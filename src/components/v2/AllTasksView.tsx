"use client";

import React, { useMemo, useState } from 'react';
import { Task } from '../../types';
import { TaskItem } from './TaskItem';
import { ListTodo, Plus, CheckCircle2, Circle } from 'lucide-react';
import { useSync } from '@/contexts/SyncContext';

import { ConfirmationModal } from '../modals/ConfirmationModal';
import { usePersistedState } from '../../lib/usePersistedState';
import { TaskListSkeleton } from './Skeleton';

type StatusFilter = 'all' | 'todo' | 'done';
type SortOption = 'created' | 'dueDate' | 'oldest';

export default function AllTasksView() {
  const { tasks, initialLoading, refetch, updateLocalTask, removeLocalTask } = useSync();
  const [statusFilter, setStatusFilter] = usePersistedState<StatusFilter>('tasks_status_filter', 'todo');
  const [sortOption, setSortOption] = usePersistedState<SortOption>('tasks_sort_option', 'created');
  

  const [confirmState, setConfirmState] = useState<{
    type: 'bulk' | 'completed' | null;
    isOpen: boolean;
  }>({ type: null, isOpen: false });

  // Inline creation state
  const [inputValue, setInputValue] = useState('');

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => t.content !== '');

    if (statusFilter === 'todo') {
      result = result.filter(t => t.status !== 'done');
    } else if (statusFilter === 'done') {
      result = result.filter(t => t.status === 'done');
    }

    if (sortOption === 'created') {
      result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOption === 'oldest') {
      result = [...result].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortOption === 'dueDate') {
      result = [...result].sort((a, b) => {
        const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        if (aDue !== bDue) return aDue - bDue;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }

    return result;
  }, [tasks, statusFilter, sortOption]);

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
        setInputValue('');
        window.dispatchEvent(new CustomEvent('taskCreated', { detail: { source: 'allTasksView' } }));
      }
    } catch (error) {
      console.error('Failed to create task', error);
    }
  };

  const handleToggle = (id: number) => {
      const task = tasks.find(t => t.id === id);
      const newStatus = task?.status === 'done' ? 'todo' : 'done';
      updateLocalTask(id, { status: newStatus });

      fetch(`/api/v2/tasks/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ status: newStatus })
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
      } catch (error) {
          console.error('Failed to update task', error);
          refetch();
      }
  };


  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const isSelectionMode = selectedTaskIds.size > 0;

  const handleSelect = (id: number, selected: boolean) => {
      const newSet = new Set(selectedTaskIds);
      if (selected) {
          newSet.add(id);
      } else {
          newSet.delete(id);
      }
      setSelectedTaskIds(newSet);
  };

  const handleSelectAll = () => {
      if (selectedTaskIds.size === filteredTasks.length) {
          setSelectedTaskIds(new Set());
      } else {
          setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
      }
  };

  const handleBulkDelete = async () => {
      setConfirmState({ type: 'bulk', isOpen: true });
  };

  const performBulkDelete = async () => {
      const idsToDelete = Array.from(selectedTaskIds);

      idsToDelete.forEach(id => removeLocalTask(id));
      setSelectedTaskIds(new Set());

      await Promise.all(idsToDelete.map(id =>
          fetch(`/api/v2/tasks?id=${id}`, { method: 'DELETE' })
      ));
      window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { source: 'allTasksView' } }));
  };

  const handleDeleteCompleted = async () => {
    const completedCount = tasks.filter(t => t.status === 'done').length;
    if (completedCount === 0) return;

    setConfirmState({ type: 'completed', isOpen: true });
  };

  const performDeleteCompleted = async () => {

    try {
        const res = await fetch('/api/v2/tasks?bulk_action=delete_completed', {
            method: 'DELETE'
        });

        if (res.ok) {
            await res.json();
            window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { source: 'allTasksView' } }));
        }
    } catch (error) {
        console.error('Failed to bulk delete', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:p-8 font-sans">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center gap-2 md:gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                <ListTodo size={24} />
            </div>
            All Tasks
            </h1>
            <p className="text-text-secondary mt-2 ml-14">Manage everything in one place.</p>
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-2">
            {isSelectionMode ? (
                <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
                >
                    Delete Selected ({selectedTaskIds.size})
                </button>
            ) : (
                 // Only show if there are completed tasks
                 tasks.some(t => t.status === 'done') && (
                    <button
                        onClick={handleDeleteCompleted}
                        className="px-4 py-2 bg-gray-100 hover:bg-rose-100 text-text-secondary hover:text-rose-600 dark:bg-gray-800 dark:hover:bg-rose-900/20 rounded-lg font-medium transition-colors text-sm flex items-center gap-2 border border-transparent hover:border-rose-200"
                    >
                        Delete Completed
                    </button>
                 )
            )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-bg-secondary rounded-xl border border-border-default">

          {/* Select All Checkbox */}
          <div className="flex items-center gap-2 mr-4">
              <input
                  type="checkbox"
                  checked={filteredTasks.length > 0 && selectedTaskIds.size === filteredTasks.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-text-secondary">Select All</span>
          </div>

          <div className="h-6 w-px bg-border-subtle mx-2" />

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-bg-primary rounded-lg p-1 border border-border-subtle">
              <button
                onClick={() => setStatusFilter('todo')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${statusFilter === 'todo' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              >
                  <Circle size={14} /> To Do
              </button>
              <button
                onClick={() => setStatusFilter('done')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${statusFilter === 'done' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              >
                  <CheckCircle2 size={14} /> Done
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-gray-100 dark:bg-gray-800 text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              >
                  All
              </button>
          </div>

          <div className="h-6 w-px bg-border-subtle mx-2" />

          {/* Sort */}
          <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Sort:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-bg-primary border border-border-subtle text-text-primary text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5"
              >
                  <option value="created">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="dueDate">Due Date</option>
              </select>
          </div>
      </div>

      {/* Quick Add (Only visible in Todo/All modes) */}
      {statusFilter !== 'done' && (
        <form onSubmit={handleCreate} className="mb-8 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
            <Plus size={20} />
            </div>
            <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Add a new task..."
            className="w-full pl-11 pr-4 py-3 bg-bg-secondary border border-transparent rounded-xl focus:bg-bg-primary focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-lg placeholder:text-text-muted text-text-primary"
            />
        </form>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {initialLoading ? (
          <TaskListSkeleton />
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16 bg-bg-secondary rounded-2xl border border-dashed border-border-default">
            <div className="inline-block p-4 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-500 mb-3">
                <ListTodo size={32} />
            </div>
            <div className="text-text-muted mb-2">No tasks found</div>
            <div className="text-sm text-text-muted opacity-70">
                {statusFilter === 'done' ? "Get to work!" : "You're all caught up."}
            </div>
          </div>
        ) : (
          filteredTasks.map(task => (
            <TaskItem
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onUpdate={(updates) => handleUpdate(task.id, updates)}
                isSelected={selectedTaskIds.has(task.id)}
                onSelect={handleSelect}
            />
          ))
        )}
      </div>
      <ConfirmationModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
        onConfirm={() => {
            if (confirmState.type === 'bulk') performBulkDelete();
            if (confirmState.type === 'completed') performDeleteCompleted();
        }}
        title={confirmState.type === 'bulk' ? 'Delete Selected Tasks' : 'Delete Completed Tasks'}
        message={
            confirmState.type === 'bulk'
            ? `Are you sure you want to delete ${selectedTaskIds.size} tasks?`
            : 'Are you sure you want to delete all completed tasks? This cannot be undone.'
        }
        confirmLabel="Delete"
      />
    </div>
  );
}