import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopBar } from './TopBar';
import { useProjectStore } from '../store/useProjectStore';
import * as projectsDb from '../db/projects';
import * as tracksDb from '../db/tracks';

// Mock useProjectStore
vi.mock('../store/useProjectStore');

// Mock database modules
vi.mock('../db/projects');
vi.mock('../db/tracks');

// Mock window.prompt and window.confirm
global.window.prompt = vi.fn();
global.window.confirm = vi.fn();

describe('PROJ-001, PROJ-002, PROJ-003, PROJ-004: New Project Creation Integration', () => {
  let mockCreateProject: any;
  let mockStore: any;

  beforeEach(() => {
    mockCreateProject = vi.fn().mockResolvedValue(undefined);

    mockStore = {
      currentProject: null,
      updateProject: vi.fn(),
      createProject: mockCreateProject,
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn().mockResolvedValue([]),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    };

    vi.mocked(useProjectStore).mockReturnValue(mockStore as any);

    // Mock window.prompt to return a project name
    vi.mocked(window.prompt).mockReturnValue('My Choir Project');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('clicking New Project prompts for project name (PROJ-001)', async () => {
    render(<TopBar />);

    const newProjectButton = screen.getByRole('button', { name: /new project/i });
    fireEvent.click(newProjectButton);

    await waitFor(() => {
      expect(window.prompt).toHaveBeenCalledWith('Project name:', 'Untitled Project');
    });
  });

  test('creates project with user-provided name', async () => {
    vi.mocked(window.prompt).mockReturnValue('Test Project Name');

    render(<TopBar />);

    const newProjectButton = screen.getByRole('button', { name: /new project/i });
    fireEvent.click(newProjectButton);

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith('Test Project Name');
    });
  });

  test('creates project with default name if user cancels prompt', async () => {
    vi.mocked(window.prompt).mockReturnValue(null);

    render(<TopBar />);

    const newProjectButton = screen.getByRole('button', { name: /new project/i });
    fireEvent.click(newProjectButton);

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith('Untitled Project');
    });
  });

  test('creates project with default name if user enters empty string', async () => {
    vi.mocked(window.prompt).mockReturnValue('');

    render(<TopBar />);

    const newProjectButton = screen.getByRole('button', { name: /new project/i });
    fireEvent.click(newProjectButton);

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith('Untitled Project');
    });
  });

  // Note: PROJ-002 (4 voice parts), PROJ-003 (BPM 120), PROJ-004 (overdub disabled)
  // are tested in useProjectStore.test.ts as they're part of the store's createNewProject logic
});

