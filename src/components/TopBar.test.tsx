import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopBar } from './TopBar';
import { useProjectStore } from '../store/useProjectStore';

// Mock the project store
vi.mock('../store/useProjectStore');

// Mock AudioContext
const mockAudioContext = {
  close: vi.fn(),
  createGain: vi.fn(),
  destination: {},
  decodeAudioData: vi.fn(),
};

// Mock useMixer
const mockMixer = {
  play: vi.fn(),
  stop: vi.fn(),
  dispose: vi.fn(),
  getCurrentTime: vi.fn().mockReturnValue(0),
  seek: vi.fn(),
  isPlaying: vi.fn().mockReturnValue(false),
  loadTracks: vi.fn(),
};

vi.mock('../contexts/MixerContext', () => ({
  useMixer: () => ({
    getMixer: () => mockMixer,
    getAudioContext: () => mockAudioContext,
    isLoading: false,
    setIsLoading: vi.fn(),
  }),
}));

global.AudioContext = vi.fn(() => mockAudioContext) as any;

describe('PROJ-009: Project name display', () => {
  beforeEach(() => {
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: { id: 'proj-1', name: 'My Choir Project', createdAt: Date.now(), updatedAt: Date.now() },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);
  });

  // ✅ Happy path
  test('displays current project name', () => {
    render(<TopBar />);

    expect(screen.getByText('My Choir Project')).toBeInTheDocument();
  });

  test('project name is editable on click', () => {
    render(<TopBar />);

    const projectName = screen.getByText('My Choir Project');
    fireEvent.click(projectName);

    const input = screen.getByDisplayValue('My Choir Project');
    expect(input).toBeInTheDocument();
  });

  test('saves project name on blur', async () => {
    const updateProject = vi.fn();
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: { id: 'proj-1', name: 'My Choir Project', createdAt: Date.now(), updatedAt: Date.now() },
      updateProject,
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);

    render(<TopBar />);

    const projectName = screen.getByText('My Choir Project');
    fireEvent.click(projectName);

    const input = screen.getByDisplayValue('My Choir Project');
    fireEvent.change(input, { target: { value: 'Updated Project' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(updateProject).toHaveBeenCalledWith('proj-1', { name: 'Updated Project' });
    });
  });

  test('saves project name on Enter key', async () => {
    const updateProject = vi.fn();
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: { id: 'proj-1', name: 'My Choir Project', createdAt: Date.now(), updatedAt: Date.now() },
      updateProject,
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);

    render(<TopBar />);

    const projectName = screen.getByText('My Choir Project');
    fireEvent.click(projectName);

    const input = screen.getByDisplayValue('My Choir Project');
    fireEvent.change(input, { target: { value: 'Updated Project' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(updateProject).toHaveBeenCalledWith('proj-1', { name: 'Updated Project' });
    });
  });

  // 🔥 Edge cases
  test('displays placeholder when no project loaded', () => {
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: null,
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);

    render(<TopBar />);

    expect(screen.getByText('No Project Loaded')).toBeInTheDocument();
  });
});

describe('PROJ-001: New Project button', () => {
  beforeEach(() => {
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: { id: 'proj-1', name: 'My Choir Project', createdAt: Date.now(), updatedAt: Date.now() },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);
  });

  // ✅ Happy path
  test('renders New Project button', () => {
    render(<TopBar />);

    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
  });

  test('creates new project on click', async () => {
    const createProject = vi.fn().mockResolvedValue('new-proj-id');
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: { id: 'proj-1', name: 'My Choir Project', createdAt: Date.now(), updatedAt: Date.now() },
      updateProject: vi.fn(),
      createProject,
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);

    // Mock window.prompt
    vi.spyOn(window, 'prompt').mockReturnValue('New Project');

    render(<TopBar />);

    const newButton = screen.getByRole('button', { name: /new project/i });
    fireEvent.click(newButton);

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith('New Project');
    });
  });

  test('uses default name if prompt cancelled', async () => {
    const createProject = vi.fn().mockResolvedValue('new-proj-id');
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: { id: 'proj-1', name: 'My Choir Project', createdAt: Date.now(), updatedAt: Date.now() },
      updateProject: vi.fn(),
      createProject,
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);

    vi.spyOn(window, 'prompt').mockReturnValue(null);

    render(<TopBar />);

    const newButton = screen.getByRole('button', { name: /new project/i });
    fireEvent.click(newButton);

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith('Untitled Project');
    });
  });
});

