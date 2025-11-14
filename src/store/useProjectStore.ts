// [EARS: PROJ-001 through PROJ-009] Zustand store for project management with auto-save

import { create } from 'zustand';
import type { Project, VoicePartType } from './types';
import * as projectsDb from '@/db/projects';

interface ProjectStore {
  // State
  currentProject: Project | null;
  hasUnsavedChanges: boolean;

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

  // Utilities
  reset: () => void;
}

/**
 * Main project store with auto-save to IndexedDB
 * [EARS: PROJ-001, PROJ-002, PROJ-003, PROJ-004, PROJ-005, PROJ-006, PROJ-007, PROJ-008, PROJ-009]
 */
export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  currentProject: null,
  hasUnsavedChanges: false,

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
      hasUnsavedChanges: false,
    });
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set({
      currentProject: null,
      hasUnsavedChanges: false,
    });
  },
}));
