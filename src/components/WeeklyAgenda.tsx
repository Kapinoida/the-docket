'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/types/v2';
import { isTaskOverdue, formatTaskDate } from '@/lib/taskParser';

interface WeeklyAgendaProps {
  onTaskSelect?: (task: Task) => void;
  onTaskComplete?: (taskId: number) => void;
}

export default function WeeklyAgenda({ onTaskSelect, onTaskComplete }: WeeklyAgendaProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyTasks();
  }, []);

  const fetchWeeklyTasks = async () => {
    try {
      const response = await fetch('/api/v2/tasks');
      if (response.ok) {
        const allTasks = await response.json();
        
        // Filter tasks for this week (including overdue)
        const now = new Date();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const weeklyTasks = allTasks.filter((task: Task) => {
          if (task.status === 'done') return false;
          // V2 tasks have due_date
          if (!task.due_date) return false;
          
          const dueDate = new Date(task.due_date);
          return dueDate <= weekEnd; // Include overdue tasks
        });
        
        // Sort by due date
        weeklyTasks.sort((a: Task, b: Task) => {
          const dateA = new Date(a.due_date || 0);
          const dateB = new Date(b.due_date || 0);
          return dateA.getTime() - dateB.getTime();
        });
        
        setTasks(weeklyTasks);
      }
    } catch (error) {
      console.error('Error fetching weekly tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = async (taskId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering onTaskSelect
    
    try {
      const response = await fetch(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
      });
      
      if (response.ok) {
        // Remove the completed task from the list
        setTasks(prev => prev.filter(task => task.id !== taskId));
        onTaskComplete?.(taskId);
      } else {
        console.error('Failed to complete task');
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  if (loading) {
// ... loading content
}

// ... empty content

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {tasks.map(task => {
        // Adapt helpers for V2 task
        // We'll construct a mock Legacy task for the helper usually, or just check date manually
        const isOverdue = task.due_date ? new Date(task.due_date) < new Date() && task.status !== 'done' : false;
        const dateLabel = task.due_date ? new Date(task.due_date).toLocaleDateString() : '';
        
        return (
          <div 
            key={task.id}
            className={`p-3 rounded-lg border transition-colors ${
              isOverdue 
                ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' 
                : 'border-border-subtle hover:bg-bg-tertiary'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={false}
                onChange={(e) => handleTaskComplete(task.id, e as any)}
                className="w-4 h-4 text-accent-green bg-bg-primary border-border-default rounded focus:ring-accent-green focus:ring-2 mt-0.5"
                title="Mark as complete"
              />
              <div 
                className="flex-1 min-w-0 cursor-pointer -m-1 p-1 rounded"
                onClick={() => onTaskSelect?.(task)}
              >
                <p className={`text-sm font-medium truncate ${
                  isOverdue 
                    ? 'text-red-800 dark:text-red-200' 
                    : 'text-text-primary'
                }`}>
                  {task.content}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-1 rounded ${
                    isOverdue 
                      ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200' 
                      : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  }`}>
                    {isOverdue ? 'Overdue' : dateLabel}
                  </span>
                    {/* Source note logic TBD for V2 */}
                  {/*
                  {task.sourceNote && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      from note
                    </span>
                  )}
                  */}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}