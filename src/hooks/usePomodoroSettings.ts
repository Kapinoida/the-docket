import { useState, useEffect } from 'react';
import { PomodoroSettings } from './usePomodoroTimer';

const SETTINGS_STORAGE_KEY = 'the-docket-pomodoro-settings';

export type FocusMode = 'normal' | 'deep';

interface PomodoroProfiles {
  normal: PomodoroSettings;
  deep: PomodoroSettings;
}

interface StoredSettings {
  activeMode: FocusMode;
  profiles: PomodoroProfiles;
}

const DEFAULT_NORMAL: PomodoroSettings = {
  workDuration: 25 * 60,
  shortBreakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  sessionsUntilLongBreak: 4,
};

const DEFAULT_DEEP: PomodoroSettings = {
  workDuration: 40 * 60,
  shortBreakDuration: 10 * 60,
  longBreakDuration: 20 * 60, // Deep work might need longer recharge
  sessionsUntilLongBreak: 0, // Deep work often implies longer singular blocks, but we'll stick to 0 or 4? Let's say 3 for deep. Usually deep work is 90m. 40m is 2x. Let's keep 4 but configurable. User asked for 40/10.
  // Actually, let's stick to standard count for deep unless specified.
};
// Correction on DEFAULT_DEEP based on user request "default of 40 working minutes with 10 minutes break"
const DEFAULT_DEEP_ADJUSTED: PomodoroSettings = {
    workDuration: 40 * 60,
    shortBreakDuration: 10 * 60,
    longBreakDuration: 20 * 60,
    sessionsUntilLongBreak: 4,
};

const DEFAULT_STORAGE: StoredSettings = {
  activeMode: 'normal',
  profiles: {
    normal: DEFAULT_NORMAL,
    deep: DEFAULT_DEEP_ADJUSTED,
  },
};

export function usePomodoroSettings() {
  const [stored, setStored] = useState<StoredSettings>(DEFAULT_STORAGE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        
        // Migration check: If it looks like the old single-object settings
        if ('workDuration' in parsed && !('profiles' in parsed)) {
            // Old format, migrate it to 'normal' profile
            setStored({
                activeMode: 'normal',
                profiles: {
                    normal: { ...DEFAULT_NORMAL, ...parsed },
                    deep: DEFAULT_DEEP_ADJUSTED
                }
            });
        } else {
            // Assume new format or valid partial
            setStored(prev => ({
                ...prev,
                ...parsed,
                profiles: {
                    ...prev.profiles,
                    ...(parsed.profiles || {})
                }
            }));
        }
      } catch (e) {
        console.error('Failed to parse pomodoro settings', e);
      }
    }
    setIsLoaded(true);
  }, []);

  const persist = (newState: StoredSettings) => {
    setStored(newState);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newState));
  };

  const updateProfile = (mode: FocusMode, updates: Partial<PomodoroSettings>) => {
    const newState = {
        ...stored,
        profiles: {
            ...stored.profiles,
            [mode]: {
                ...stored.profiles[mode],
                ...updates
            }
        }
    };
    persist(newState);
  };

  const setMode = (mode: FocusMode) => {
    persist({ ...stored, activeMode: mode });
  };

  return {
    activeMode: stored.activeMode,
    settings: stored.profiles[stored.activeMode], // The active settings to use for timer
    profiles: stored.profiles, // All profiles for editing
    updateProfile,
    setMode,
    isLoaded
  };
}

