// [EARS: PROJ-001 through PROJ-009, REC-010, TRACK-001 through TRACK-010] Zustand store for project and track management with auto-save

import { create } from 'zustand';
import type { Project, VoicePartType, Track, UndoState } from './types';
import * as projectsDb from '@/db/projects';
import * as tracksDb from '@/db/tracks';
import { db } from '@/db/index';

interface ProjectStore {
  // State
  currentProject: Project | null;
  hasUnsavedChanges: boolean;
  undoState: UndoState;
  tracks: Track[];

  // Actions - Project lifecycle
  createNewProject: (name: string) => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  getAllProjects: () => Promise<Project[]>;
  deleteCurrentProject: () => Promise<void>;

  // Actions - Project updates
  updateProjectName: (name: string) => Promise<void>;
  updateBpm: (bpm: number) => Promise<void>;
  setOverdubEnabled: (enabled: boolean) => Promise<void>;
  toggleVoicePartExpanded: (voicePartType: VoicePartType) => Promise<void>;

  // Actions - Track management
  addTrack: (
    voicePartType: VoicePartType,
    trackData: { audioBlob: Blob; duration: number; waveformData: number[] }
  ) => Promise<void>;
  deleteTrack: (trackId: string) => Promise<void>;
  undoDeleteTrack: () => Promise<void>;
  setTrackSolo: (trackId: string, soloed: boolean) => Promise<void>;
  setTrackMute: (trackId: string, muted: boolean) => Promise<void>;
  setTrackVolume: (trackId: string, volume: number) => Promise<void>;
  setTrackName: (trackId: string, name: string) => Promise<void>;

  // Convenience wrappers for UI components
  createProject: (name: string) => Promise<void>;
  updateProject: (id: string, updates: { name: string }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Utilities
  reset: () => void;
}

/**
 * Helper: Extract all tracks from a project
 */
const getTracksFromProject = (project: Project | null): Track[] => {
  if (!project) return [];
  return project.voiceParts.flatMap(vp => vp.tracks);
};

/**
 * Main project store with auto-save to IndexedDB
 * [EARS: PROJ-001 through PROJ-009, REC-010, TRACK-001 through TRACK-010]
 */
export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  currentProject: null,
  hasUnsavedChanges: false,
  tracks: [],
  undoState: {
    lastDeletedTrack: null,
    lastDeletedFromVoicePart: null,
  },

  /**
   * Create a new project
   * [EARS: PROJ-001] Prompt for project name
   * [EARS: PROJ-002] Initialize 4 voice parts
   * [EARS: PROJ-003] Default BPM 120
   * [EARS: PROJ-004] Overdub disabled by default
   * [EARS: PROJ-005] Auto-save to IndexedDB
   */
  createNewProject: async (name: string) => {
    const projectId = await projectsDb.createProject(name);
    const project = await projectsDb.getProject(projectId);

    if (!project) {
      throw new Error('Failed to create project');
    }

    set({
      currentProject: project,
      tracks: getTracksFromProject(project),
      hasUnsavedChanges: false,
    });
  },

  /**
   * Load an existing project
   * [EARS: PROJ-006] Load saved projects from IndexedDB
   * [EARS: PROJ-007] Restore all project metadata and audio tracks
   */
  loadProject: async (id: string) => {
    const project = await projectsDb.getProject(id);

    if (!project) {
      throw new Error('Project not found');
    }

    set({
      currentProject: project,
      tracks: getTracksFromProject(project),
      hasUnsavedChanges: false,
    });
  },

  /**
   * Get all projects (for load project list)
   * [EARS: PROJ-006] Display list of saved projects
   */
  getAllProjects: async () => {
    return await projectsDb.getAllProjects();
  },

  /**
   * Delete the current project
   * [EARS: PROJ-008] Remove project from IndexedDB
   */
  deleteCurrentProject: async () => {
    const { currentProject } = get();

    if (!currentProject) {
      throw new Error('No project loaded');
    }

    await projectsDb.deleteProject(currentProject.id);

    set({
      currentProject: null,
      tracks: [],
      hasUnsavedChanges: false,
    });
  },

