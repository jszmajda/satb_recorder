import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { useProjectStore } from './useProjectStore';
import { db, initializeDatabase } from '@/db/index';
import type { VoicePartType } from './types';

describe('REC-010, REC-011: Add track to project', () => {
  beforeEach(async () => {
    await initializeDatabase();
    useProjectStore.getState().reset();
    await useProjectStore.getState().createNewProject('Test Project');
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('adds track to voice part', async () => {
    const audioBlob = new Blob(['audio-data'], { type: 'audio/wav' });

    await useProjectStore.getState().addTrack('S', {
      audioBlob,
      duration: 30,
      waveformData: [0.1, 0.5, 0.3],
    });

    const store = useProjectStore.getState();
    const sopranoVoice = store.currentProject?.voiceParts.find(vp => vp.type === 'S');

    expect(sopranoVoice?.tracks).toHaveLength(1);
    expect(sopranoVoice?.tracks[0].name).toBe('S1');
    expect(sopranoVoice?.tracks[0].duration).toBe(30);
  });

  test('auto-generates sequential track names', async () => {
    const audioBlob = new Blob();

    await useProjectStore.getState().addTrack('A', { audioBlob, duration: 10, waveformData: [] });
    await useProjectStore.getState().addTrack('A', { audioBlob, duration: 10, waveformData: [] });
    await useProjectStore.getState().addTrack('A', { audioBlob, duration: 10, waveformData: [] });

    const store = useProjectStore.getState();
    const altoVoice = store.currentProject?.voiceParts.find(vp => vp.type === 'A');

    expect(altoVoice?.tracks[0].name).toBe('A1');
    expect(altoVoice?.tracks[1].name).toBe('A2');
    expect(altoVoice?.tracks[2].name).toBe('A3');
  });

  test('sets default volume to 80', async () => {
    const audioBlob = new Blob();

    await useProjectStore.getState().addTrack('T', { audioBlob, duration: 10, waveformData: [] });

    const store = useProjectStore.getState();
    const tenorVoice = store.currentProject?.voiceParts.find(vp => vp.type === 'T');

    expect(tenorVoice?.tracks[0].volume).toBe(80);
  });

  test('sets muted and soloed to false by default', async () => {
    const audioBlob = new Blob();

    await useProjectStore.getState().addTrack('B', { audioBlob, duration: 10, waveformData: [] });

    const store = useProjectStore.getState();
    const bassVoice = store.currentProject?.voiceParts.find(vp => vp.type === 'B');

    expect(bassVoice?.tracks[0].muted).toBe(false);
    expect(bassVoice?.tracks[0].soloed).toBe(false);
  });

  test('stores track in IndexedDB', async () => {
    const audioBlob = new Blob(['test'], { type: 'audio/wav' });

    await useProjectStore.getState().addTrack('S', { audioBlob, duration: 10, waveformData: [] });

    const store = useProjectStore.getState();
    const trackId = store.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0].id;

    const dbTrack = await db.tracks.get(trackId!);
    expect(dbTrack).toBeDefined();
    expect(dbTrack?.audioBlob.type).toBe('audio/wav');
  });

  // ⚠️ Sad path
  test('throws error when adding track with no project loaded', async () => {
    useProjectStore.getState().reset();
    const audioBlob = new Blob();

    await expect(
      useProjectStore.getState().addTrack('S', { audioBlob, duration: 10, waveformData: [] })
    ).rejects.toThrow('No project loaded');
  });

  // 🔥 Edge cases
  test('enforces maximum 8 tracks per voice part', async () => {
    const audioBlob = new Blob();

    // Add 8 tracks
    for (let i = 0; i < 8; i++) {
      await useProjectStore.getState().addTrack('S', { audioBlob, duration: 10, waveformData: [] });
    }

    // 9th track should throw
    await expect(
      useProjectStore.getState().addTrack('S', { audioBlob, duration: 10, waveformData: [] })
    ).rejects.toThrow('Maximum 8 tracks per voice part');
  });

  test('allows 8 tracks per voice part independently', async () => {
    const audioBlob = new Blob();

    // Add 8 to Soprano
    for (let i = 0; i < 8; i++) {
      await useProjectStore.getState().addTrack('S', { audioBlob, duration: 10, waveformData: [] });
    }

    // Should still be able to add to Alto
    await useProjectStore.getState().addTrack('A', { audioBlob, duration: 10, waveformData: [] });

    const store = useProjectStore.getState();
    const altoVoice = store.currentProject?.voiceParts.find(vp => vp.type === 'A');

    expect(altoVoice?.tracks).toHaveLength(1);
  });
});

describe('TRACK-001, TRACK-002: Delete track', () => {
  let trackId: string;

  beforeEach(async () => {
    await initializeDatabase();
    useProjectStore.getState().reset();
    await useProjectStore.getState().createNewProject('Test Project');

    const audioBlob = new Blob();
    await useProjectStore.getState().addTrack('S', { audioBlob, duration: 10, waveformData: [] });

    const store = useProjectStore.getState();
    trackId = store.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0].id!;
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('deletes track from voice part', async () => {
    await useProjectStore.getState().deleteTrack(trackId);

    const store = useProjectStore.getState();
    const sopranoVoice = store.currentProject?.voiceParts.find(vp => vp.type === 'S');

    expect(sopranoVoice?.tracks).toHaveLength(0);
  });

  test('removes track from IndexedDB', async () => {
    await useProjectStore.getState().deleteTrack(trackId);

    const dbTrack = await db.tracks.get(trackId);
    expect(dbTrack).toBeUndefined();
  });

  test('deletes only the specified track', async () => {
    const audioBlob = new Blob();
    await useProjectStore.getState().addTrack('S', { audioBlob, duration: 10, waveformData: [] });

    const store = useProjectStore.getState();
    const track2Id = store.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[1].id!;

    await useProjectStore.getState().deleteTrack(trackId);

    const updatedStore = useProjectStore.getState();
    const sopranoVoice = updatedStore.currentProject?.voiceParts.find(vp => vp.type === 'S');

    expect(sopranoVoice?.tracks).toHaveLength(1);
    expect(sopranoVoice?.tracks[0].id).toBe(track2Id);
  });

  // ⚠️ Sad path
  test('throws error when deleting with no project', async () => {
    useProjectStore.getState().reset();

    await expect(useProjectStore.getState().deleteTrack(trackId)).rejects.toThrow('No project loaded');
  });

  test('throws error when deleting non-existent track', async () => {
    await expect(useProjectStore.getState().deleteTrack('non-existent')).rejects.toThrow('Track not found');
  });
});

describe('TRACK-003, TRACK-004: Undo delete track', () => {
  let trackId: string;

  beforeEach(async () => {
    await initializeDatabase();
    useProjectStore.getState().reset();
    await useProjectStore.getState().createNewProject('Test Project');

    const audioBlob = new Blob(['test-audio'], { type: 'audio/wav' });
    await useProjectStore.getState().addTrack('S', {
      audioBlob,
      duration: 30,
      waveformData: [0.1, 0.5],
    });

    const store = useProjectStore.getState();
    trackId = store.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0].id!;
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('stores deleted track in undo state', async () => {
    await useProjectStore.getState().deleteTrack(trackId);

    const store = useProjectStore.getState();
    expect(store.undoState.lastDeletedTrack).toBeDefined();
    expect(store.undoState.lastDeletedTrack?.id).toBe(trackId);
  });

  test('stores which voice part track was deleted from', async () => {
    await useProjectStore.getState().deleteTrack(trackId);

    const store = useProjectStore.getState();
    expect(store.undoState.lastDeletedFromVoicePart).toBe('S');
  });

  test('restores deleted track with undo', async () => {
    await useProjectStore.getState().deleteTrack(trackId);
    await useProjectStore.getState().undoDeleteTrack();

    const store = useProjectStore.getState();
    const sopranoVoice = store.currentProject?.voiceParts.find(vp => vp.type === 'S');

    expect(sopranoVoice?.tracks).toHaveLength(1);
    expect(sopranoVoice?.tracks[0].id).toBe(trackId);
  });

  test('restores track to IndexedDB', async () => {
    await useProjectStore.getState().deleteTrack(trackId);
    await useProjectStore.getState().undoDeleteTrack();

    const dbTrack = await db.tracks.get(trackId);
    expect(dbTrack).toBeDefined();
  });

  test('restores track with all properties intact', async () => {
    const originalStore = useProjectStore.getState();
    const originalTrack = originalStore.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0];

    await useProjectStore.getState().deleteTrack(trackId);
    await useProjectStore.getState().undoDeleteTrack();

    const store = useProjectStore.getState();
    const restoredTrack = store.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0];

    expect(restoredTrack?.duration).toBe(originalTrack?.duration);
    expect(restoredTrack?.waveformData).toEqual(originalTrack?.waveformData);
    expect(restoredTrack?.volume).toBe(originalTrack?.volume);
  });

  test('clears undo state after restoring', async () => {
    await useProjectStore.getState().deleteTrack(trackId);
    await useProjectStore.getState().undoDeleteTrack();

    const store = useProjectStore.getState();
    expect(store.undoState.lastDeletedTrack).toBeNull();
    expect(store.undoState.lastDeletedFromVoicePart).toBeNull();
  });

  test('only supports single-level undo', async () => {
    // Add and delete first track
    const audioBlob = new Blob();
    await useProjectStore.getState().addTrack('A', { audioBlob, duration: 10, waveformData: [] });
    const firstTrackId = useProjectStore.getState().currentProject?.voiceParts.find(vp => vp.type === 'A')?.tracks[0].id!;
    await useProjectStore.getState().deleteTrack(firstTrackId);

    // Delete second track (Soprano track from setup)
    await useProjectStore.getState().deleteTrack(trackId);

    // Undo should only restore the Soprano track (most recent delete)
    await useProjectStore.getState().undoDeleteTrack();

    const store = useProjectStore.getState();
    const sopranoVoice = store.currentProject?.voiceParts.find(vp => vp.type === 'S');
    const altoVoice = store.currentProject?.voiceParts.find(vp => vp.type === 'A');

    expect(sopranoVoice?.tracks).toHaveLength(1); // Restored
    expect(altoVoice?.tracks).toHaveLength(0); // Not restored (older delete)
  });

  // ⚠️ Sad path
  test('throws error when undoing with no project', async () => {
    await useProjectStore.getState().deleteTrack(trackId);
    useProjectStore.getState().reset();

    await expect(useProjectStore.getState().undoDeleteTrack()).rejects.toThrow('No project loaded');
  });

  test('throws error when nothing to undo', async () => {
    await expect(useProjectStore.getState().undoDeleteTrack()).rejects.toThrow('Nothing to undo');
  });
});

describe('TRACK-005, TRACK-006, TRACK-007: Solo and mute tracks', () => {
  let trackId: string;

  beforeEach(async () => {
    await initializeDatabase();
    useProjectStore.getState().reset();
    await useProjectStore.getState().createNewProject('Test Project');

    const audioBlob = new Blob();
    await useProjectStore.getState().addTrack('S', { audioBlob, duration: 10, waveformData: [] });

    trackId = useProjectStore.getState().currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0].id!;
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('sets track solo flag', async () => {
    await useProjectStore.getState().setTrackSolo(trackId, true);

    const store = useProjectStore.getState();
    const track = store.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0];

    expect(track?.soloed).toBe(true);
  });

  test('clears track solo flag', async () => {
    await useProjectStore.getState().setTrackSolo(trackId, true);
    await useProjectStore.getState().setTrackSolo(trackId, false);

    const store = useProjectStore.getState();
    const track = store.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0];

    expect(track?.soloed).toBe(false);
  });

  test('sets track mute flag', async () => {
    await useProjectStore.getState().setTrackMute(trackId, true);

    const store = useProjectStore.getState();
    const track = store.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0];

    expect(track?.muted).toBe(true);
  });

  test('mute does not affect volume setting', async () => {
    await useProjectStore.getState().setTrackVolume(trackId, 90);
    await useProjectStore.getState().setTrackMute(trackId, true);

    const store = useProjectStore.getState();
    const track = store.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0];

    expect(track?.muted).toBe(true);
    expect(track?.volume).toBe(90); // [EARS: TRACK-007, TRACK-009]
  });

  test('persists solo/mute to IndexedDB', async () => {
    await useProjectStore.getState().setTrackSolo(trackId, true);
    await useProjectStore.getState().setTrackMute(trackId, true);

    const dbTrack = await db.tracks.get(trackId);
    expect(dbTrack?.soloed).toBe(true);
    expect(dbTrack?.muted).toBe(true);
  });

  // ⚠️ Sad path
  test('throws error when setting solo with no project', async () => {
    useProjectStore.getState().reset();
    await expect(useProjectStore.getState().setTrackSolo(trackId, true)).rejects.toThrow('No project loaded');
  });

  test('throws error when setting mute on non-existent track', async () => {
    await expect(useProjectStore.getState().setTrackMute('non-existent', true)).rejects.toThrow('Track not found');
  });
});

