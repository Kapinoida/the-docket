'use client';

import { useState, useEffect, useMemo } from 'react';
import { TaskInstance } from '@/types';
import { isTaskOverdue, formatTaskDate } from '@/lib/taskParser';
import { Search, Filter, Calendar, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import TaskCheckbox from './TaskCheckbox';

interface TaskListViewProps {
  onTaskSelect?: (task: TaskInstance) => void;
  onTaskComplete?: (taskId: string) => void;
}

type FilterType = 'all' | 'pending' | 'completed' | 'overdue' | 'today' | 'week';
type SortType = 'dueDate' | 'created' | 'priority' | 'name';

export default function TaskListView({ onTaskSelect, onTaskComplete }: TaskListViewProps) {
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('dueDate');
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<FilterType | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [groupBy, setGroupBy] = useState<'none' | 'note'>('none');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    fetchTasks();

    const handleTaskUpdated = (event: CustomEvent) => {
      const { taskId, task } = event.detail;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...task } : t));
    };

    window.addEventListener('taskUpdated', handleTaskUpdated as EventListener);
    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdated as EventListener);
    };
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

  const handleTaskToggleComplete = async (taskId: string, newCompletedStatus: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompletedStatus })
      });
      
      if (response.ok) {
        // Update the task in our local state
        setTasks(prev => prev.map(task => 
          task.id === taskId 
            ? { 
                ...task, 
                completed: newCompletedStatus, 
                completedAt: newCompletedStatus ? new Date() : undefined
              } 
            : task
        ));
        onTaskComplete?.(taskId);
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, filterType: FilterType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(filterType);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const calculateNewDueDate = (filterType: FilterType): Date | null => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filterType) {
      case 'today':
        return today;
      case 'week':
        // Set to end of this week (Sunday)
        const daysUntilSunday = 7 - today.getDay();
        return new Date(today.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);
      case 'all':
      case 'pending':
      case 'completed':
      case 'overdue':
        // Don't change the date for these filters
        return null;
      default:
        return null;
    }
  };

  const handleDrop = async (e: React.DragEvent, filterType: FilterType) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    
    if (!taskId || !draggedTask) return;
    
    const newDueDate = calculateNewDueDate(filterType);
    
    // Only update if we have a meaningful date change
    if (newDueDate && filterType !== 'all' && filterType !== 'pending' && filterType !== 'completed' && filterType !== 'overdue') {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dueDate: newDueDate.toISOString() })
        });
        
        if (response.ok) {
          // Update the task in our local state
          setTasks(prev => prev.map(task => 
            task.id === taskId ? { ...task, dueDate: newDueDate } : task
          ));
          
          console.log(`Task rescheduled to ${filterType}:`, newDueDate);
        }
      } catch (error) {
        console.error('Error rescheduling task:', error);
      }
    }
    
    setDraggedTask(null);
    setDropTarget(null);
  };

  // Bulk operation handlers
  const handleBulkComplete = async (completed: boolean) => {
    const taskIds = Array.from(selectedTasks);
    const promises = taskIds.map(taskId => 
      fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      })
    );
    
    try {
      await Promise.all(promises);
      // Update local state
      setTasks(prev => prev.map(task => {
        if (selectedTasks.has(task.id)) {
          return { 
            ...task, 
            completed, 
            completedAt: completed ? new Date() : undefined 
          };
        }
        return task;
      }));
      setSelectedTasks(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error bulk updating tasks:', error);
    }
  };

  const handleBulkDateChange = async (date: Date | null) => {
    const taskIds = Array.from(selectedTasks);
    const promises = taskIds.map(taskId => 
      fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: date?.toISOString() || null })
      })
    );
    
    try {
      await Promise.all(promises);
      // Update local state
      setTasks(prev => prev.map(task => {
        if (selectedTasks.has(task.id)) {
          return { ...task, dueDate: date };
        }
        return task;
      }));
      setSelectedTasks(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error bulk updating task dates:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedTasks.size} selected tasks? This action cannot be undone.`)) {
      return;
    }
    
    const taskIds = Array.from(selectedTasks);
    const promises = taskIds.map(taskId => 
      fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })
    );
    
    try {
      await Promise.all(promises);
      setTasks(prev => prev.filter(task => !selectedTasks.has(task.id)));
      
      // Dispatch taskDeleted events for sync
      selectedTasks.forEach(taskId => {
        window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { taskId } }));
      });
      
      setSelectedTasks(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error bulk deleting tasks:', error);
    }
  };

  const handleTaskSelect = (taskId: string, selected: boolean) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allTaskIds = filteredAndSortedTasks.map(task => task.id);
    setSelectedTasks(new Set(allTaskIds));
  };

  const handleClearSelection = () => {
    setSelectedTasks(new Set());
    setIsSelectionMode(false);
  };

  const handleClearCompleted = async () => {
    if (counts.completed === 0) return;
    setShowClearConfirm(true);
  };

  const confirmClearCompleted = async () => {
    try {
      const response = await fetch('/api/tasks?status=completed', {
        method: 'DELETE',
      });

      if (response.ok) {
        setTasks(prev => prev.filter(task => !task.completed));
        setShowClearConfirm(false);
      } else {
        alert('Failed to delete completed tasks');
      }
    } catch (error) {
      console.error('Error deleting completed tasks:', error);
      alert('Error deleting completed tasks');
    }
  };

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status/date filters
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    switch (filter) {
      case 'pending':
        filtered = filtered.filter(task => !task.completed);
        break;
      case 'completed':
        filtered = filtered.filter(task => task.completed);
        break;
      case 'overdue':
        filtered = filtered.filter(task => 
          !task.completed && task.dueDate && new Date(task.dueDate) < today
        );
        break;
      case 'today':
        filtered = filtered.filter(task => 
          !task.completed && task.dueDate && 
          new Date(task.dueDate) >= today && new Date(task.dueDate) < tomorrow
        );
        break;
      case 'week':
        filtered = filtered.filter(task => 
          !task.completed && task.dueDate && new Date(task.dueDate) <= weekEnd
        );
        break;
      // 'all' shows everything
    }

    // Sort tasks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.content.localeCompare(b.content);
        case 'priority':
          // For now, just sort by due date as we don't have priority yet
          return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [tasks, searchQuery, filter, sortBy]);

  const getFilterCounts = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      all: tasks.length,
      pending: tasks.filter(t => !t.completed).length,
      completed: tasks.filter(t => t.completed).length,
      overdue: tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today).length,
      today: tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) < tomorrow).length,
      week: tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) <= weekEnd).length,
    };
  };

  const counts = getFilterCounts();

  const renderTaskItem = (task: TaskInstance) => {
    const isOverdue = isTaskOverdue(task);
    const dateLabel = task.dueDate ? formatTaskDate(task.dueDate) : null;
    
    return (
      <div 
        key={task.id}
        draggable={!task.completed && !isSelectionMode}
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragEnd={handleDragEnd}
        className={`p-4 rounded-lg border transition-colors ${
          isSelectionMode ? 'cursor-pointer' : 'cursor-move'
        } ${
          draggedTask === task.id
            ? 'opacity-50 transform rotate-2 scale-105'
            : selectedTasks.has(task.id)
              ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : task.completed
                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                : isOverdue 
                  ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        } ${
          !task.completed && !isSelectionMode ? 'hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600' : ''
        } ${
          isSelectionMode ? 'hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600' : ''
        }`}
        onClick={() => {
          if (isSelectionMode) {
            handleTaskSelect(task.id, !selectedTasks.has(task.id));
          }
        }}
      >
        <div className="flex items-start gap-3">
          {/* Multi-select checkbox (only in selection mode) */}
          {isSelectionMode && (
            <input
              type="checkbox"
              checked={selectedTasks.has(task.id)}
              onChange={(e) => handleTaskSelect(task.id, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mt-1"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          
          {/* Drag Handle */}
          {!task.completed && !isSelectionMode && (
            <div className="flex flex-col items-center justify-center w-4 h-6 mt-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing">
              <div className="w-1 h-1 bg-current rounded-full mb-0.5"></div>
              <div className="w-1 h-1 bg-current rounded-full mb-0.5"></div>
              <div className="w-1 h-1 bg-current rounded-full"></div>
            </div>
          )}
          
          <TaskCheckbox
            checked={task.completed}
            onChange={(checked) => handleTaskToggleComplete(task.id, checked)}
            size="md"
            className="mt-1"
          />
          <div 
            className={`flex-1 min-w-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 -m-2 p-2 rounded ${
              isSelectionMode ? 'pointer-events-none' : ''
            }`}
            onClick={() => !isSelectionMode && onTaskSelect?.(task)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  task.completed 
                    ? 'line-through text-gray-500 dark:text-gray-400'
                    : isOverdue 
                      ? 'text-red-800 dark:text-red-200'
                      : 'text-gray-900 dark:text-white'
                }`}>
                  {task.content}
                </p>
                
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {dateLabel && (
                    <span className={`px-2 py-1 rounded ${
                      task.completed
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        : isOverdue 
                          ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'
                          : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
                    }`}>
                      {isOverdue ? 'Overdue' : dateLabel}
                    </span>
                  )}
                  
                  {task.sourceNote && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4z" />
                      </svg>
                      {groupBy === 'note' ? 'Attached' : 'from note'}
                    </span>
                  )}
                  
                  {task.completedAt && task.completed && (
                     <span className="text-gray-400">
                        Completed {new Date(task.completedAt).toLocaleDateString()}
                     </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto animate-pulse">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
          </div>

          {/* Search and Filters Skeleton */}
          <div className="mb-6 space-y-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-full"></div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              ))}
            </div>
            <div className="flex justify-between items-center h-9">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
          </div>

          {/* Task List Skeleton */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-800"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            All Tasks
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and organize all your tasks
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>
          
          {/* Drag and Drop Instructions */}
          {filteredAndSortedTasks.some(task => !task.completed) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Tip:</span>
                Drag tasks to reschedule them! Drop on "Today" or "This Week" to change due dates.
              </div>
            </div>
          )}

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All', count: counts.all, icon: CheckSquare },
              { key: 'pending', label: 'Pending', count: counts.pending, icon: Clock },
              { key: 'completed', label: 'Completed', count: counts.completed, icon: CheckSquare },
              { key: 'overdue', label: 'Overdue', count: counts.overdue, icon: AlertCircle },
              { key: 'today', label: 'Due Today', count: counts.today, icon: Calendar },
              { key: 'week', label: 'This Week', count: counts.week, icon: Calendar },
            ].map(({ key, label, count, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key as FilterType)}
                onDragOver={(e) => handleDragOver(e, key as FilterType)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, key as FilterType)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                  filter === key
                    ? 'bg-blue-500 text-white'
                    : dropTarget === key
                      ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 border-2 border-blue-400 border-dashed'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : dropTarget === key
                      ? 'bg-blue-300 dark:bg-blue-700 text-blue-800 dark:text-blue-200'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>
                  {count}
                </span>
                {dropTarget === key && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-lg pointer-events-none" />
                )}
              </button>
            ))}
          </div>

          {/* Sort Options and Bulk Actions Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              >
                <option value="dueDate">Due Date</option>
                <option value="created">Created Date</option>  
                <option value="name">Name</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Group by:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'none' | 'note')}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              >
                <option value="none">None</option>
                <option value="note">Context (Note)</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              {counts.completed > 0 && (
                <button
                  onClick={handleClearCompleted}
                  className="px-3 py-1.5 rounded text-sm font-medium transition-colors bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 mr-2"
                >
                  Clear Completed
                </button>
              )}
              <button
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isSelectionMode 
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {isSelectionMode ? 'Exit Selection' : 'Select Multiple'}
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {isSelectionMode && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                <CheckSquare className="w-4 h-4" />
                <span className="font-medium">{selectedTasks.size} tasks selected</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Clear
                </button>
                
                <div className="w-px h-6 bg-blue-300 dark:bg-blue-600 mx-2"></div>
                
                <button
                  onClick={() => handleBulkComplete(true)}
                  disabled={selectedTasks.size === 0}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    selectedTasks.size === 0 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                      : 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-700'
                  }`}
                >
                  Mark Complete
                </button>
                <button
                  onClick={() => handleBulkComplete(false)}
                  disabled={selectedTasks.size === 0}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    selectedTasks.size === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                      : 'bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-700'
                  }`}
                >
                  Mark Incomplete
                </button>
                
                <button
                  onClick={() => handleBulkDateChange(new Date())}
                  disabled={selectedTasks.size === 0}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    selectedTasks.size === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                      : 'bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-700'
                  }`}
                >
                  Due Today
                </button>
                <button
                  onClick={() => handleBulkDateChange(null)}
                  disabled={selectedTasks.size === 0}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    selectedTasks.size === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Clear Due Date
                </button>
                
                <div className="w-px h-6 bg-blue-300 dark:bg-blue-600 mx-2"></div>
                
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedTasks.size === 0}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    selectedTasks.size === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                      : 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-700'
                  }`}
                >
                  Delete Selected
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="space-y-3">
          {filteredAndSortedTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium mb-1">
                {searchQuery || filter !== 'all' ? 'No tasks found' : 'No tasks yet'}
              </p>
              <p className="text-sm">
                {searchQuery || filter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first task to get started'
                }
              </p>
            </div>
          ) : (
            groupBy === 'note' ? (
              // Grouped View
              Object.entries(
                filteredAndSortedTasks.reduce((groups, task) => {
                  const key = task.sourceNote ? task.sourceNote.title : 'Standalone Tasks';
                  const noteId = task.sourceNote?.id; // For sorting/key
                  const groupKey = noteId ? `note:${noteId}:${key}` : `standalone:null:${key}`;
                  
                  if (!groups[groupKey]) groups[groupKey] = [];
                  groups[groupKey].push(task);
                  return groups;
                }, {} as Record<string, TaskInstance[]>)
              ).map(([groupKey, groupTasks]) => {
                const [type, id, title] = groupKey.split(':');
                
                return (
                  <div key={groupKey} className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1 mt-6 mb-2">
                      {title}
                    </h3>
                    {groupTasks.map(task => {
                      const isOverdue = isTaskOverdue(task);
                      const dateLabel = task.dueDate ? formatTaskDate(task.dueDate) : null;
                      
                      return (
                        <div 
                          key={task.id}
                          draggable={!task.completed && !isSelectionMode}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          className={`p-4 rounded-lg border transition-colors ${
                            isSelectionMode ? 'cursor-pointer' : 'cursor-move'
                          } ${
                            draggedTask === task.id
                              ? 'opacity-50 transform rotate-2 scale-105'
                              : selectedTasks.has(task.id)
                                ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                : task.completed
                                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                                  : isOverdue 
                                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                          } ${
                            !task.completed && !isSelectionMode ? 'hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600' : ''
                          } ${
                            isSelectionMode ? 'hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600' : ''
                          }`}
                          onClick={() => {
                            if (isSelectionMode) {
                              handleTaskSelect(task.id, !selectedTasks.has(task.id));
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {/* Multi-select checkbox (only in selection mode) */}
                            {isSelectionMode && (
                              <input
                                type="checkbox"
                                checked={selectedTasks.has(task.id)}
                                onChange={(e) => handleTaskSelect(task.id, e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mt-1"
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            
                            {/* Drag Handle */}
                            {!task.completed && !isSelectionMode && (
                              <div className="flex flex-col items-center justify-center w-4 h-6 mt-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing">
                                <div className="w-1 h-1 bg-current rounded-full mb-0.5"></div>
                                <div className="w-1 h-1 bg-current rounded-full mb-0.5"></div>
                                <div className="w-1 h-1 bg-current rounded-full"></div>
                              </div>
                            )}
                            
                            <TaskCheckbox
                              checked={task.completed}
                              onChange={(checked) => handleTaskToggleComplete(task.id, checked)}
                              size="md"
                              className="mt-1"
                            />
                            <div 
                              className={`flex-1 min-w-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 -m-2 p-2 rounded ${
                                isSelectionMode ? 'pointer-events-none' : ''
                              }`}
                              onClick={() => !isSelectionMode && onTaskSelect?.(task)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${
                                    task.completed 
                                      ? 'line-through text-gray-500 dark:text-gray-400'
                                      : isOverdue 
                                        ? 'text-red-800 dark:text-red-200'
                                        : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {task.content}
                                  </p>
                                  
                                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    {dateLabel && (
                                      <span className={`px-2 py-1 rounded ${
                                        task.completed
                                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                          : isOverdue 
                                            ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'
                                            : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
                                      }`}>
                                        {isOverdue ? 'Overdue' : dateLabel}
                                      </span>
                                    )}
                                    
                                    {task.sourceNote && (
                                      <span className="flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4z" />
                                        </svg>
                                        from note
                                      </span>
                                    )}
                                    
                                    <span>
                                      Created {new Date(task.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              // Flat View
              filteredAndSortedTasks.map(task => {
                const isOverdue = isTaskOverdue(task);
                const dateLabel = task.dueDate ? formatTaskDate(task.dueDate) : null;
                
                return (
                  <div 
                    key={task.id}
                    draggable={!task.completed && !isSelectionMode}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className={`p-4 rounded-lg border transition-colors ${
                      isSelectionMode ? 'cursor-pointer' : 'cursor-move'
                    } ${
                      draggedTask === task.id
                        ? 'opacity-50 transform rotate-2 scale-105'
                        : selectedTasks.has(task.id)
                          ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : task.completed
                            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                            : isOverdue 
                              ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    } ${
                      !task.completed && !isSelectionMode ? 'hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600' : ''
                    } ${
                      isSelectionMode ? 'hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600' : ''
                    }`}
                    onClick={() => {
                      if (isSelectionMode) {
                        handleTaskSelect(task.id, !selectedTasks.has(task.id));
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Multi-select checkbox (only in selection mode) */}
                      {isSelectionMode && (
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={(e) => handleTaskSelect(task.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mt-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      
                      {/* Drag Handle */}
                      {!task.completed && !isSelectionMode && (
                        <div className="flex flex-col items-center justify-center w-4 h-6 mt-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing">
                          <div className="w-1 h-1 bg-current rounded-full mb-0.5"></div>
                          <div className="w-1 h-1 bg-current rounded-full mb-0.5"></div>
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                        </div>
                      )}
                      
                      <TaskCheckbox
                        checked={task.completed}
                        onChange={(checked) => handleTaskToggleComplete(task.id, checked)}
                        size="md"
                        className="mt-1"
                      />
                      <div 
                        className={`flex-1 min-w-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 -m-2 p-2 rounded ${
                          isSelectionMode ? 'pointer-events-none' : ''
                        }`}
                        onClick={() => !isSelectionMode && onTaskSelect?.(task)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${
                              task.completed 
                                ? 'line-through text-gray-500 dark:text-gray-400'
                                : isOverdue 
                                  ? 'text-red-800 dark:text-red-200'
                                  : 'text-gray-900 dark:text-white'
                            }`}>
                              {task.content}
                            </p>
                            
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              {dateLabel && (
                                <span className={`px-2 py-1 rounded ${
                                  task.completed
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                    : isOverdue 
                                      ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'
                                      : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
                                }`}>
                                  {isOverdue ? 'Overdue' : dateLabel}
                                </span>
                              )}
                              
                              {task.sourceNote && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 4a2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4z" />
                                  </svg>
                                  from note
                                </span>
                              )}
                              
                              <span>
                                Created {new Date(task.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {/* Clear Completed Confirmation Modal */}
      {showClearConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Clear Completed Tasks
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete {counts.completed} completed tasks? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmClearCompleted();
                }}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete {counts.completed} Tasks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}