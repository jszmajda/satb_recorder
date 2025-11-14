// [EARS: PROJ-001, PROJ-002, PROJ-005, PROJ-006, PROJ-008, ERR-002] Project CRUD operations

import { db } from './index';
import type { Project, VoicePart } from '@/store/types';
import { useErrorStore } from '@/store/useErrorStore';

/**
 * Generate a unique ID for projects
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Initialize default voice parts for a new project
 * [EARS: PROJ-002] Initialize 4 empty voice parts (S, A, T, B)
 */
function initializeVoiceParts(): VoicePart[] {
  return [
    { type: 'S', label: 'Soprano', expanded: true, tracks: [] },
    { type: 'A', label: 'Alto', expanded: true, tracks: [] },
    { type: 'T', label: 'Tenor', expanded: true, tracks: [] },
    { type: 'B', label: 'Bass', expanded: true, tracks: [] },
  ];
}

/**
 * Create a new project
 * [EARS: PROJ-001] Prompt for project name
 * [EARS: PROJ-002] Initialize 4 empty voice parts
 * [EARS: PROJ-003] Set default BPM to 120
 * [EARS: PROJ-004] Set overdub to disabled by default
 * [EARS: PROJ-005] Auto-save to IndexedDB
 *
 * @param name - Project name (required, will be trimmed)
 * @returns Project ID
 * @throws Error if name is empty or only whitespace
 */
export async function createProject(name: string): Promise<string> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error('Project name cannot be empty');
  }

  const now = new Date();
  const project: Project = {
    id: generateId(),
    name: trimmedName,
    bpm: 120, // [EARS: PROJ-003]
    overdubEnabled: false, // [EARS: PROJ-004]
    createdAt: now,
    updatedAt: now,
    voiceParts: initializeVoiceParts(), // [EARS: PROJ-002]
  };

  try {
    await db.projects.add(project);
    return project.id;
  } catch (error) {
    // [EARS: ERR-002] Handle storage quota exceeded
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      useErrorStore.getState().setError('Storage quota exceeded. Please delete some projects or tracks.');
      throw new Error('Storage quota exceeded');
    }
    throw error;
  }
}

/**
 * Get a project by ID
 * [EARS: PROJ-006] Load saved projects from IndexedDB
 * [EARS: PROJ-007] Restore project metadata and audio tracks
 *
 * @param id - Project ID
 * @returns Project or undefined if not found
 */
export async function getProject(id: string): Promise<Project | undefined> {
  return await db.projects.get(id);
}

/**
 * Get all projects, sorted by most recently updated first
 * [EARS: PROJ-006] Display list of saved projects
 *
 * @returns Array of projects sorted by updatedAt descending
 */
export async function getAllProjects(): Promise<Project[]> {
  const projects = await db.projects.toArray();
  return projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/**
 * Update a project
 * [EARS: PROJ-005] Auto-save on every change
 *
 * @param id - Project ID
 * @param updates - Partial project data to update
 * @throws Error if project not found or if trying to set empty name
 */
export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const project = await db.projects.get(id);

  if (!project) {
    throw new Error('Project not found');
  }

  // Validate name if it's being updated
  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    if (!trimmedName) {
      throw new Error('Project name cannot be empty');
    }
    updates.name = trimmedName;
  }

  const updatedProject: Project = {
    ...project,
    ...updates,
    updatedAt: new Date(), // [EARS: PROJ-005] Update timestamp on every change
  };

  try {
    await db.projects.put(updatedProject);
  } catch (error) {
    // [EARS: ERR-002] Handle storage quota exceeded
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      useErrorStore.getState().setError('Storage quota exceeded. Please delete some projects or tracks.');
      throw new Error('Storage quota exceeded');
    }
    throw error;
  }
}

/**
 * Delete a project
 * [EARS: PROJ-008] Remove project from IndexedDB
 *
 * @param id - Project ID
 */
export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
}
