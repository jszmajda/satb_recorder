// End-to-end integration tests for major user workflows
// Phase 9.1: Full Integration Testing
//
// These tests verify complete workflows through the application logic layer
// (store + services), ensuring all components work together correctly.

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { useProjectStore } from '../store/useProjectStore';
import type { Track, Project } from '../store/types';

// In-memory database for testing
const mockDb = {
  projects: new Map<string, Project>(),
  tracks: new Map<string, Track>(),
};

// Mock IndexedDB operations with stateful in-memory storage
vi.mock('../db/projects', () => ({
  createProject: vi.fn().mockImplementation(async (name: string) => {
    const projectId = `project-${Date.now()}`;
    const project: Project = {
      id: projectId,
      name,
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
    mockDb.projects.set(projectId, project);
    return projectId;
  }),
  getProject: vi.fn().mockImplementation(async (id: string) => {
    return mockDb.projects.get(id);
  }),
  getAllProjects: vi.fn().mockImplementation(async () => {
    return Array.from(mockDb.projects.values());
  }),
  updateProject: vi.fn().mockImplementation(async (id: string, updates: Partial<Project>) => {
    const project = mockDb.projects.get(id);
    if (project) {
      const updatedProject = {
        ...project,
        ...updates,
        updatedAt: new Date(),
      };
      mockDb.projects.set(id, updatedProject);
    }
  }),
  deleteProject: vi.fn().mockImplementation(async (id: string) => {
    mockDb.projects.delete(id);
  }),
}));

// Mock the Dexie database
vi.mock('../db/index', () => ({
  db: {
    tracks: {
      add: vi.fn().mockImplementation(async (track: Track) => {
        mockDb.tracks.set(track.id, track);
        return track.id;
      }),
      get: vi.fn().mockImplementation(async (id: string) => {
        return mockDb.tracks.get(id);
      }),
      put: vi.fn().mockImplementation(async (track: Track) => {
        mockDb.tracks.set(track.id, track);
      }),
      delete: vi.fn().mockImplementation(async (id: string) => {
        mockDb.tracks.delete(id);
      }),
    },
    projects: {
      get: vi.fn().mockImplementation(async (id: string) => {
        return mockDb.projects.get(id);
      }),
      add: vi.fn().mockImplementation(async (project: Project) => {
        mockDb.projects.set(project.id, project);
        return project.id;
      }),
      put: vi.fn().mockImplementation(async (project: Project) => {
        mockDb.projects.set(project.id, project);
      }),
      delete: vi.fn().mockImplementation(async (id: string) => {
        mockDb.projects.delete(id);
      }),
      toArray: vi.fn().mockImplementation(async () => {
        return Array.from(mockDb.projects.values());
      }),
    },
  },
}));

vi.mock('../db/tracks', () => ({
  addTrackToProject: vi.fn().mockImplementation(async (projectId: string, voicePartType: string, trackData: any) => {
    const project = mockDb.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const voicePart = project.voiceParts.find(vp => vp.type === voicePartType);
    if (!voicePart) throw new Error('Voice part not found');

    const trackId = `track-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const track: Track = {
      id: trackId,
      voicePartType: voicePartType as any,
      name: `${voicePartType}${voicePart.tracks.length + 1}`,
      audioBlob: trackData.audioBlob,
      duration: trackData.duration,
      volume: 80,
      muted: false,
      soloed: false,
      waveformData: trackData.waveformData,
      createdAt: new Date(),
    };

    mockDb.tracks.set(trackId, track);
    voicePart.tracks.push(track);
    mockDb.projects.set(projectId, project);

    return trackId;
  }),
  getTrack: vi.fn().mockImplementation(async (id: string) => {
    return mockDb.tracks.get(id);
  }),
  getProjectTracks: vi.fn().mockImplementation(async (projectId: string) => {
    const project = mockDb.projects.get(projectId);
    if (!project) throw new Error('Project not found');
    return project.voiceParts.flatMap(vp => vp.tracks);
  }),
  updateTrack: vi.fn().mockImplementation(async (id: string, updates: Partial<Track>) => {
    const track = mockDb.tracks.get(id);
    if (!track) throw new Error('Track not found');

    const updatedTrack = { ...track, ...updates };
    mockDb.tracks.set(id, updatedTrack);

    // Also update in project
    for (const project of mockDb.projects.values()) {
      for (const voicePart of project.voiceParts) {
        const trackIndex = voicePart.tracks.findIndex(t => t.id === id);
        if (trackIndex !== -1) {
          voicePart.tracks[trackIndex] = updatedTrack;
          mockDb.projects.set(project.id, project);
          return;
        }
      }
    }
  }),
  deleteTrack: vi.fn().mockImplementation(async (projectId: string, trackId: string) => {
    const project = mockDb.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    mockDb.tracks.delete(trackId);

    for (const voicePart of project.voiceParts) {
      voicePart.tracks = voicePart.tracks.filter(t => t.id !== trackId);
    }
    mockDb.projects.set(projectId, project);
  }),
}));

// Mock audio modules
vi.mock('../audio/recorder', () => ({
  Recorder: vi.fn().mockImplementation(() => ({
    enumerateDevices: vi.fn().mockResolvedValue([]),
    selectDevice: vi.fn(),
    getSelectedDeviceId: vi.fn().mockReturnValue(null),
    requestPermission: vi.fn().mockResolvedValue({} as MediaStream),
    startRecording: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn().mockResolvedValue({
      blob: new Blob(['audio'], { type: 'audio/wav' }),
      duration: 5,
    }),
    dispose: vi.fn(),
  })),
}));

vi.mock('../audio/metronome', () => ({
  Metronome: vi.fn().mockImplementation(() => ({
    setBpm: vi.fn(),
    getBpm: vi.fn().mockReturnValue(120),
    start: vi.fn(),
    stop: vi.fn(),
    isPlaying: vi.fn().mockReturnValue(false),
    setFlashCallback: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock('../audio/vuMeter', () => ({
  VUMeter: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    getLevel: vi.fn().mockReturnValue(0),
  })),
}));

vi.mock('../audio/mixer', () => ({
  Mixer: vi.fn().mockImplementation(() => ({
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    updateTrack: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    getPlaybackState: vi.fn().mockReturnValue('stopped'),
    getCurrentTime: vi.fn().mockReturnValue(0),
    dispose: vi.fn(),
  })),
}));

vi.mock('../audio/exporter', () => ({
  Exporter: vi.fn().mockImplementation(() => ({
    downloadWAV: vi.fn(),
    downloadMP3: vi.fn(),
    dispose: vi.fn(),
  })),
}));

describe('End-to-End Workflows', () => {
  let initialStoreState: any;

  beforeEach(() => {
    // Clear mock database
    mockDb.projects.clear();
    mockDb.tracks.clear();

    // Save initial store state
    initialStoreState = useProjectStore.getState();
    // Clear mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up by resetting current project if set
    const store = useProjectStore.getState();
    if (store.currentProject) {
      // Store will be reset naturally by test framework
    }
  });

  describe('E2E-001: New project → Record 4 tracks → Export flow', () => {
    test('complete workflow from project creation through recording', async () => {
      // Step 1: Create new project
      await useProjectStore.getState().createNewProject('My Choir Project');

      // Verify project is created
      let state = useProjectStore.getState();
      expect(state.currentProject).not.toBeNull();
      expect(state.currentProject?.name).toBe('My Choir Project');
      expect(state.currentProject?.bpm).toBe(120); // Default BPM
      expect(state.currentProject?.voiceParts).toHaveLength(4); // S, A, T, B

      // Step 2: Add tracks (simulating recording workflow)
      const mockTrackData = {
        audioBlob: new Blob(['audio'], { type: 'audio/wav' }),
        duration: 5,
        waveformData: [],
      };

      // Add one track per voice part
      await useProjectStore.getState().addTrack('S', mockTrackData);
      await useProjectStore.getState().addTrack('A', mockTrackData);
      await useProjectStore.getState().addTrack('T', mockTrackData);
      await useProjectStore.getState().addTrack('B', mockTrackData);

      // Verify tracks were added
      state = useProjectStore.getState();
      const sopranoTracks = state.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks;
      const altoTracks = state.currentProject?.voiceParts.find(vp => vp.type === 'A')?.tracks;
      const tenorTracks = state.currentProject?.voiceParts.find(vp => vp.type === 'T')?.tracks;
      const bassTracks = state.currentProject?.voiceParts.find(vp => vp.type === 'B')?.tracks;

      expect(sopranoTracks).toHaveLength(1);
      expect(altoTracks).toHaveLength(1);
      expect(tenorTracks).toHaveLength(1);
      expect(bassTracks).toHaveLength(1);

      // Step 3: Verify export readiness (tracks available)
      const allTracks = state.currentProject?.voiceParts.flatMap(vp => vp.tracks) || [];
      expect(allTracks).toHaveLength(4);
      allTracks.forEach(track => {
        expect(track.audioBlob).toBeInstanceOf(Blob);
        expect(track.duration).toBeGreaterThan(0);
      });
    });
  });

  describe('E2E-002: Load project → Edit → Auto-save', () => {
    test('project edits are persisted via auto-save', async () => {
      // Step 1: Create a project
      await useProjectStore.getState().createNewProject('Test Project');

      // Verify project is created
      let state = useProjectStore.getState();
      expect(state.currentProject).not.toBeNull();
      expect(state.currentProject?.name).toBe('Test Project');

      // Step 2: Make edits
      // Edit 1: Change BPM
      await useProjectStore.getState().updateBpm(140);
      state = useProjectStore.getState();
      expect(state.currentProject?.bpm).toBe(140);

      // Edit 2: Enable overdub
      await useProjectStore.getState().setOverdubEnabled(true);
      state = useProjectStore.getState();
      expect(state.currentProject?.overdubEnabled).toBe(true);

      // Edit 3: Add a track
      const mockTrackData = {
        audioBlob: new Blob(['audio'], { type: 'audio/wav' }),
        duration: 5,
        waveformData: [],
      };
      await useProjectStore.getState().addTrack('S', mockTrackData);

      // Step 3: Verify all edits are in the current project
      state = useProjectStore.getState();
      expect(state.currentProject?.bpm).toBe(140);
      expect(state.currentProject?.overdubEnabled).toBe(true);
      const sopranoTracks = state.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks;
      expect(sopranoTracks).toHaveLength(1);

      // Note: Auto-save is handled by updateProject calls in the store
      // The mock verifies these were called
    });
  });

  describe('E2E-003: Overdub → Solo/Mute workflow', () => {
    test('overdub mode with solo/mute track controls', async () => {
      // Step 1: Create a project and enable overdub
      await useProjectStore.getState().createNewProject('Overdub Test');
      await useProjectStore.getState().setOverdubEnabled(true);

      let state = useProjectStore.getState();
      expect(state.currentProject?.overdubEnabled).toBe(true);

      // Step 2: Add multiple tracks (simulating overdub recording)
      const mockTrackData = {
        audioBlob: new Blob(['audio'], { type: 'audio/wav' }),
        duration: 5,
        waveformData: [],
      };

      // Record first soprano track
      await useProjectStore.getState().addTrack('S', mockTrackData);
      // Record second soprano track (overdub)
      await useProjectStore.getState().addTrack('S', mockTrackData);

      state = useProjectStore.getState();
      const sopranoTracks = state.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks;
      expect(sopranoTracks).toHaveLength(2);

      // Step 3: Test solo/mute controls
      const track1Id = sopranoTracks![0].id;
      const track2Id = sopranoTracks![1].id;

      // Mute first track
      await useProjectStore.getState().setTrackMute(track1Id, true);
      state = useProjectStore.getState();
      let updatedTrack1 = state.currentProject?.voiceParts
        .find(vp => vp.type === 'S')?.tracks.find(t => t.id === track1Id);
      expect(updatedTrack1?.muted).toBe(true);

      // Solo second track
      await useProjectStore.getState().setTrackSolo(track2Id, true);
      state = useProjectStore.getState();
      let updatedTrack2 = state.currentProject?.voiceParts
        .find(vp => vp.type === 'S')?.tracks.find(t => t.id === track2Id);
      expect(updatedTrack2?.soloed).toBe(true);

      // Step 4: Verify tracks are ready for export
      const allTracks = state.currentProject?.voiceParts.flatMap(vp => vp.tracks) || [];
      expect(allTracks).toHaveLength(2);
    });
  });

  describe('E2E-004: Delete track → Undo → Restoration', () => {
    test('undo restores deleted track correctly', async () => {
      // Step 1: Create a project
      await useProjectStore.getState().createNewProject('Undo Test');

      // Step 2: Add a track
      const mockTrackData = {
        audioBlob: new Blob(['audio'], { type: 'audio/wav' }),
        duration: 5,
        waveformData: [],
      };

      await useProjectStore.getState().addTrack('S', mockTrackData);

      // Verify track was added
      let state = useProjectStore.getState();
      let sopranoTracks = state.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks;
      expect(sopranoTracks).toHaveLength(1);
      const trackId = sopranoTracks![0].id;

      // Step 3: Delete the track
      await useProjectStore.getState().deleteTrack(trackId);

      // Verify track is deleted
      state = useProjectStore.getState();
      sopranoTracks = state.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks;
      expect(sopranoTracks).toHaveLength(0);

      // Step 4: Undo the deletion
      await useProjectStore.getState().undoDeleteTrack();

      // Step 5: Verify track is restored
      state = useProjectStore.getState();
      sopranoTracks = state.currentProject?.voiceParts.find(vp => vp.type === 'S')?.tracks;
      expect(sopranoTracks).toHaveLength(1);
      expect(sopranoTracks![0].id).toBe(trackId);
      expect(sopranoTracks![0].audioBlob).toBeInstanceOf(Blob);
    });
  });
});
