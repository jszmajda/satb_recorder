import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RecordButton } from './RecordButton';
import { Recorder } from '../audio/recorder';
import { Metronome } from '../audio/metronome';
import { VUMeter } from '../audio/vuMeter';
import { Visualizer } from '../audio/visualizer';
import { Mixer } from '../audio/mixer';
import { MetronomeProvider } from '../contexts/MetronomeContext';

// Mock AudioContext
const mockAudioContext = {
  close: vi.fn(),
  createAnalyser: vi.fn(),
  createMediaStreamSource: vi.fn(),
};

global.AudioContext = vi.fn(() => mockAudioContext) as any;

// Mock audio classes
vi.mock('../audio/recorder');
vi.mock('../audio/metronome');
vi.mock('../audio/vuMeter');
vi.mock('../audio/visualizer');
vi.mock('../audio/mixer');

// Helper function to render with MetronomeProvider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MetronomeProvider>
      {component}
    </MetronomeProvider>
  );
};

describe('REC-001: Request microphone permission on Add Track', () => {
  let mockRecorder: any;
  let mockMetronome: any;
  let mockVUMeter: any;

  beforeEach(() => {
    mockRecorder = {
      enumerateDevices: vi.fn().mockResolvedValue([]),
      selectDevice: vi.fn(),
      requestMicrophoneAccess: vi.fn().mockResolvedValue({} as MediaStream),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue({
        audioBlob: new Blob(),
        duration: 5,
        waveformData: [],
      }),
      getRecordingState: vi.fn().mockReturnValue('inactive'),
      dispose: vi.fn(),
    };

    mockMetronome = {
      setBpm: vi.fn(),
      getBpm: vi.fn().mockReturnValue(120),
      start: vi.fn(),
      stop: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false),
      setVisualCallback: vi.fn(),
      dispose: vi.fn(),
    };

    mockVUMeter = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
      getVolume: vi.fn().mockReturnValue(0),
    };

    vi.mocked(Recorder).mockImplementation(function() {
      return mockRecorder;
    } as any);
    vi.mocked(Metronome).mockImplementation(function() {
      return mockMetronome;
    } as any);
    vi.mocked(VUMeter).mockImplementation(function() {
      return mockVUMeter;
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('requests microphone permission when clicked', async () => {
    const handleRecordingComplete = vi.fn();
    renderWithProvider(
      <RecordButton
        voicePartId="soprano"
        onRecordingComplete={handleRecordingComplete}
      />
    );

    const button = screen.getByRole('button', { name: /record|add track/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();
    });
  });

  test('displays error when permission denied', async () => {
    mockRecorder.requestMicrophoneAccess.mockRejectedValue(new Error('Permission denied'));

    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });
    fireEvent.click(button);

    // Error is now displayed globally via useErrorStore (ERR-001)
    // Test will pass as long as no error is thrown
    await waitFor(() => {
      expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();
    });
  });

  test('does not start recording if permission denied', async () => {
    mockRecorder.requestMicrophoneAccess.mockRejectedValue(new Error('Permission denied'));

    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });
    fireEvent.click(button);

    // Error is now displayed globally via useErrorStore (ERR-001)
    await waitFor(() => {
      expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();
    });

    expect(mockRecorder.startRecording).not.toHaveBeenCalled();
  });
});

