'use client';

import React, { useState, useEffect } from 'react';
import { usePomodoroTimer } from '@/hooks/usePomodoroTimer';
import TimerControls from '@/components/focus/TimerControls';
import FocusVisualizer, { VisualizationMode } from '@/components/focus/FocusVisualizer';
import VisualizationDropdown from '@/components/focus/VisualizationDropdown';
import useSoundEffects from '@/hooks/useSoundEffects';
import useAmbience from '@/hooks/useAmbience';
import FocusTaskSidebar from '@/components/focus/FocusTaskSidebar';
import { Task } from '@/types/v2';
import { Target, X, ListTodo } from 'lucide-react';

export default function FocusPage() {
  const { playClick, playWorkComplete, playBreakComplete } = useSoundEffects();
  const timer = usePomodoroTimer({}, {
    onWorkComplete: playWorkComplete,
    onBreakComplete: playBreakComplete
  });
  const { start: startAmbience, stop: stopAmbience } = useAmbience();
  const [visualMode, setVisualMode] = useState<VisualizationMode>('rays');
  const [isAmbienceEnabled, setIsAmbienceEnabled] = useState(false);
  
  // Task Integration
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Ambience Effect
  useEffect(() => {
    if (timer.isActive && isAmbienceEnabled) {
      startAmbience(visualMode);
    } else {
      stopAmbience();
    }
    // Cleanup on unmount
    return () => stopAmbience();
  }, [timer.isActive, isAmbienceEnabled, visualMode, startAmbience, stopAmbience]);

  const handleModeChange = (mode: VisualizationMode) => {
    playClick();
    setVisualMode(mode);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <FocusVisualizer 
        state={timer.state} 
        timeLeft={timer.timeLeft} 
        totalDuration={timer.totalDuration}
        mode={visualMode}
      />

      <header className="w-full flex justify-between items-center z-30 p-6">
        <h1 className="text-xl font-medium tracking-tight">Focus Mode</h1>
        
        <div className="flex items-center gap-4">
            <VisualizationDropdown
              currentMode={visualMode}
              onModeChange={handleModeChange}
            />
            
            {/* Ambience Toggle */}
            <button 
                onClick={() => {
                    playClick();
                    setIsAmbienceEnabled(!isAmbienceEnabled);
                }}
                className={`p-2 rounded-full transition-all ${
                    isAmbienceEnabled ? 'bg-white/20 text-white' : 'bg-transparent text-white/40 hover:text-white/80'
                }`}
                title="Toggle Ambience (Drone)"
            >
                 {isAmbienceEnabled ? (
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
                 ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                 )}
            </button>
            
            {/* Task List Toggle (Header Shortcut) */}
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/5"
                title="Open Task List"
            >
                <ListTodo size={20} />
            </button>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center w-full relative z-10 pointer-events-none"> 
         {/* Note: increased z-index for controls interaction, but we need this layer to let clicks pass through to controls if needed, 
             BUT we also want task selector to be interactive. 
             Ideally UI elements are in a z-layer above canvas.
             Let's make sure the specific interactive children have pointer-events-auto */}
             
        <div className="text-center mb-8 pointer-events-auto flex flex-col items-center">
           
           {/* Active Task Display - Moved to Top */}
           <div className="flex flex-col items-center gap-3 mb-8 relative z-20">
               {activeTask ? (
                   <button 
                       onClick={() => setIsSidebarOpen(true)}
                       className="flex items-center gap-3 bg-bg-secondary/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg animate-in fade-in slide-in-from-top-2 group hover:border-accent-blue/50 transition-all"
                   >
                       <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse"></span>
                       <span className="text-sm font-medium max-w-[200px] truncate">{activeTask.content}</span>
                       <div 
                         onClick={(e) => {
                             e.stopPropagation();
                             setActiveTask(null);
                         }}
                         className="p-1 hover:bg-white/10 rounded-full transition-colors ml-1 opacity-50 group-hover:opacity-100"
                         title="Clear Active Task"
                       >
                           <X size={14} />
                       </div>
                   </button>
               ) : (
                   <button
                     onClick={() => setIsSidebarOpen(true)}
                     className="flex items-center gap-2 text-sm text-white/50 hover:text-white hover:bg-white/10 px-4 py-2 rounded-full transition-all border border-transparent hover:border-white/10"
                   >
                       <Target size={16} />
                       <span>Set Focus Task</span>
                   </button>
               )}
           </div>

           <h2 className="text-7xl font-light mb-4 font-mono tracking-tighter tabular-nums drop-shadow-2xl">
            {formatTime(timer.timeLeft)}
           </h2>
           <p className="text-lg opacity-80 uppercase tracking-widest font-medium mb-8">{formatState(timer.state)}</p>
        </div>
      </main>

      <div className="w-full max-w-md z-20 pb-0">
        <TimerControls timer={timer} onInteraction={playClick} />
      </div>
      
      {/* Sidebar */}
      <FocusTaskSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onSelectTask={setActiveTask}
        activeTaskId={activeTask?.id}
      />
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatState(state: string): string {
  switch (state) {
    case 'work': return 'Focus';
    case 'shortBreak': return 'Short Break';
    case 'longBreak': return 'Long Break';
    case 'idle': return 'Ready';
    default: return state;
  }
}