describe('TRACK-008, TRACK-009: Volume control', () => {
  let trackId: string;

  beforeEach(async () => {
    await initializeDatabase();
    useProjectStore.getState().reset();
    await useProjectStore.getState().createNewProject('Test Project');

    const audioBlob = new Blob();
    await useProjectStore.getState().addTrack('S', { audioBlob, duration: 10, waveformData: [] });

    trackId = useProjectStore.getState().currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0].id!;
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('updates track volume', async () => {
    await useProjectStore.getState().setTrackVolume(trackId, 60);

    const store = useProjectStore.getState();
    const track = store.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0];

    expect(track?.volume).toBe(60);
  });

  test('volume persists when muted', async () => {
    await useProjectStore.getState().setTrackVolume(trackId, 75);
    await useProjectStore.getState().setTrackMute(trackId, true);
    await useProjectStore.getState().setTrackMute(trackId, false);

    const store = useProjectStore.getState();
    const track = store.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0];

    expect(track?.volume).toBe(75); // [EARS: TRACK-009]
  });

  test('persists volume to IndexedDB', async () => {
    await useProjectStore.getState().setTrackVolume(trackId, 55);

    const dbTrack = await db.tracks.get(trackId);
    expect(dbTrack?.volume).toBe(55);
  });

  // 🔥 Edge cases
  test('clamps volume to 0-100 range', async () => {
    await useProjectStore.getState().setTrackVolume(trackId, 150);
    expect(useProjectStore.getState().currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0].volume).toBe(100);

    await useProjectStore.getState().setTrackVolume(trackId, -20);
    expect(useProjectStore.getState().currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0].volume).toBe(0);
  });

  // ⚠️ Sad path
  test('throws error when setting volume with no project', async () => {
    useProjectStore.getState().reset();
    await expect(useProjectStore.getState().setTrackVolume(trackId, 50)).rejects.toThrow('No project loaded');
  });
});

describe('TRACK-010: Edit track name', () => {
  let trackId: string;

  beforeEach(async () => {
    await initializeDatabase();
    useProjectStore.getState().reset();
    await useProjectStore.getState().createNewProject('Test Project');

    const audioBlob = new Blob();
    await useProjectStore.getState().addTrack('S', { audioBlob, duration: 10, waveformData: [] });

    trackId = useProjectStore.getState().currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0].id!;
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('updates track name', async () => {
    await useProjectStore.getState().setTrackName(trackId, 'Lead Vocal');

    const store = useProjectStore.getState();
    const track = store.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks[0];

    expect(track?.name).toBe('Lead Vocal');
  });

  test('persists track name to IndexedDB', async () => {
    await useProjectStore.getState().setTrackName(trackId, 'Harmony Part');

    const dbTrack = await db.tracks.get(trackId);
    expect(dbTrack?.name).toBe('Harmony Part');
  });

  // ⚠️ Sad path
  test('throws error when setting name with no project', async () => {
    useProjectStore.getState().reset();
    await expect(useProjectStore.getState().setTrackName(trackId, 'New Name')).rejects.toThrow('No project loaded');
  });
});
