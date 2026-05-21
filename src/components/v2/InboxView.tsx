
"use client";

import React, { useEffect, useState } from 'react';
import { Task } from '../../types/v2';
import { TaskItem } from './TaskItem';
import { Plus, Inbox as InboxIcon, ArrowRight } from 'lucide-react';
import MoveToPageModal from './MoveToPageModal';

export default function InboxView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Move Logic
  const [movingTask, setMovingTask] = useState<Task | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  // Fetch tasks (Filtered: Context=none)
  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/v2/tasks?context=none');
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
  }, []);

  // Create Task
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
        fetchTasks(); // Refresh list
      }
    } catch (error) {
      console.error('Failed to create task', error);
    }
  };

  // Toggle Task
  const handleToggle = (id: number) => {
      // Optimistic
      setTasks(prev => prev.filter(t => t.id !== id));
      
      // API
      fetch(`/api/v2/tasks/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ status: 'done' }) // Assuming inbox tasks are todo
      }).catch(() => fetchTasks());
  };

  const handleUpdate = async (id: number, updates: Partial<Task>) => {
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

      try {
          await fetch(`/api/v2/tasks/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates)
          });
      } catch (error) {
          console.error('Failed to update task', error);
          fetchTasks(); // Revert
      }
  };
  
  const openMoveModal = (task: Task) => {
      setMovingTask(task);
      setIsMoveModalOpen(true);
  };

  const handleMoveToPage = async (pageId: number) => {
      if (!movingTask) return;
      
      try {
          // Link task to page (which removes it from "context=none" Inbox view)
          const res = await fetch(`/api/v2/tasks/${movingTask.id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ addToPageId: pageId })
          });
          
          if (res.ok) {
              setMovingTask(null);
              setIsMoveModalOpen(false);
              fetchTasks(); // Refresh to remove moved task
          }
      } catch (e) {
          console.error("Failed to move task", e);
      }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 font-sans">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
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

      {/* Task List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 bg-bg-secondary rounded-2xl border border-dashed border-border-default">
            <div className="text-text-muted mb-2">No tasks in Inbox</div>
            <div className="text-sm text-text-muted opacity-70">Enjoy your free time!</div>
          </div>
        ) : (
          tasks.map(task => (
            <TaskItem 
                key={task.id} 
                task={task} 
                onToggle={handleToggle} 
                onUpdate={(updates) => handleUpdate(task.id, updates)}
                extraActions={
                    <button 
                        onClick={() => openMoveModal(task)}
                        className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors ml-2 opacity-0 group-hover:opacity-100"
                        title="Move to Page"
                    >
                        <ArrowRight size={16} />
                    </button>
                }
            />
          ))
        )}
      </div>
      
      <MoveToPageModal 
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onSelect={handleMoveToPage}
      />
    </div>
  );
}
