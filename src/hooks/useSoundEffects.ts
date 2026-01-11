import { useCallback, useRef, useEffect } from 'react';

export default function useSoundEffects() {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext lazily
  const getContext = () => {
    if (!audioContextRef.current) {
      // @ts-ignore - for Safari support if needed, though standard is well supported now
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextCtor) {
        audioContextRef.current = new AudioContextCtor();
      }
    }
    return audioContextRef.current;
  };

  const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number = 0) => {
    const ctx = getContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

    gain.gain.setValueAtTime(0.1, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  };

  const playClick = useCallback(() => {
    // Short high-pitch blip
    playTone(800, 'sine', 0.1);
  }, []);

  const playWorkComplete = useCallback(() => {
    // Ascending major triad: C5 - E5 - G5 - C6
    const ctx = getContext();
    if (!ctx) return;
    const now = 0; // Relative to current time
    
    // Arpeggio
    playTone(523.25, 'sine', 0.5, 0);    // C5
    playTone(659.25, 'sine', 0.5, 0.1);  // E5
    playTone(783.99, 'sine', 0.5, 0.2);  // G5
    playTone(1046.50, 'sine', 1.0, 0.3); // C6
  }, []);

  const playBreakComplete = useCallback(() => {
    // Descending gentle chime: G5 - E5 - C5
    const ctx = getContext();
    if (!ctx) return;
    
    playTone(783.99, 'sine', 0.6, 0);   // G5
    playTone(659.25, 'sine', 0.6, 0.2); // E5
    playTone(523.25, 'sine', 1.0, 0.4); // C5
  }, []);

  return {
    playClick,
    playWorkComplete,
    playBreakComplete
  };
}
