'use client';

import { X } from 'lucide-react';
import { CalDAVSettings } from './CalDAVSettings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: Props) {
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
        
        <div className="mt-2">
          <CalDAVSettings />
        </div>
      </div>
    </div>
  );
}
