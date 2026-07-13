'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Volume2, VolumeX, Waves, CloudRain, Snowflake, Orbit, Music, Radio, Coffee } from 'lucide-react';
import type { AmbienceMode, MusicSource } from '@/hooks/useAmbience';

interface SoundDropdownProps {
  ambienceMode: AmbienceMode;
  musicSource: MusicSource;
  onAmbienceChange: (mode: AmbienceMode) => void;
  onMusicChange: (source: MusicSource) => void;
  onToggle?: () => void;
}

export default function SoundDropdown({
  ambienceMode,
  musicSource,
  onAmbienceChange,
  onMusicChange,
}: SoundDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const anySoundActive = ambienceMode !== 'none' || musicSource !== 'none';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 sm:p-2 rounded-full transition-all ${
          anySoundActive
            ? 'bg-white/20 text-white'
            : 'bg-white/10 text-white/40 hover:text-white/80 border border-white/5'
        }`}
        title="Sound Settings"
      >
        {anySoundActive ? <Volume2 size={16} className="sm:w-5 sm:h-5" /> : <VolumeX size={16} className="sm:w-5 sm:h-5" />}
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-[220px] bg-black/80 backdrop-blur-md border border-white/10 rounded-lg shadow-xl z-50 py-2 px-1 styled-scrollbar">
          {/* Ambience Section */}
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-white/40 font-medium">
            Ambience
          </div>
          {ambienceOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onAmbienceChange(option.id);
              }}
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
              onClick={() => {
                onMusicChange(option.id);
              }}
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