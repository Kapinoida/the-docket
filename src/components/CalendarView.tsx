'use client';

import { useState, useEffect, useMemo } from 'react';
import { TaskInstance } from '@/types';
import { isTaskOverdue, formatTaskDate } from '@/lib/taskParser';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import TaskCheckbox from './TaskCheckbox';

interface CalendarViewProps {
  onTaskSelect?: (task: TaskInstance) => void;
  onTaskComplete?: (taskId: string) => void;
}

type ViewType = 'week' | 'month';

export default function CalendarView({ onTaskSelect, onTaskComplete }: CalendarViewProps) {
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('week');
  const [draggedTask, setDraggedTask] = useState<TaskInstance | null>(null);
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null);
  const [draggedOverUnscheduled, setDraggedOverUnscheduled] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const allTasks = await response.json();
        setTasks(allTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = async (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Find the current task to get its completion status
    const currentTask = tasks.find(task => task.id === taskId);
    if (!currentTask) return;
    
    const newCompletedStatus = !currentTask.completed;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompletedStatus })
      });
      
      if (response.ok) {
        setTasks(prev => prev.map(task => 
          task.id === taskId 
            ? { 
                ...task, 
                completed: newCompletedStatus, 
                completedAt: newCompletedStatus ? new Date().toISOString() : null 
              } 
            : task
        ));
        onTaskComplete?.(taskId);
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  const handleTaskDragStart = (e: React.DragEvent, task: TaskInstance) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleTaskDragEnd = () => {
    setDraggedTask(null);
    setDraggedOverDate(null);
    setDraggedOverUnscheduled(false);
  };

  const handleDayDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverDate(dateKey);
  };

  const handleDayDragLeave = () => {
    setDraggedOverDate(null);
  };

  const handleUnscheduledDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverUnscheduled(true);
  };

  const handleUnscheduledDragLeave = () => {
    setDraggedOverUnscheduled(false);
  };

  const handleDayDrop = async (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    
    if (!taskId || !draggedTask) return;

    const dropDate = new Date(dateKey);
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: dropDate.toISOString() })
      });
      
      if (response.ok) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, dueDate: dropDate } : task
        ));
        console.log(`Task rescheduled to ${dateKey}`);
      }
    } catch (error) {
      console.error('Error rescheduling task:', error);
    }
    
    setDraggedTask(null);
    setDraggedOverDate(null);
    setDraggedOverUnscheduled(false);
  };

  const handleUnscheduleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    
    if (!taskId || !draggedTask) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: null })
      });
      
      if (response.ok) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, dueDate: null } : task
        ));
        console.log(`Task unscheduled`);
      }
    } catch (error) {
      console.error('Error unscheduling task:', error);
    }
    
    setDraggedTask(null);
    setDraggedOverDate(null);
    setDraggedOverUnscheduled(false);
  };

  // Generate calendar days based on view type
  const calendarData = useMemo(() => {
    const now = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (viewType === 'week') {
      // Get the start of the week (Sunday)
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day);
      
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        days.push(date);
      }
      return days;
    } else {
      // Month view
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());
      
      const days = [];
      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
      
      let current = new Date(startDate);
      while (current <= endDate) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      return days;
    }
  }, [currentDate, viewType]);

  // Group tasks by date and separate unscheduled tasks
  const { tasksByDate, unscheduledTasks } = useMemo(() => {
    const grouped: { [key: string]: TaskInstance[] } = {};
    const unscheduled: TaskInstance[] = [];
    
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = new Date(task.dueDate).toDateString();
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      } else if (!task.completed) {
        // Only include unscheduled tasks that are not completed
        unscheduled.push(task);
      }
    });
    
    return { tasksByDate: grouped, unscheduledTasks: unscheduled };
  }, [tasks]);

  const navigateCalendar = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewType === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const formatDateHeader = (date: Date) => {
    if (viewType === 'week') {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } else {
      return date.getDate().toString();
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Calendar
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Drag tasks to reschedule them
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewType('week')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewType === 'week'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewType('month')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewType === 'month'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Month
              </button>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateCalendar('prev')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="text-lg font-semibold text-gray-900 dark:text-white min-w-[200px] text-center">
                {currentDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric',
                  ...(viewType === 'week' ? { day: 'numeric' } : {})
                })}
              </div>
              
              <button
                onClick={() => navigateCalendar('next')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        {/* Unscheduled Tasks */}
        {(unscheduledTasks.length > 0 || draggedTask?.dueDate) && (
          <div 
            className={`mb-6 rounded-lg border p-4 transition-colors ${
              draggedOverUnscheduled 
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            }`}
            onDragOver={handleUnscheduledDragOver}
            onDragLeave={handleUnscheduledDragLeave}
            onDrop={handleUnscheduleDrop}
          >
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Unscheduled Tasks
              </h3>
              <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                {unscheduledTasks.length}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {draggedOverUnscheduled && draggedTask?.dueDate
                ? 'Drop here to unschedule this task'
                : 'Drag these tasks to calendar days to schedule them, or drag scheduled tasks here to unschedule them'
              }
            </p>
            
            <div className="flex flex-wrap gap-2">
              {unscheduledTasks.map(task => {
                const isOverdue = isTaskOverdue(task);
                const isDragging = draggedTask?.id === task.id;
                
                return (
                  <div
                    key={task.id}
                    draggable={!task.completed}
                    onDragStart={(e) => handleTaskDragStart(e, task)}
                    onDragEnd={handleTaskDragEnd}
                    className={`p-2 rounded text-sm cursor-pointer transition-all inline-block ${
                      isDragging
                        ? 'opacity-50 transform rotate-1 scale-95'
                        : task.completed
                          ? 'bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 line-through'
                          : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                    }`}
                    onClick={() => !isDragging && onTaskSelect?.(task)}
                  >
                    <div className="flex items-center gap-2">
                      <TaskCheckbox
                        checked={task.completed}
                        onChange={() => handleTaskComplete(task.id, { stopPropagation: () => {} } as any)}
                        size="sm"
                      />
                      <span className="leading-tight">
                        {task.content}
                      </span>
                      {task.sourceNote && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          📝
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Drop zone indicator when dragging scheduled task over empty unscheduled section */}
              {draggedOverUnscheduled && draggedTask?.dueDate && unscheduledTasks.length === 0 && (
                <div className="p-4 border-2 border-dashed border-blue-400 rounded text-sm text-blue-600 dark:text-blue-400 text-center flex-1">
                  Drop here to unschedule task
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className={`grid gap-4 ${
          viewType === 'week' 
            ? 'grid-cols-7' 
            : 'grid-cols-7'
        }`}>
          {calendarData.map((date, index) => {
            const dateKey = date.toDateString();
            const dayTasks = tasksByDate[dateKey] || [];
            const isDragOver = draggedOverDate === dateKey;
            const today = isToday(date);
            const currentMonth = isCurrentMonth(date);
            
            return (
              <div
                key={dateKey}
                className={`min-h-32 p-3 border rounded-lg transition-colors ${
                  isDragOver
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : today
                      ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/10'
                      : currentMonth || viewType === 'week'
                        ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50'
                } ${
                  viewType === 'month' && !currentMonth ? 'opacity-50' : ''
                }`}
                onDragOver={(e) => handleDayDragOver(e, dateKey)}
                onDragLeave={handleDayDragLeave}
                onDrop={(e) => handleDayDrop(e, dateKey)}
              >
                {/* Date Header */}
                <div className={`text-sm font-medium mb-2 ${
                  today 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : currentMonth || viewType === 'week'
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {formatDateHeader(date)}
                </div>
                
                {/* Tasks */}
                <div className="space-y-1">
                  {dayTasks.map(task => {
                    const isOverdue = isTaskOverdue(task);
                    const isDragging = draggedTask?.id === task.id;
                    
                    return (
                      <div
                        key={task.id}
                        draggable={!task.completed}
                        onDragStart={(e) => handleTaskDragStart(e, task)}
                        onDragEnd={handleTaskDragEnd}
                        className={`p-2 rounded text-xs cursor-pointer transition-all ${
                          isDragging
                            ? 'opacity-50 transform rotate-1 scale-95'
                            : task.completed
                              ? 'bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 line-through'
                              : isOverdue
                                ? 'bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-200'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        onClick={() => !isDragging && onTaskSelect?.(task)}
                      >
                        <div className="flex items-start gap-1">
                          <TaskCheckbox
                            checked={task.completed}
                            onChange={() => handleTaskComplete(task.id, { stopPropagation: () => {} } as any)}
                            size="sm"
                            className="mt-0.5"
                          />
                          <span className="flex-1 leading-tight">
                            {task.content}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Drop zone indicator when dragging over empty day */}
                  {isDragOver && dayTasks.length === 0 && (
                    <div className="p-2 border-2 border-dashed border-blue-400 rounded text-xs text-blue-600 dark:text-blue-400 text-center">
                      Drop task here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}