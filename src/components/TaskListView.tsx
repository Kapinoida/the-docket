'use client';

import { useState, useEffect, useMemo } from 'react';
import { TaskInstance } from '@/types';
import { isTaskOverdue, formatTaskDate } from '@/lib/taskParser';
import { Search, Filter, Calendar, CheckSquare, Clock, AlertCircle } from 'lucide-react';

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
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true })
      });
      
      if (response.ok) {
        // Update the task in our local state
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, completed: true, completedAt: new Date().toISOString() } : task
        ));
        onTaskComplete?.(taskId);
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleTaskUncomplete = async (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: false })
      });
      
      if (response.ok) {
        // Update the task in our local state
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, completed: false, completedAt: undefined } : task
        ));
        onTaskComplete?.(taskId);
      }
    } catch (error) {
      console.error('Error uncompleting task:', error);
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

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
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
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Sort Options */}
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
        </div>

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
            filteredAndSortedTasks.map(task => {
              const isOverdue = isTaskOverdue(task);
              const dateLabel = task.dueDate ? formatTaskDate(task.dueDate) : null;
              
              return (
                <div 
                  key={task.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    task.completed
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                      : isOverdue 
                        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={(e) => task.completed 
                        ? handleTaskUncomplete(task.id, e as any)
                        : handleTaskComplete(task.id, e as any)
                      }
                      className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2 mt-1"
                    />
                    <div 
                      className="flex-1 min-w-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 -m-2 p-2 rounded"
                      onClick={() => onTaskSelect?.(task)}
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
            })
          )}
        </div>
      </div>
    </div>
  );
}