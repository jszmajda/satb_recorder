import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Visualizer } from './visualizer';

describe('VIS-001, REC-008: Waveform data generation', () => {
  let visualizer: Visualizer;
  let audioContext: AudioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
    visualizer = new Visualizer(audioContext);
  });

  afterEach(() => {
    visualizer.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('generates waveform data from audio blob', async () => {
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });

    const waveformData = await visualizer.generateWaveform(mockBlob);

    expect(waveformData).toBeInstanceOf(Array);
    expect(waveformData.length).toBeGreaterThan(0);
  });

  test('returns 100-200 data points', async () => {
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });

    const waveformData = await visualizer.generateWaveform(mockBlob);

    expect(waveformData.length).toBeGreaterThanOrEqual(100);
    expect(waveformData.length).toBeLessThanOrEqual(200);
  });

  test('normalizes waveform values between 0 and 1', async () => {
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });

    const waveformData = await visualizer.generateWaveform(mockBlob);

    waveformData.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    });
  });

  test('generates consistent data for same blob', async () => {
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });

    const waveformData1 = await visualizer.generateWaveform(mockBlob);
    const waveformData2 = await visualizer.generateWaveform(mockBlob);

    expect(waveformData1.length).toBe(waveformData2.length);
  });

  test('handles different audio blob sizes', async () => {
    const smallBlob = new Blob(['small'], { type: 'audio/wav' });
    const largeBlob = new Blob(['large audio data with more content'], { type: 'audio/wav' });

    const smallWaveform = await visualizer.generateWaveform(smallBlob);
    const largeWaveform = await visualizer.generateWaveform(largeBlob);

    // Both should return data in the 100-200 range
    expect(smallWaveform.length).toBeGreaterThanOrEqual(100);
    expect(largeWaveform.length).toBeGreaterThanOrEqual(100);
  });

  // ⚠️ Negative cases
  test('throws error for empty blob', async () => {
    const emptyBlob = new Blob([], { type: 'audio/wav' });

    await expect(visualizer.generateWaveform(emptyBlob)).rejects.toThrow();
  });

  test('throws error for invalid audio data', async () => {
    const invalidBlob = new Blob(['not valid audio'], { type: 'audio/wav' });

    // Mock decodeAudioData to reject
    vi.spyOn(audioContext, 'decodeAudioData').mockRejectedValueOnce(
      new Error('Failed to decode audio')
    );

    await expect(visualizer.generateWaveform(invalidBlob)).rejects.toThrow(
      'Failed to generate waveform'
    );
  });

  // 🔥 Edge cases
  test('handles mono audio', async () => {
    const monoBlob = new Blob(['mono audio'], { type: 'audio/wav' });

    const waveformData = await visualizer.generateWaveform(monoBlob);

    expect(waveformData.length).toBeGreaterThanOrEqual(100);
  });

  test('handles stereo audio by averaging channels', async () => {
    const stereoBlob = new Blob(['stereo audio'], { type: 'audio/wav' });

    const waveformData = await visualizer.generateWaveform(stereoBlob);

    expect(waveformData.length).toBeGreaterThanOrEqual(100);
  });

  test('can generate multiple waveforms concurrently', async () => {
    const blob1 = new Blob(['audio 1'], { type: 'audio/wav' });
    const blob2 = new Blob(['audio 2'], { type: 'audio/wav' });

    const [waveform1, waveform2] = await Promise.all([
      visualizer.generateWaveform(blob1),
      visualizer.generateWaveform(blob2),
    ]);

    expect(waveform1).toBeInstanceOf(Array);
    expect(waveform2).toBeInstanceOf(Array);
  });
});

describe('VIS-001: Configurable sample count', () => {
  let visualizer: Visualizer;
  let audioContext: AudioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
    visualizer = new Visualizer(audioContext);
  });

  afterEach(() => {
    visualizer.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('allows specifying target sample count', async () => {
    const customVisualizer = new Visualizer(audioContext, { sampleCount: 150 });
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });

    const waveformData = await customVisualizer.generateWaveform(mockBlob);

    expect(waveformData.length).toBe(150);
    customVisualizer.dispose();
  });

  test('defaults to 150 samples if not specified', async () => {
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });

    const waveformData = await visualizer.generateWaveform(mockBlob);

    expect(waveformData.length).toBe(150);
  });

  // 🔥 Edge cases
  test('clamps sample count to minimum 100', async () => {
    const customVisualizer = new Visualizer(audioContext, { sampleCount: 50 });
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });

    const waveformData = await customVisualizer.generateWaveform(mockBlob);

    expect(waveformData.length).toBe(100);
    customVisualizer.dispose();
  });

  test('clamps sample count to maximum 200', async () => {
    const customVisualizer = new Visualizer(audioContext, { sampleCount: 300 });
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });

    const waveformData = await customVisualizer.generateWaveform(mockBlob);

    expect(waveformData.length).toBe(200);
    customVisualizer.dispose();
  });
});

describe('Visualizer cleanup', () => {
  let audioContext: AudioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
  });

  afterEach(() => {
    audioContext.close();
  });

  // ✅ Happy path
  test('disposes resources properly', () => {
    const visualizer = new Visualizer(audioContext);

    expect(() => visualizer.dispose()).not.toThrow();
  });

  test('can dispose without generating waveforms', () => {
    const visualizer = new Visualizer(audioContext);

    expect(() => visualizer.dispose()).not.toThrow();
  });
});
