import { useState, useEffect } from 'react';
import { VisualizationMode } from '@/components/focus/FocusVisualizer';
import type { AmbienceMode, MusicSource } from '@/hooks/useAmbience';

const PREFERENCES_STORAGE_KEY = 'the-docket-focus-preferences';

interface FocusPreferences {
  visualMode: VisualizationMode;
  ambienceMode: AmbienceMode;
  musicSource: MusicSource;
}

const DEFAULT_PREFERENCES: FocusPreferences = {
  visualMode: 'rays',
  ambienceMode: 'none',
  musicSource: 'none',
};

export function useFocusPreferences() {
  const [preferences, setPreferences] = useState<FocusPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Migration: convert old boolean keys to new string selectors
        const migrated: Partial<FocusPreferences> = { ...parsed };

        if ('isAmbienceEnabled' in parsed) {
          migrated.ambienceMode = parsed.isAmbienceEnabled ? 'brown-noise' : 'none';
          delete (migrated as Record<string, unknown>).isAmbienceEnabled;
        }
        if ('isMusicEnabled' in parsed) {
          migrated.musicSource = parsed.isMusicEnabled ? 'pentatonic' : 'none';
          delete (migrated as Record<string, unknown>).isMusicEnabled;
        }

        // Validate string values are known
        if (migrated.ambienceMode && !['brown-noise', 'rain', 'snow', 'orbit', 'none'].includes(migrated.ambienceMode)) {
          delete migrated.ambienceMode;
        }
        if (migrated.musicSource && !['pentatonic', 'runtime_loop', 'warm_boot', 'none'].includes(migrated.musicSource)) {
          delete migrated.musicSource;
        }

        // Persist migrated format back to localStorage
        const merged = { ...DEFAULT_PREFERENCES, ...migrated };
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(merged));
        setPreferences(merged);
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

  const setAmbienceMode = (mode: AmbienceMode) => {
    persist({ ...preferences, ambienceMode: mode });
  };

  const setMusicSource = (source: MusicSource) => {
    persist({ ...preferences, musicSource: source });
  };

  return {
    visualMode: preferences.visualMode,
    ambienceMode: preferences.ambienceMode,
    musicSource: preferences.musicSource,
    setVisualMode,
    setAmbienceMode,
    setMusicSource,
    isLoaded,
  };
}