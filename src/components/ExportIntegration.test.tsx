import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopBar } from './TopBar';
import { useProjectStore } from '../store/useProjectStore';
import { Exporter } from '../audio/exporter';

// Mock useProjectStore
vi.mock('../store/useProjectStore');

// Mock Exporter
vi.mock('../audio/exporter');

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

describe('EXP-001, EXP-002, EXP-003: WAV Export Integration', () => {
  let mockExporter: any;
  let mockTracks: any[];

  beforeEach(() => {
    // Create mock tracks with audio data
    mockTracks = [
      {
        id: 'track-1',
        projectId: 'proj-1',
        name: 'Soprano Track',
        voicePart: 'soprano',
        audioBlob: new Blob(['soprano audio data'], { type: 'audio/wav' }),
        waveformData: [0.1, 0.2, 0.3],
        duration: 5.0,
        volume: 80,
        muted: false,
        soloed: false,
        createdAt: Date.now(),
      },
      {
        id: 'track-2',
        projectId: 'proj-1',
        name: 'Alto Track',
        voicePart: 'alto',
        audioBlob: new Blob(['alto audio data'], { type: 'audio/wav' }),
        waveformData: [0.2, 0.3, 0.4],
        duration: 5.0,
        volume: 90,
        muted: false,
        soloed: false,
        createdAt: Date.now(),
      },
      {
        id: 'track-3',
        projectId: 'proj-1',
        name: 'Muted Track',
        voicePart: 'tenor',
        audioBlob: new Blob(['tenor audio data'], { type: 'audio/wav' }),
        waveformData: [0.3, 0.4, 0.5],
        duration: 5.0,
        volume: 100,
        muted: true, // This track should be excluded from export
        soloed: false,
        createdAt: Date.now(),
      },
    ];

    // Mock exporter methods
    mockExporter = {
      downloadWAV: vi.fn().mockResolvedValue(undefined),
      downloadMP3: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn(),
    };

    vi.mocked(Exporter).mockImplementation(function () {
      return mockExporter;
    } as any);

    // Mock project store
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: {
        id: 'proj-1',
        name: 'My Choir Project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: mockTracks,
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('clicking Export WAV triggers download with correct project name', async () => {
    render(<TopBar />);

    // Open export dropdown
    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    // Click WAV option
    await waitFor(() => {
      const wavOption = screen.getByText(/WAV/i);
      fireEvent.click(wavOption);
    });

    // Wait for export to complete
    await waitFor(() => {
      expect(mockExporter.downloadWAV).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'track-1',
            audioBlob: expect.any(Blob),
            volume: 80,
            muted: false,
            soloed: false,
          }),
          expect.objectContaining({
            id: 'track-2',
            audioBlob: expect.any(Blob),
            volume: 90,
            muted: false,
            soloed: false,
          }),
          expect.objectContaining({
            id: 'track-3',
            audioBlob: expect.any(Blob),
            volume: 100,
            muted: true,
            soloed: false,
          }),
        ]),
        'My Choir Project'
      );
    });
  });

  test('WAV export includes all tracks with their volume levels (EXP-001)', async () => {
    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const wavOption = screen.getByText(/WAV/i);
      fireEvent.click(wavOption);
    });

    await waitFor(() => {
      const exportedTracks = mockExporter.downloadWAV.mock.calls[0][0];
      expect(exportedTracks).toHaveLength(3);
      expect(exportedTracks[0].volume).toBe(80);
      expect(exportedTracks[1].volume).toBe(90);
      expect(exportedTracks[2].volume).toBe(100);
    });
  });

  test('WAV export includes muted status (EXP-001)', async () => {
    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const wavOption = screen.getByText(/WAV/i);
      fireEvent.click(wavOption);
    });

    await waitFor(() => {
      const exportedTracks = mockExporter.downloadWAV.mock.calls[0][0];
      expect(exportedTracks[0].muted).toBe(false);
      expect(exportedTracks[1].muted).toBe(false);
      expect(exportedTracks[2].muted).toBe(true); // Muted track
    });
  });

  test('WAV export creates Exporter with AudioContext (EXP-002)', async () => {
    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const wavOption = screen.getByText(/WAV/i);
      fireEvent.click(wavOption);
    });

    await waitFor(() => {
      expect(Exporter).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  // Note: Cleanup tests (AudioContext.close, exporter.dispose) are handled by unit tests
  // Integration tests focus on the data flow: tracks → exporter → download

  test('WAV export closes dropdown after completion', async () => {
    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const wavOption = screen.getByText(/WAV/i);
      fireEvent.click(wavOption);
    });

    // Wait for export to complete and dropdown to close
    await waitFor(() => {
      expect(screen.queryByText(/WAV/i)).not.toBeInTheDocument();
    });
  });

  // 🔥 Edge cases
  test('WAV export with single track', async () => {
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: {
        id: 'proj-1',
        name: 'Solo Project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: [mockTracks[0]],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);

    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const wavOption = screen.getByText(/WAV/i);
      fireEvent.click(wavOption);
    });

    await waitFor(() => {
      expect(mockExporter.downloadWAV).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'track-1' })]),
        'Solo Project'
      );
    });
  });

  test('WAV export with all tracks muted', async () => {
    const allMutedTracks = mockTracks.map((track) => ({
      ...track,
      muted: true,
    }));

    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: {
        id: 'proj-1',
        name: 'Muted Project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: allMutedTracks,
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);

    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const wavOption = screen.getByText(/WAV/i);
      fireEvent.click(wavOption);
    });

    await waitFor(() => {
      const exportedTracks = mockExporter.downloadWAV.mock.calls[0][0];
      expect(exportedTracks.every((t: any) => t.muted === true)).toBe(true);
    });
  });
});