describe('PROJ-006: Load button', () => {
  beforeEach(() => {
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: { id: 'proj-1', name: 'My Choir Project', createdAt: Date.now(), updatedAt: Date.now() },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn().mockResolvedValue([
        { id: 'proj-1', name: 'Project 1', createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'proj-2', name: 'Project 2', createdAt: Date.now(), updatedAt: Date.now() },
      ]),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);
  });

  // ✅ Happy path
  test('renders Load button', () => {
    render(<TopBar />);

    expect(screen.getByRole('button', { name: /load/i })).toBeInTheDocument();
  });

  test('shows project list modal on click', async () => {
    render(<TopBar />);

    const loadButton = screen.getByRole('button', { name: /load/i });
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument();
      expect(screen.getByText('Project 2')).toBeInTheDocument();
    });
  });

  test('loads selected project', async () => {
    const loadProject = vi.fn();
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: { id: 'proj-1', name: 'My Choir Project', createdAt: Date.now(), updatedAt: Date.now() },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject,
      deleteProject: vi.fn(),
      getAllProjects: vi.fn().mockResolvedValue([
        { id: 'proj-1', name: 'Project 1', createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'proj-2', name: 'Project 2', createdAt: Date.now(), updatedAt: Date.now() },
      ]),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);

    render(<TopBar />);

    const loadButton = screen.getByRole('button', { name: /load/i });
    fireEvent.click(loadButton);

    await waitFor(() => {
      const project2 = screen.getByText('Project 2');
      fireEvent.click(project2);
    });

    await waitFor(() => {
      expect(loadProject).toHaveBeenCalledWith('proj-2');
    });
  });
});

describe('PROJ-008: Delete Project button', () => {
  beforeEach(() => {
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: { id: 'proj-1', name: 'My Choir Project', createdAt: Date.now(), updatedAt: Date.now() },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);
  });

  // ✅ Happy path
  test('renders Delete button', () => {
    render(<TopBar />);

    expect(screen.getByRole('button', { name: /delete project/i })).toBeInTheDocument();
  });

  test('shows confirmation dialog on click', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<TopBar />);

    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
  });

  test('deletes project when confirmed', async () => {
    const deleteProject = vi.fn();
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: { id: 'proj-1', name: 'My Choir Project', createdAt: Date.now(), updatedAt: Date.now() },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject,
      getAllProjects: vi.fn(),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<TopBar />);

    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(deleteProject).toHaveBeenCalledWith('proj-1');
    });
  });

  test('does not delete when cancelled', async () => {
    const deleteProject = vi.fn();
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: { id: 'proj-1', name: 'My Choir Project', createdAt: Date.now(), updatedAt: Date.now() },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject,
      getAllProjects: vi.fn(),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<TopBar />);

    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    fireEvent.click(deleteButton);

    expect(deleteProject).not.toHaveBeenCalled();
  });

  // 🔥 Edge cases
  test('Delete button disabled when no project loaded', () => {
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: null,
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);

    render(<TopBar />);

    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    expect(deleteButton).toBeDisabled();
  });
});

describe('EXP-007: Export dropdown', () => {
  beforeEach(() => {
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: { id: 'proj-1', name: 'My Choir Project', createdAt: Date.now(), updatedAt: Date.now() },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: [
        { id: 'track-1', projectId: 'proj-1', name: 'Track 1', voicePart: 'soprano', audioBlob: new Blob(), waveformData: [], duration: 1.0, volume: 100, muted: false, soloed: false, createdAt: Date.now() },
      ],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);
  });

  // ✅ Happy path
  test('renders Export dropdown button', () => {
    render(<TopBar />);

    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  test('shows WAV and MP3 options on click', async () => {
    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/WAV/i)).toBeInTheDocument();
      expect(screen.getByText(/MP3/i)).toBeInTheDocument();
    });
  });

  // 🔥 Edge cases
  test('Export button disabled when no tracks', () => {
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: { id: 'proj-1', name: 'My Choir Project', createdAt: Date.now(), updatedAt: Date.now() },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: [],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);

    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeDisabled();
  });
});
