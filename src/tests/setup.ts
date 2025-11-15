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
  global.AudioContext = vi.fn().mockImplementation(function(this: any) {
    return {
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
      createBuffer: vi.fn().mockImplementation((numberOfChannels: number, length: number, sampleRate: number) => {
        const channelData = new Float32Array(length);
        return {
          duration: length / sampleRate,
          length,
          numberOfChannels,
          sampleRate,
          getChannelData: (channel: number) => channelData,
        };
      }),
      decodeAudioData: vi.fn().mockImplementation(async () => {
        // Generate mock audio data with some variation
        const length = 44100;
        const channelData = new Float32Array(length);
        for (let i = 0; i < length; i++) {
          // Generate a simple sine wave pattern
          channelData[i] = Math.sin(i / 100) * 0.5;
        }

        return {
          duration: 1.0,
          length,
          numberOfChannels: 2,
          sampleRate: 44100,
          getChannelData: (channel: number) => channelData,
        };
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
    };
  }) as any;

  // Mock MediaRecorder
  global.MediaRecorder = vi.fn().mockImplementation(function(this: any) {
    const listeners: Map<string, Function[]> = new Map();

    this.start = vi.fn(() => {
      this.state = 'recording';
    });

    this.stop = vi.fn(() => {
      this.state = 'inactive';
      // Trigger stop event
      const stopListeners = listeners.get('stop') || [];
      stopListeners.forEach(listener => listener(new Event('stop')));

      // Trigger dataavailable event with some mock data
      const dataListeners = listeners.get('dataavailable') || [];
      dataListeners.forEach(listener => {
        listener({
          data: new Blob(['mock audio data'], { type: 'audio/webm' })
        });
      });
    });

    this.pause = vi.fn();
    this.resume = vi.fn();
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
    this.onerror = null;

    this.addEventListener = vi.fn((event: string, listener: Function) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)!.push(listener);
    });

    this.removeEventListener = vi.fn((event: string, listener: Function) => {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(listener);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    });

    return this;
  }) as any;

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
    private data: any[];

    constructor(parts?: any[], options?: { type?: string }) {
      this.data = parts || [];
      this.size = parts?.reduce((acc: number, part: any) => {
        if (part instanceof ArrayBuffer) {
          return acc + part.byteLength;
        }
        return acc + (part?.length || 0);
      }, 0) || 0;
      this.type = options?.type || '';
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
      // If parts contain an ArrayBuffer, return it
      if (this.data.length > 0 && this.data[0] instanceof ArrayBuffer) {
        return this.data[0];
      }
      // Return ArrayBuffer matching the blob size
      // If size is 0, return empty buffer; otherwise use size or default to 1024
      return new ArrayBuffer(this.size > 0 ? this.size : (this.size === 0 ? 0 : 1024));
    }

    slice(): Blob {
      return new MockBlob() as any;
    }

    stream() {
      return {} as any;
    }

    async text(): Promise<string> {
      return '';
    }

    async bytes(): Promise<Uint8Array> {
      return new Uint8Array(0);
    }
  }

  global.Blob = MockBlob as any;

  // Mock HTMLCanvasElement.getContext
  HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(function(this: HTMLCanvasElement, contextType: string) {
    if (contextType === '2d') {
      return {
        canvas: this,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        miterLimit: 10,
        shadowColor: '',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        clearRect: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        arc: vi.fn(),
        arcTo: vi.fn(),
        ellipse: vi.fn(),
        rect: vi.fn(),
        quadraticCurveTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        translate: vi.fn(),
        transform: vi.fn(),
        setTransform: vi.fn(),
        resetTransform: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        clip: vi.fn(),
        isPointInPath: vi.fn().mockReturnValue(false),
        isPointInStroke: vi.fn().mockReturnValue(false),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 0 }),
        drawImage: vi.fn(),
        createImageData: vi.fn(),
        getImageData: vi.fn().mockReturnValue({
          data: new Uint8ClampedArray(0),
          width: 0,
          height: 0,
        }),
        putImageData: vi.fn(),
        createLinearGradient: vi.fn(),
        createRadialGradient: vi.fn(),
        createPattern: vi.fn(),
      };
    }
    return null;
  }) as any;
});
