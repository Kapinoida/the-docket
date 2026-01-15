'use client';

import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Zap, Brain } from 'lucide-react';
import { PomodoroSettings } from '@/hooks/usePomodoroTimer';
import { FocusMode } from '@/hooks/usePomodoroSettings';

interface FocusSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // We now pass all profiles
  profiles: Record<FocusMode, PomodoroSettings>;
  onSave: (mode: FocusMode, newSettings: PomodoroSettings) => void;
  activeMode: FocusMode;
}

export default function FocusSettingsModal({ isOpen, onClose, profiles, onSave, activeMode }: FocusSettingsModalProps) {
  // We edit one mode at a time, defaulting to the active one when opened
  const [editingMode, setEditingMode] = useState<FocusMode>(activeMode);
  const [formData, setFormData] = useState<PomodoroSettings>(profiles[activeMode]);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditingMode(activeMode);
      setFormData(profiles[activeMode]);
    }
  }, [isOpen, activeMode, profiles]);

  // When switching tabs, save pending changes? Or just switch view?
  // Let's switch view to keep it simple, but we should probably init formData with new mode.
  // Ideally we should manage state for BOTH in the form, but let's keep it simple: 
  // Select tab -> load that profile into form.
  // Warning: Unsaved changes in the previous tab would be lost if we don't track them.
  // Better approach: Track both in a local object.
  const [localProfiles, setLocalProfiles] = useState(profiles);

  useEffect(() => {
     if (isOpen) {
         setLocalProfiles(profiles);
     }
  }, [isOpen, profiles]);

  const currentSettings = localProfiles[editingMode];

  const handleLocalChange = (field: keyof PomodoroSettings, value: number) => {
    setLocalProfiles(prev => ({
        ...prev,
        [editingMode]: {
            ...prev[editingMode],
            [field]: value
        }
    }));
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save both profiles? Or just the one we edited?
    // The prop onSave takes (mode, settings). Let's save both.
    onSave('normal', localProfiles.normal);
    onSave('deep', localProfiles.deep);
    onClose();
  };

  // Helper to convert seconds to minutes for display
  const toMinutes = (seconds: number) => Math.floor(seconds / 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-bg-secondary border border-border-default rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-border-default bg-bg-tertiary/30 shrink-0">
          <h2 className="text-lg font-semibold text-text-primary">Focus Settings</h2>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-md hover:bg-bg-tertiary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 mx-6 mt-6 bg-bg-tertiary rounded-lg shrink-0">
            <button
                type="button"
                onClick={() => setEditingMode('normal')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all ${
                    editingMode === 'normal' 
                        ? 'bg-bg-secondary text-accent-blue shadow-sm' 
                        : 'text-text-secondary hover:text-text-primary'
                }`}
            >
                <Zap size={14} />
                Normal
            </button>
            <button
                type="button"
                onClick={() => setEditingMode('deep')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all ${
                    editingMode === 'deep' 
                        ? 'bg-bg-secondary text-purple-400 shadow-sm' 
                        : 'text-text-secondary hover:text-text-primary'
                }`}
            >
                <Brain size={14} />
                Deep Work
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                {editingMode === 'normal' ? 'Normal Mode' : 'Deep Work Mode'} Timers
            </h3>
            
            <div className="space-y-2">
              <label className="flex justify-between items-center text-sm font-medium text-text-primary">
                Focus Duration
                <input 
                  type="number" 
                  min="1" 
                  max="120"
                  value={toMinutes(currentSettings.workDuration)}
                  onChange={(e) => handleLocalChange('workDuration', parseInt(e.target.value || '0') * 60)}
                  className="w-20 bg-bg-tertiary/50 border border-border-default rounded px-3 py-1.5 text-right focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="flex justify-between items-center text-sm font-medium text-text-primary">
                Short Break
                <input 
                  type="number" 
                  min="1" 
                  max="60"
                  value={toMinutes(currentSettings.shortBreakDuration)}
                  onChange={(e) => handleLocalChange('shortBreakDuration', parseInt(e.target.value || '0') * 60)}
                  className="w-20 bg-bg-tertiary/50 border border-border-default rounded px-3 py-1.5 text-right focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="flex justify-between items-center text-sm font-medium text-text-primary">
                Long Break
                <input 
                  type="number" 
                  min="1" 
                  max="60"
                  value={toMinutes(currentSettings.longBreakDuration)}
                  onChange={(e) => handleLocalChange('longBreakDuration', parseInt(e.target.value || '0') * 60)}
                  className="w-20 bg-bg-tertiary/50 border border-border-default rounded px-3 py-1.5 text-right focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
                />
              </label>
            </div>
          </div>

          <div className="h-px bg-border-default" />

          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Intervals</h3>
            
            <div className="space-y-2">
              <label className="flex justify-between items-center text-sm font-medium text-text-primary">
                Long Break After
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="1" 
                    max="10"
                    value={currentSettings.sessionsUntilLongBreak}
                    onChange={(e) => handleLocalChange('sessionsUntilLongBreak', parseInt(e.target.value || '4'))}
                    className="w-20 bg-bg-tertiary/50 border border-border-default rounded px-3 py-1.5 text-right focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
                  />
                  <span className="text-text-secondary text-sm">sessions</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 shrink-0">
            <button
               type="button"
               onClick={() => {
                   // Reset current mode only
                   handleLocalChange('workDuration', editingMode === 'normal' ? 25*60 : 40*60);
                   handleLocalChange('shortBreakDuration', editingMode === 'normal' ? 5*60 : 10*60);
                   handleLocalChange('longBreakDuration', editingMode === 'normal' ? 15*60 : 20*60);
                   handleLocalChange('sessionsUntilLongBreak', 4);
               }}
               className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors flex items-center gap-2 mr-auto"
            >
               <RotateCcw size={14} />
               Reset Mode
            </button>
            
            <button
              type="submit"
              className="px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 font-medium"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

