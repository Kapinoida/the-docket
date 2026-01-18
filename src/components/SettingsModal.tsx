'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { CalDAVSettings } from './CalDAVSettings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: Props) {
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const paused = localStorage.getItem('docket_sync_paused') === 'true';
      setIsPaused(paused);
    }
  }, [isOpen]);

  const togglePause = () => {
    const newState = !isPaused;
    setIsPaused(newState);
    localStorage.setItem('docket_sync_paused', String(newState));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">General Settings</h2>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Pause Auto-Sync
              </label>
              <button
                onClick={togglePause}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${isPaused ? 'bg-blue-600' : 'bg-gray-200 dark:bg-zinc-700'}
                `}
                role="switch"
                aria-checked={isPaused}
              >
                <span
                  aria-hidden="true"
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${isPaused ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Prevent background synchronization tasks from running. Manual sync can still be triggered.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-zinc-800 pt-4">
            <h2 className="text-lg font-semibold mb-4">Sync Settings</h2>
            <CalDAVSettings />
          </div>
        </div>
      </div>
    </div>
  );
}
