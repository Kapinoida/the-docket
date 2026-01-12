'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '@/types/v2';
import { CheckCircle2, Circle, Calendar, X, ChevronRight, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface TaskGroup {
  overdue: Task[];
  today: Task[];
  week: Task[];
}

interface FocusTaskSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (task: Task) => void;
  activeTaskId?: number;
}

export default function FocusTaskSidebar({ isOpen, onClose, onSelectTask, activeTaskId }: FocusTaskSidebarProps) {
  const [tasks, setTasks] = useState<TaskGroup>({ overdue: [], today: [], week: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'week'>('today');

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v2/focus/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
        if (data.today.length === 0 && data.overdue.length > 0 && activeTab === 'today') {
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
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Panel - Floating Card Style */}
      <div 
        className={`fixed top-24 right-8 bottom-8 w-[340px] bg-bg-secondary/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col overflow-hidden ${isOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <h2 className="text-lg font-medium tracking-tight">Focus Tasks</h2>
          <button 
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-text-muted hover:text-text-primary transition-colors rounded-full hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-transparent shrink-0">
            <TabButton 
                active={activeTab === 'overdue'} 
                label="Overdue" 
                count={tasks.overdue.length} 
                onClick={() => setActiveTab('overdue')} 
                color="rose"
            />
            <TabButton 
                active={activeTab === 'today'} 
                label="Today" 
                count={tasks.today.length} 
                onClick={() => setActiveTab('today')} 
                color="blue"
            />
            <TabButton 
                active={activeTab === 'week'} 
                label="Week" 
                count={tasks.week.length} 
                onClick={() => setActiveTab('week')} 
                color="gray"
            />
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-3 styled-scrollbar">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
                 <div className="w-5 h-5 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin"></div>
                 <p className="text-xs">Loading...</p>
             </div>
          ) : currentList.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2 opacity-60">
                <CheckCircle2 size={24} />
                <p className="text-xs">No tasks found</p>
             </div>
          ) : (
             <div className="space-y-1.5">
                 {currentList.map(task => (
                     <button
                         key={task.id}
                         onClick={() => {
                             onSelectTask(task);
                             onClose();
                         }}
                         className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 group ${
                             activeTaskId === task.id 
                                 ? 'bg-accent-blue/10 border-accent-blue/30 shadow-sm' 
                                 : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                         }`}
                     >
                         <div className={`mt-0.5 transition-colors ${activeTaskId === task.id ? 'text-accent-blue' : 'text-text-muted group-hover:text-text-secondary'}`}>
                              {activeTaskId === task.id ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                         </div>
                         <div className="flex-1 min-w-0">
                             <p className={`text-sm font-medium leading-snug mb-1 ${activeTaskId === task.id ? 'text-text-primary' : 'text-text-primary'}`}>
                                 {task.content}
                             </p>
                             <div className="flex items-center gap-2 text-[10px] text-text-muted">
                                 {task.due_date && (
                                     <span className={`flex items-center gap-1 px-1.5 py-px rounded border ${
                                         activeTab === 'overdue' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                                         activeTab === 'today' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                                         'bg-white/5 border-white/10'
                                     }`}>
                                         <Calendar size={10} />
                                         {format(new Date(task.due_date), 'MMM d')}
                                     </span>
                                 )}
                                 {task.recurrence_rule && (
                                     <span className="flex items-center gap-1 opacity-70">
                                         <Clock size={10} />
                                         Repeating
                                     </span>
                                 )}
                             </div>
                         </div>
                     </button>
                 ))}
             </div>
           )}
        </div>
      </div>
    </>
  );
}

function TabButton({ active, label, count, onClick, color }: { active: boolean, label: string, count: number, onClick: () => void, color: 'rose' | 'blue' | 'gray' }) {
    const activeColors = {
        rose: 'text-rose-500 border-rose-500',
        blue: 'text-accent-blue border-accent-blue',
        gray: 'text-text-primary border-text-primary'
    };
    
    return (
        <button 
            onClick={onClick}
            className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider transition-all relative flex flex-col items-center gap-1.5 ${
                active ? activeColors[color] : 'text-text-secondary hover:text-text-primary border-transparent opacity-60 hover:opacity-100'
            }`}
        >
            <span className="flex items-center gap-1.5">
                {label}
                {count > 0 && (
                    <span className={`text-[9px] px-1.5 py-px rounded-full ${
                        active 
                            ? (color === 'rose' ? 'bg-rose-500/10' : color === 'blue' ? 'bg-accent-blue/10' : 'bg-white/10') 
                            : 'bg-white/5 text-text-muted'
                    }`}>
                        {count}
                    </span>
                )}
            </span>
            {active && <div className={`absolute bottom-0 left-0 w-full h-0.5 ${color === 'rose' ? 'bg-rose-500' : color === 'blue' ? 'bg-accent-blue' : 'bg-text-primary'}`} />}
        </button>
    );
}
