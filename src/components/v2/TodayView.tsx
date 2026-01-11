
"use client";

import React, { useEffect, useState } from 'react';
import { Task } from '../../types/v2';
import { TaskItem } from './TaskItem';
import { Clock, Plus, Calendar } from 'lucide-react';

export default function TodayView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/v2/tasks?due=today');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch today tasks', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    try {
      const today = new Date();
      const res = await fetch('/api/v2/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            content: inputValue,
            dueDate: today.toISOString() // Explicitly set due date to today
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
      // Optimistic update
      setTasks(prev => prev.filter(t => t.id !== id));
      
      // Actual API call
      fetch(`/api/v2/tasks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'done' })
      }).catch(err => {
          console.error("Failed to mark done", err);
          fetchTasks(); // Revert on error
      });
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
          fetchTasks(); 
      }
  };

  // Grouping Logic
  // Fix: Use local date comparison instead of UTC toISOString to avoid timezone bugs
  const toLocalDateStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const todayStr = toLocalDateStr(new Date());
  
  const overdueTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      const dueStr = toLocalDateStr(new Date(t.due_date));
      return dueStr < todayStr;
  });

  const todayTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      const dueStr = toLocalDateStr(new Date(t.due_date));
      return dueStr === todayStr;
  });

  return (
    <div className="max-w-3xl mx-auto p-8 font-sans">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
            <Clock size={24} />
          </div>
          Today
          <span className="text-lg font-normal text-text-muted ml-auto">
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

      {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading your day...</div>
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
                            />
                        ))}
                      </div>
                  </div>
              )}

              {/* Today Section */}
              <div className="space-y-3">
                   {/* Only show header if we have overdue tasks to distinguish, otherwise it's just The List */}
                  {overdueTasks.length > 0 && (
                      <div className="flex items-center gap-2 text-sm font-bold text-text-muted uppercase tracking-wide px-2">
                          <Calendar size={14} /> Today
                      </div>
                  )}
                  
                  {todayTasks.length === 0 && overdueTasks.length === 0 ? (
                       <div className="text-center py-16">
                           <div className="inline-block p-4 rounded-full bg-green-50 dark:bg-green-900/20 text-green-500 mb-3">
                               <InboxIcon size={32} />
                           </div>
                           <h3 className="text-text-primary font-medium">All caught up!</h3>
                           <p className="text-text-muted">No tasks due today.</p>
                       </div>
                  ) : (
                      todayTasks.map(task => (
                          <TaskItem 
                            key={task.id} 
                            task={task} 
                            onToggle={handleToggle} 
                            onUpdate={(updates) => handleUpdate(task.id, updates)}
                          />
                      ))
                  )}
              </div>
          </div>
      )}
    </div>
  );
}

function InboxIcon({ size }: any) {
    // Reusing the icon from lucide but renaming for local component usage if simpler
    return <Clock size={size} />; 
}
