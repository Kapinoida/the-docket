'use client';

import { Radio as RadioIcon, RefreshCw } from 'lucide-react';
import { useNowPlaying } from '@/hooks/useNowPlaying';
import { useSound } from '@/contexts/SoundContext';
import { getAllStations } from '@/lib/radioStations';
import StationCard from '@/components/radio/StationCard';
import NowPlayingPanel from '@/components/radio/NowPlayingPanel';
import SongHistory from '@/components/radio/SongHistory';
import type { MusicSource } from '@/hooks/useAmbience';

export default function RadioView() {
  const { stations, isOffline, getStation, refresh } = useNowPlaying();
  const { musicSource, setMusicSource, stopAll } = useSound();
  const radioStations = getAllStations();

  const handlePlay = (shortcode: string) => {
    setMusicSource(shortcode as MusicSource);
  };

  const handleStop = () => {
    stopAll();
  };

  const selectedStation = musicSource === 'runtime_loop' || musicSource === 'warm_boot'
    ? radioStations.find(s => s.shortcode === musicSource)
    : null;

  const selectedNowPlaying = selectedStation ? getStation(selectedStation.shortcode) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary">
      <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-blue/10">
              <RadioIcon size={20} className="text-accent-blue" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">Radio</h1>
              <p className="text-sm text-text-muted">Live streaming stations</p>
            </div>
          </div>
          <button
            onClick={refresh}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {selectedStation && selectedNowPlaying && (
          <div className="mb-6">
            <NowPlayingPanel
              station={selectedStation}
              nowPlaying={selectedNowPlaying}
              isOffline={isOffline}
            />
          </div>
        )}

        {selectedStation && selectedNowPlaying && selectedNowPlaying.song_history.length > 0 && (
          <div className="mb-6">
            <SongHistory nowPlaying={selectedNowPlaying} />
          </div>
        )}

        <div className="mb-4">
          <h2 className="text-sm font-medium text-text-secondary mb-3">Stations</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {radioStations.map((station) => {
            const nowPlaying = getStation(station.shortcode);
            const isThisStationPlaying = musicSource === station.shortcode;

            return (
              <StationCard
                key={station.shortcode}
                station={station}
                nowPlaying={nowPlaying}
                isPlaying={isThisStationPlaying}
                isOffline={isOffline && !nowPlaying}
                onPlay={() => handlePlay(station.shortcode)}
                onStop={handleStop}
              />
            );
          })}
        </div>

        {isOffline && (
          <div className="mt-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
            <p className="text-sm text-yellow-400">
              Unable to reach AzuraCast. Station data may be unavailable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