  /**
   * Update project name
   * [EARS: PROJ-005, PROJ-009] Auto-save name changes
   */
  updateProjectName: async (name: string) => {
    const { currentProject } = get();

    if (!currentProject) {
      throw new Error('No project loaded');
    }

    await projectsDb.updateProject(currentProject.id, { name });

    const updatedProject = await projectsDb.getProject(currentProject.id);

    set({
      currentProject: updatedProject!,
      tracks: getTracksFromProject(updatedProject!),
      hasUnsavedChanges: false,
    });
  },

  /**
   * Update project BPM
   * [EARS: PROJ-005] Auto-save BPM changes
   */
  updateBpm: async (bpm: number) => {
    const { currentProject } = get();

    if (!currentProject) {
      throw new Error('No project loaded');
    }

    await projectsDb.updateProject(currentProject.id, { bpm });

    const updatedProject = await projectsDb.getProject(currentProject.id);

    set({
      currentProject: updatedProject!,
      tracks: getTracksFromProject(updatedProject!),
      hasUnsavedChanges: false,
    });
  },

  /**
   * Set overdub enabled/disabled
   * [EARS: PROJ-005, OVER-004] Auto-save overdub setting
   */
  setOverdubEnabled: async (enabled: boolean) => {
    const { currentProject } = get();

    if (!currentProject) {
      throw new Error('No project loaded');
    }

    await projectsDb.updateProject(currentProject.id, { overdubEnabled: enabled });

    const updatedProject = await projectsDb.getProject(currentProject.id);

    set({
      currentProject: updatedProject!,
      tracks: getTracksFromProject(updatedProject!),
      hasUnsavedChanges: false,
    });
  },

  /**
   * Toggle voice part expanded/collapsed state
   * [EARS: PROJ-005, VOICE-002] Auto-save voice part state
   */
  toggleVoicePartExpanded: async (voicePartType: VoicePartType) => {
    const { currentProject } = get();

    if (!currentProject) {
      throw new Error('No project loaded');
    }

    const updatedVoiceParts = currentProject.voiceParts.map(vp => {
      if (vp.type === voicePartType) {
        return { ...vp, expanded: !vp.expanded };
      }
      return vp;
    });

    await projectsDb.updateProject(currentProject.id, { voiceParts: updatedVoiceParts });

    const updatedProject = await projectsDb.getProject(currentProject.id);

    set({
      currentProject: updatedProject!,
      tracks: getTracksFromProject(updatedProject!),
      hasUnsavedChanges: false,
    });
  },

  /**
   * Add a track to a voice part
   * [EARS: REC-009] Auto-save track to IndexedDB
   * [EARS: REC-010] Auto-generate track name
   * [EARS: REC-011] Enforce 8-track limit
   */
  addTrack: async (voicePartType: VoicePartType, trackData) => {
    const { currentProject } = get();

    if (!currentProject) {
      throw new Error('No project loaded');
    }

    await tracksDb.addTrackToProject(currentProject.id, voicePartType, trackData);

    const updatedProject = await projectsDb.getProject(currentProject.id);

    set({
      currentProject: updatedProject!,
      tracks: getTracksFromProject(updatedProject!),
      hasUnsavedChanges: false,
    });
  },

  /**
   * Delete a track
   * [EARS: TRACK-001] Store in undo state
   * [EARS: TRACK-002] Remove from IndexedDB
   */
  deleteTrack: async (trackId: string) => {
    const { currentProject } = get();

    if (!currentProject) {
      throw new Error('No project loaded');
    }

    // Find the track to store in undo state
    let deletedTrack: Track | null = null;
    let deletedFromVoicePart: VoicePartType | null = null;

    for (const voicePart of currentProject.voiceParts) {
      const track = voicePart.tracks.find(t => t.id === trackId);
      if (track) {
        deletedTrack = track;
        deletedFromVoicePart = voicePart.type;
        break;
      }
    }

    if (!deletedTrack) {
      throw new Error('Track not found');
    }

    // Delete from database
    await tracksDb.deleteTrack(currentProject.id, trackId);

    // Update project state
    const updatedProject = await projectsDb.getProject(currentProject.id);

    set({
      currentProject: updatedProject!,
      hasUnsavedChanges: false,
      undoState: {
        lastDeletedTrack: deletedTrack,
        lastDeletedFromVoicePart: deletedFromVoicePart,
      },
    });
  },

