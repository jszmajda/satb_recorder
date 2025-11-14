import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { db, initializeDatabase } from './index';
import type { Project, Track } from '@/store/types';

describe('PROJ-005: Database auto-saves project data', () => {
  beforeEach(async () => {
    await initializeDatabase();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('initializes database with projects and tracks tables', async () => {
    expect(db.projects).toBeDefined();
    expect(db.tracks).toBeDefined();
  });

  test('projects table exists and is empty initially', async () => {
    const count = await db.projects.count();
    expect(count).toBe(0);
  });

  test('tracks table exists and is empty initially', async () => {
    const count = await db.tracks.count();
    expect(count).toBe(0);
  });
});

describe('PROJ-006: Load saved projects from IndexedDB', () => {
  beforeEach(async () => {
    await initializeDatabase();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('can insert a project with required fields', async () => {
    const project: Project = {
      id: 'test-project-1',
      name: 'Test Project',
      bpm: 120,
      overdubEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      voiceParts: [
        { type: 'S', label: 'Soprano', expanded: true, tracks: [] },
        { type: 'A', label: 'Alto', expanded: true, tracks: [] },
        { type: 'T', label: 'Tenor', expanded: true, tracks: [] },
        { type: 'B', label: 'Bass', expanded: true, tracks: [] },
      ],
    };

    await db.projects.add(project);
    const count = await db.projects.count();
    expect(count).toBe(1);
  });

  test('can retrieve inserted project by id', async () => {
    const project: Project = {
      id: 'test-project-2',
      name: 'Another Test',
      bpm: 140,
      overdubEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      voiceParts: [
        { type: 'S', label: 'Soprano', expanded: false, tracks: [] },
        { type: 'A', label: 'Alto', expanded: false, tracks: [] },
        { type: 'T', label: 'Tenor', expanded: false, tracks: [] },
        { type: 'B', label: 'Bass', expanded: false, tracks: [] },
      ],
    };

    await db.projects.add(project);
    const retrieved = await db.projects.get('test-project-2');

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Another Test');
    expect(retrieved?.bpm).toBe(140);
    expect(retrieved?.overdubEnabled).toBe(true);
  });

  // ⚠️ Sad path
  test('returns undefined when retrieving non-existent project', async () => {
    const retrieved = await db.projects.get('non-existent-id');
    expect(retrieved).toBeUndefined();
  });

  // 🔥 Edge cases
  test('can store project with all voice parts having max tracks', async () => {
    const project: Project = {
      id: 'test-project-max',
      name: 'Max Tracks Test',
      bpm: 120,
      overdubEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      voiceParts: [
        {
          type: 'S',
          label: 'Soprano',
          expanded: true,
          tracks: Array.from({ length: 8 }, (_, i) => ({
            id: `s-track-${i}`,
            voicePartType: 'S' as const,
            name: `S${i + 1}`,
            audioBlob: new Blob(),
            duration: 10,
            volume: 80,
            muted: false,
            soloed: false,
            waveformData: [1, 2, 3],
            createdAt: new Date(),
          })),
        },
        { type: 'A', label: 'Alto', expanded: true, tracks: [] },
        { type: 'T', label: 'Tenor', expanded: true, tracks: [] },
        { type: 'B', label: 'Bass', expanded: true, tracks: [] },
      ],
    };

    await db.projects.add(project);
    const retrieved = await db.projects.get('test-project-max');
    expect(retrieved?.voiceParts[0].tracks).toHaveLength(8);
  });
});

describe('REC-009: Auto-save track to IndexedDB', () => {
  beforeEach(async () => {
    await initializeDatabase();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('can insert a track with audio blob', async () => {
    const audioBlob = new Blob(['fake-audio-data'], { type: 'audio/wav' });
    const track: Track = {
      id: 'track-1',
      voicePartType: 'S',
      name: 'S1',
      audioBlob,
      duration: 15.5,
      volume: 75,
      muted: false,
      soloed: false,
      waveformData: [0.1, 0.5, 0.3, 0.8],
      createdAt: new Date(),
    };

    await db.tracks.add(track);
    const count = await db.tracks.count();
    expect(count).toBe(1);
  });

  test('can retrieve track with preserved blob data', async () => {
    const audioBlob = new Blob(['test-audio'], { type: 'audio/wav' });
    const track: Track = {
      id: 'track-2',
      voicePartType: 'A',
      name: 'A1',
      audioBlob,
      duration: 20,
      volume: 100,
      muted: false,
      soloed: false,
      waveformData: [],
      createdAt: new Date(),
    };

    await db.tracks.add(track);
    const retrieved = await db.tracks.get('track-2');

    expect(retrieved).toBeDefined();
    expect(retrieved?.audioBlob).toBeDefined();
    expect(retrieved?.audioBlob.type).toBe('audio/wav');
    expect(retrieved?.audioBlob.size).toBe(10); // 'test-audio' length
  });

  // ⚠️ Sad path
  test('returns undefined when retrieving non-existent track', async () => {
    const retrieved = await db.tracks.get('non-existent-track');
    expect(retrieved).toBeUndefined();
  });

  // 🔥 Edge cases
  test('can store track with large waveform data array', async () => {
    const largeWaveformData = Array.from({ length: 200 }, () => Math.random());
    const track: Track = {
      id: 'track-large',
      voicePartType: 'B',
      name: 'B1',
      audioBlob: new Blob(),
      duration: 60,
      volume: 50,
      muted: false,
      soloed: false,
      waveformData: largeWaveformData,
      createdAt: new Date(),
    };

    await db.tracks.add(track);
    const retrieved = await db.tracks.get('track-large');
    expect(retrieved?.waveformData).toHaveLength(200);
  });

  test('can store track with zero duration', async () => {
    const track: Track = {
      id: 'track-zero',
      voicePartType: 'T',
      name: 'T1',
      audioBlob: new Blob(),
      duration: 0,
      volume: 0,
      muted: true,
      soloed: false,
      waveformData: [],
      createdAt: new Date(),
    };

    await db.tracks.add(track);
    const retrieved = await db.tracks.get('track-zero');
    expect(retrieved?.duration).toBe(0);
  });
});

describe('PROJ-007: Restore project metadata and audio tracks', () => {
  beforeEach(async () => {
    await initializeDatabase();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('can list all projects', async () => {
    const project1: Project = {
      id: 'proj-1',
      name: 'Project 1',
      bpm: 120,
      overdubEnabled: false,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      voiceParts: [
        { type: 'S', label: 'Soprano', expanded: true, tracks: [] },
        { type: 'A', label: 'Alto', expanded: true, tracks: [] },
        { type: 'T', label: 'Tenor', expanded: true, tracks: [] },
        { type: 'B', label: 'Bass', expanded: true, tracks: [] },
      ],
    };

    const project2: Project = {
      id: 'proj-2',
      name: 'Project 2',
      bpm: 140,
      overdubEnabled: true,
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
      voiceParts: [
        { type: 'S', label: 'Soprano', expanded: true, tracks: [] },
        { type: 'A', label: 'Alto', expanded: true, tracks: [] },
        { type: 'T', label: 'Tenor', expanded: true, tracks: [] },
        { type: 'B', label: 'Bass', expanded: true, tracks: [] },
      ],
    };

    await db.projects.add(project1);
    await db.projects.add(project2);

    const allProjects = await db.projects.toArray();
    expect(allProjects).toHaveLength(2);
    expect(allProjects.map(p => p.name)).toContain('Project 1');
    expect(allProjects.map(p => p.name)).toContain('Project 2');
  });

  test('can list all tracks', async () => {
    const track1: Track = {
      id: 'trk-1',
      voicePartType: 'S',
      name: 'S1',
      audioBlob: new Blob(),
      duration: 10,
      volume: 80,
      muted: false,
      soloed: false,
      waveformData: [],
      createdAt: new Date(),
    };

    const track2: Track = {
      id: 'trk-2',
      voicePartType: 'A',
      name: 'A1',
      audioBlob: new Blob(),
      duration: 15,
      volume: 90,
      muted: false,
      soloed: false,
      waveformData: [],
      createdAt: new Date(),
    };

    await db.tracks.add(track1);
    await db.tracks.add(track2);

    const allTracks = await db.tracks.toArray();
    expect(allTracks).toHaveLength(2);
    expect(allTracks.map(t => t.name)).toContain('S1');
    expect(allTracks.map(t => t.name)).toContain('A1');
  });
});

describe('PROJ-008: Delete project from IndexedDB', () => {
  beforeEach(async () => {
    await initializeDatabase();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('can delete a project by id', async () => {
    const project: Project = {
      id: 'delete-test',
      name: 'To Be Deleted',
      bpm: 120,
      overdubEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      voiceParts: [
        { type: 'S', label: 'Soprano', expanded: true, tracks: [] },
        { type: 'A', label: 'Alto', expanded: true, tracks: [] },
        { type: 'T', label: 'Tenor', expanded: true, tracks: [] },
        { type: 'B', label: 'Bass', expanded: true, tracks: [] },
      ],
    };

    await db.projects.add(project);
    expect(await db.projects.count()).toBe(1);

    await db.projects.delete('delete-test');
    expect(await db.projects.count()).toBe(0);
  });

  test('can delete a track by id', async () => {
    const track: Track = {
      id: 'delete-track',
      voicePartType: 'T',
      name: 'T1',
      audioBlob: new Blob(),
      duration: 10,
      volume: 70,
      muted: false,
      soloed: false,
      waveformData: [],
      createdAt: new Date(),
    };

    await db.tracks.add(track);
    expect(await db.tracks.count()).toBe(1);

    await db.tracks.delete('delete-track');
    expect(await db.tracks.count()).toBe(0);
  });

  // ⚠️ Sad path
  test('deleting non-existent project does not throw error', async () => {
    await expect(db.projects.delete('non-existent')).resolves.toBeUndefined();
  });

  test('deleting non-existent track does not throw error', async () => {
    await expect(db.tracks.delete('non-existent')).resolves.toBeUndefined();
  });
});