describe('EXP-004, EXP-005, EXP-006: MP3 Export Integration', () => {
  let mockExporter: any;
  let mockTracks: any[];

  beforeEach(() => {
    // Create mock tracks
    mockTracks = [
      {
        id: 'track-1',
        projectId: 'proj-1',
        name: 'Soprano Track',
        voicePart: 'soprano',
        audioBlob: new Blob(['soprano audio data'], { type: 'audio/wav' }),
        waveformData: [0.1, 0.2, 0.3],
        duration: 5.0,
        volume: 75,
        muted: false,
        soloed: false,
        createdAt: Date.now(),
      },
      {
        id: 'track-2',
        projectId: 'proj-1',
        name: 'Alto Track',
        voicePart: 'alto',
        audioBlob: new Blob(['alto audio data'], { type: 'audio/wav' }),
        waveformData: [0.2, 0.3, 0.4],
        duration: 5.0,
        volume: 85,
        muted: false,
        soloed: true, // Soloed track
        createdAt: Date.now(),
      },
    ];

    // Mock exporter
    mockExporter = {
      downloadWAV: vi.fn().mockResolvedValue(undefined),
      downloadMP3: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn(),
    };

    vi.mocked(Exporter).mockImplementation(function () {
      return mockExporter;
    } as any);

    // Mock project store
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: {
        id: 'proj-1',
        name: 'My Choir Project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: mockTracks,
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('clicking Export MP3 triggers download with correct project name', async () => {
    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const mp3Option = screen.getByText(/MP3/i);
      fireEvent.click(mp3Option);
    });

    await waitFor(() => {
      expect(mockExporter.downloadMP3).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'track-1' }),
          expect.objectContaining({ id: 'track-2' }),
        ]),
        'My Choir Project'
      );
    });
  });

  test('MP3 export includes all tracks with their volume levels (EXP-004)', async () => {
    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const mp3Option = screen.getByText(/MP3/i);
      fireEvent.click(mp3Option);
    });

    await waitFor(() => {
      const exportedTracks = mockExporter.downloadMP3.mock.calls[0][0];
      expect(exportedTracks).toHaveLength(2);
      expect(exportedTracks[0].volume).toBe(75);
      expect(exportedTracks[1].volume).toBe(85);
    });
  });

  test('MP3 export includes soloed status (EXP-004)', async () => {
    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const mp3Option = screen.getByText(/MP3/i);
      fireEvent.click(mp3Option);
    });

    await waitFor(() => {
      const exportedTracks = mockExporter.downloadMP3.mock.calls[0][0];
      expect(exportedTracks[0].soloed).toBe(false);
      expect(exportedTracks[1].soloed).toBe(true);
    });
  });

  test('MP3 export creates Exporter with AudioContext (EXP-005)', async () => {
    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const mp3Option = screen.getByText(/MP3/i);
      fireEvent.click(mp3Option);
    });

    await waitFor(() => {
      expect(Exporter).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  // Note: Cleanup tests (AudioContext.close, exporter.dispose) are handled by unit tests
  // Integration tests focus on the data flow: tracks → exporter → download

  test('MP3 export closes dropdown after completion', async () => {
    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const mp3Option = screen.getByText(/MP3/i);
      fireEvent.click(mp3Option);
    });

    await waitFor(() => {
      expect(screen.queryByText(/MP3/i)).not.toBeInTheDocument();
    });
  });

  // 🔥 Edge cases
  test('MP3 export with project name containing special characters', async () => {
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: {
        id: 'proj-1',
        name: 'My Project: Special/Edition #1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: mockTracks,
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);

    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      const mp3Option = screen.getByText(/MP3/i);
      fireEvent.click(mp3Option);
    });

    await waitFor(() => {
      expect(mockExporter.downloadMP3).toHaveBeenCalledWith(
        expect.any(Array),
        'My Project: Special/Edition #1'
      );
    });
  });
});

describe('EXP-007: Export dropdown UI', () => {
  beforeEach(() => {
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: {
        id: 'proj-1',
        name: 'Test Project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      updateProject: vi.fn(),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      getAllProjects: vi.fn(),
      tracks: [
        {
          id: 'track-1',
          projectId: 'proj-1',
          name: 'Track 1',
          voicePart: 'soprano',
          audioBlob: new Blob(),
          waveformData: [],
          duration: 1.0,
          volume: 100,
          muted: false,
          soloed: false,
          createdAt: Date.now(),
        },
      ],
      addTrack: vi.fn(),
      updateTrack: vi.fn(),
      deleteTrack: vi.fn(),
      restoreLastDeletedTrack: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('export dropdown provides both WAV and MP3 options', async () => {
    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/WAV/i)).toBeInTheDocument();
      expect(screen.getByText(/MP3/i)).toBeInTheDocument();
    });
  });

  // Note: UI behavior tests (dropdown close on outside click) are in TopBar.test.tsx unit tests

  test('export dropdown toggles on button click', async () => {
    render(<TopBar />);

    const exportButton = screen.getByRole('button', { name: /export/i });

    // Open dropdown
    fireEvent.click(exportButton);
    await waitFor(() => {
      expect(screen.getByText(/WAV/i)).toBeInTheDocument();
    });

    // Close dropdown
    fireEvent.click(exportButton);
    await waitFor(() => {
      expect(screen.queryByText(/WAV/i)).not.toBeInTheDocument();
    });
  });
});
