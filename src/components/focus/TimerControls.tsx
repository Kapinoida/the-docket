'use client';

import React from 'react';
import { TimerState } from '@/hooks/usePomodoroTimer';

interface TimerControlsProps {
  timer: {
    isActive: boolean;
    state: TimerState;
    sessionCount: number;
    start: () => void;
    pause: () => void;
    skip: () => void;
    reset: () => void;
  };
  onInteraction?: () => void;
}

export default function TimerControls({ timer, onInteraction }: TimerControlsProps) {
  const handleInteraction = (action: () => void) => {
    if (onInteraction) onInteraction();
    action();
  };

  return (
    <div className="relative w-full flex justify-center pb-8">
      {/* Semicircle Background */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[320px] h-[160px] bg-bg-secondary rounded-t-[160px] border-t border-border-default shadow-2xl backdrop-blur-sm -z-10"></div>
      
      <div className="flex flex-col items-center gap-6 pt-8 z-10 w-[300px]">
        {/* Session Counter */}
        <div className="flex gap-1">
           {Array.from({ length: 4 }).map((_, i) => (
             <div 
               key={i}
               className={`w-2 h-2 rounded-full ${
                 i < (timer.sessionCount % 4) 
                   ? 'bg-blue-400' 
                   : i === (timer.sessionCount % 4) && timer.state === 'work'
                     ? 'bg-accent-blue/50 animate-pulse'
                     : 'bg-bg-accent'
               }`}
             />
           ))}
        </div>

        {/* Main Controls */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => handleInteraction(timer.skip)}
            className="p-3 rounded-full hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all"
            aria-label="Skip"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
          </button>

          <button 
            onClick={() => handleInteraction(timer.isActive ? timer.pause : timer.start)}
            className={`w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-lg ${
              timer.state === 'work' ? 'bg-blue-600 text-white shadow-blue-500/30' :
              timer.state === 'shortBreak' || timer.state === 'longBreak' ? 'bg-emerald-600 text-white shadow-emerald-500/30' :
              'bg-blue-600 text-white shadow-blue-500/30' // Idle: Blue for "Start Focus"
            }`}
            aria-label={timer.isActive ? "Pause" : "Start"}
          >
            {timer.isActive ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="opacity-90"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="ml-1 opacity-90"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            )}
          </button>
          
          <button 
            onClick={() => handleInteraction(timer.reset)}
            className="p-3 rounded-full hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all"
            aria-label="Reset"
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"></path><path d="M3 3v9h9"></path></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
