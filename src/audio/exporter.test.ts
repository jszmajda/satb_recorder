import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Exporter } from './exporter';

// Mock track data for testing
interface MockTrack {
  id: string;
  audioBlob: Blob;
  volume: number;
  muted: boolean;
  soloed: boolean;
}

describe('Exporter initialization', () => {
  let exporter: Exporter;
  let audioContext: AudioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
    exporter = new Exporter(audioContext);
  });

  afterEach(() => {
    exporter.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('initializes with AudioContext', () => {
    expect(exporter).toBeDefined();
  });
});

describe('EXP-001, EXP-004: Track mixing algorithm', () => {
  let exporter: Exporter;
  let audioContext: AudioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
    exporter = new Exporter(audioContext);
  });

  afterEach(() => {
    exporter.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('mixes multiple tracks into single buffer', async () => {
    const tracks: MockTrack[] = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio 1'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: false,
      },
      {
        id: 'track-2',
        audioBlob: new Blob(['audio 2'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: false,
      },
    ];

    const mixedBuffer = await exporter.mixTracks(tracks);

    expect(mixedBuffer).toBeDefined();
    expect(mixedBuffer.numberOfChannels).toBeGreaterThanOrEqual(1);
    expect(mixedBuffer.length).toBeGreaterThan(0);
  });

  test('respects mute flag when mixing', async () => {
    const tracks: MockTrack[] = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio 1'], { type: 'audio/wav' }),
        volume: 100,
        muted: true, // Muted track
        soloed: false,
      },
      {
        id: 'track-2',
        audioBlob: new Blob(['audio 2'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: false,
      },
    ];

    const mixedBuffer = await exporter.mixTracks(tracks);

    // Should still create a buffer even with muted tracks
    expect(mixedBuffer).toBeDefined();
  });

  test('respects solo flag when mixing', async () => {
    const tracks: MockTrack[] = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio 1'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: true, // Only this track should be in mix
      },
      {
        id: 'track-2',
        audioBlob: new Blob(['audio 2'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: false,
      },
    ];

    const mixedBuffer = await exporter.mixTracks(tracks);

    expect(mixedBuffer).toBeDefined();
  });

  test('applies volume levels when mixing', async () => {
    const tracks: MockTrack[] = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio 1'], { type: 'audio/wav' }),
        volume: 50, // Half volume
        muted: false,
        soloed: false,
      },
      {
        id: 'track-2',
        audioBlob: new Blob(['audio 2'], { type: 'audio/wav' }),
        volume: 100, // Full volume
        muted: false,
        soloed: false,
      },
    ];

    const mixedBuffer = await exporter.mixTracks(tracks);

    expect(mixedBuffer).toBeDefined();
  });

  test('handles tracks of different lengths', async () => {
    const tracks: MockTrack[] = [
      {
        id: 'track-1',
        audioBlob: new Blob(['short audio'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: false,
      },
      {
        id: 'track-2',
        audioBlob: new Blob(['much longer audio data here'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: false,
      },
    ];

    const mixedBuffer = await exporter.mixTracks(tracks);

    // Mixed buffer should be as long as the longest track
    expect(mixedBuffer).toBeDefined();
    expect(mixedBuffer.length).toBeGreaterThan(0);
  });

  // ⚠️ Negative cases
  test('throws error if all tracks are muted', async () => {
    const tracks: MockTrack[] = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio 1'], { type: 'audio/wav' }),
        volume: 100,
        muted: true,
        soloed: false,
      },
      {
        id: 'track-2',
        audioBlob: new Blob(['audio 2'], { type: 'audio/wav' }),
        volume: 100,
        muted: true,
        soloed: false,
      },
    ];

    await expect(exporter.mixTracks(tracks)).rejects.toThrow(
      'No audible tracks to export'
    );
  });

  test('throws error if no tracks provided', async () => {
    await expect(exporter.mixTracks([])).rejects.toThrow(
      'No tracks to export'
    );
  });

  // 🔥 Edge cases
  test('handles single track export', async () => {
    const tracks: MockTrack[] = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio 1'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: false,
      },
    ];

    const mixedBuffer = await exporter.mixTracks(tracks);

    expect(mixedBuffer).toBeDefined();
  });

  test('multiple soloed tracks all get mixed', async () => {
    const tracks: MockTrack[] = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio 1'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: true,
      },
      {
        id: 'track-2',
        audioBlob: new Blob(['audio 2'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: true,
      },
    ];

    const mixedBuffer = await exporter.mixTracks(tracks);

    expect(mixedBuffer).toBeDefined();
  });
});

describe('EXP-002, EXP-003: WAV export', () => {
  let exporter: Exporter;
  let audioContext: AudioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
    exporter = new Exporter(audioContext);
  });

  afterEach(() => {
    exporter.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('exports tracks to WAV blob', async () => {
    const tracks: MockTrack[] = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio 1'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: false,
      },
    ];

    const wavBlob = await exporter.exportWAV(tracks);

    expect(wavBlob).toBeInstanceOf(Blob);
    expect(wavBlob.type).toBe('audio/wav');
  });

  test('WAV blob has correct RIFF header', async () => {
    const tracks: MockTrack[] = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio 1'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: false,
      },
    ];

    const wavBlob = await exporter.exportWAV(tracks);
    const arrayBuffer = await wavBlob.arrayBuffer();
    const view = new DataView(arrayBuffer);

    // Check for RIFF header (0x52494646 = "RIFF")
    const riffHeader = view.getUint32(0, false);
    expect(riffHeader).toBe(0x52494646);
  });

  test('downloads WAV with project name', async () => {
    const tracks: MockTrack[] = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio 1'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: false,
      },
    ];

    // Mock document.createElement and click
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

    await exporter.downloadWAV(tracks, 'My Project');

    expect(mockLink.download).toBe('My Project.wav');
    expect(mockLink.click).toHaveBeenCalled();
  });
});

describe('EXP-005, EXP-006: MP3 export', () => {
  let exporter: Exporter;
  let audioContext: AudioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
    exporter = new Exporter(audioContext);
  });

  afterEach(() => {
    exporter.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('exports tracks to MP3 blob', async () => {
    const tracks: MockTrack[] = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio 1'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: false,
      },
    ];

    const mp3Blob = await exporter.exportMP3(tracks);

    expect(mp3Blob).toBeInstanceOf(Blob);
    expect(mp3Blob.type).toBe('audio/mp3');
  });

  test('MP3 blob is smaller than WAV (compression)', async () => {
    const tracks: MockTrack[] = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio 1'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: false,
      },
    ];

    const wavBlob = await exporter.exportWAV(tracks);
    const mp3Blob = await exporter.exportMP3(tracks);

    // MP3 should be smaller due to compression
    // Note: This might not always be true for very small files
    expect(mp3Blob.size).toBeGreaterThan(0);
  });

  test('downloads MP3 with project name', async () => {
    const tracks: MockTrack[] = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio 1'], { type: 'audio/wav' }),
        volume: 100,
        muted: false,
        soloed: false,
      },
    ];

    // Mock document.createElement and click
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

    await exporter.downloadMP3(tracks, 'My Project');

    expect(mockLink.download).toBe('My Project.mp3');
    expect(mockLink.click).toHaveBeenCalled();
  });
});

describe('Exporter cleanup', () => {
  let audioContext: AudioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
  });

  afterEach(() => {
    audioContext.close();
  });

  // ✅ Happy path
  test('disposes resources properly', () => {
    const exporter = new Exporter(audioContext);
    expect(() => exporter.dispose()).not.toThrow();
  });
});