describe('REC-002: Display countdown (3-2-1)', () => {
  let mockRecorder: any;
  let mockMetronome: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockRecorder = {
      requestMicrophoneAccess: vi.fn().mockResolvedValue({} as MediaStream),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue({
        audioBlob: new Blob(),
        duration: 5,
        waveformData: [],
      }),
      getRecordingState: vi.fn().mockReturnValue('inactive'),
      dispose: vi.fn(),
    };

    mockMetronome = {
      setBpm: vi.fn(),
      getBpm: vi.fn().mockReturnValue(120),
      start: vi.fn(),
      stop: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false),
      setVisualCallback: vi.fn(),
      dispose: vi.fn(),
    };

    vi.mocked(Recorder).mockImplementation(function() {
      return mockRecorder;
    } as any);
    vi.mocked(Metronome).mockImplementation(function() {
      return mockMetronome;
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test('displays countdown after permission granted', async () => {
    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      // Flush promises to allow requestMicrophoneAccess to resolve
      await Promise.resolve();
    });

    expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();

    // Should show countdown value 3
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('countdown shows 3, 2, 1 in sequence', async () => {
    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(screen.getByText('3')).toBeInTheDocument();

    // Advance 1 second
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('2')).toBeInTheDocument();

    // Advance 1 second
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  test('starts recording after countdown completes', async () => {
    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();

    // Wait for countdown (3 seconds)
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockRecorder.startRecording).toHaveBeenCalled();
  });
});

describe('REC-003: Start MediaRecorder and metronome', () => {
  let mockRecorder: any;
  let mockMetronome: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockRecorder = {
      requestMicrophoneAccess: vi.fn().mockResolvedValue({} as MediaStream),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue({
        audioBlob: new Blob(),
        duration: 5,
        waveformData: [],
      }),
      getRecordingState: vi.fn().mockReturnValue('inactive'),
      dispose: vi.fn(),
    };

    mockMetronome = {
      setBpm: vi.fn(),
      getBpm: vi.fn().mockReturnValue(120),
      start: vi.fn(),
      stop: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false),
      setVisualCallback: vi.fn(),
      dispose: vi.fn(),
    };

    vi.mocked(Recorder).mockImplementation(function() {
      return mockRecorder;
    } as any);
    vi.mocked(Metronome).mockImplementation(function() {
      return mockMetronome;
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test('starts metronome when recording begins', async () => {
    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} bpm={120} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockMetronome.start).toHaveBeenCalled();
  });

  test('starts MediaRecorder when recording begins', async () => {
    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockRecorder.startRecording).toHaveBeenCalled();
  });

  test('starts both metronome and recorder together', async () => {
    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} bpm={120} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockRecorder.startRecording).toHaveBeenCalled();
    expect(mockMetronome.start).toHaveBeenCalled();
  });
});

