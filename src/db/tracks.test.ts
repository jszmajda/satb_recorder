import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { db, initializeDatabase } from './index';
import { createProject, getProject } from './projects';
import { addTrackToProject, getTrack, updateTrack, deleteTrack, getProjectTracks } from './tracks';
import type { VoicePartType } from '@/store/types';

describe('REC-009: Auto-save track to IndexedDB', () => {
  let projectId: string;

  beforeEach(async () => {
    await initializeDatabase();
    projectId = await createProject('Test Project');
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('adds track to project voice part', async () => {
    const audioBlob = new Blob(['audio-data'], { type: 'audio/wav' });
    const trackId = await addTrackToProject(projectId, 'S', {
      audioBlob,
      duration: 30,
      waveformData: [0.1, 0.5, 0.3],
    });

    expect(trackId).toBeDefined();
    expect(typeof trackId).toBe('string');

    const track = await getTrack(trackId);
    expect(track?.voicePartType).toBe('S');
    expect(track?.duration).toBe(30);
  });

  test('auto-generates track name based on voice part', async () => {
    const audioBlob = new Blob();
    const trackId = await addTrackToProject(projectId, 'S', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });

    const track = await getTrack(trackId);
    expect(track?.name).toBe('S1');
  });

  test('auto-generates sequential track names', async () => {
    const audioBlob = new Blob();

    const id1 = await addTrackToProject(projectId, 'A', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });
    const id2 = await addTrackToProject(projectId, 'A', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });
    const id3 = await addTrackToProject(projectId, 'A', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });

    const track1 = await getTrack(id1);
    const track2 = await getTrack(id2);
    const track3 = await getTrack(id3);

    expect(track1?.name).toBe('A1');
    expect(track2?.name).toBe('A2');
    expect(track3?.name).toBe('A3');
  });

  test('sets default volume to 80', async () => {
    const audioBlob = new Blob();
    const trackId = await addTrackToProject(projectId, 'T', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });

    const track = await getTrack(trackId);
    expect(track?.volume).toBe(80);
  });

  test('sets muted and soloed to false by default', async () => {
    const audioBlob = new Blob();
    const trackId = await addTrackToProject(projectId, 'B', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });

    const track = await getTrack(trackId);
    expect(track?.muted).toBe(false);
    expect(track?.soloed).toBe(false);
  });

  test('sets createdAt timestamp', async () => {
    const before = new Date();
    const audioBlob = new Blob();
    const trackId = await addTrackToProject(projectId, 'S', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });
    const after = new Date();

    const track = await getTrack(trackId);
    expect(track?.createdAt).toBeInstanceOf(Date);
    expect(track?.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(track?.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  test('stores track in IndexedDB tracks table', async () => {
    const audioBlob = new Blob();
    const trackId = await addTrackToProject(projectId, 'S', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });

    const dbTrack = await db.tracks.get(trackId);
    expect(dbTrack).toBeDefined();
    expect(dbTrack?.id).toBe(trackId);
  });

  test('adds track reference to project voice part', async () => {
    const audioBlob = new Blob();
    const trackId = await addTrackToProject(projectId, 'S', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });

    const project = await getProject(projectId);
    const sopranoVoice = project?.voiceParts.find(vp => vp.type === 'S');

    expect(sopranoVoice?.tracks).toHaveLength(1);
    expect(sopranoVoice?.tracks[0].id).toBe(trackId);
  });

  test('stores audio blob with track', async () => {
    const audioBlob = new Blob(['test-audio'], { type: 'audio/wav' });
    const trackId = await addTrackToProject(projectId, 'S', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });

    const track = await getTrack(trackId);
    expect(track?.audioBlob).toBeDefined();
    expect(track?.audioBlob.type).toBe('audio/wav');
  });

  // ⚠️ Sad path
  test('throws error when adding track to non-existent project', async () => {
    const audioBlob = new Blob();
    await expect(
      addTrackToProject('non-existent', 'S', {
        audioBlob,
        duration: 10,
        waveformData: [],
      })
    ).rejects.toThrow('Project not found');
  });

  test('throws error when adding track with invalid voice part', async () => {
    const audioBlob = new Blob();
    await expect(
      addTrackToProject(projectId, 'X' as VoicePartType, {
        audioBlob,
        duration: 10,
        waveformData: [],
      })
    ).rejects.toThrow('Invalid voice part type');
  });

  // 🔥 Edge cases
  test('enforces maximum of 8 tracks per voice part', async () => {
    const audioBlob = new Blob();

    // Add 8 tracks
    for (let i = 0; i < 8; i++) {
      await addTrackToProject(projectId, 'S', {
        audioBlob,
        duration: 10,
        waveformData: [],
      });
    }

    // 9th track should throw
    await expect(
      addTrackToProject(projectId, 'S', {
        audioBlob,
        duration: 10,
        waveformData: [],
      })
    ).rejects.toThrow('Maximum 8 tracks per voice part');
  });

  test('allows 8 tracks per voice part independently', async () => {
    const audioBlob = new Blob();

    // Add 8 tracks to Soprano
    for (let i = 0; i < 8; i++) {
      await addTrackToProject(projectId, 'S', {
        audioBlob,
        duration: 10,
        waveformData: [],
      });
    }

    // Should still be able to add to Alto
    const altoTrackId = await addTrackToProject(projectId, 'A', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });

    expect(altoTrackId).toBeDefined();
  });
});

