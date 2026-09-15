export interface RadioStation {
  shortcode: string;
  displayName: string;
  listenUrl: string;
  description: string;
}

export const RADIO_STATIONS: Record<string, RadioStation> = {
  runtime_loop: {
    shortcode: 'runtime_loop',
    displayName: 'Runtime Loop',
    listenUrl: 'https://radio.dcplaskett.com/listen/runtime_loop/radio.mp3',
    description: 'Ambient electronic loops for deep focus',
  },
  warm_boot: {
    shortcode: 'warm_boot',
    displayName: 'Warm Boot',
    listenUrl: 'https://radio.dcplaskett.com/listen/warm_boot/radio.mp3',
    description: 'Warm, mellow tracks for relaxed productivity',
  },
};

export function getStationByShortcode(shortcode: string): RadioStation | undefined {
  return RADIO_STATIONS[shortcode];
}

export function getStationStreamUrl(shortcode: string): string | undefined {
  return RADIO_STATIONS[shortcode]?.listenUrl;
}

export function getAllStations(): RadioStation[] {
  return Object.values(RADIO_STATIONS);
}
