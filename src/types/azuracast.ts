export interface AzuraCastSong {
  id: string;
  text: string;
  artist: string;
  title: string;
  art: string | null;
}

export interface AzuraCastNowPlaying {
  song: AzuraCastSong;
  elapsed: number;
  duration: number;
}

export interface AzuraCastListeners {
  total: number;
  unique: number;
  current: number;
}

export interface AzuraCastStation {
  id: number;
  name: string;
  shortcode: string;
  listen_url: string;
  listeners: AzuraCastListeners;
  now_playing: AzuraCastNowPlaying;
  playing_next: { song: AzuraCastSong } | null;
  song_history: Array<{ song: AzuraCastSong; played_at: number }>;
}

export type AzuraCastNowPlayingResponse = AzuraCastStation[];
