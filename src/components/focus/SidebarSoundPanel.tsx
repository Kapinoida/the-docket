'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Waves, CloudRain, Snowflake, Orbit, Music, Radio, Coffee, VolumeX, SkipForward, WifiOff, Volume2 } from 'lucide-react';
import { useSound } from '@/contexts/SoundContext';
import { useNowPlaying } from '@/hooks/useNowPlaying';
import { getStationByShortcode } from '@/lib/radioStations';
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

const AMBIENCE_ICONS: Record<AmbienceMode, React.ReactNode> = {
  'brown-noise': <Waves size={14} />,
  'rain': <CloudRain size={14} />,
  'snow': <Snowflake size={14} />,
  'orbit': <Orbit size={14} />,
  'none': <VolumeX size={14} />,
};

const MUSIC_ICONS: Record<MusicSource, React.ReactNode> = {
  'pentatonic': <Music size={14} />,
  'runtime_loop': <Radio size={14} />,
  'warm_boot': <Coffee size={14} />,
  'none': <VolumeX size={14} />,
};

export default function SidebarSoundPanel() {
  const { ambienceMode, musicSource, setAmbienceMode, setMusicSource, stopAll, isPlaying, volume, setVolume } = useSound();
  const { isOffline, getStation } = useNowPlaying();
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

  const isStreamPlaying = musicSource === 'runtime_loop' || musicSource === 'warm_boot';
  const nowPlayingData = isStreamPlaying ? getStation(musicSource) : null;
  const stationInfo = isStreamPlaying ? getStationByShortcode(musicSource) : null;
  const song = isStreamPlaying && nowPlayingData ? nowPlayingData.now_playing.song : null;

  const trackText = song?.artist && song?.title
    ? `${song.artist} — ${song.title}`
    : song?.text || null;

  const handleSwitchStation = () => {
    const otherStation = musicSource === 'runtime_loop' ? 'warm_boot' : 'runtime_loop';
    setMusicSource(otherStation as MusicSource);
  };

  if (!isPlaying) {
    return (
      <div ref={containerRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
          title="Select sound"
        >
          <Radio size={16} className="flex-shrink-0" />
          <span className="truncate">Radio</span>
        </button>

        {isOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-bg-tertiary border border-border-subtle rounded-lg shadow-xl z-50 py-2 px-1 styled-scrollbar max-h-[300px] overflow-y-auto">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-text-muted font-medium">
              Ambience
            </div>
            {(['brown-noise', 'rain', 'snow', 'orbit', 'none'] as AmbienceMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => { setAmbienceMode(mode); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md text-left transition-colors ${
                  ambienceMode === mode
                    ? 'bg-accent-blue/15 text-accent-blue font-medium'
                    : 'text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                <div className="flex items-center gap-2">
                  {AMBIENCE_ICONS[mode]}
                  <span>{AMBIENCE_LABELS[mode]}</span>
                </div>
                {ambienceMode === mode && <Check size={14} />}
              </button>
            ))}

            <div className="my-1 mx-2 border-t border-border-subtle" />

            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-text-muted font-medium">
              Music
            </div>
            {(['pentatonic', 'runtime_loop', 'warm_boot', 'none'] as MusicSource[]).map((source) => (
              <button
                key={source}
                onClick={() => { setMusicSource(source); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md text-left transition-colors ${
                  musicSource === source
                    ? 'bg-accent-blue/15 text-accent-blue font-medium'
                    : 'text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                <div className="flex items-center gap-2">
                  {MUSIC_ICONS[source]}
                  <span>{MUSIC_LABELS[source]}</span>
                </div>
                {musicSource === source && <Check size={14} />}
              </button>
            ))}

            <div className="my-1 mx-2 border-t border-border-subtle" />

            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-text-muted font-medium">
              Volume
            </div>
            <div className="flex items-center gap-2 px-2 py-1">
              <Volume2 size={12} className="text-text-muted flex-shrink-0" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-1 accent-accent-blue cursor-pointer"
                aria-label="Volume"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isStreamPlaying && isOffline && !nowPlayingData) {
    const parts: string[] = [];
    if (ambienceMode !== 'none') parts.push(AMBIENCE_LABELS[ambienceMode]);
    parts.push(MUSIC_LABELS[musicSource]);
    const label = parts.join(' + ');

    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-bg-tertiary">
        <WifiOff size={14} className="text-red-400 flex-shrink-0" />
        <span className="text-xs text-text-muted truncate flex-1">{label}</span>
        <button
          onClick={stopAll}
          className="p-0.5 rounded text-text-muted hover:text-text-primary transition-colors"
          title="Stop all sounds"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  if (isStreamPlaying && nowPlayingData && stationInfo) {
    return (
      <div className="px-2 py-2 rounded-lg bg-bg-tertiary space-y-1.5">
        <div className="flex items-center gap-2">
          {song?.art ? (
            <img
              src={song.art}
              alt="Album art"
              className="w-8 h-8 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-bg-secondary flex items-center justify-center flex-shrink-0">
              <Radio size={14} className="text-text-muted" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary truncate">{stationInfo.displayName}</div>
            {trackText && (
              <div className="text-[11px] text-text-muted truncate">{trackText}</div>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={handleSwitchStation}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors"
              title="Switch station"
            >
              <SkipForward size={14} />
            </button>
            <button
              onClick={stopAll}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors"
              title="Stop"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Volume2 size={12} className="text-text-muted flex-shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-accent-blue cursor-pointer"
            aria-label="Volume"
          />
        </div>

        {ambienceMode !== 'none' && (
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            {AMBIENCE_ICONS[ambienceMode]}
            <span>{AMBIENCE_LABELS[ambienceMode]}</span>
          </div>
        )}
      </div>
    );
  }

  const parts: string[] = [];
  if (ambienceMode !== 'none') parts.push(AMBIENCE_LABELS[ambienceMode]);
  if (musicSource !== 'none') parts.push(MUSIC_LABELS[musicSource]);
  const label = parts.join(' + ') || 'Playing';

  return (
    <div className="px-2 py-2 rounded-lg bg-bg-tertiary space-y-1.5">
      <div className="flex items-center gap-2">
        <Volume2 size={14} className="text-accent-blue flex-shrink-0" />
        <span className="text-xs text-text-secondary truncate flex-1">{label}</span>
        <button
          onClick={stopAll}
          className="p-0.5 rounded text-text-muted hover:text-text-primary transition-colors"
          title="Stop all sounds"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Volume2 size={12} className="text-text-muted flex-shrink-0" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-accent-blue cursor-pointer"
          aria-label="Volume"
        />
      </div>
    </div>
  );
}
