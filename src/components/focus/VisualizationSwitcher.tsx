'use client';

import React from 'react';
import { VisualizationMode } from './FocusVisualizer';

interface VisualizationSwitcherProps {
  currentMode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
}

export default function VisualizationSwitcher({ currentMode, onModeChange }: VisualizationSwitcherProps) {
  const modes: { id: VisualizationMode; label: string; icon: React.ReactNode }[] = [
    { 
      id: 'rays', 
      label: 'Rays',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
    },
    { 
      id: 'particles', 
      label: 'Particles',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="6" r="1"/><circle cx="12" cy="18" r="1"/><circle cx="6" cy="12" r="1"/><circle cx="18" cy="12" r="1"/></svg>
    },
    { 
      id: 'waves', 
      label: 'Waves',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
    },
    { 
      id: 'stream', 
      label: 'Flow',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
    },
    { 
      id: 'flame', 
      label: 'Flame',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
    },
    { 
      id: 'hex', 
      label: 'Hex',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><circle cx="12" cy="12" r="3"/></svg>
    },
    { 
      id: 'ascent', 
      label: 'Ascent',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
    },
    { 
      id: 'orbit', 
      label: 'Orbit',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M12 19a7 7 0 0 1 0-14"/><path d="M19 12a7 7 0 0 1-14 0"/></svg>
    },
    { 
      id: 'rain', 
      label: 'Rain',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 19v2"/><path d="M8 13v2"/><path d="M16 19v2"/><path d="M16 13v2"/><path d="M12 21v2"/><path d="M12 15v2"/></svg>
    },
    { 
      id: 'snow', 
      label: 'Snow',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10 20-3-3"/><path d="m14 16-3 3"/><path d="M12 2v20"/><path d="m20 10-3 3"/><path d="m16 14-3-3"/><path d="M22 12H2"/><path d="m10 4 3 3"/><path d="m14 8-3-3"/><path d="m4 10 3 3"/><path d="m8 14-3-3"/></svg>
    },
    { 
      id: 'constellation', 
      label: 'Net',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 3v18h18"/><path d="M7 17l3.293-3.293a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 0 1.414 0l5.293-5.293"/></svg>
    },
  ];

  return (
    <div className="flex gap-2 bg-bg-secondary backdrop-blur-md p-1 rounded-full border border-border-default overflow-x-auto max-w-full">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all whitespace-nowrap ${
            currentMode === mode.id 
              ? 'bg-bg-tertiary text-accent-blue shadow-sm font-medium' 
              : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary/50'
          }`}
        >
          {mode.icon}
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
