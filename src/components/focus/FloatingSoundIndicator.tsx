'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, X, Check, Waves, CloudRain, Snowflake, Orbit, Music, VolumeX } from 'lucide-react';
import { useSound } from '@/contexts/SoundContext';
import type { AmbienceMode, MusicSource } from '@/hooks/useAmbience';

const AMBIENCE_LABELS: Record<AmbienceMode, string> = {
  'brown-noise': 'Brown Noise',
  'rain': 'Rain',
  'snow': 'Snow',
  'orbit': 'Orbit',
  'none': 'Off',
};

const MUSIC_LABELS: Record<MusicSource, string> = {
  'pentatonic': 'Pentatonic',
  'none': 'Off',
};

export default function FloatingSoundIndicator() {
  const { ambienceMode, musicSource, setAmbienceMode, setMusicSource, stopAll, isPlaying } = useSound();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const parts: string[] = [];
  if (ambienceMode !== 'none') parts.push(AMBIENCE_LABELS[ambienceMode]);
  if (musicSource !== 'none') parts.push(MUSIC_LABELS[musicSource]);
  const label = parts.join(' + ') || 'Sound';

  return (
    <div ref={containerRef} className="fixed bottom-4 left-4 z-50 pb-[52px] md:pb-0">
      <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md border border-white/10 rounded-full shadow-lg pl-3 pr-1 py-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs text-white/90 hover:text-white transition-colors"
          title="Sound controls"
        >
          <Volume2 size={14} />
          <span className="max-w-[180px] truncate">{label}</span>
        </button>
        {isPlaying && (
          <button
            onClick={stopAll}
            className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/15 transition-all"
            title="Stop all sounds"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute bottom-12 left-0 w-[220px] bg-black/80 backdrop-blur-md border border-white/10 rounded-lg shadow-xl z-50 py-2 px-1 styled-scrollbar">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-white/40 font-medium">
            Ambience
          </div>
          {(['brown-noise', 'rain', 'snow', 'orbit', 'none'] as AmbienceMode[]).map((mode) => {
            const icons: Record<AmbienceMode, React.ReactNode> = {
              'brown-noise': <Waves size={14} />,
              'rain': <CloudRain size={14} />,
              'snow': <Snowflake size={14} />,
              'orbit': <Orbit size={14} />,
              'none': <VolumeX size={14} />,
            };
            return (
              <button
                key={mode}
                onClick={() => { setAmbienceMode(mode); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md text-left transition-colors ${
                  ambienceMode === mode
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  {icons[mode]}
                  <span>{AMBIENCE_LABELS[mode]}</span>
                </div>
                {ambienceMode === mode && <Check size={14} />}
              </button>
            );
          })}

          <div className="my-1 mx-2 border-t border-white/10" />

          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-white/40 font-medium">
            Music
          </div>
          {(['pentatonic', 'none'] as MusicSource[]).map((source) => {
            const icons: Record<MusicSource, React.ReactNode> = {
              'pentatonic': <Music size={14} />,
              'none': <VolumeX size={14} />,
            };
            return (
              <button
                key={source}
                onClick={() => { setMusicSource(source); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md text-left transition-colors ${
                  musicSource === source
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  {icons[source]}
                  <span>{MUSIC_LABELS[source]}</span>
                </div>
                {musicSource === source && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
