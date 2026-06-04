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
  timeLeft: number;
  totalDuration: number;
  onInteraction?: () => void;
}

export default function TimerControls({ timer, timeLeft, totalDuration, onInteraction }: TimerControlsProps) {
  const handleInteraction = (action: () => void) => {
    if (onInteraction) onInteraction();
    action();
  };

  const progress = totalDuration > 0 ? timeLeft / totalDuration : 1;
  const ringProgress = 1 - progress;

  const isBreak = timer.state === 'shortBreak' || timer.state === 'longBreak';
  const accentColor = isBreak ? '#10b981' : '#3b82f6';
  const buttonBg = isBreak 
    ? 'bg-emerald-600 text-white shadow-emerald-500/30' 
    : 'bg-blue-600 text-white shadow-blue-500/30';

  return (
    <div className="relative w-full flex justify-center pb-0">
      {/* Solid semicircle — perfect half-circle (border-radius = width/2). No border. */}
      <div 
        id="timer-controls-semicircle"
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[260px] sm:w-[320px] h-[130px] sm:h-[160px] rounded-t-[130px] sm:rounded-t-[160px] bg-bg-secondary z-0" 
      />

      {/* Progress ring — mobile */}
      <ProgressRingMobile 
        progress={ringProgress} 
        color={accentColor} 
      />
      {/* Progress ring — desktop */}
      <ProgressRingDesktop 
        progress={ringProgress} 
        color={accentColor} 
      />

      {/* Controls */}
      <div className="flex flex-col items-center gap-3 sm:gap-4 pt-6 sm:pt-6 pb-[calc(16px+env(safe-area-inset-bottom,0px))] sm:pb-[calc(24px+env(safe-area-inset-bottom,0px))] z-10 w-[240px] sm:w-[300px]">
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

        <div className="flex items-center gap-6">
          <button 
            onClick={() => handleInteraction(timer.skip)}
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all"
            aria-label="Skip"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
          </button>

          <button 
            onClick={() => handleInteraction(timer.isActive ? timer.pause : timer.start)}
            className={`w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-lg ${buttonBg}`}
            aria-label={timer.isActive ? "Pause" : "Start"}
          >
            {timer.isActive ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="opacity-90"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="translate-x-[2px] opacity-90"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            )}
          </button>
          
          <button 
            onClick={() => handleInteraction(timer.reset)}
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all"
            aria-label="Reset"
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"></path><path d="M3 3v9h9"></path></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/*
 * Mobile arc geometry: w=260, h=130, radius=130 (half-width = perfect semicircle)
 * viewBox: 0 0 260 130, center: (130, 130)
 */
function ProgressRingMobile({ progress, color }: { progress: number; color: string }) {
  const arcR = 130;
  const circ = Math.PI * arcR;
  const offset = circ * (1 - progress);

  return (
    <svg
      className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-[5] pointer-events-none sm:hidden"
      width="260" height="130"
      viewBox="0 0 260 130"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 0 130 A 130 130 0 0 1 260 130"
        fill="none" stroke="white" strokeWidth="3"
        strokeLinecap="round" opacity="0.1"
      />
      <path
        d="M 0 130 A 130 130 0 0 1 260 130"
        fill="none" stroke={color} strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

/*
 * Desktop arc geometry: w=320, h=160, radius=160 (half-width = perfect semicircle)
 * viewBox: 0 0 320 160, center: (160, 160)
 */
function ProgressRingDesktop({ progress, color }: { progress: number; color: string }) {
  const arcR = 160;
  const circ = Math.PI * arcR;
  const offset = circ * (1 - progress);

  return (
    <svg
      className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-[5] pointer-events-none hidden sm:block"
      width="320" height="160"
      viewBox="0 0 320 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 0 160 A 160 160 0 0 1 320 160"
        fill="none" stroke="white" strokeWidth="3"
        strokeLinecap="round" opacity="0.1"
      />
      <path
        d="M 0 160 A 160 160 0 0 1 320 160"
        fill="none" stroke={color} strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}
