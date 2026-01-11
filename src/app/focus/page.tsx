'use client';

import React, { useState, useEffect } from 'react';
import { usePomodoroTimer } from '@/hooks/usePomodoroTimer';
import TimerControls from '@/components/focus/TimerControls';
import FocusVisualizer, { VisualizationMode } from '@/components/focus/FocusVisualizer';
import VisualizationDropdown from '@/components/focus/VisualizationDropdown';
import useSoundEffects from '@/hooks/useSoundEffects';
import useAmbience from '@/hooks/useAmbience';

export default function FocusPage() {
  const { playClick, playWorkComplete, playBreakComplete } = useSoundEffects();
  const timer = usePomodoroTimer({}, {
    onWorkComplete: playWorkComplete,
    onBreakComplete: playBreakComplete
  });
  const { start: startAmbience, stop: stopAmbience } = useAmbience();
  const [visualMode, setVisualMode] = useState<VisualizationMode>('rays');
  const [isAmbienceEnabled, setIsAmbienceEnabled] = useState(false);

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
            className={`mt-4 p-3 rounded-full transition-all ${
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
        <button className="p-2 opacity-50 hover:opacity-100 transition-opacity">
          Settings
        </button>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center w-full relative z-10">
        <div className="text-center mb-12">
           <h2 className="text-6xl font-light mb-2 font-mono">
            {formatTime(timer.timeLeft)}
           </h2>
           <p className="text-lg opacity-60 uppercase tracking-widest">{formatState(timer.state)}</p>
        </div>
      </main>

      <div className="w-full max-w-md z-20 pb-0">
        <TimerControls timer={timer} onInteraction={playClick} />
      </div>
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
