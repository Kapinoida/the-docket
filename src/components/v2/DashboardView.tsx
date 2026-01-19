'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Task, Page } from '@/types/v2';
import WeeklyAgenda from '../WeeklyAgenda';
import RecentNotes from './RecentNotes';
import { Plus, Layout, Calendar, CheckSquare } from 'lucide-react';
import { useTaskEdit } from '@/contexts/TaskEditContext';

export default function DashboardView() {
  const router = useRouter();
  const { openTaskEdit } = useTaskEdit();
  const [stats, setStats] = useState({ 
    notes: 0, 
    tasks: 0, 
    overdueTasks: 0, 
    dueTodayTasks: 0 
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [pagesResponse, tasksResponse] = await Promise.all([
        fetch('/api/v2/pages?view=all'),
        fetch('/api/v2/tasks')
      ]);
      
      if (pagesResponse.ok) {
        const pages: Page[] = await pagesResponse.json();
        setStats(prev => ({ ...prev, notes: pages.length }));
      }
      
      if (tasksResponse.ok) {
        const tasks: Task[] = await tasksResponse.json();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        
        const overdueTasks = tasks.filter(task => 
          task.status !== 'done' && task.due_date && new Date(task.due_date) < today
        ).length;
        
        const dueTodayTasks = tasks.filter(task => 
          task.status !== 'done' && task.due_date && 
          new Date(task.due_date) >= today && new Date(task.due_date) < tomorrow
        ).length;
        
        setStats(prev => ({ 
          ...prev, 
          tasks: tasks.filter(t => t.status !== 'done').length,
          overdueTasks,
          dueTodayTasks
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    const handleTaskUpdate = () => fetchStats();
    const handleTaskCreate = () => fetchStats();
    const handleTaskDelete = () => fetchStats();

    window.addEventListener('taskUpdated', handleTaskUpdate);
    window.addEventListener('taskCreated', handleTaskCreate);
    window.addEventListener('taskDeleted', handleTaskDelete);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
      window.removeEventListener('taskCreated', handleTaskCreate);
      window.removeEventListener('taskDeleted', handleTaskDelete);
    };
  }, [fetchStats]);

  const handleTaskSelect = (task: Task) => {
    // Adapter for V1 TaskEditContext
    openTaskEdit({
      ...task,
      id: task.id.toString(), // V2 uses number, V1 uses string
      dueDate: task.due_date ? new Date(task.due_date) : null,
      completed: task.status === 'done',
      createdAt: new Date(task.created_at),
      updatedAt: new Date(task.updated_at),
      content: task.content,
      recurrenceRule: task.recurrence_rule
    } as any);
  };

  const handleNoteSelect = (page: Page) => {
    router.push(`/page/${page.id}`);
  };

  return (
    <div className="flex-1 p-8 bg-bg-primary">
      <div className="w-full">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Layout size={24} />
              </div>
              Dashboard
            </h1>
            <p className="text-text-secondary mt-2 ml-14">Your productivity overview</p>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-bg-secondary p-6 rounded-2xl border border-border-subtle shadow-sm">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {statsLoading ? (
                <div className="animate-pulse bg-bg-tertiary h-8 w-12 rounded"></div>
              ) : (
                stats.notes
              )}
            </div>
            <div className="text-sm font-medium text-text-muted">Total Notes</div>
          </div>
          <div className="bg-bg-secondary p-6 rounded-2xl border border-border-subtle shadow-sm">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
              {statsLoading ? (
                <div className="animate-pulse bg-bg-tertiary h-8 w-12 rounded"></div>
              ) : (
                stats.tasks
              )}
            </div>
            <div className="text-sm font-medium text-text-muted">Active Tasks</div>
          </div>
          <div className="bg-bg-secondary p-6 rounded-2xl border border-border-subtle shadow-sm">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
              {statsLoading ? (
                <div className="animate-pulse bg-bg-tertiary h-8 w-12 rounded"></div>
              ) : (
                stats.overdueTasks
              )}
            </div>
            <div className="text-sm font-medium text-text-muted">Overdue</div>
          </div>
          <div className="bg-bg-secondary p-6 rounded-2xl border border-border-subtle shadow-sm">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              {statsLoading ? (
                <div className="animate-pulse bg-bg-tertiary h-8 w-12 rounded"></div>
              ) : (
                stats.dueTodayTasks
              )}
            </div>
            <div className="text-sm font-medium text-text-muted">Due Today</div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="grid grid-cols-1 gap-8">
          
          {/* Weekly Calendar - Full Width */}
          <div className="bg-bg-secondary rounded-2xl border border-border-subtle shadow-sm p-6">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <Calendar className="text-purple-500" size={20} />
                    Weekly Schedule
                </h3>
            </div>
            <WeeklyAgenda 
              onTaskSelect={handleTaskSelect} 
              onTaskComplete={() => fetchStats()}
            />
          </div>
          
          {/* Recent Notes */}
          <div className="bg-bg-secondary rounded-2xl border border-border-subtle shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <CheckSquare className="text-blue-500" size={20} />
                    Recent Notes
                </h3>
            </div>
            <RecentNotes onNoteSelect={handleNoteSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}
