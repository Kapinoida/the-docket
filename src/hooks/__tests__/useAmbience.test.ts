import { renderHook, act } from '@testing-library/react';
import useAmbience from '../useAmbience';

// Mock Web Audio API
class MockAudioNode {
  connect() {}
  disconnect() {}
}

class MockAudioScheduledSourceNode extends MockAudioNode {
  start = jest.fn();
  stop = jest.fn();
  loop = false;
  buffer: any = null;
}

class MockGainNode extends MockAudioNode {
  gain = {
    value: 0,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    cancelScheduledValues: jest.fn(),
  };
}

class MockOscillatorNode extends MockAudioScheduledSourceNode {
    frequency = { value: 440 };
    type = 'sine';
}

class MockBiquadFilterNode extends MockAudioNode {
    frequency = { value: 440 };
    type = 'lowpass';
    Q = { value: 1 };
}

class MockAudioBufferSourceNode extends MockAudioScheduledSourceNode {}

class MockMediaElementSourceNode extends MockAudioNode {}

class MockAudioContext {
  state = 'suspended';
  resume = jest.fn().mockResolvedValue(undefined);
  currentTime = 0;
  sampleRate = 44100;

  createGain = jest.fn(() => new MockGainNode());
  createOscillator = jest.fn(() => new MockOscillatorNode());
  createBiquadFilter = jest.fn(() => new MockBiquadFilterNode());
  createBuffer = jest.fn(() => ({
    getChannelData: jest.fn(() => new Float32Array(88200)),
  }));
  createBufferSource = jest.fn(() => new MockAudioBufferSourceNode());
  createMediaElementSource = jest.fn(() => new MockMediaElementSourceNode());
}

// @ts-ignore
window.AudioContext = MockAudioContext;

// Mock HTMLAudioElement
class MockAudioElement {
  crossOrigin = '';
  src = '';
  loop = false;
  preload = '';
  play = jest.fn().mockResolvedValue(undefined);
  pause = jest.fn();
}

// @ts-ignore
global.Audio = MockAudioElement;

describe('useAmbience', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('initializes audio context and starts playback', () => {
        const { result } = renderHook(() => useAmbience());

        act(() => {
            result.current.start('brown-noise');
        });
    });

    it('starts specific mode (orbit)', () => {
        const { result } = renderHook(() => useAmbience());
        
        act(() => {
            result.current.start('orbit');
        });
    });

    it('starts specific mode (rain)', () => {
        const { result } = renderHook(() => useAmbience());
        
        act(() => {
            result.current.start('rain');
        });
    });

    it('starts specific mode (snow)', () => {
        const { result } = renderHook(() => useAmbience());
        
        act(() => {
            result.current.start('snow');
        });
    });

    it('stops playback gracefully', () => {
        const { result } = renderHook(() => useAmbience());
        
        act(() => {
            result.current.start('brown-noise');
        });

        act(() => {
            result.current.stop();
        });
    });

    it('starts and stops a stream (AzuraCast)', () => {
        const { result } = renderHook(() => useAmbience());

        act(() => {
            result.current.startStream('https://radio.dcplaskett.com/listen/runtime_loop/radio.mp3');
        });

        act(() => {
            result.current.stopStream();
        });
    });

    it('startMusicSource dispatches to startMusic for pentatonic', () => {
        const { result } = renderHook(() => useAmbience());

        act(() => {
            result.current.startMusicSource('pentatonic');
        });

        act(() => {
            result.current.stopMusicAndStream();
        });
    });

    it('startMusicSource dispatches to startStream for runtime_loop', () => {
        const { result } = renderHook(() => useAmbience());

        act(() => {
            result.current.startMusicSource('runtime_loop');
        });

        act(() => {
            result.current.stopMusicAndStream();
        });
    });

    it('startMusicSource dispatches to startStream for warm_boot', () => {
        const { result } = renderHook(() => useAmbience());

        act(() => {
            result.current.startMusicSource('warm_boot');
        });

        act(() => {
            result.current.stopMusicAndStream();
        });
    });
});