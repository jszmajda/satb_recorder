import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useProjectStore } from './useProjectStore';
import { db, initializeDatabase } from '@/db/index';
import * as projectsDb from '@/db/projects';

describe('PROJ-001, PROJ-002, PROJ-003, PROJ-004: Create new project', () => {
  beforeEach(async () => {
    await initializeDatabase();
    useProjectStore.getState().reset();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('creates a new project with name', async () => {
    await useProjectStore.getState().createNewProject('My Harmony Project');

    const store = useProjectStore.getState();
    expect(store.currentProject).toBeDefined();
    expect(store.currentProject?.name).toBe('My Harmony Project');
  });

  test('initializes project with default BPM 120', async () => {
    await useProjectStore.getState().createNewProject('Test Project');
    const store = useProjectStore.getState();

    expect(store.currentProject?.bpm).toBe(120);
  });

  test('initializes project with overdub disabled', async () => {
    await useProjectStore.getState().createNewProject('Test Project');
    const store = useProjectStore.getState();

    expect(store.currentProject?.overdubEnabled).toBe(false);
  });

  test('initializes project with 4 voice parts', async () => {
    await useProjectStore.getState().createNewProject('Test Project');
    const store = useProjectStore.getState();

    expect(store.currentProject?.voiceParts).toHaveLength(4);
    expect(store.currentProject?.voiceParts.map(vp => vp.type)).toEqual(['S', 'A', 'T', 'B']);
  });

  test('all voice parts are expanded by default', async () => {
    await useProjectStore.getState().createNewProject('Test Project');
    const store = useProjectStore.getState();

    store.currentProject?.voiceParts.forEach(vp => {
      expect(vp.expanded).toBe(true);
    });
  });

  test('all voice parts have empty tracks', async () => {
    await useProjectStore.getState().createNewProject('Test Project');
    const store = useProjectStore.getState();

    store.currentProject?.voiceParts.forEach(vp => {
      expect(vp.tracks).toEqual([]);
    });
  });

  // ⚠️ Sad path
  test('throws error when name is empty', async () => {
    const store = useProjectStore.getState();
    await expect(store.createNewProject('')).rejects.toThrow('Project name cannot be empty');
  });

  test('throws error when name is only whitespace', async () => {
    const store = useProjectStore.getState();
    await expect(store.createNewProject('   ')).rejects.toThrow('Project name cannot be empty');
  });

  // 🔥 Edge cases
  test('replaces current project when creating new one', async () => {
    await useProjectStore.getState().createNewProject('First Project');
    const firstId = useProjectStore.getState().currentProject?.id;

    await useProjectStore.getState().createNewProject('Second Project');
    const store = useProjectStore.getState();

    expect(store.currentProject?.id).not.toBe(firstId);
    expect(store.currentProject?.name).toBe('Second Project');
  });
});

describe('PROJ-005: Auto-save on every change', () => {
  beforeEach(async () => {
    await initializeDatabase();
    useProjectStore.getState().reset();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('auto-saves project when BPM changes', async () => {
    await useProjectStore.getState().createNewProject('Test Project');
    const projectId = useProjectStore.getState().currentProject!.id;

    await useProjectStore.getState().updateBpm(140);

    const savedProject = await projectsDb.getProject(projectId);
    expect(savedProject?.bpm).toBe(140);
  });

  test('auto-saves project when overdub setting changes', async () => {
    await useProjectStore.getState().createNewProject('Test Project');
    const projectId = useProjectStore.getState().currentProject!.id;

    await useProjectStore.getState().setOverdubEnabled(true);

    const savedProject = await projectsDb.getProject(projectId);
    expect(savedProject?.overdubEnabled).toBe(true);
  });

  test('auto-saves project when voice part expanded state changes', async () => {
    await useProjectStore.getState().createNewProject('Test Project');
    const projectId = useProjectStore.getState().currentProject!.id;

    await useProjectStore.getState().toggleVoicePartExpanded('S');

    const savedProject = await projectsDb.getProject(projectId);
    const sopranoVoice = savedProject?.voiceParts.find(vp => vp.type === 'S');
    expect(sopranoVoice?.expanded).toBe(false);
  });

  test('updates updatedAt timestamp on changes', async () => {
    await useProjectStore.getState().createNewProject('Test Project');
    const projectId = useProjectStore.getState().currentProject!.id;
    const originalUpdatedAt = useProjectStore.getState().currentProject!.updatedAt.getTime();

    await new Promise(resolve => setTimeout(resolve, 10));
    await useProjectStore.getState().updateBpm(130);

    const savedProject = await projectsDb.getProject(projectId);
    expect(savedProject!.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt);
  });

  // ⚠️ Sad path
  test('does not auto-save when no project is loaded', async () => {
    const store = useProjectStore.getState();
    await expect(store.updateBpm(140)).rejects.toThrow('No project loaded');
  });
});

describe('PROJ-006, PROJ-007: Load saved project', () => {
  beforeEach(async () => {
    await initializeDatabase();
    useProjectStore.getState().reset();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('loads project by ID', async () => {
    await useProjectStore.getState().createNewProject('Project to Load');
    const projectId = useProjectStore.getState().currentProject!.id;

    // Reset store
    useProjectStore.getState().reset();
    expect(useProjectStore.getState().currentProject).toBeNull();

    // Load project
    await useProjectStore.getState().loadProject(projectId);
    const store = useProjectStore.getState();

    expect(store.currentProject).toBeDefined();
    expect(store.currentProject?.id).toBe(projectId);
    expect(store.currentProject?.name).toBe('Project to Load');
  });

  test('loads all project metadata', async () => {
    await useProjectStore.getState().createNewProject('Full Project');
    await useProjectStore.getState().updateBpm(150);
    await useProjectStore.getState().setOverdubEnabled(true);
    const projectId = useProjectStore.getState().currentProject!.id;

    useProjectStore.getState().reset();
    await useProjectStore.getState().loadProject(projectId);
    const store = useProjectStore.getState();

    expect(store.currentProject?.bpm).toBe(150);
    expect(store.currentProject?.overdubEnabled).toBe(true);
  });

  test('loads voice parts with correct state', async () => {
    await useProjectStore.getState().createNewProject('Test Project');
    await useProjectStore.getState().toggleVoicePartExpanded('S');
    await useProjectStore.getState().toggleVoicePartExpanded('A');
    const projectId = useProjectStore.getState().currentProject!.id;

    useProjectStore.getState().reset();
    await useProjectStore.getState().loadProject(projectId);
    const store = useProjectStore.getState();

    const soprano = store.currentProject?.voiceParts.find(vp => vp.type === 'S');
    const alto = store.currentProject?.voiceParts.find(vp => vp.type === 'A');
    const tenor = store.currentProject?.voiceParts.find(vp => vp.type === 'T');

    expect(soprano?.expanded).toBe(false);
    expect(alto?.expanded).toBe(false);
    expect(tenor?.expanded).toBe(true);
  });

  test('gets list of all projects', async () => {
    const store = useProjectStore.getState();
    await store.createNewProject('Project 1');
    await store.createNewProject('Project 2');
    await store.createNewProject('Project 3');

    const allProjects = await store.getAllProjects();

    expect(allProjects).toHaveLength(3);
    expect(allProjects.map(p => p.name)).toContain('Project 1');
    expect(allProjects.map(p => p.name)).toContain('Project 2');
    expect(allProjects.map(p => p.name)).toContain('Project 3');
  });

  test('projects are sorted by most recent first', async () => {
    const store = useProjectStore.getState();
    await store.createNewProject('Old');
    await new Promise(resolve => setTimeout(resolve, 10));
    await store.createNewProject('Middle');
    await new Promise(resolve => setTimeout(resolve, 10));
    await store.createNewProject('New');

    const allProjects = await store.getAllProjects();

    expect(allProjects[0].name).toBe('New');
    expect(allProjects[1].name).toBe('Middle');
    expect(allProjects[2].name).toBe('Old');
  });

  // ⚠️ Sad path
  test('throws error when loading non-existent project', async () => {
    const store = useProjectStore.getState();
    await expect(store.loadProject('non-existent-id')).rejects.toThrow('Project not found');
  });
});

describe('PROJ-008: Delete project', () => {
  beforeEach(async () => {
    await initializeDatabase();
    useProjectStore.getState().reset();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('deletes current project', async () => {
    await useProjectStore.getState().createNewProject('To Delete');
    const projectId = useProjectStore.getState().currentProject!.id;

    await useProjectStore.getState().deleteCurrentProject();
    const store = useProjectStore.getState();

    expect(store.currentProject).toBeNull();
    expect(await projectsDb.getProject(projectId)).toBeUndefined();
  });

  test('resets store after deleting project', async () => {
    await useProjectStore.getState().createNewProject('To Delete');
    await useProjectStore.getState().updateBpm(150);
    await useProjectStore.getState().setOverdubEnabled(true);

    await useProjectStore.getState().deleteCurrentProject();
    const store = useProjectStore.getState();

    expect(store.currentProject).toBeNull();
  });

  // ⚠️ Sad path
  test('throws error when deleting with no project loaded', async () => {
    const store = useProjectStore.getState();
    await expect(store.deleteCurrentProject()).rejects.toThrow('No project loaded');
  });
});

describe('PROJ-009: Display current project name', () => {
  beforeEach(async () => {
    await initializeDatabase();
    useProjectStore.getState().reset();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('exposes current project name', async () => {
    await useProjectStore.getState().createNewProject('My Project Name');
    const store = useProjectStore.getState();

    expect(store.currentProject?.name).toBe('My Project Name');
  });

  test('returns null when no project loaded', () => {
    const store = useProjectStore.getState();
    expect(store.currentProject).toBeNull();
  });

  test('can update project name', async () => {
    await useProjectStore.getState().createNewProject('Original Name');
    const projectId = useProjectStore.getState().currentProject!.id;

    await useProjectStore.getState().updateProjectName('Updated Name');
    const store = useProjectStore.getState();

    expect(store.currentProject?.name).toBe('Updated Name');

    const savedProject = await projectsDb.getProject(projectId);
    expect(savedProject?.name).toBe('Updated Name');
  });

  // ⚠️ Sad path
  test('throws error when updating name with no project', async () => {
    const store = useProjectStore.getState();
    await expect(store.updateProjectName('New Name')).rejects.toThrow('No project loaded');
  });
});

describe('Store utilities', () => {
  beforeEach(async () => {
    await initializeDatabase();
    useProjectStore.getState().reset();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ✅ Happy path
  test('reset clears current project', async () => {
    await useProjectStore.getState().createNewProject('Test');

    useProjectStore.getState().reset();
    const store = useProjectStore.getState();

    expect(store.currentProject).toBeNull();
  });

  test('hasUnsavedChanges is false after save', async () => {
    await useProjectStore.getState().createNewProject('Test');
    const store = useProjectStore.getState();

    expect(store.hasUnsavedChanges).toBe(false);
  });
});
