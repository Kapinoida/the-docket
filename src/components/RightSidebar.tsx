'use client';

import { useState, useEffect } from 'react';
import { Folder, TaskInstance } from '@/types';
import { isTaskOverdue, formatTaskDate } from '@/lib/taskParser';
import { Clock, Calendar, CheckSquare } from 'lucide-react';
import TaskCheckbox from './TaskCheckbox';

interface RightSidebarProps {
  selectedFolder: Folder | null;
  onTaskSelect?: (task: TaskInstance) => void;
}

export default function RightSidebar({ selectedFolder, onTaskSelect }: RightSidebarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayTasks, setTodayTasks] = useState<TaskInstance[]>([]);
  const [weekTasks, setWeekTasks] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(true);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const allTasks = await response.json();
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        // Filter today's tasks
        const todayFiltered = allTasks.filter(task => 
          !task.completed && task.dueDate && 
          new Date(task.dueDate) >= today && new Date(task.dueDate) < tomorrow
        );
        
        // Filter this week's tasks (excluding today)
        const weekFiltered = allTasks.filter(task => 
          !task.completed && task.dueDate && 
          new Date(task.dueDate) >= tomorrow && new Date(task.dueDate) <= weekEnd
        );
        
        setTodayTasks(todayFiltered);
        setWeekTasks(weekFiltered);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      
      if (response.ok) {
        // Refresh tasks after completion
        fetchTasks();
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 flex-1 overflow-y-auto overflow-x-hidden">
        {/* Current Time & Date */}
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">Current Time</span>
          </div>
          <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            {formatTime(currentTime)}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">
            {formatDate(currentTime)}
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Today's Tasks
            </h3>
            <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full font-medium">
              {todayTasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-3 bg-gray-50 dark:bg-gray-800/50 rounded border border-dashed border-gray-200 dark:border-gray-700">
                No tasks due today
              </div>
            ) : (
              todayTasks.slice(0, 5).map(task => {
                const isOverdue = isTaskOverdue(task);
                return (
                  <div 
                    key={task.id}
                    className="p-2 rounded border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => onTaskSelect?.(task)}
                  >
                    <div className="flex items-start gap-2">
                      <TaskCheckbox
                        checked={task.completed}
                        onChange={(checked) => handleTaskToggleComplete(task.id, checked)}
                        size="sm"
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-tight ${
                          isOverdue 
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {task.content.length > 50 ? task.content.slice(0, 50) + '...' : task.content}
                        </p>
                        {task.sourceNote && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                            <span>📝</span> from note
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {todayTasks.length > 5 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                +{todayTasks.length - 5} more tasks
              </div>
            )}
          </div>
        </div>

        {/* This Week */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              This Week
            </h3>
            <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full font-medium">
              {weekTasks.length}
            </span>
          </div>
          <div className="space-y-1">
            {loading ? (
              <div className="animate-pulse space-y-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            ) : weekTasks.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-3 bg-gray-50 dark:bg-gray-800/50 rounded border border-dashed border-gray-200 dark:border-gray-700">
                No tasks this week
              </div>
            ) : (
              weekTasks.slice(0, 6).map(task => {
                const isOverdue = isTaskOverdue(task);
                const dateLabel = task.dueDate ? formatTaskDate(task.dueDate) : null;
                return (
                  <div 
                    key={task.id}
                    className="p-1.5 rounded text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => onTaskSelect?.(task)}
                  >
                    <div className="flex items-center gap-1.5">
                      <TaskCheckbox
                        checked={task.completed}
                        onChange={(checked) => handleTaskToggleComplete(task.id, checked)}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium leading-tight truncate ${
                          isOverdue 
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {task.content.length > 35 ? task.content.slice(0, 35) + '...' : task.content}
                        </p>
                        {dateLabel && (
                          <span className={`text-xs ${
                            isOverdue 
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {dateLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {weekTasks.length > 6 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                +{weekTasks.length - 6} more this week
              </div>
            )}
          </div>
        </div>

        {/* Mini Calendar */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Quick Calendar
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-2">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {currentTime.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-gray-500 dark:text-gray-400 font-medium py-1">
                  {day}
                </div>
              ))}
              {(() => {
                const firstDay = new Date(currentTime.getFullYear(), currentTime.getMonth(), 1);
                const lastDay = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0);
                const startDate = new Date(firstDay);
                startDate.setDate(startDate.getDate() - firstDay.getDay());
                
                const days = [];
                for (let i = 0; i < 42; i++) {
                  const date = new Date(startDate);
                  date.setDate(startDate.getDate() + i);
                  const isCurrentMonth = date.getMonth() === currentTime.getMonth();
                  const isToday = date.toDateString() === currentTime.toDateString();
                  
                  days.push(
                    <div 
                      key={i}
                      className={`text-center py-1 rounded text-xs ${
                        isToday
                          ? 'bg-blue-500 text-white font-semibold'
                          : isCurrentMonth
                            ? 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                            : 'text-gray-400 dark:text-gray-600'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  );
                }
                return days.slice(0, 35); // Show 5 weeks max
              })()}
            </div>
          </div>
        </div>

        {/* Folder Properties */}
        {selectedFolder && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Folder Properties
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3 space-y-2 border border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Name:</span>
                <div className="text-sm text-gray-900 dark:text-white font-medium">
                  {selectedFolder.name}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Created:</span>
                <div className="text-sm text-gray-900 dark:text-white">
                  {new Date(selectedFolder.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Quick Stats
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
              <div className="text-lg font-semibold text-green-700 dark:text-green-300">
                {todayTasks.length}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                Due Today
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2">
              <div className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                {weekTasks.length}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                This Week
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}