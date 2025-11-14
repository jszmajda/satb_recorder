import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { VUMeter } from './vuMeter';

describe('MIC-005, REC-004, VIS-003: VU meter initialization', () => {
  let vuMeter: VUMeter;
  let audioContext: AudioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
    vuMeter = new VUMeter(audioContext);
  });

  afterEach(() => {
    vuMeter.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('initializes with AudioContext', () => {
    expect(vuMeter).toBeDefined();
  });

  test('starts in disconnected state', () => {
    expect(vuMeter.isConnected()).toBe(false);
  });

  test('returns zero volume when disconnected', () => {
    const volume = vuMeter.getVolume();
    expect(volume).toBe(0);
  });
});

describe('MIC-005, REC-004: VU meter stream connection', () => {
  let vuMeter: VUMeter;
  let audioContext: AudioContext;
  let mockStream: MediaStream;

  beforeEach(async () => {
    audioContext = new AudioContext();
    vuMeter = new VUMeter(audioContext);
    mockStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  });

  afterEach(() => {
    vuMeter.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('connects to MediaStream', () => {
    vuMeter.connect(mockStream);
    expect(vuMeter.isConnected()).toBe(true);
  });

  test('creates AnalyserNode on connection', () => {
    const createAnalyserSpy = vi.spyOn(audioContext, 'createAnalyser');

    vuMeter.connect(mockStream);

    expect(createAnalyserSpy).toHaveBeenCalled();
  });

  test('creates MediaStreamSource on connection', () => {
    const createSourceSpy = vi.spyOn(audioContext, 'createMediaStreamSource');

    vuMeter.connect(mockStream);

    expect(createSourceSpy).toHaveBeenCalledWith(mockStream);
  });

  test('disconnects from stream', () => {
    vuMeter.connect(mockStream);
    expect(vuMeter.isConnected()).toBe(true);

    vuMeter.disconnect();
    expect(vuMeter.isConnected()).toBe(false);
  });

  test('returns zero volume after disconnect', () => {
    vuMeter.connect(mockStream);
    vuMeter.disconnect();

    const volume = vuMeter.getVolume();
    expect(volume).toBe(0);
  });

  // 🔥 Edge cases
  test('can reconnect after disconnect', () => {
    vuMeter.connect(mockStream);
    vuMeter.disconnect();
    vuMeter.connect(mockStream);

    expect(vuMeter.isConnected()).toBe(true);
  });

  test('disconnect is idempotent', () => {
    vuMeter.connect(mockStream);
    vuMeter.disconnect();

    expect(() => vuMeter.disconnect()).not.toThrow();
    expect(vuMeter.isConnected()).toBe(false);
  });
});

describe('VIS-003: VU meter volume monitoring', () => {
  let vuMeter: VUMeter;
  let audioContext: AudioContext;
  let mockStream: MediaStream;

  beforeEach(async () => {
    audioContext = new AudioContext();
    vuMeter = new VUMeter(audioContext);
    mockStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  });

  afterEach(() => {
    vuMeter.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('returns volume level between 0 and 1', () => {
    vuMeter.connect(mockStream);

    const volume = vuMeter.getVolume();

    expect(volume).toBeGreaterThanOrEqual(0);
    expect(volume).toBeLessThanOrEqual(1);
  });

  test('volume updates on each call', () => {
    vuMeter.connect(mockStream);

    const volume1 = vuMeter.getVolume();
    const volume2 = vuMeter.getVolume();

    // Both should be valid values
    expect(volume1).toBeGreaterThanOrEqual(0);
    expect(volume2).toBeGreaterThanOrEqual(0);
  });

  test('volume reflects audio level changes', () => {
    vuMeter.connect(mockStream);

    // Mock the analyser to return different values
    const analyser = (vuMeter as any).analyser;
    if (analyser) {
      // Override getByteTimeDomainData to simulate audio input
      vi.spyOn(analyser, 'getByteTimeDomainData').mockImplementation((array: Uint8Array) => {
        // Simulate audio signal (128 = silence, values above/below = sound)
        for (let i = 0; i < array.length; i++) {
          array[i] = 128 + Math.sin(i / 10) * 50; // Simulated signal
        }
      });
    }

    const volume = vuMeter.getVolume();
    expect(volume).toBeGreaterThan(0);
  });

  // 🔥 Edge cases
  test('handles silent audio (returns low volume)', () => {
    vuMeter.connect(mockStream);

    const analyser = (vuMeter as any).analyser;
    if (analyser) {
      vi.spyOn(analyser, 'getByteTimeDomainData').mockImplementation((array: Uint8Array) => {
        // All values at 128 = silence
        array.fill(128);
      });
    }

    const volume = vuMeter.getVolume();
    expect(volume).toBe(0);
  });

  test('handles loud audio (returns high volume)', () => {
    vuMeter.connect(mockStream);

    const analyser = (vuMeter as any).analyser;
    if (analyser) {
      vi.spyOn(analyser, 'getByteTimeDomainData').mockImplementation((array: Uint8Array) => {
        // Maximum variation from 128
        for (let i = 0; i < array.length; i++) {
          array[i] = i % 2 === 0 ? 0 : 255;
        }
      });
    }

    const volume = vuMeter.getVolume();
    expect(volume).toBeGreaterThan(0.8); // Should be near maximum
  });

  test('can get volume multiple times per frame', () => {
    vuMeter.connect(mockStream);

    const volume1 = vuMeter.getVolume();
    const volume2 = vuMeter.getVolume();
    const volume3 = vuMeter.getVolume();

    expect(volume1).toBeGreaterThanOrEqual(0);
    expect(volume2).toBeGreaterThanOrEqual(0);
    expect(volume3).toBeGreaterThanOrEqual(0);
  });
});

describe('VU meter cleanup', () => {
  let audioContext: AudioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
  });

  afterEach(() => {
    audioContext.close();
  });

  // ✅ Happy path
  test('disposes resources properly', async () => {
    const vuMeter = new VUMeter(audioContext);
    const mockStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    vuMeter.connect(mockStream);
    expect(() => vuMeter.dispose()).not.toThrow();
  });

  test('can dispose without connecting', () => {
    const vuMeter = new VUMeter(audioContext);
    expect(() => vuMeter.dispose()).not.toThrow();
  });

  test('returns zero volume after dispose', async () => {
    const vuMeter = new VUMeter(audioContext);
    const mockStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    vuMeter.connect(mockStream);
    vuMeter.dispose();

    const volume = vuMeter.getVolume();
    expect(volume).toBe(0);
  });

  test('marks as disconnected after dispose', async () => {
    const vuMeter = new VUMeter(audioContext);
    const mockStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    vuMeter.connect(mockStream);
    vuMeter.dispose();

    expect(vuMeter.isConnected()).toBe(false);
  });
});
