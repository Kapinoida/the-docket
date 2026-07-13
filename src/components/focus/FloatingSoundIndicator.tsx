'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, X, Check, Waves, CloudRain, Snowflake, Orbit, Music, Radio, Coffee, VolumeX } from 'lucide-react';
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
  'runtime_loop': 'Runtime Loop',
  'warm_boot': 'Warm Boot',
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

  if (!isPlaying) return null;

  const ambienceOptions: { id: AmbienceMode; label: string; icon: React.ReactNode }[] = [
    { id: 'brown-noise', label: 'Brown Noise', icon: <Waves size={14} /> },
    { id: 'rain', label: 'Rain', icon: <CloudRain size={14} /> },
    { id: 'snow', label: 'Snow', icon: <Snowflake size={14} /> },
    { id: 'orbit', label: 'Orbit', icon: <Orbit size={14} /> },
    { id: 'none', label: 'Off', icon: <VolumeX size={14} /> },
  ];

  const musicOptions: { id: MusicSource; label: string; icon: React.ReactNode }[] = [
    { id: 'pentatonic', label: 'Pentatonic', icon: <Music size={14} /> },
    { id: 'runtime_loop', label: 'Runtime Loop', icon: <Radio size={14} /> },
    { id: 'warm_boot', label: 'Warm Boot', icon: <Coffee size={14} /> },
    { id: 'none', label: 'Off', icon: <VolumeX size={14} /> },
  ];

  const parts: string[] = [];
  if (ambienceMode !== 'none') parts.push(AMBIENCE_LABELS[ambienceMode]);
  if (musicSource !== 'none') parts.push(MUSIC_LABELS[musicSource]);
  const label = parts.join(' + ') || 'Playing';

  return (
    <div ref={containerRef} className="fixed bottom-4 left-4 z-50 pb-[52px] md:pb-0">
      {/* Pill */}
      <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md border border-white/10 rounded-full shadow-lg pl-3 pr-1 py-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs text-white/90 hover:text-white transition-colors"
          title="Sound controls"
        >
          <Volume2 size={14} />
          <span className="max-w-[180px] truncate">{label}</span>
        </button>
        <button
          onClick={stopAll}
          className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/15 transition-all"
          title="Stop all sounds"
        >
          <X size={12} />
        </button>
      </div>

      {/* Popover */}
      {isOpen && (
        <div className="absolute bottom-12 left-0 w-[220px] bg-black/80 backdrop-blur-md border border-white/10 rounded-lg shadow-xl z-50 py-2 px-1 styled-scrollbar">
          {/* Ambience Section */}
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-white/40 font-medium">
            Ambience
          </div>
          {ambienceOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setAmbienceMode(option.id)}
              className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md text-left transition-colors ${
                ambienceMode === option.id
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                {option.icon}
                <span>{option.label}</span>
              </div>
              {ambienceMode === option.id && <Check size={14} />}
            </button>
          ))}

          {/* Divider */}
          <div className="my-1 mx-2 border-t border-white/10" />

          {/* Music Section */}
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-white/40 font-medium">
            Music
          </div>
          {musicOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setMusicSource(option.id)}
              className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md text-left transition-colors ${
                musicSource === option.id
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                {option.icon}
                <span>{option.label}</span>
              </div>
              {musicSource === option.id && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}