  /**
   * Undo delete track (single-level undo)
   * [EARS: TRACK-003] Restore last deleted track
   * [EARS: TRACK-004] Single-level undo only
   */
  undoDeleteTrack: async () => {
    const { currentProject, undoState } = get();

    if (!currentProject) {
      throw new Error('No project loaded');
    }

    if (!undoState.lastDeletedTrack || !undoState.lastDeletedFromVoicePart) {
      throw new Error('Nothing to undo');
    }

    // Re-add the track directly to IndexedDB with original ID
    await db.tracks.add(undoState.lastDeletedTrack);

    // Update project voice parts to include the restored track
    const updatedVoiceParts = currentProject.voiceParts.map(vp => {
      if (vp.type === undoState.lastDeletedFromVoicePart) {
        return {
          ...vp,
          tracks: [...vp.tracks, undoState.lastDeletedTrack!],
        };
      }
      return vp;
    });

    await projectsDb.updateProject(currentProject.id, { voiceParts: updatedVoiceParts });

    // Refresh project state and clear undo
    const finalProject = await projectsDb.getProject(currentProject.id);

    set({
      currentProject: finalProject!,
      hasUnsavedChanges: false,
      undoState: {
        lastDeletedTrack: null,
        lastDeletedFromVoicePart: null,
      },
    });
  },

  /**
   * Set track solo flag
   * [EARS: TRACK-005] Set solo flag
   */
  setTrackSolo: async (trackId: string, soloed: boolean) => {
    const { currentProject } = get();

    if (!currentProject) {
      throw new Error('No project loaded');
    }

    await tracksDb.updateTrack(trackId, { soloed });

    const updatedProject = await projectsDb.getProject(currentProject.id);

    set({
      currentProject: updatedProject!,
      tracks: getTracksFromProject(updatedProject!),
      hasUnsavedChanges: false,
    });
  },

  /**
   * Set track mute flag
   * [EARS: TRACK-006] Set mute flag
   * [EARS: TRACK-007] Mute does not modify volume
   */
  setTrackMute: async (trackId: string, muted: boolean) => {
    const { currentProject } = get();

    if (!currentProject) {
      throw new Error('No project loaded');
    }

    await tracksDb.updateTrack(trackId, { muted });

    const updatedProject = await projectsDb.getProject(currentProject.id);

    set({
      currentProject: updatedProject!,
      tracks: getTracksFromProject(updatedProject!),
      hasUnsavedChanges: false,
    });
  },

  /**
   * Set track volume
   * [EARS: TRACK-008] Update volume (0-100)
   * [EARS: TRACK-009] Volume persists independently of mute
   */
  setTrackVolume: async (trackId: string, volume: number) => {
    const { currentProject } = get();

    if (!currentProject) {
      throw new Error('No project loaded');
    }

    await tracksDb.updateTrack(trackId, { volume });

    const updatedProject = await projectsDb.getProject(currentProject.id);

    set({
      currentProject: updatedProject!,
      tracks: getTracksFromProject(updatedProject!),
      hasUnsavedChanges: false,
    });
  },

  /**
   * Set track name
   * [EARS: TRACK-010] Edit track name
   */
  setTrackName: async (trackId: string, name: string) => {
    const { currentProject } = get();

    if (!currentProject) {
      throw new Error('No project loaded');
    }

    await tracksDb.updateTrack(trackId, { name });

    const updatedProject = await projectsDb.getProject(currentProject.id);

    set({
      currentProject: updatedProject!,
      tracks: getTracksFromProject(updatedProject!),
      hasUnsavedChanges: false,
    });
  },

  /**
   * Convenience wrapper: Create project (matches TopBar API)
   */
  createProject: async (name: string) => {
    return get().createNewProject(name);
  },

  /**
   * Convenience wrapper: Update project (matches TopBar API)
   */
  updateProject: async (id: string, updates: { name: string }) => {
    const { currentProject } = get();
    if (!currentProject || currentProject.id !== id) {
      throw new Error('Project ID mismatch');
    }
    return get().updateProjectName(updates.name);
  },

  /**
   * Convenience wrapper: Delete project (matches TopBar API)
   */
  deleteProject: async (id: string) => {
    const { currentProject } = get();
    if (!currentProject || currentProject.id !== id) {
      throw new Error('Project ID mismatch');
    }
    return get().deleteCurrentProject();
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set({
      currentProject: null,
      tracks: [],
      hasUnsavedChanges: false,
      undoState: {
        lastDeletedTrack: null,
        lastDeletedFromVoicePart: null,
      },
    });
  },
}));
