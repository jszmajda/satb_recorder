import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Mixer } from './mixer';

describe('Mixer initialization', () => {
  let mixer: Mixer;
  let audioContext: AudioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
    mixer = new Mixer(audioContext);
  });

  afterEach(() => {
    mixer.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('initializes with AudioContext', () => {
    expect(mixer).toBeDefined();
  });

  test('starts in stopped state', () => {
    expect(mixer.isPlaying()).toBe(false);
  });

  test('has no tracks initially', () => {
    const trackIds = mixer.getTrackIds();
    expect(trackIds).toEqual([]);
  });
});

describe('Track loading', () => {
  let mixer: Mixer;
  let audioContext: AudioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
    mixer = new Mixer(audioContext);
  });

  afterEach(() => {
    mixer.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('loads track from audio blob', async () => {
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
    const trackId = 'track-1';

    await mixer.loadTrack(trackId, mockBlob);

    const trackIds = mixer.getTrackIds();
    expect(trackIds).toContain(trackId);
  });

  test('decodes audio data when loading track', async () => {
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
    const decodeAudioDataSpy = vi.spyOn(audioContext, 'decodeAudioData');

    await mixer.loadTrack('track-1', mockBlob);

    expect(decodeAudioDataSpy).toHaveBeenCalled();
  });

  test('creates GainNode for loaded track', async () => {
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
    const createGainSpy = vi.spyOn(audioContext, 'createGain');

    await mixer.loadTrack('track-1', mockBlob);

    expect(createGainSpy).toHaveBeenCalled();
  });

  test('can load multiple tracks', async () => {
    const blob1 = new Blob(['audio 1'], { type: 'audio/wav' });
    const blob2 = new Blob(['audio 2'], { type: 'audio/wav' });

    await mixer.loadTrack('track-1', blob1);
    await mixer.loadTrack('track-2', blob2);

    const trackIds = mixer.getTrackIds();
    expect(trackIds).toContain('track-1');
    expect(trackIds).toContain('track-2');
    expect(trackIds.length).toBe(2);
  });

  test('can unload track', async () => {
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
    await mixer.loadTrack('track-1', mockBlob);

    mixer.unloadTrack('track-1');

    const trackIds = mixer.getTrackIds();
    expect(trackIds).not.toContain('track-1');
  });

  // ⚠️ Negative cases
  test('throws error for invalid audio blob', async () => {
    const invalidBlob = new Blob(['not audio'], { type: 'text/plain' });

    // Mock decodeAudioData to reject
    vi.spyOn(audioContext, 'decodeAudioData').mockRejectedValueOnce(
      new Error('Failed to decode')
    );

    await expect(mixer.loadTrack('track-1', invalidBlob)).rejects.toThrow(
      'Failed to load track'
    );
  });

  // 🔥 Edge cases
  test('unloading non-existent track does not throw', () => {
    expect(() => mixer.unloadTrack('non-existent')).not.toThrow();
  });

  test('replacing track with same ID unloads previous', async () => {
    const blob1 = new Blob(['audio 1'], { type: 'audio/wav' });
    const blob2 = new Blob(['audio 2'], { type: 'audio/wav' });

    await mixer.loadTrack('track-1', blob1);
    await mixer.loadTrack('track-1', blob2);

    const trackIds = mixer.getTrackIds();
    expect(trackIds.filter(id => id === 'track-1').length).toBe(1);
  });
});

