'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * useState backed by localStorage. Survives page reloads and navigation.
 * Falls back to the default value if localStorage is unavailable (SSR) or the key is missing.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(`docket_${key}`);
      if (stored !== null) return JSON.parse(stored);
    } catch {
      // corrupted or unavailable — fall through
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(`docket_${key}`, JSON.stringify(state));
    } catch {
      // quota exceeded or unavailable — silently ignore
    }
  }, [key, state]);

  return [state, setState];
}

/**
 * Same as usePersistedState but value is stored/retrieved as a raw string (no JSON.parse/stringify).
 * Use for simple string values where JSON wrapping adds unnecessary quotes.
 */
export function usePersistedString(
  key: string,
  defaultValue: string = ''
): [string, (value: string | ((prev: string) => string)) => void] {
  const [state, setState] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(`docket_${key}`);
      return stored !== null ? stored : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`docket_${key}`, state);
    } catch {
      // silently ignore
    }
  }, [key, state]);

  return [state, setState];
}
