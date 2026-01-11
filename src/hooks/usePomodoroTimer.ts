import { useState, useEffect, useCallback, useRef } from 'react';

export type TimerState = 'idle' | 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroSettings {
  workDuration: number; // in seconds
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25 * 60,
  shortBreakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  sessionsUntilLongBreak: 4,
};

export interface PomodoroCallbacks {
  onWorkComplete?: () => void;
  onBreakComplete?: () => void;
}

export function usePomodoroTimer(initialSettings: Partial<PomodoroSettings> = {}, callbacks?: PomodoroCallbacks) {
  const settings = { ...DEFAULT_SETTINGS, ...initialSettings };
  
  const [state, setState] = useState<TimerState>('idle');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration);
  const [isActive, setIsActive] = useState(false);
  const [sessionCount, setSessionCount] = useState(0); // Completed work sessions
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const switchState = useCallback((newState: TimerState) => {
    setState(newState);
    setIsActive(false);
    
    switch (newState) {
      case 'work':
        setTimeLeft(settings.workDuration);
        break;
      case 'shortBreak':
        setTimeLeft(settings.shortBreakDuration);
        break;
      case 'longBreak':
        setTimeLeft(settings.longBreakDuration);
        break;
      case 'idle':
        setTimeLeft(settings.workDuration);
        break;
    }
  }, [settings]);

  const completeSession = useCallback(() => {
    if (state === 'work') {
      const newSessionCount = sessionCount + 1;
      setSessionCount(newSessionCount);
      
      // Determine next state
      if (newSessionCount % settings.sessionsUntilLongBreak === 0) {
        switchState('longBreak');
        if (callbacks?.onWorkComplete) callbacks.onWorkComplete();
      } else {
        switchState('shortBreak');
        if (callbacks?.onWorkComplete) callbacks.onWorkComplete();
      }
    } else {
      // Break is over, back to work
      switchState('work');
      if (callbacks?.onBreakComplete) callbacks.onBreakComplete();
    }
  }, [state, sessionCount, settings.sessionsUntilLongBreak, switchState]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      completeSession();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, timeLeft, completeSession]);

  const start = () => setIsActive(true);
  const pause = () => setIsActive(false);
  
  const reset = () => {
    setIsActive(false);
    switchState('idle');
    setSessionCount(0);
  };

  const skip = () => {
    setIsActive(false);
    completeSession();
  };

  // Helper to get total duration for current state (for progress calculation)
  const getTotalDuration = () => {
    switch (state) {
      case 'work': return settings.workDuration;
      case 'shortBreak': return settings.shortBreakDuration;
      case 'longBreak': return settings.longBreakDuration;
      default: return settings.workDuration;
    }
  };

  return {
    state,
    timeLeft,
    isActive,
    sessionCount,
    totalDuration: getTotalDuration(),
    start,
    pause,
    reset,
    skip,
  };
}
