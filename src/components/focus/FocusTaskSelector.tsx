'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '@/types/v2';
import { CheckCircle2, Circle, AlertCircle, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface TaskGroup {
  overdue: Task[];
  today: Task[];
  week: Task[];
}

interface FocusTaskSelectorProps {
  onSelectTask: (task: Task) => void;
  activeTaskId?: number;
}

export default function FocusTaskSelector({ onSelectTask, activeTaskId }: FocusTaskSelectorProps) {
  const [tasks, setTasks] = useState<TaskGroup>({ overdue: [], today: [], week: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'week'>('today');
  
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/v2/focus/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
        // Auto-switch tab if today is empty but overdue has items?
        if (data.today.length === 0 && data.overdue.length > 0) {
            setActiveTab('overdue');
        }
      }
    } catch (e) {
      console.error("Failed to fetch focus tasks", e);
    } finally {
      setLoading(false);
    }
  };

  const currentList = tasks[activeTab] || [];

  return (
    <div className="w-full max-w-md bg-bg-secondary/50 backdrop-blur-md border border-border-default rounded-xl overflow-hidden shadow-xl flex flex-col max-h-[400px]">
      {/* Header / Tabs */}
      <div className="flex border-b border-border-default bg-bg-secondary/80">
        <button 
            onClick={() => setActiveTab('overdue')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'overdue' ? 'text-rose-500' : 'text-text-secondary hover:text-text-primary'}`}
        >
            Overdue
            {tasks.overdue.length > 0 && <span className="ml-1.5 text-[10px] bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded-full">{tasks.overdue.length}</span>}
            {activeTab === 'overdue' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500" />}
        </button>
        <button 
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'today' ? 'text-accent-blue' : 'text-text-secondary hover:text-text-primary'}`}
        >
            Today
            {tasks.today.length > 0 && <span className="ml-1.5 text-[10px] bg-accent-blue/10 text-accent-blue px-1.5 py-0.5 rounded-full">{tasks.today.length}</span>}
            {activeTab === 'today' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-blue" />}
        </button>
        <button 
            onClick={() => setActiveTab('week')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'week' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
        >
            Week
            {tasks.week.length > 0 && <span className="ml-1.5 text-[10px] bg-bg-tertiary text-text-muted px-1.5 py-0.5 rounded-full">{tasks.week.length}</span>}
            {activeTab === 'week' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-text-primary" />}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 styled-scrollbar min-h-[200px]">
        {loading ? (
            <div className="flex items-center justify-center h-full text-text-muted text-sm">Loading tasks...</div>
        ) : currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2 py-8">
                <CheckCircle2 size={32} className="opacity-20" />
                <p className="text-sm">No tasks {activeTab === 'overdue' ? 'overdue' : activeTab === 'today' ? 'for today' : 'this week'}</p>
            </div>
        ) : (
            <div className="space-y-1">
                {currentList.map(task => (
                    <button
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 group ${
                            activeTaskId === task.id 
                                ? 'bg-accent-blue/10 border-accent-blue/30 shadow-sm' 
                                : 'bg-bg-primary/50 border-transparent hover:bg-bg-tertiary hover:border-border-default'
                        }`}
                    >
                        <div className={`mt-0.5 ${activeTaskId === task.id ? 'text-accent-blue' : 'text-text-muted'}`}>
                             {activeTaskId === task.id ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${activeTaskId === task.id ? 'text-text-primary font-medium' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                {task.content}
                            </p>
                            {task.due_date && (
                                <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                                    <Calendar size={10} />
                                    {format(new Date(task.due_date), 'MMM d')}
                                </p>
                            )}
                        </div>
                        {activeTaskId === task.id && (
                             <span className="text-[10px] font-medium text-accent-blue bg-accent-blue/10 px-2 py-1 rounded">Focusing</span>
                        )}
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