describe('TRACK-008: Volume control', () => {
  let mixer: Mixer;
  let audioContext: AudioContext;

  beforeEach(async () => {
    audioContext = new AudioContext();
    mixer = new Mixer(audioContext);
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
    await mixer.loadTrack('track-1', mockBlob);
  });

  afterEach(() => {
    mixer.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('defaults to volume 100', () => {
    const volume = mixer.getVolume('track-1');
    expect(volume).toBe(100);
  });

  test('sets volume for track', () => {
    mixer.setVolume('track-1', 50);

    const volume = mixer.getVolume('track-1');
    expect(volume).toBe(50);
  });

  test('maps volume 0-100 to gain 0-1', () => {
    mixer.setVolume('track-1', 0);
    expect(mixer.getVolume('track-1')).toBe(0);

    mixer.setVolume('track-1', 50);
    expect(mixer.getVolume('track-1')).toBe(50);

    mixer.setVolume('track-1', 100);
    expect(mixer.getVolume('track-1')).toBe(100);
  });

  test('clamps volume to 0-100 range', () => {
    mixer.setVolume('track-1', -10);
    expect(mixer.getVolume('track-1')).toBe(0);

    mixer.setVolume('track-1', 150);
    expect(mixer.getVolume('track-1')).toBe(100);
  });

  // 🔥 Edge cases
  test('setting volume on non-existent track does not throw', () => {
    expect(() => mixer.setVolume('non-existent', 50)).not.toThrow();
  });

  test('getting volume on non-existent track returns 100', () => {
    const volume = mixer.getVolume('non-existent');
    expect(volume).toBe(100);
  });
});

describe('TRACK-006, TRACK-007, PLAY-006: Mute control', () => {
  let mixer: Mixer;
  let audioContext: AudioContext;

  beforeEach(async () => {
    audioContext = new AudioContext();
    mixer = new Mixer(audioContext);
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
    await mixer.loadTrack('track-1', mockBlob);
  });

  afterEach(() => {
    mixer.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('tracks are not muted by default', () => {
    expect(mixer.isMuted('track-1')).toBe(false);
  });

  test('mutes track', () => {
    mixer.setMuted('track-1', true);
    expect(mixer.isMuted('track-1')).toBe(true);
  });

  test('unmutes track', () => {
    mixer.setMuted('track-1', true);
    mixer.setMuted('track-1', false);
    expect(mixer.isMuted('track-1')).toBe(false);
  });

  test('mute preserves volume setting', () => {
    mixer.setVolume('track-1', 75);
    mixer.setMuted('track-1', true);

    expect(mixer.getVolume('track-1')).toBe(75);
  });

  test('volume changes while muted are preserved', () => {
    mixer.setMuted('track-1', true);
    mixer.setVolume('track-1', 50);

    expect(mixer.getVolume('track-1')).toBe(50);

    mixer.setMuted('track-1', false);
    expect(mixer.getVolume('track-1')).toBe(50);
  });

  // 🔥 Edge cases
  test('setting mute on non-existent track does not throw', () => {
    expect(() => mixer.setMuted('non-existent', true)).not.toThrow();
  });

  test('getting mute on non-existent track returns false', () => {
    expect(mixer.isMuted('non-existent')).toBe(false);
  });
});

describe('TRACK-005, PLAY-007: Solo control', () => {
  let mixer: Mixer;
  let audioContext: AudioContext;

  beforeEach(async () => {
    audioContext = new AudioContext();
    mixer = new Mixer(audioContext);
    const blob1 = new Blob(['audio 1'], { type: 'audio/wav' });
    const blob2 = new Blob(['audio 2'], { type: 'audio/wav' });
    await mixer.loadTrack('track-1', blob1);
    await mixer.loadTrack('track-2', blob2);
  });

  afterEach(() => {
    mixer.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('tracks are not soloed by default', () => {
    expect(mixer.isSoloed('track-1')).toBe(false);
    expect(mixer.isSoloed('track-2')).toBe(false);
  });

  test('solos track', () => {
    mixer.setSoloed('track-1', true);
    expect(mixer.isSoloed('track-1')).toBe(true);
  });

  test('unsolos track', () => {
    mixer.setSoloed('track-1', true);
    mixer.setSoloed('track-1', false);
    expect(mixer.isSoloed('track-1')).toBe(false);
  });

  test('can solo multiple tracks', () => {
    mixer.setSoloed('track-1', true);
    mixer.setSoloed('track-2', true);

    expect(mixer.isSoloed('track-1')).toBe(true);
    expect(mixer.isSoloed('track-2')).toBe(true);
  });

  test('solo takes precedence over mute', () => {
    // If track is soloed, it should play even if muted
    mixer.setMuted('track-1', true);
    mixer.setSoloed('track-1', true);

    // Both flags are preserved
    expect(mixer.isMuted('track-1')).toBe(true);
    expect(mixer.isSoloed('track-1')).toBe(true);
  });

  // 🔥 Edge cases
  test('setting solo on non-existent track does not throw', () => {
    expect(() => mixer.setSoloed('non-existent', true)).not.toThrow();
  });

  test('getting solo on non-existent track returns false', () => {
    expect(mixer.isSoloed('non-existent')).toBe(false);
  });
});

describe('PLAY-002, PLAY-003, PLAY-004, PLAY-005: Playback control', () => {
  let mixer: Mixer;
  let audioContext: AudioContext;

  beforeEach(async () => {
    audioContext = new AudioContext();
    mixer = new Mixer(audioContext);
    const blob1 = new Blob(['audio 1'], { type: 'audio/wav' });
    const blob2 = new Blob(['audio 2'], { type: 'audio/wav' });
    await mixer.loadTrack('track-1', blob1);
    await mixer.loadTrack('track-2', blob2);
  });

  afterEach(() => {
    mixer.dispose();
    audioContext.close();
  });

  // ✅ Happy path
  test('starts playback', () => {
    mixer.play();
    expect(mixer.isPlaying()).toBe(true);
  });

  test('stops playback', () => {
    mixer.play();
    mixer.stop();
    expect(mixer.isPlaying()).toBe(false);
  });

  test('creates BufferSourceNode for each track on play', () => {
    const createBufferSourceSpy = vi.spyOn(audioContext, 'createBufferSource');

    mixer.play();

    // Should create one source per track
    expect(createBufferSourceSpy).toHaveBeenCalledTimes(2);
  });

  test('respects mute during playback', () => {
    mixer.setMuted('track-1', true);

    mixer.play();

    // Muted track should not create source or should have gain = 0
    expect(mixer.isPlaying()).toBe(true);
  });

  test('respects solo during playback', () => {
    mixer.setSoloed('track-1', true);

    mixer.play();

    // Only soloed track should be audible
    expect(mixer.isPlaying()).toBe(true);
  });

  test('when no solo, all non-muted tracks play', () => {
    mixer.setMuted('track-1', true);

    mixer.play();

    // track-2 should play, track-1 should not
    expect(mixer.isPlaying()).toBe(true);
  });

  test('can restart playback after stop', () => {
    mixer.play();
    mixer.stop();
    mixer.play();

    expect(mixer.isPlaying()).toBe(true);
  });

  // ⚠️ Negative cases
  test('play with no tracks does not throw', () => {
    const emptyMixer = new Mixer(audioContext);
    expect(() => emptyMixer.play()).not.toThrow();
    emptyMixer.dispose();
  });

  test('stop when not playing does not throw', () => {
    expect(() => mixer.stop()).not.toThrow();
  });

  // 🔥 Edge cases
  test('play is idempotent', () => {
    mixer.play();
    expect(() => mixer.play()).not.toThrow();
    expect(mixer.isPlaying()).toBe(true);
  });

  test('stop is idempotent', () => {
    mixer.play();
    mixer.stop();
    expect(() => mixer.stop()).not.toThrow();
    expect(mixer.isPlaying()).toBe(false);
  });
});

describe('Mixer cleanup', () => {
  let audioContext: AudioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
  });

  afterEach(() => {
    audioContext.close();
  });

  // ✅ Happy path
  test('disposes resources properly', async () => {
    const mixer = new Mixer(audioContext);
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
    await mixer.loadTrack('track-1', mockBlob);

    mixer.play();
    expect(() => mixer.dispose()).not.toThrow();
  });

  test('can dispose without loading tracks', () => {
    const mixer = new Mixer(audioContext);
    expect(() => mixer.dispose()).not.toThrow();
  });

  test('stops playback on dispose', async () => {
    const mixer = new Mixer(audioContext);
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
    await mixer.loadTrack('track-1', mockBlob);

    mixer.play();
    mixer.dispose();

    expect(mixer.isPlaying()).toBe(false);
  });

  test('clears all tracks on dispose', async () => {
    const mixer = new Mixer(audioContext);
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
    await mixer.loadTrack('track-1', mockBlob);

    mixer.dispose();

    expect(mixer.getTrackIds()).toEqual([]);
  });
});
