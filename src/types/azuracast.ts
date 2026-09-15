export interface AzuraCastSong {
  id: string;
  text: string;
  artist: string;
  title: string;
  art: string | null;
}

export interface AzuraCastNowPlayingEntry {
  song: AzuraCastSong;
  elapsed: number;
  duration: number;
  played_at: number;
}

export interface AzuraCastListeners {
  total: number;
  unique: number;
  current: number;
}

export interface AzuraCastStationInfo {
  id: number;
  name: string;
  shortcode: string;
  listen_url: string;
}

export interface AzuraCastStation {
  station: AzuraCastStationInfo;
  listeners: AzuraCastListeners;
  now_playing: AzuraCastNowPlayingEntry;
  playing_next: { song: AzuraCastSong } | null;
  song_history: Array<{ song: AzuraCastSong; played_at: number }>;
  is_online: boolean;
}

export type AzuraCastNowPlayingResponse = AzuraCastStation[];
