
"use client";

import React, { useEffect, useState } from 'react';
import { Task } from '../../types/v2';
import { TaskItem } from './TaskItem';
import { ListTodo, Plus, Filter, SortAsc, SortDesc, CheckCircle2, Circle } from 'lucide-react';
import { useTaskEdit } from '../../contexts/TaskEditContext';

import { ConfirmationModal } from '../modals/ConfirmationModal';

type StatusFilter = 'all' | 'todo' | 'done';
type SortOption = 'created' | 'dueDate' | 'oldest';

export default function AllTasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todo');
  const [sortOption, setSortOption] = useState<SortOption>('created');
  const [isLoading, setIsLoading] = useState(true);
  const { createTask } = useTaskEdit(); // Use context for creating tasks if needed, or simple inline
  
  const [confirmState, setConfirmState] = useState<{
    type: 'bulk' | 'completed' | null;
    isOpen: boolean;
  }>({ type: null, isOpen: false });

  // Inline creation state
  const [inputValue, setInputValue] = useState('');

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
          status: statusFilter,
          sort: sortOption
      });
      const res = await fetch(`/api/v2/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, sortOption]);

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
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to create task', error);
    }
  };

  const handleToggle = (id: number) => {
      // Optimistic update
      setTasks(prev => prev.map(t => {
          if (t.id === id) {
              const newStatus = t.status === 'done' ? 'todo' : 'done';
              return { ...t, status: newStatus };
          }
          return t;
      }));
      
      // We might need to refresh if filtering by status, but let's just toggle for now
      // Actually if we are in 'todo' view and mark done, it should disappear.
      if (statusFilter !== 'all') {
           setTimeout(() => {
               setTasks(prev => prev.filter(t => t.id !== id));
           }, 300); // Small delay for animation
      }

      // API Call
      // We need to fetch the current status first to toggle correctly? 
      // Or just send 'done' if we know it was todo?
      // Simplified: Just mark 'done' if it was todo. But what if unchecking?
      // TaskItem handles this usually but here we are managing state.
      // Let's rely on TaskItem's onToggle but we need to pass a handler.
       // Actually TaskItem calls onToggle with ID.
       
      // Determining new status:
      const task = tasks.find(t => t.id === id);
      const newStatus = task?.status === 'done' ? 'todo' : 'done';

      fetch(`/api/v2/tasks/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ status: newStatus })
      }).catch(() => fetchTasks());
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
      if (selectedTaskIds.size === tasks.length) {
          setSelectedTaskIds(new Set());
      } else {
          setSelectedTaskIds(new Set(tasks.map(t => t.id)));
      }
  };

  const handleBulkDelete = async () => {
      setConfirmState({ type: 'bulk', isOpen: true });
  };
  
  const performBulkDelete = async () => {
      const idsToDelete = Array.from(selectedTaskIds);
      
      // Update UI first
      setTasks(prev => prev.filter(t => !selectedTaskIds.has(t.id)));
      setSelectedTaskIds(new Set());

      // Perform deletions
      await Promise.all(idsToDelete.map(id => 
          fetch(`/api/v2/tasks?id=${id}`, { method: 'DELETE' })
      ));
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
            const data = await res.json();
            // Refresh
            fetchTasks();
            // Could show a toast here "Deleted ${data.count} tasks"
        }
    } catch (error) {
        console.error('Failed to bulk delete', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans">
      
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
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
                  checked={tasks.length > 0 && selectedTaskIds.size === tasks.length}
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
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 bg-bg-secondary rounded-2xl border border-dashed border-border-default">
            <div className="text-text-muted mb-2">No tasks found</div>
            <div className="text-sm text-text-muted opacity-70">
                {statusFilter === 'done' ? "Get to work!" : "You're all caught up."}
            </div>
          </div>
        ) : (
          tasks.map(task => (
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
