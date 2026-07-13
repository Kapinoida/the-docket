import { useRef, useCallback, useEffect } from 'react';

export type AmbienceMode = 'brown-noise' | 'rain' | 'snow' | 'orbit' | 'none';

export type MusicSource = 'pentatonic' | 'runtime_loop' | 'warm_boot' | 'none';

interface SoundLayer {
  mode: AmbienceMode;
  gainNode: GainNode;
  sources: AudioScheduledSourceNode[];
  startTime: number;
}

export default function useAmbience() {
  const contextRef = useRef<AudioContext | null>(null);
  const activeLayersRef = useRef<SoundLayer[]>([]);
  const streamAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const streamGainRef = useRef<GainNode | null>(null);
  const streamStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initAudio = () => {
    if (!contextRef.current) {
      // @ts-ignore
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextCtor) {
        contextRef.current = new AudioContextCtor();
      }
    }
    return contextRef.current;
  };

  const createBrownNoise = (ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 2; // 2 seconds buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise filter (pseudo-integration)
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        data[i] = lastOut * 3.5; // Compensate for gain loss
        data[i] *= 0.5; // Overall volume scaler
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    return noise;
  };

  const createPinkNoise = (ctx: AudioContext) => {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0, b1, b2, b3, b4, b5, b6;
      b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11; // (roughly) compensate for gain
        b6 = white * 0.115926;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      return noise;
  };

  const start = useCallback((mode: AmbienceMode = 'brown-noise') => {
    const ctx = initAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    // Check if the requested mode is already the most recent active layer
    const currentLayer = activeLayersRef.current[activeLayersRef.current.length - 1];
    if (currentLayer && currentLayer.mode === mode) {
        return;
    }

    const now = ctx.currentTime;
    const fadeDuration = 3; // Longer fade (3s) for nice ambience transitions

    // 1. Fade OUT all existing layers
    activeLayersRef.current.forEach(layer => {
        // Cancel any pending ramps (like fade-ins)
        layer.gainNode.gain.cancelScheduledValues(now);
        // Ramp to 0 from current value
        layer.gainNode.gain.setValueAtTime(layer.gainNode.gain.value, now);
        layer.gainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);
        
        // Stop nodes after fade
        setTimeout(() => {
            layer.sources.forEach(s => { try { s.stop(); } catch(e){} });
        }, (fadeDuration + 0.1) * 1000);
    });
    
    // Clear list (they will clean themselves up via garbage collection/stop, 
    // but we remove ref immediately so we know what is "current")
    activeLayersRef.current = [];

    // 2. Create NEW Layer
    const layerGain = ctx.createGain();
    layerGain.connect(ctx.destination);
    layerGain.gain.setValueAtTime(0, now);
    layerGain.gain.linearRampToValueAtTime(0.5, now + fadeDuration); // Fade In

    const sources: AudioScheduledSourceNode[] = [];

    // --- Soundscape Logic ---
    if (mode === 'rain') {
        const noise = createPinkNoise(ctx);
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.3;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 200;
        noise.connect(lp); lp.connect(hp); hp.connect(noiseGain); noiseGain.connect(layerGain);
        noise.start(); sources.push(noise);
    } else if (mode === 'snow') {
        const noise = createPinkNoise(ctx);
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.4;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 1.0;
        noise.connect(bp); bp.connect(noiseGain); noiseGain.connect(layerGain);
        noise.start(); sources.push(noise);
    } else if (mode === 'orbit') {
        const osc1 = ctx.createOscillator(); osc1.type = 'sine'; osc1.frequency.value = 110;
        const osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = 164.81;
        const oscMixedGain = ctx.createGain(); oscMixedGain.gain.value = 0.05;
        osc1.connect(oscMixedGain); osc2.connect(oscMixedGain); oscMixedGain.connect(layerGain);
        osc1.start(); osc2.start(); sources.push(osc1, osc2);
    } else {
        // brown-noise (default)
        const noise = createBrownNoise(ctx);
        const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.4;
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 200;
        noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(layerGain);
        noise.start(); sources.push(noise);

        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 55;
        const oscGain = ctx.createGain(); oscGain.gain.value = 0.1;
        osc.connect(oscGain); oscGain.connect(layerGain);
        osc.start(); sources.push(osc);
    }

    activeLayersRef.current.push({
        mode,
        gainNode: layerGain,
        sources,
        startTime: now
    });

  }, []);

  const stop = useCallback(() => {
    const ctx = contextRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const fadeDuration = 2; // Fade out on stop

    activeLayersRef.current.forEach(layer => {
        layer.gainNode.gain.cancelScheduledValues(now);
        layer.gainNode.gain.setValueAtTime(layer.gainNode.gain.value, now);
        layer.gainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);
        
        setTimeout(() => {
             layer.sources.forEach(s => { try { s.stop(); } catch(e){} });
        }, (fadeDuration + 0.1) * 1000);
    });
    activeLayersRef.current = [];
  }, []);

  /* --- Stream Logic (AzuraCast) --- */
  const startStream = useCallback((url: string) => {
    const ctx = initAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    // Stop any existing stream first
    if (streamAudioRef.current) {
      stopStream();
    }

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = url;
    audio.loop = false; // Live stream, no loop needed
    audio.preload = 'none';

    let mediaSource: MediaElementAudioSourceNode;
    try {
      mediaSource = ctx.createMediaElementSource(audio);
    } catch (e) {
      console.error('Failed to create media element source', e);
      return;
    }

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 3); // Fade in over 3s

    mediaSource.connect(gainNode);
    gainNode.connect(ctx.destination);

    streamAudioRef.current = audio;
    streamSourceRef.current = mediaSource;
    streamGainRef.current = gainNode;

    audio.play().catch(e => console.error('Stream playback failed', e));
  }, []);

  const stopStream = useCallback(() => {
    const ctx = contextRef.current;
    const audio = streamAudioRef.current;
    const source = streamSourceRef.current;
    const gain = streamGainRef.current;
    if (!audio) return;

    // Null refs immediately so a subsequent startStream doesn't see stale refs
    streamAudioRef.current = null;
    streamSourceRef.current = null;
    streamGainRef.current = null;

    // Fade out over 2s
    if (gain && ctx) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 2);
    }

    // Clear any pending stop timeout
    if (streamStopTimeoutRef.current) {
      clearTimeout(streamStopTimeoutRef.current);
    }

    streamStopTimeoutRef.current = setTimeout(() => {
      audio.pause();
      audio.src = '';
      try { source?.disconnect(); } catch(e) {}
      try { gain?.disconnect(); } catch(e) {}
      streamStopTimeoutRef.current = null;
    }, 2100);
  }, []);

  /* --- Music Logic --- */
  // C Major Pentatonic Scale
  // C4, D4, E4, G4, A4, C5, D5, E5
  const NOTES = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
  
  const musicTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const musicActiveRef = useRef(false);

  const playNote = (ctx: AudioContext) => {
    if (!musicActiveRef.current) return;

    // Pick a random note
    const note = NOTES[Math.floor(Math.random() * NOTES.length)];
    
    // Create Oscillator
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = note;

    // Create Gain for Envelope
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0;

    // Connect
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Envelope Parameters (Serene & Sparse)
    const now = ctx.currentTime;
    const attack = 2 + Math.random() * 2; // 2-4s attack
    const sustain = 2 + Math.random() * 3; // 2-5s sustain
    const release = 3 + Math.random() * 3; // 3-6s release
    const totalDuration = attack + sustain + release;
    
    // Attack
    gainNode.gain.linearRampToValueAtTime(0.05, now + attack); // Very quiet (0.05)
    // Release
    gainNode.gain.setValueAtTime(0.05, now + attack + sustain);
    gainNode.gain.linearRampToValueAtTime(0, now + totalDuration);

    osc.start(now);
    osc.stop(now + totalDuration + 1);

    // Schedule next note
    // Overlapping is nice, but we want it "sparse". 
    // Wait for at least half the duration before maybe starting another, or strictly one at a time?
    // Let's do random interval between 4s and 10s
    const nextDelay = (4 + Math.random() * 6) * 1000;
    
    musicTimeoutRef.current = setTimeout(() => {
        if (musicActiveRef.current) playNote(ctx);
    }, nextDelay);
  };

  const startMusic = useCallback(() => {
    if (musicActiveRef.current) return;
    const ctx = initAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    musicActiveRef.current = true;
    playNote(ctx);
  }, []);

  const stopMusic = useCallback(() => {
    musicActiveRef.current = false;
    if (musicTimeoutRef.current) {
        clearTimeout(musicTimeoutRef.current);
        musicTimeoutRef.current = null;
    }
  }, []);

  /* --- Unified Music Source Dispatcher --- */
  // Stream URL mapping for AzuraCast stations
  const STREAM_URLS: Record<string, string> = {
    runtime_loop: 'https://radio.dcplaskett.com/listen/runtime_loop/radio.mp3',
    warm_boot: 'https://radio.dcplaskett.com/listen/warm_boot/radio.mp3',
  };

  const startMusicSource = useCallback((source: MusicSource) => {
    // Stop whatever was playing before (music or stream) to avoid overlap
    stopMusic();
    stopStream();

    if (source === 'pentatonic') {
      startMusic();
    } else if (source in STREAM_URLS) {
      startStream(STREAM_URLS[source]);
    }
  }, [startMusic, stopMusic, startStream, stopStream]);

  const stopMusicAndStream = useCallback(() => {
    stopMusic();
    stopStream();
  }, [stopMusic, stopStream]);

  // Ensure cleanup on unmount for music + streams
  useEffect(() => {
      return () => {
          stopMusic();
          stopStream();
      };
  }, [stopMusic, stopStream]);

  return { start, stop, startMusic, stopMusic, startStream, stopStream, startMusicSource, stopMusicAndStream };
}