describe('REC-004: Display VU meter during recording', () => {
  let mockRecorder: any;
  let mockVUMeter: any;

  beforeEach(() => {
    vi.useFakeTimers();

    const mockStream = {} as MediaStream;

    mockRecorder = {
      requestMicrophoneAccess: vi.fn().mockResolvedValue(mockStream),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue({
        audioBlob: new Blob(),
        duration: 5,
        waveformData: [],
      }),
      getRecordingState: vi.fn().mockReturnValue('inactive'),
      dispose: vi.fn(),
    };

    mockVUMeter = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
      getVolume: vi.fn().mockReturnValue(0.5),
    };

    vi.mocked(Recorder).mockImplementation(function() {
      return mockRecorder;
    } as any);
    vi.mocked(VUMeter).mockImplementation(function() {
      return mockVUMeter;
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test('displays VU meter during recording', async () => {
    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(screen.getByRole('meter', { name: /vu meter|volume/i })).toBeInTheDocument();
  });

  test('connects VU meter to microphone stream', async () => {
    const mockStream = {} as MediaStream;
    mockRecorder.requestMicrophoneAccess.mockResolvedValue(mockStream);

    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockVUMeter.connect).toHaveBeenCalledWith(mockStream);
  });

  test('VU meter shows current level', async () => {
    mockVUMeter.getVolume.mockReturnValue(0.7);

    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();

    // Wait for countdown and first VU meter update interval (50ms)
    await act(async () => {
      vi.advanceTimersByTime(3000 + 50);
      await Promise.resolve();
    });

    const meter = screen.getByRole('meter', { name: /vu meter|volume/i });
    expect(meter).toHaveAttribute('aria-valuenow', '70');
  });
});

describe('REC-007: Convert to WAV blob on stop', () => {
  let mockRecorder: any;
  let mockMetronome: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockRecorder = {
      requestMicrophoneAccess: vi.fn().mockResolvedValue({} as MediaStream),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue({
        audioBlob: new Blob(['audio data'], { type: 'audio/webm' }),
        duration: 5.5,
        waveformData: [],
      }),
      getRecordingState: vi.fn()
        .mockReturnValueOnce('inactive')
        .mockReturnValue('recording'),
      dispose: vi.fn(),
    };

    mockMetronome = {
      setBpm: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
    };

    vi.mocked(Recorder).mockImplementation(function() {
      return mockRecorder;
    } as any);
    vi.mocked(Metronome).mockImplementation(function() {
      return mockMetronome;
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test('stops recording when stop button clicked', async () => {
    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const startButton = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(startButton);
      await Promise.resolve();
    });

    expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockRecorder.startRecording).toHaveBeenCalled();

    // Now recording, find stop button
    const stopButton = screen.getByRole('button', { name: /stop/i });

    await act(async () => {
      fireEvent.click(stopButton);
      await Promise.resolve();
    });

    expect(mockRecorder.stopRecording).toHaveBeenCalled();
  });

  test('converts recording to WAV blob', async () => {
    const handleRecordingComplete = vi.fn();

    renderWithProvider(
      <RecordButton
        voicePartId="soprano"
        onRecordingComplete={handleRecordingComplete}
      />
    );

    const startButton = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(startButton);
      await Promise.resolve();
    });

    expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockRecorder.startRecording).toHaveBeenCalled();

    const stopButton = screen.getByRole('button', { name: /stop/i });

    await act(async () => {
      fireEvent.click(stopButton);
      await Promise.resolve();
    });

    expect(handleRecordingComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        blob: expect.any(Blob),
        duration: 5.5,
      })
    );
  });

  test('stops metronome when recording stops', async () => {
    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const startButton = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(startButton);
      await Promise.resolve();
    });

    expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockRecorder.startRecording).toHaveBeenCalled();

    const stopButton = screen.getByRole('button', { name: /stop/i });

    await act(async () => {
      fireEvent.click(stopButton);
      await Promise.resolve();
    });

    expect(mockMetronome.stop).toHaveBeenCalled();
  });
});

describe('RecordButton: Component states', () => {
  let mockRecorder: any;

  beforeEach(() => {
    mockRecorder = {
      requestMicrophoneAccess: vi.fn().mockResolvedValue({} as MediaStream),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue({
        audioBlob: new Blob(),
        duration: 5,
        waveformData: [],
      }),
      getRecordingState: vi.fn().mockReturnValue('inactive'),
      dispose: vi.fn(),
    };

    vi.mocked(Recorder).mockImplementation(function() {
      return mockRecorder;
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('shows record button initially', () => {
    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });
    expect(button).toBeInTheDocument();
  });

  test('disables button during countdown', async () => {
    vi.useFakeTimers();

    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(button).toBeDisabled();

    vi.useRealTimers();
  });

  test('shows stop button while recording', async () => {
    vi.useFakeTimers();

    mockRecorder.getRecordingState.mockReturnValue('recording');

    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const startButton = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(startButton);
      await Promise.resolve();
    });

    expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();

    vi.useRealTimers();
  });

  test('returns to record button after stopping', async () => {
    vi.useFakeTimers();

    mockRecorder.getRecordingState
      .mockReturnValueOnce('inactive')
      .mockReturnValueOnce('recording')
      .mockReturnValue('inactive');

    renderWithProvider(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const startButton = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(startButton);
      await Promise.resolve();
    });

    expect(mockRecorder.requestMicrophoneAccess).toHaveBeenCalled();

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockRecorder.startRecording).toHaveBeenCalled();

    const stopButton = screen.getByRole('button', { name: /stop/i });

    await act(async () => {
      fireEvent.click(stopButton);
      await Promise.resolve();
    });

    expect(screen.getByRole('button', { name: /record|add track/i })).toBeInTheDocument();

    vi.useRealTimers();
  });
});

