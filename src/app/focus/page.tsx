'use client';

import React, { useState, useEffect } from 'react';
import { usePomodoroTimer } from '@/hooks/usePomodoroTimer';
import { usePomodoroSettings } from '@/hooks/usePomodoroSettings';
import TimerControls from '@/components/focus/TimerControls';
import FocusVisualizer, { VisualizationMode } from '@/components/focus/FocusVisualizer';
import VisualizationDropdown from '@/components/focus/VisualizationDropdown';
import FocusSettingsModal from '@/components/focus/FocusSettingsModal';
import useSoundEffects from '@/hooks/useSoundEffects';
import useAmbience from '@/hooks/useAmbience';
import { useFocusPreferences } from '@/hooks/useFocusPreferences';
import FocusTaskSidebar from '@/components/focus/FocusTaskSidebar';
import { Task } from '@/types/v2';
import { Target, X, ListTodo, Settings, Zap, Brain, Music } from 'lucide-react';

export default function FocusPage() {
  const { playClick, playWorkComplete, playBreakComplete } = useSoundEffects();
  const { settings, profiles, updateProfile, activeMode, setMode, isLoaded } = usePomodoroSettings();
  
  // Initialize timer with settings once loaded
  const timer = usePomodoroTimer(isLoaded ? settings : {}, {
    onWorkComplete: playWorkComplete,
    onBreakComplete: playBreakComplete
  });

  const { start: startAmbience, stop: stopAmbience, startMusic, stopMusic } = useAmbience();
  const { 
      visualMode, 
      isAmbienceEnabled, 
      isMusicEnabled,
      setVisualMode, 
      setIsAmbienceEnabled,
      setIsMusicEnabled
  } = useFocusPreferences();
  
  // Task Integration
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Ambience Effect
  useEffect(() => {
    if (timer.isActive && isAmbienceEnabled) {
      startAmbience(visualMode);
    } else {
      stopAmbience();
    }
    // Cleanup on unmount handled by hook, but explicit stop is good for toggle responsiveness
  }, [timer.isActive, isAmbienceEnabled, visualMode, startAmbience, stopAmbience]);

  // Music Effect
  useEffect(() => {
    if (timer.isActive && isMusicEnabled) {
      startMusic();
    } else {
      stopMusic();
    }
  }, [timer.isActive, isMusicEnabled, startMusic, stopMusic]);

  const handleModeChange = (mode: VisualizationMode) => {
    playClick();
    setVisualMode(mode);
  };

  // Prevent hydration mismatch or flash of default settings by not rendering critical parts until loaded
  // or just accept smooth transition. Timer handles initial props gracefully.

  return (
    <div className="flex flex-col items-center justify-between flex-1 min-h-0 bg-bg-primary text-text-primary overflow-hidden relative pb-[60px] md:pb-0">
      <FocusVisualizer 
        state={timer.state} 
        timeLeft={timer.timeLeft} 
        totalDuration={timer.totalDuration}
        mode={visualMode}
      />

      {/* Compact single-row header */}
      <header className="w-full flex items-center justify-between z-30 p-3 sm:p-4 gap-2 shrink-0">
        <h1 className="text-sm sm:text-lg font-medium tracking-tight shrink-0">Focus</h1>
        
        <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Mode Toggle — icons only on mobile */}
            <div className="flex bg-white/10 rounded-full p-0.5 sm:p-1 border border-white/5">
                <button
                    onClick={() => { if (activeMode !== 'normal') { playClick(); setMode('normal'); } }}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-all ${
                        activeMode === 'normal' 
                            ? 'bg-accent-blue text-white shadow-sm' 
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                    title="Normal Mode"
                >
                    <Zap size={14} />
                    <span className="hidden sm:inline">Normal</span>
                </button>
                <button
                    onClick={() => { if (activeMode !== 'deep') { playClick(); setMode('deep'); } }}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-all ${
                        activeMode === 'deep' 
                            ? 'bg-purple-500 text-white shadow-sm' 
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                    title="Deep Work Mode"
                >
                    <Brain size={14} />
                    <span className="hidden sm:inline">Deep</span>
                </button>
            </div>

            <VisualizationDropdown
              currentMode={visualMode}
              onModeChange={handleModeChange}
            />
            
            {/* Ambience & Music — compact */}
            <div className="flex items-center gap-0.5 bg-white/10 rounded-full p-0.5 border border-white/5">
                <button 
                    onClick={() => { playClick(); setIsAmbienceEnabled(!isAmbienceEnabled); }}
                    className={`p-1.5 sm:p-2 rounded-full transition-all ${
                        isAmbienceEnabled ? 'bg-white/20 text-white' : 'bg-transparent text-white/40 hover:text-white/80'
                    }`}
                    title="Toggle Ambience"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>{!isAmbienceEnabled && <line x1="2" y1="2" x2="22" y2="22"></line>}</svg>
                </button>
                <button 
                    onClick={() => { playClick(); setIsMusicEnabled(!isMusicEnabled); }}
                    className={`p-1.5 sm:p-2 rounded-full transition-all ${
                        isMusicEnabled ? 'bg-white/20 text-white' : 'bg-transparent text-white/40 hover:text-white/80'
                    }`}
                    title="Toggle Music"
                >
                     <Music size={16} className={`sm:w-5 sm:h-5 ${!isMusicEnabled ? "opacity-50" : ""}`} />
                </button>
            </div>
            
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 sm:p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/5"
                title="Timer Settings"
            >
                <Settings size={16} className="sm:w-5 sm:h-5" />
            </button>

            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 sm:p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/5"
                title="Open Task List"
            >
                <ListTodo size={16} className="sm:w-5 sm:h-5" />
            </button>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center w-full relative z-10 pointer-events-none min-h-0 py-4"> 
        <div className="text-center pointer-events-auto flex flex-col items-center gap-3 sm:gap-4">
           
           {/* Active Task Display — compact pill */}
           <div className="relative z-20 min-h-[28px] flex items-center">
               {activeTask ? (
                   <button 
                       onClick={() => setIsSidebarOpen(true)}
                       className="flex items-center gap-2 bg-bg-secondary/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-lg group hover:border-accent-blue/50 transition-all"
                   >
                       <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse"></span>
                       <span className="text-xs sm:text-sm font-medium max-w-[160px] truncate">{activeTask.content}</span>
                       <div 
                         onClick={(e) => { e.stopPropagation(); setActiveTask(null); }}
                         className="p-0.5 hover:bg-white/10 rounded-full transition-colors opacity-40 group-hover:opacity-100"
                         title="Clear Active Task"
                       >
                           <X size={12} />
                       </div>
                   </button>
               ) : (
                   <button
                     onClick={() => setIsSidebarOpen(true)}
                     className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 hover:bg-white/5 px-3 py-1 rounded-full transition-all"
                   >
                       <Target size={12} />
                       <span>Set Focus Task</span>
                   </button>
               )}
           </div>

           <h2 className="text-5xl sm:text-6xl md:text-7xl font-light font-mono tracking-tighter tabular-nums drop-shadow-2xl leading-none">
            {formatTime(timer.timeLeft)}
           </h2>
           <p className="text-sm sm:text-lg opacity-80 uppercase tracking-widest font-medium">
            {timer.state === 'work' && activeMode === 'deep' ? 'Deep Work' : formatState(timer.state)}
           </p>
        </div>
      </main>

      <div className="w-full max-w-md relative z-20 pb-safe shrink-0">
        <TimerControls timer={timer} timeLeft={timer.timeLeft} totalDuration={timer.totalDuration} onInteraction={playClick} />
      </div>
      
      {/* Sidebar */}
      <FocusTaskSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onSelectTask={setActiveTask}
        activeTaskId={activeTask?.id}
      />

      {/* Settings Modal */}
      <FocusSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profiles={profiles}
        activeMode={activeMode}
        onSave={updateProfile}
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