describe('PROJ-005: Auto-save Integration', () => {
  let mockUpdateProject: any;
  let mockStore: any;

  beforeEach(() => {
    mockUpdateProject = vi.fn().mockResolvedValue(undefined);

    mockStore = {
      currentProject: {
        id: 'proj-1',
        name: 'My Project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      updateProject: mockUpdateProject,
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn().mockResolvedValue([]),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    };

    vi.mocked(useProjectStore).mockReturnValue(mockStore as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('auto-saves project name when edited', async () => {
    render(<TopBar />);

    // Click on project name to edit
    const projectName = screen.getByText('My Project');
    fireEvent.click(projectName);

    // Input should appear
    await waitFor(() => {
      const input = screen.getByDisplayValue('My Project');
      expect(input).toBeInTheDocument();
    });

    // Edit the name
    const input = screen.getByDisplayValue('My Project');
    fireEvent.change(input, { target: { value: 'Updated Project Name' } });

    // Blur to trigger save
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalledWith('proj-1', {
        name: 'Updated Project Name',
      });
    });
  });

  test('auto-saves project name when pressing Enter', async () => {
    render(<TopBar />);

    const projectName = screen.getByText('My Project');
    fireEvent.click(projectName);

    await waitFor(() => {
      const input = screen.getByDisplayValue('My Project');
      expect(input).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('My Project');
    fireEvent.change(input, { target: { value: 'Enter Project' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalledWith('proj-1', {
        name: 'Enter Project',
      });
    });
  });

  // Note: Auto-save for track changes, BPM changes, overdub changes, etc.
  // are tested in useProjectStore.test.ts as they're part of the store logic
});

describe('PROJ-006, PROJ-007: Load Project Integration', () => {
  let mockLoadProject: any;
  let mockGetAllProjects: any;
  let mockStore: any;

  beforeEach(() => {
    mockLoadProject = vi.fn().mockResolvedValue(undefined);
    mockGetAllProjects = vi.fn().mockResolvedValue([
      {
        id: 'proj-1',
        name: 'Project One',
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
      },
      {
        id: 'proj-2',
        name: 'Project Two',
        createdAt: Date.now() - 2000,
        updatedAt: Date.now() - 500,
      },
      {
        id: 'proj-3',
        name: 'Project Three',
        createdAt: Date.now() - 3000,
        updatedAt: Date.now() - 100,
      },
    ]);

    mockStore = {
      currentProject: {
        id: 'proj-1',
        name: 'Current Project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: mockLoadProject,
      deleteProject: vi.fn(),
      getAllProjects: mockGetAllProjects,
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    };

    vi.mocked(useProjectStore).mockReturnValue(mockStore as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('clicking Load displays project list (PROJ-006)', async () => {
    render(<TopBar />);

    const loadButton = screen.getByRole('button', { name: /^load$/i });
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(mockGetAllProjects).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Project One')).toBeInTheDocument();
      expect(screen.getByText('Project Two')).toBeInTheDocument();
      expect(screen.getByText('Project Three')).toBeInTheDocument();
    });
  });

  // Note: Project sorting logic is tested in TopBar unit tests and useProjectStore tests

  test('clicking project in list loads it (PROJ-007)', async () => {
    render(<TopBar />);

    const loadButton = screen.getByRole('button', { name: /^load$/i });
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByText('Project Two')).toBeInTheDocument();
    });

    const projectTwoButton = screen.getByText('Project Two');
    fireEvent.click(projectTwoButton);

    await waitFor(() => {
      expect(mockLoadProject).toHaveBeenCalledWith('proj-2');
    });
  });

  test('load modal closes after selecting project', async () => {
    render(<TopBar />);

    const loadButton = screen.getByRole('button', { name: /^load$/i });
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByText('Project One')).toBeInTheDocument();
    });

    const projectOneButton = screen.getByText('Project One');
    fireEvent.click(projectOneButton);

    await waitFor(() => {
      expect(screen.queryByText('Project One')).not.toBeInTheDocument();
    });
  });

  // Note: Modal close behavior (clicking outside) is tested in TopBar.test.tsx unit tests

  // 🔥 Edge cases
  test('displays message when no projects available', async () => {
    mockGetAllProjects.mockResolvedValue([]);

    render(<TopBar />);

    const loadButton = screen.getByRole('button', { name: /^load$/i });
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
    });
  });

  // Note: Full restoration of metadata and tracks (PROJ-007) is tested in
  // useProjectStore.test.ts as it's part of the store's loadProject logic
});

describe('PROJ-008: Delete Project Integration', () => {
  let mockDeleteProject: any;
  let mockStore: any;

  beforeEach(() => {
    mockDeleteProject = vi.fn().mockResolvedValue(undefined);

    mockStore = {
      currentProject: {
        id: 'proj-1',
        name: 'Project to Delete',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: mockDeleteProject,
      getAllProjects: vi.fn().mockResolvedValue([]),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    };

    vi.mocked(useProjectStore).mockReturnValue(mockStore as any);

    // Mock window.confirm to return true by default
    vi.mocked(window.confirm).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('clicking Delete Project shows confirmation dialog', async () => {
    render(<TopBar />);

    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        'Delete "Project to Delete"? This cannot be undone.'
      );
    });
  });

  test('deletes project when user confirms', async () => {
    vi.mocked(window.confirm).mockReturnValue(true);

    render(<TopBar />);

    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteProject).toHaveBeenCalledWith('proj-1');
    });
  });

  test('does not delete project when user cancels', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);

    render(<TopBar />);

    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
    });

    expect(mockDeleteProject).not.toHaveBeenCalled();
  });

  // 🔥 Edge cases
  test('Delete button disabled when no project loaded', () => {
    mockStore.currentProject = null;
    vi.mocked(useProjectStore).mockReturnValue(mockStore as any);

    render(<TopBar />);

    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    expect(deleteButton).toBeDisabled();
  });

  test('does not crash when trying to delete without current project', async () => {
    mockStore.currentProject = null;
    vi.mocked(useProjectStore).mockReturnValue(mockStore as any);

    render(<TopBar />);

    const deleteButton = screen.getByRole('button', { name: /delete project/i });

    // Button should be disabled, but test clicking anyway
    expect(() => {
      fireEvent.click(deleteButton);
    }).not.toThrow();

    expect(window.confirm).not.toHaveBeenCalled();
    expect(mockDeleteProject).not.toHaveBeenCalled();
  });
});

