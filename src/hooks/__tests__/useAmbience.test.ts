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

// @ts-expect-error - test mock override
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

// @ts-expect-error - test mock override
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

    it('startMusicSource dispatches to startMusic for pentatonic', () => {
        const { result } = renderHook(() => useAmbience());

        act(() => {
            result.current.startMusicSource('pentatonic');
        });

        act(() => {
            result.current.stopMusic();
        });
    });

    it('exposes volume and setVolume', () => {
        const { result } = renderHook(() => useAmbience());

        expect(result.current.volume).toBe(0.6);
        expect(typeof result.current.setVolume).toBe('function');
    });

    it('setVolume clamps values to 0..1 range', () => {
        const { result } = renderHook(() => useAmbience());

        act(() => {
            result.current.setVolume(1.5);
        });
        expect(result.current.volume).toBe(1);

        act(() => {
            result.current.setVolume(-0.5);
        });
        expect(result.current.volume).toBe(0);

        act(() => {
            result.current.setVolume(0.5);
        });
        expect(result.current.volume).toBe(0.5);
    });

    it('setVolume updates master gain node', () => {
        const { result } = renderHook(() => useAmbience());

        act(() => {
            result.current.start('brown-noise');
        });

        act(() => {
            result.current.setVolume(0.3);
        });

        expect(result.current.volume).toBe(0.3);
    });

    it('volume persists across source switching', () => {
        const { result } = renderHook(() => useAmbience());

        act(() => {
            result.current.setVolume(0.4);
        });

        act(() => {
            result.current.startMusicSource('pentatonic');
        });

        expect(result.current.volume).toBe(0.4);

        act(() => {
            result.current.stopMusic();
        });
    });
});