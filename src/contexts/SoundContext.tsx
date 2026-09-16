'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import useAmbience, { AmbienceMode, MusicSource } from '@/hooks/useAmbience';

const PREFERENCES_STORAGE_KEY = 'the-docket-focus-preferences';

interface SoundContextType {
  ambienceMode: AmbienceMode;
  musicSource: MusicSource;
  isPlaying: boolean;
  volume: number;
  setAmbienceMode: (mode: AmbienceMode) => void;
  setMusicSource: (source: MusicSource) => void;
  setVolume: (v: number) => void;
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
  const { start: startAmbience, stop: stopAmbience, startMusicSource, stopMusicAndStream, setVolume: setVolumeHook } = useAmbience();
  const [ambienceMode, setAmbienceModeState] = useState<AmbienceMode>('none');
  const [musicSource, setMusicSourceState] = useState<MusicSource>('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumeState, setVolumeState] = useState(0.6);
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

        let vol = 0.6;
        if ('volume' in parsed && typeof parsed.volume === 'number') {
          vol = Math.max(0, Math.min(1, parsed.volume));
        }

        // Validate
        if (['brown-noise', 'rain', 'snow', 'orbit', 'none'].includes(ambMode)) {
          setAmbienceModeState(ambMode);
        }
        if (['pentatonic', 'runtime_loop', 'warm_boot', 'none'].includes(musSource)) {
          setMusicSourceState(musSource);
        }
        setVolumeState(vol);
        setVolumeHook(vol);
      }
    } catch (e) {
      console.error('Failed to load sound preferences', e);
    }
    isInitializedRef.current = true;
  }, [setVolumeHook]);

  // Persist to localStorage whenever selections change
  const persistSelections = useCallback((amb: AmbienceMode, mus: MusicSource, vol?: number) => {
    try {
      const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      const prefs = raw ? JSON.parse(raw) : {};
      prefs.ambienceMode = amb;
      prefs.musicSource = mus;
      if (vol !== undefined) {
        prefs.volume = vol;
      }
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
    persistSelections(mode, musicSource, volumeState);
    updatePlayingState(mode, musicSource);
  }, [startAmbience, stopAmbience, musicSource, volumeState, persistSelections, updatePlayingState]);

  const setMusicSource = useCallback((source: MusicSource) => {
    setMusicSourceState(source);
    if (source !== 'none') {
      startMusicSource(source);
    } else {
      stopMusicAndStream();
    }
    persistSelections(ambienceMode, source, volumeState);
    updatePlayingState(ambienceMode, source);
  }, [startMusicSource, stopMusicAndStream, ambienceMode, volumeState, persistSelections, updatePlayingState]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    setVolumeHook(clamped);
    persistSelections(ambienceMode, musicSource, clamped);
  }, [ambienceMode, musicSource, setVolumeHook, persistSelections]);

  const stopAll = useCallback(() => {
    stopAmbience();
    stopMusicAndStream();
    setAmbienceModeState('none');
    setMusicSourceState('none');
    persistSelections('none', 'none', volumeState);
    setIsPlaying(false);
  }, [stopAmbience, stopMusicAndStream, volumeState, persistSelections]);

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
      volume: volumeState,
      setAmbienceMode,
      setMusicSource,
      setVolume,
      stopAll,
    }}>
      {children}
    </SoundContext.Provider>
  );
}