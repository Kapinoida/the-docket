import { useState, useEffect } from 'react';
import { VisualizationMode } from '@/components/focus/FocusVisualizer';

const PREFERENCES_STORAGE_KEY = 'the-docket-focus-preferences';

interface FocusPreferences {
  visualMode: VisualizationMode;
  isAmbienceEnabled: boolean;
  isMusicEnabled: boolean;
}

const DEFAULT_PREFERENCES: FocusPreferences = {
  visualMode: 'rays',
  isAmbienceEnabled: false,
  isMusicEnabled: false, // Default to off
};

export function useFocusPreferences() {
  const [preferences, setPreferences] = useState<FocusPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...parsed,
        });
      } catch (e) {
        console.error('Failed to parse focus preferences', e);
      }
    }
    setIsLoaded(true);
  }, []);

  const persist = (newPreferences: FocusPreferences) => {
    setPreferences(newPreferences);
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(newPreferences));
  };

  const setVisualMode = (mode: VisualizationMode) => {
    persist({ ...preferences, visualMode: mode });
  };

  const setIsAmbienceEnabled = (enabled: boolean) => {
    persist({ ...preferences, isAmbienceEnabled: enabled });
  };

  const setIsMusicEnabled = (enabled: boolean) => {
    persist({ ...preferences, isMusicEnabled: enabled });
  };

  return {
    visualMode: preferences.visualMode,
    isAmbienceEnabled: preferences.isAmbienceEnabled,
    isMusicEnabled: preferences.isMusicEnabled,
    setVisualMode,
    setIsAmbienceEnabled,
    setIsMusicEnabled,
    isLoaded,
  };
}
