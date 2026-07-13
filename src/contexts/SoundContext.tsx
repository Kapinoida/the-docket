'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import useAmbience, { AmbienceMode, MusicSource } from '@/hooks/useAmbience';

const PREFERENCES_STORAGE_KEY = 'the-docket-focus-preferences';

interface SoundContextType {
  ambienceMode: AmbienceMode;
  musicSource: MusicSource;
  isPlaying: boolean;
  setAmbienceMode: (mode: AmbienceMode) => void;
  setMusicSource: (source: MusicSource) => void;
  stopAll: () => void;
}

const SoundContext = createContext<SoundContextType | null>(null);

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};

export function SoundProvider({ children }: { children: ReactNode }) {
  const { start: startAmbience, stop: stopAmbience, startMusicSource, stopMusicAndStream } = useAmbience();
  const [ambienceMode, setAmbienceModeState] = useState<AmbienceMode>('none');
  const [musicSource, setMusicSourceState] = useState<MusicSource>('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const isInitializedRef = useRef(false);

  // Load from localStorage on mount — restore saved selections but do NOT auto-play
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Migration: convert old boolean keys to new string selectors
        let ambMode: AmbienceMode = 'none';
        let musSource: MusicSource = 'none';

        if ('ambienceMode' in parsed) {
          ambMode = parsed.ambienceMode;
        } else if ('isAmbienceEnabled' in parsed) {
          ambMode = parsed.isAmbienceEnabled ? 'brown-noise' : 'none';
        }

        if ('musicSource' in parsed) {
          musSource = parsed.musicSource;
        } else if ('isMusicEnabled' in parsed) {
          musSource = parsed.isMusicEnabled ? 'pentatonic' : 'none';
        }

        // Validate
        if (['brown-noise', 'rain', 'snow', 'orbit', 'none'].includes(ambMode)) {
          setAmbienceModeState(ambMode);
        }
        if (['pentatonic', 'runtime_loop', 'warm_boot', 'none'].includes(musSource)) {
          setMusicSourceState(musSource);
        }
      }
    } catch (e) {
      console.error('Failed to load sound preferences', e);
    }
    isInitializedRef.current = true;
  }, []);

  // Persist to localStorage whenever selections change
  const persistSelections = useCallback((amb: AmbienceMode, mus: MusicSource) => {
    try {
      const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      const prefs = raw ? JSON.parse(raw) : {};
      prefs.ambienceMode = amb;
      prefs.musicSource = mus;
      // Remove old boolean keys if they still exist
      delete prefs.isAmbienceEnabled;
      delete prefs.isMusicEnabled;
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.error('Failed to persist sound preferences', e);
    }
  }, []);

  const updatePlayingState = useCallback((amb: AmbienceMode, mus: MusicSource) => {
    setIsPlaying(amb !== 'none' || mus !== 'none');
  }, []);

  const setAmbienceMode = useCallback((mode: AmbienceMode) => {
    setAmbienceModeState(mode);
    if (mode !== 'none') {
      startAmbience(mode);
    } else {
      stopAmbience();
    }
    persistSelections(mode, musicSource);
    updatePlayingState(mode, musicSource);
  }, [startAmbience, stopAmbience, musicSource, persistSelections, updatePlayingState]);

  const setMusicSource = useCallback((source: MusicSource) => {
    setMusicSourceState(source);
    if (source !== 'none') {
      startMusicSource(source);
    } else {
      stopMusicAndStream();
    }
    persistSelections(ambienceMode, source);
    updatePlayingState(ambienceMode, source);
  }, [startMusicSource, stopMusicAndStream, ambienceMode, persistSelections, updatePlayingState]);

  const stopAll = useCallback(() => {
    stopAmbience();
    stopMusicAndStream();
    setAmbienceModeState('none');
    setMusicSourceState('none');
    persistSelections('none', 'none');
    setIsPlaying(false);
  }, [stopAmbience, stopMusicAndStream, persistSelections]);

  // Cleanup only on tab close — NOT on React unmount (so audio persists across SPA navigation)
  useEffect(() => {
    const handleBeforeUnload = () => {
      stopAmbience();
      stopMusicAndStream();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [stopAmbience, stopMusicAndStream]);

  return (
    <SoundContext.Provider value={{
      ambienceMode,
      musicSource,
      isPlaying,
      setAmbienceMode,
      setMusicSource,
      stopAll,
    }}>
      {children}
    </SoundContext.Provider>
  );
}