describe('REC-010: Auto-generate track name', () => {
  let projectId: string;

  beforeEach(async () => {
    await initializeDatabase();
    projectId = await createProject('Test Project');
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('generates names for each voice part independently', async () => {
    const audioBlob = new Blob();

    const sId = await addTrackToProject(projectId, 'S', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });
    const aId = await addTrackToProject(projectId, 'A', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });
    const tId = await addTrackToProject(projectId, 'T', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });
    const bId = await addTrackToProject(projectId, 'B', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });

    expect((await getTrack(sId))?.name).toBe('S1');
    expect((await getTrack(aId))?.name).toBe('A1');
    expect((await getTrack(tId))?.name).toBe('T1');
    expect((await getTrack(bId))?.name).toBe('B1');
  });
});

describe('TRACK-006, TRACK-008, TRACK-009: Update track properties', () => {
  let projectId: string;
  let trackId: string;

  beforeEach(async () => {
    await initializeDatabase();
    projectId = await createProject('Test Project');
    const audioBlob = new Blob();
    trackId = await addTrackToProject(projectId, 'S', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('updates track muted state', async () => {
    await updateTrack(trackId, { muted: true });

    const track = await getTrack(trackId);
    expect(track?.muted).toBe(true);
  });

  test('updates track soloed state', async () => {
    await updateTrack(trackId, { soloed: true });

    const track = await getTrack(trackId);
    expect(track?.soloed).toBe(true);
  });

  test('updates track volume', async () => {
    await updateTrack(trackId, { volume: 50 });

    const track = await getTrack(trackId);
    expect(track?.volume).toBe(50);
  });

  test('updates track name', async () => {
    await updateTrack(trackId, { name: 'Lead Vocal' });

    const track = await getTrack(trackId);
    expect(track?.name).toBe('Lead Vocal');
  });

  test('updates multiple properties at once', async () => {
    await updateTrack(trackId, {
      muted: true,
      volume: 60,
      name: 'Harmony',
    });

    const track = await getTrack(trackId);
    expect(track?.muted).toBe(true);
    expect(track?.volume).toBe(60);
    expect(track?.name).toBe('Harmony');
  });

  test('preserves volume when muting', async () => {
    await updateTrack(trackId, { volume: 90 });
    await updateTrack(trackId, { muted: true });

    const track = await getTrack(trackId);
    expect(track?.volume).toBe(90); // [EARS: TRACK-007, TRACK-009]
    expect(track?.muted).toBe(true);
  });

  // ⚠️ Sad path
  test('throws error when updating non-existent track', async () => {
    await expect(updateTrack('non-existent', { volume: 50 })).rejects.toThrow(
      'Track not found'
    );
  });

  // 🔥 Edge cases
  test('clamps volume to 0-100 range', async () => {
    await updateTrack(trackId, { volume: 150 });
    expect((await getTrack(trackId))?.volume).toBe(100);

    await updateTrack(trackId, { volume: -10 });
    expect((await getTrack(trackId))?.volume).toBe(0);
  });
});

describe('TRACK-001, TRACK-002: Delete track', () => {
  let projectId: string;
  let trackId: string;

  beforeEach(async () => {
    await initializeDatabase();
    projectId = await createProject('Test Project');
    const audioBlob = new Blob();
    trackId = await addTrackToProject(projectId, 'S', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('deletes track from IndexedDB', async () => {
    await deleteTrack(projectId, trackId);

    const track = await getTrack(trackId);
    expect(track).toBeUndefined();
  });

  test('removes track from project voice part', async () => {
    await deleteTrack(projectId, trackId);

    const project = await getProject(projectId);
    const sopranoVoice = project?.voiceParts.find(vp => vp.type === 'S');

    expect(sopranoVoice?.tracks).toHaveLength(0);
  });

  test('deletes only the specified track', async () => {
    const audioBlob = new Blob();
    const track2Id = await addTrackToProject(projectId, 'S', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });

    await deleteTrack(projectId, trackId);

    expect(await getTrack(trackId)).toBeUndefined();
    expect(await getTrack(track2Id)).toBeDefined();
  });

  // ⚠️ Sad path
  test('throws error when deleting from non-existent project', async () => {
    await expect(deleteTrack('non-existent', trackId)).rejects.toThrow('Project not found');
  });

  test('throws error when deleting non-existent track', async () => {
    await expect(deleteTrack(projectId, 'non-existent')).rejects.toThrow('Track not found');
  });
});

describe('PROJ-007: Get project tracks', () => {
  let projectId: string;

  beforeEach(async () => {
    await initializeDatabase();
    projectId = await createProject('Test Project');
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('retrieves all tracks for a project', async () => {
    const audioBlob = new Blob();

    await addTrackToProject(projectId, 'S', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });
    await addTrackToProject(projectId, 'A', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });
    await addTrackToProject(projectId, 'T', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });

    const tracks = await getProjectTracks(projectId);
    expect(tracks).toHaveLength(3);
  });

  test('returns empty array when project has no tracks', async () => {
    const tracks = await getProjectTracks(projectId);
    expect(tracks).toEqual([]);
  });

  test('only returns tracks from specified project', async () => {
    const audioBlob = new Blob();
    const project2Id = await createProject('Project 2');

    await addTrackToProject(projectId, 'S', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });
    await addTrackToProject(project2Id, 'A', {
      audioBlob,
      duration: 10,
      waveformData: [],
    });

    const tracks = await getProjectTracks(projectId);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].voicePartType).toBe('S');
  });

  // ⚠️ Sad path
  test('throws error when getting tracks for non-existent project', async () => {
    await expect(getProjectTracks('non-existent')).rejects.toThrow('Project not found');
  });
});