describe('Project Management: Full Workflow Integration', () => {
  let mockStore: any;

  beforeEach(() => {
    mockStore = {
      currentProject: null,
      updateProject: vi.fn(),
      createProject: vi.fn().mockResolvedValue(undefined),
      loadProject: vi.fn().mockResolvedValue(undefined),
      deleteProject: vi.fn().mockResolvedValue(undefined),
      getAllProjects: vi.fn().mockResolvedValue([]),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    };

    vi.mocked(useProjectStore).mockReturnValue(mockStore as any);
    vi.mocked(window.prompt).mockReturnValue('New Project');
    vi.mocked(window.confirm).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('complete workflow: create → update name → delete', async () => {
    const { rerender } = render(<TopBar />);

    // Step 1: Create new project
    const newProjectButton = screen.getByRole('button', { name: /new project/i });
    fireEvent.click(newProjectButton);

    await waitFor(() => {
      expect(mockStore.createProject).toHaveBeenCalledWith('New Project');
    });

    // Step 2: Project is now loaded (simulate store update)
    mockStore.currentProject = {
      id: 'proj-new',
      name: 'New Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    vi.mocked(useProjectStore).mockReturnValue(mockStore as any);
    rerender(<TopBar />);

    // Verify project name is displayed (look for h1 element specifically)
    await waitFor(() => {
      const projectNameHeading = screen.getByRole('heading', { name: /new project/i });
      expect(projectNameHeading).toBeInTheDocument();
    });

    // Step 3: Edit project name
    const projectNameHeading = screen.getByRole('heading', { name: /new project/i });
    fireEvent.click(projectNameHeading);

    await waitFor(() => {
      const input = screen.getByDisplayValue('New Project');
      expect(input).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('New Project');
    fireEvent.change(input, { target: { value: 'Updated Name' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockStore.updateProject).toHaveBeenCalledWith('proj-new', {
        name: 'Updated Name',
      });
    });

    // Step 4: Delete project
    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockStore.deleteProject).toHaveBeenCalledWith('proj-new');
    });
  });

  test('complete workflow: create → load different project', async () => {
    const { rerender } = render(<TopBar />);

    // Step 1: Create first project
    const newProjectButton = screen.getByRole('button', { name: /new project/i });
    fireEvent.click(newProjectButton);

    await waitFor(() => {
      expect(mockStore.createProject).toHaveBeenCalledWith('New Project');
    });

    // Step 2: Simulate multiple projects exist
    mockStore.currentProject = {
      id: 'proj-1',
      name: 'New Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    mockStore.getAllProjects.mockResolvedValue([
      { id: 'proj-1', name: 'New Project', createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'proj-2', name: 'Old Project', createdAt: Date.now() - 1000, updatedAt: Date.now() - 1000 },
    ]);
    vi.mocked(useProjectStore).mockReturnValue(mockStore as any);
    rerender(<TopBar />);

    // Step 3: Open load modal
    const loadButton = screen.getByRole('button', { name: /^load$/i });
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByText('Old Project')).toBeInTheDocument();
    });

    // Step 4: Load old project
    const oldProjectButton = screen.getByText('Old Project');
    fireEvent.click(oldProjectButton);

    await waitFor(() => {
      expect(mockStore.loadProject).toHaveBeenCalledWith('proj-2');
    });
  });
});
