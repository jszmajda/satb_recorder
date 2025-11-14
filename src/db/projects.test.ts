import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { db, initializeDatabase } from './index';
import {
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getAllProjects,
} from './projects';
import type { Project } from '@/store/types';

describe('PROJ-001: Create new project with prompted name', () => {
  beforeEach(async () => {
    await initializeDatabase();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('creates a new project with required name', async () => {
    const projectId = await createProject('My First Project');

    expect(projectId).toBeDefined();
    expect(typeof projectId).toBe('string');

    const project = await db.projects.get(projectId);
    expect(project?.name).toBe('My First Project');
  });

  test('creates project with default BPM of 120', async () => {
    const projectId = await createProject('Test Project');
    const project = await db.projects.get(projectId);

    expect(project?.bpm).toBe(120);
  });

  test('creates project with overdub disabled by default', async () => {
    const projectId = await createProject('Test Project');
    const project = await db.projects.get(projectId);

    expect(project?.overdubEnabled).toBe(false);
  });

  test('creates project with 4 voice parts (S, A, T, B)', async () => {
    const projectId = await createProject('Test Project');
    const project = await db.projects.get(projectId);

    expect(project?.voiceParts).toHaveLength(4);
    expect(project?.voiceParts.map(vp => vp.type)).toEqual(['S', 'A', 'T', 'B']);
    expect(project?.voiceParts.map(vp => vp.label)).toEqual([
      'Soprano',
      'Alto',
      'Tenor',
      'Bass',
    ]);
  });

  test('creates project with all voice parts expanded by default', async () => {
    const projectId = await createProject('Test Project');
    const project = await db.projects.get(projectId);

    project?.voiceParts.forEach(vp => {
      expect(vp.expanded).toBe(true);
    });
  });

  test('creates project with empty tracks for each voice part', async () => {
    const projectId = await createProject('Test Project');
    const project = await db.projects.get(projectId);

    project?.voiceParts.forEach(vp => {
      expect(vp.tracks).toEqual([]);
    });
  });

  test('sets createdAt and updatedAt timestamps', async () => {
    const beforeCreate = new Date();
    const projectId = await createProject('Test Project');
    const afterCreate = new Date();

    const project = await db.projects.get(projectId);

    expect(project?.createdAt).toBeInstanceOf(Date);
    expect(project?.updatedAt).toBeInstanceOf(Date);
    expect(project?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(project?.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });

  // ⚠️ Sad path
  test('throws error when project name is empty', async () => {
    await expect(createProject('')).rejects.toThrow('Project name cannot be empty');
  });

  test('throws error when project name is only whitespace', async () => {
    await expect(createProject('   ')).rejects.toThrow('Project name cannot be empty');
  });

  // 🔥 Edge cases
  test('trims whitespace from project name', async () => {
    const projectId = await createProject('  Spaced Project  ');
    const project = await db.projects.get(projectId);

    expect(project?.name).toBe('Spaced Project');
  });

  test('allows very long project names', async () => {
    const longName = 'A'.repeat(500);
    const projectId = await createProject(longName);
    const project = await db.projects.get(projectId);

    expect(project?.name).toBe(longName);
  });

  test('generates unique IDs for multiple projects', async () => {
    const id1 = await createProject('Project 1');
    const id2 = await createProject('Project 2');
    const id3 = await createProject('Project 3');

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
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
  test('retrieves project by ID', async () => {
    const projectId = await createProject('Test Project');
    const project = await getProject(projectId);

    expect(project).toBeDefined();
    expect(project?.id).toBe(projectId);
    expect(project?.name).toBe('Test Project');
  });

  test('retrieves all projects', async () => {
    await createProject('Project 1');
    await createProject('Project 2');
    await createProject('Project 3');

    const allProjects = await getAllProjects();

    expect(allProjects).toHaveLength(3);
    expect(allProjects.map(p => p.name)).toContain('Project 1');
    expect(allProjects.map(p => p.name)).toContain('Project 2');
    expect(allProjects.map(p => p.name)).toContain('Project 3');
  });

  test('returns projects sorted by updatedAt descending (most recent first)', async () => {
    const id1 = await createProject('Old Project');
    await new Promise(resolve => setTimeout(resolve, 10));
    const id2 = await createProject('Middle Project');
    await new Promise(resolve => setTimeout(resolve, 10));
    const id3 = await createProject('New Project');

    const allProjects = await getAllProjects();

    expect(allProjects[0].id).toBe(id3); // Most recent
    expect(allProjects[1].id).toBe(id2);
    expect(allProjects[2].id).toBe(id1); // Oldest
  });

  // ⚠️ Sad path
  test('returns undefined for non-existent project ID', async () => {
    const project = await getProject('non-existent-id');
    expect(project).toBeUndefined();
  });

  test('returns empty array when no projects exist', async () => {
    const allProjects = await getAllProjects();
    expect(allProjects).toEqual([]);
  });
});

describe('PROJ-005: Auto-save project data on changes', () => {
  beforeEach(async () => {
    await initializeDatabase();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('updates project name', async () => {
    const projectId = await createProject('Original Name');
    await updateProject(projectId, { name: 'Updated Name' });

    const project = await getProject(projectId);
    expect(project?.name).toBe('Updated Name');
  });

  test('updates project BPM', async () => {
    const projectId = await createProject('Test Project');
    await updateProject(projectId, { bpm: 140 });

    const project = await getProject(projectId);
    expect(project?.bpm).toBe(140);
  });

  test('updates project overdub setting', async () => {
    const projectId = await createProject('Test Project');
    await updateProject(projectId, { overdubEnabled: true });

    const project = await getProject(projectId);
    expect(project?.overdubEnabled).toBe(true);
  });

  test('updates voice part expanded state', async () => {
    const projectId = await createProject('Test Project');
    const project = await getProject(projectId);

    const updatedVoiceParts = project!.voiceParts.map(vp =>
      vp.type === 'S' ? { ...vp, expanded: false } : vp
    );

    await updateProject(projectId, { voiceParts: updatedVoiceParts });

    const updated = await getProject(projectId);
    const sopranoVoice = updated?.voiceParts.find(vp => vp.type === 'S');
    expect(sopranoVoice?.expanded).toBe(false);
  });

  test('updates updatedAt timestamp on every change', async () => {
    const projectId = await createProject('Test Project');
    const original = await getProject(projectId);
    const originalUpdatedAt = original!.updatedAt.getTime();

    await new Promise(resolve => setTimeout(resolve, 10));

    await updateProject(projectId, { bpm: 130 });

    const updated = await getProject(projectId);
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt);
  });

  test('can update multiple fields at once', async () => {
    const projectId = await createProject('Test Project');
    await updateProject(projectId, {
      name: 'Multi Update',
      bpm: 150,
      overdubEnabled: true,
    });

    const project = await getProject(projectId);
    expect(project?.name).toBe('Multi Update');
    expect(project?.bpm).toBe(150);
    expect(project?.overdubEnabled).toBe(true);
  });

  // ⚠️ Sad path
  test('throws error when updating non-existent project', async () => {
    await expect(updateProject('non-existent-id', { bpm: 140 })).rejects.toThrow(
      'Project not found'
    );
  });

  test('throws error when updating to empty name', async () => {
    const projectId = await createProject('Test Project');
    await expect(updateProject(projectId, { name: '' })).rejects.toThrow(
      'Project name cannot be empty'
    );
  });

  // 🔥 Edge cases
  test('trims whitespace when updating name', async () => {
    const projectId = await createProject('Test Project');
    await updateProject(projectId, { name: '  Spaced Name  ' });

    const project = await getProject(projectId);
    expect(project?.name).toBe('Spaced Name');
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
  test('deletes project by ID', async () => {
    const projectId = await createProject('To Delete');
    expect(await db.projects.count()).toBe(1);

    await deleteProject(projectId);

    expect(await db.projects.count()).toBe(0);
    expect(await getProject(projectId)).toBeUndefined();
  });

  test('deletes only the specified project', async () => {
    const id1 = await createProject('Project 1');
    const id2 = await createProject('Project 2');
    const id3 = await createProject('Project 3');

    await deleteProject(id2);

    expect(await db.projects.count()).toBe(2);
    expect(await getProject(id1)).toBeDefined();
    expect(await getProject(id2)).toBeUndefined();
    expect(await getProject(id3)).toBeDefined();
  });

  // ⚠️ Sad path
  test('does not throw error when deleting non-existent project', async () => {
    await expect(deleteProject('non-existent-id')).resolves.toBeUndefined();
  });

  test('handles deleting already deleted project', async () => {
    const projectId = await createProject('Test Project');
    await deleteProject(projectId);
    await expect(deleteProject(projectId)).resolves.toBeUndefined();
  });
});