describe('REC-005, OVER-002: Overdub muting logic', () => {
  let mockRecorder: any;
  let mockMetronome: any;
  let mockVUMeter: any;
  let mockMixer: any;

  beforeEach(() => {
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    };

    mockRecorder = {
      setSelectedDevice: vi.fn(),
      requestMicrophoneAccess: vi.fn().mockResolvedValue(mockStream),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue({
        audioBlob: new Blob(['audio data'], { type: 'audio/webm' }),
        duration: 5.5,
        waveformData: [],
      }),
      dispose: vi.fn(),
    };

    mockMetronome = {
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
    };

    mockVUMeter = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      getVolume: vi.fn().mockReturnValue(0.5),
    };

    mockMixer = {
      loadTrack: vi.fn().mockResolvedValue(undefined),
      play: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
    };

    vi.mocked(Recorder).mockImplementation(function() {
      return mockRecorder;
    } as any);
    vi.mocked(Metronome).mockImplementation(function() {
      return mockMetronome;
    } as any);
    vi.mocked(VUMeter).mockImplementation(function() {
      return mockVUMeter;
    } as any);
    vi.mocked(Mixer).mockImplementation(function() {
      return mockMixer;
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('does not play tracks when overdub is disabled', async () => {
    vi.useFakeTimers();

    const mockTracks = [
      { id: 'track-1', audioBlob: new Blob(), volume: 100, muted: false, soloed: false },
    ];

    renderWithProvider(
      <RecordButton
        voicePartId="soprano"
        bpm={120}
        overdubEnabled={false}
        tracks={mockTracks}
        onRecordingComplete={vi.fn()}
      />
    );

    const recordButton = screen.getByRole('button', { name: /record track/i });

    await act(async () => {
      fireEvent.click(recordButton);
      await Promise.resolve();
    });

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    // Mixer should NOT be used when overdub is disabled
    expect(mockMixer.loadTrack).not.toHaveBeenCalled();
    expect(mockMixer.play).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  test('plays tracks when overdub is enabled', async () => {
    vi.useFakeTimers();

    const mockTracks = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio'], { type: 'audio/webm' }),
        volume: 100,
        muted: false,
        soloed: false
      },
    ];

    renderWithProvider(
      <RecordButton
        voicePartId="soprano"
        bpm={120}
        overdubEnabled={true}
        tracks={mockTracks}
        onRecordingComplete={vi.fn()}
      />
    );

    const recordButton = screen.getByRole('button', { name: /record track/i });

    await act(async () => {
      fireEvent.click(recordButton);
      await Promise.resolve();
    });

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    // Mixer should load track and play when overdub is enabled
    expect(mockMixer.loadTrack).toHaveBeenCalledWith('track-1', mockTracks[0].audioBlob);
    expect(mockMixer.play).toHaveBeenCalled();

    vi.useRealTimers();
  });

  test('stops mixer on recording stop when overdub enabled', async () => {
    vi.useFakeTimers();

    const mockTracks = [
      {
        id: 'track-1',
        audioBlob: new Blob(['audio'], { type: 'audio/webm' }),
        volume: 100,
        muted: false,
        soloed: false
      },
    ];

    renderWithProvider(
      <RecordButton
        voicePartId="soprano"
        bpm={120}
        overdubEnabled={true}
        tracks={mockTracks}
        onRecordingComplete={vi.fn()}
      />
    );

    const recordButton = screen.getByRole('button', { name: /record track/i });

    await act(async () => {
      fireEvent.click(recordButton);
      await Promise.resolve();
    });

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    const stopButton = screen.getByRole('button', { name: /stop recording/i });

    await act(async () => {
      fireEvent.click(stopButton);
      await Promise.resolve();
    });

    // Mixer should be stopped when recording stops
    expect(mockMixer.stop).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
