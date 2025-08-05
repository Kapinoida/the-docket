'use client';

import { useState, useEffect } from 'react';
import { TaskInstance } from '@/types';
import { isTaskOverdue, formatTaskDate } from '@/lib/taskParser';

interface WeeklyAgendaProps {
  onTaskSelect?: (task: TaskInstance) => void;
  onTaskComplete?: (taskId: string) => void;
}

export default function WeeklyAgenda({ onTaskSelect, onTaskComplete }: WeeklyAgendaProps) {
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyTasks();
  }, []);

  const fetchWeeklyTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const allTasks = await response.json();
        
        // Filter tasks for this week (including overdue)
        const now = new Date();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const weeklyTasks = allTasks.filter((task: TaskInstance) => {
          if (task.completed) return false;
          if (!task.dueDate) return false;
          
          const dueDate = new Date(task.dueDate);
          return dueDate <= weekEnd; // Include overdue tasks
        });
        
        // Sort by due date
        weeklyTasks.sort((a: TaskInstance, b: TaskInstance) => {
          const dateA = new Date(a.dueDate || 0);
          const dateB = new Date(b.dueDate || 0);
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

  const handleTaskComplete = async (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering onTaskSelect
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true })
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
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-1"></div>
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">No tasks due this week</p>
        <p className="text-xs mt-1">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {tasks.map(task => {
        const isOverdue = isTaskOverdue(task);
        const dateLabel = formatTaskDate(task.dueDate);
        
        return (
          <div 
            key={task.id}
            className={`p-3 rounded-lg border transition-colors ${
              isOverdue 
                ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' 
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={false}
                onChange={(e) => handleTaskComplete(task.id, e as any)}
                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2 mt-0.5"
                title="Mark as complete"
              />
              <div 
                className="flex-1 min-w-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 -m-1 p-1 rounded"
                onClick={() => onTaskSelect?.(task)}
              >
                <p className={`text-sm font-medium truncate ${
                  isOverdue 
                    ? 'text-red-800 dark:text-red-200' 
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {task.content}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-1 rounded ${
                    isOverdue 
                      ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200' 
                      : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
                  }`}>
                    {isOverdue ? 'Overdue' : dateLabel}
                  </span>
                  {task.sourceNote && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      from note
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}