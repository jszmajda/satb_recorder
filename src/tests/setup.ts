import { expect, afterEach, vi, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import 'fake-indexeddb/auto';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Tone.js
vi.mock('tone', () => {
  let transportBpm = 120;
  let transportState = 'stopped';
  const scheduleCallbacks: Map<number, { callback: (time: number) => void; interval: string }> = new Map();
  let nextScheduleId = 1;
  let intervalHandle: NodeJS.Timeout | null = null;

  const mockTransport = {
    bpm: {
      get value() {
        return transportBpm;
      },
      set value(val: number) {
        transportBpm = val;
      },
    },
    get state() {
      return transportState;
    },
    start: vi.fn(() => {
      transportState = 'started';
      // Simulate scheduled callbacks
      if (scheduleCallbacks.size > 0 && !intervalHandle) {
        intervalHandle = setInterval(() => {
          if (transportState === 'started') {
            scheduleCallbacks.forEach(({ callback }) => {
              callback(0); // Call with dummy time
            });
          }
        }, (60 / transportBpm) * 1000); // Convert BPM to milliseconds per beat
      }
    }),
    stop: vi.fn(() => {
      transportState = 'stopped';
      if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
      }
    }),
    scheduleRepeat: vi.fn((callback: (time: number) => void, interval: string) => {
      const id = nextScheduleId++;
      scheduleCallbacks.set(id, { callback, interval });
      return id;
    }),
    clear: vi.fn((id: number) => {
      scheduleCallbacks.delete(id);
      if (scheduleCallbacks.size === 0 && intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
      }
    }),
  };

  // Mock Oscillator class
  class MockOscillator {
    frequency: { value: number };
    type: string;
    private started: boolean = false;

    constructor(options?: { frequency?: number; type?: string }) {
      this.frequency = { value: options?.frequency || 440 };
      this.type = options?.type || 'sine';
    }

    toDestination() {
      return this;
    }

    start() {
      this.started = true;
      return this;
    }

    stop() {
      this.started = false;
      return this;
    }

    dispose() {
      this.started = false;
    }
  }

  return {
    getTransport: vi.fn(() => mockTransport),
    Draw: {
      schedule: vi.fn((callback: () => void) => callback()),
    },
    Oscillator: MockOscillator,
    default: {},
  };
});

// Mock Web Audio API
beforeAll(() => {
  // Mock AudioContext
  global.AudioContext = vi.fn().mockImplementation(() => ({
    createGain: vi.fn().mockReturnValue({
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createAnalyser: vi.fn().mockReturnValue({
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: vi.fn(),
      getByteTimeDomainData: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createOscillator: vi.fn().mockReturnValue({
      frequency: {
        value: 440,
        setValueAtTime: vi.fn(),
      },
      type: 'sine',
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createMediaStreamSource: vi.fn().mockReturnValue({
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createMediaStreamDestination: vi.fn().mockReturnValue({
      stream: {},
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createBufferSource: vi.fn().mockReturnValue({
      buffer: null,
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    decodeAudioData: vi.fn().mockResolvedValue({
      duration: 1.0,
      length: 44100,
      numberOfChannels: 2,
      sampleRate: 44100,
      getChannelData: vi.fn().mockReturnValue(new Float32Array(44100)),
    }),
    destination: {
      channelCount: 2,
      maxChannelCount: 2,
    },
    sampleRate: 44100,
    currentTime: 0,
    state: 'running',
    suspend: vi.fn(),
    resume: vi.fn(),
    close: vi.fn(),
  })) as any;

  // Mock MediaRecorder
  global.MediaRecorder = vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    state: 'inactive',
    ondataavailable: null,
    onstop: null,
    onerror: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as any;

  // Mock MediaDevices
  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        id: 'mock-stream',
        active: true,
        getTracks: vi.fn().mockReturnValue([
          {
            kind: 'audio',
            id: 'mock-track',
            label: 'Mock Microphone',
            enabled: true,
            stop: vi.fn(),
          },
        ]),
        getAudioTracks: vi.fn().mockReturnValue([
          {
            kind: 'audio',
            id: 'mock-track',
            label: 'Mock Microphone',
            enabled: true,
            stop: vi.fn(),
          },
        ]),
      }),
      enumerateDevices: vi.fn().mockResolvedValue([
        {
          deviceId: 'default',
          kind: 'audioinput',
          label: 'Default Microphone',
          groupId: 'default-group',
        },
        {
          deviceId: 'mic-1',
          kind: 'audioinput',
          label: 'Microphone 1',
          groupId: 'group-1',
        },
        {
          deviceId: 'mic-2',
          kind: 'audioinput',
          label: 'Microphone 2',
          groupId: 'group-2',
        },
      ]),
    },
  });

  // Mock URL.createObjectURL for blob handling
  global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  global.URL.revokeObjectURL = vi.fn();

  // Mock Blob - methods on prototype to avoid cloning issues in IndexedDB
  class MockBlob {
    size: number;
    type: string;

    constructor(parts?: any[], options?: { type?: string }) {
      this.size = parts?.reduce((acc: number, part: any) => acc + (part?.length || 0), 0) || 0;
      this.type = options?.type || '';
    }
  }

  MockBlob.prototype.arrayBuffer = async function (): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  };

  MockBlob.prototype.slice = function (): Blob {
    return new MockBlob();
  };

  MockBlob.prototype.stream = function () {
    return {};
  };

  MockBlob.prototype.text = async function (): Promise<string> {
    return '';
  };

  global.Blob = MockBlob as any;
});
