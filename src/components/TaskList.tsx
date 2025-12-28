'use client';

import { useState, useEffect } from 'react';
import { TaskInstance } from '@/types';
import TaskItem from './TaskItem';
import { Plus } from 'lucide-react';

interface TaskListProps {
  folderId?: string;
  onTaskEdit?: (task: TaskInstance) => void;
  onTaskCreate?: (folderId?: string) => void;
  refreshTrigger?: number;
  showCreateButton?: boolean;
  title?: string;
}

export default function TaskList({ 
  folderId, 
  onTaskEdit, 
  onTaskCreate, 
  refreshTrigger, 
  showCreateButton = true,
  title = "Tasks"
}: TaskListProps) {
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchTasks();
    }
  }, [mounted, folderId, refreshTrigger]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = folderId ? `/api/tasks?folderId=${folderId}` : '/api/tasks';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        throw new Error('Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });

      if (response.ok) {
        // Update local state
        setTasks(prev => prev.map(task => 
          task.id === taskId 
            ? { ...task, completed, completedAt: completed ? new Date() : undefined }
            : task
        ));
      } else {
        throw new Error('Failed to update task');
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
      alert('Failed to update task');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTasks(prev => prev.filter(task => task.id !== taskId));
        // Dispatch taskDeleted event for sync
        window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { taskId } }));
      } else {
        throw new Error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  // Group tasks by status
  const incompleteTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 dark:text-gray-400">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 dark:text-red-400">{error}</div>
        <button 
          onClick={fetchTasks}
          className="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {title} ({tasks.length})
        </h3>
        {showCreateButton && (
          <button
            onClick={() => onTaskCreate?.(folderId)}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        )}
      </div>

      {/* Task Lists */}
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            No tasks yet
          </div>
          {showCreateButton && (
            <button
              onClick={() => onTaskCreate?.(folderId)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Create your first task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Incomplete Tasks */}
          {incompleteTasks.length > 0 && (
            <div className="space-y-2">
              {incompleteTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onEdit={onTaskEdit || (() => {})}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-6">
                Completed ({completedTasks.length})
              </div>
              {completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onEdit={onTaskEdit || (() => {})}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}