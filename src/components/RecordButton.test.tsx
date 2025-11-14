import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RecordButton } from './RecordButton';
import { Recorder } from '../audio/recorder';
import { Metronome } from '../audio/metronome';
import { VUMeter } from '../audio/vuMeter';
import { Visualizer } from '../audio/visualizer';

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

describe('REC-001: Request microphone permission on Add Track', () => {
  let mockRecorder: any;
  let mockMetronome: any;
  let mockVUMeter: any;

  beforeEach(() => {
    mockRecorder = {
      enumerateDevices: vi.fn().mockResolvedValue([]),
      selectDevice: vi.fn(),
      requestPermission: vi.fn().mockResolvedValue({} as MediaStream),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue({
        blob: new Blob(),
        duration: 5,
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
    render(
      <RecordButton
        voicePartId="soprano"
        onRecordingComplete={handleRecordingComplete}
      />
    );

    const button = screen.getByRole('button', { name: /record|add track/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockRecorder.requestPermission).toHaveBeenCalled();
    });
  });

  test('displays error when permission denied', async () => {
    mockRecorder.requestPermission.mockRejectedValue(new Error('Permission denied'));

    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/permission denied|microphone access/i)).toBeInTheDocument();
    });
  });

  test('does not start recording if permission denied', async () => {
    mockRecorder.requestPermission.mockRejectedValue(new Error('Permission denied'));

    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/permission denied|microphone access/i)).toBeInTheDocument();
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
      requestPermission: vi.fn().mockResolvedValue({} as MediaStream),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue({
        blob: new Blob(),
        duration: 5,
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
    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      // Flush promises to allow requestPermission to resolve
      await Promise.resolve();
    });

    expect(mockRecorder.requestPermission).toHaveBeenCalled();

    // Should show countdown value 3
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('countdown shows 3, 2, 1 in sequence', async () => {
    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

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
    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(mockRecorder.requestPermission).toHaveBeenCalled();

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
      requestPermission: vi.fn().mockResolvedValue({} as MediaStream),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue({
        blob: new Blob(),
        duration: 5,
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
    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} bpm={120} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(mockRecorder.requestPermission).toHaveBeenCalled();

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockMetronome.start).toHaveBeenCalled();
  });

  test('starts MediaRecorder when recording begins', async () => {
    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(mockRecorder.requestPermission).toHaveBeenCalled();

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockRecorder.startRecording).toHaveBeenCalled();
  });

  test('starts both metronome and recorder together', async () => {
    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} bpm={120} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(mockRecorder.requestPermission).toHaveBeenCalled();

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
      requestPermission: vi.fn().mockResolvedValue(mockStream),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue({
        blob: new Blob(),
        duration: 5,
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
    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(mockRecorder.requestPermission).toHaveBeenCalled();

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(screen.getByRole('meter', { name: /vu meter|volume/i })).toBeInTheDocument();
  });

  test('connects VU meter to microphone stream', async () => {
    const mockStream = {} as MediaStream;
    mockRecorder.requestPermission.mockResolvedValue(mockStream);

    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(mockRecorder.requestPermission).toHaveBeenCalled();

    // Wait for countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(mockVUMeter.connect).toHaveBeenCalledWith(mockStream);
  });

  test('VU meter shows current level', async () => {
    mockVUMeter.getVolume.mockReturnValue(0.7);

    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(mockRecorder.requestPermission).toHaveBeenCalled();

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
      requestPermission: vi.fn().mockResolvedValue({} as MediaStream),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue({
        blob: new Blob(['audio data'], { type: 'audio/wav' }),
        duration: 5.5,
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
    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const startButton = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(startButton);
      await Promise.resolve();
    });

    expect(mockRecorder.requestPermission).toHaveBeenCalled();

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

    render(
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

    expect(mockRecorder.requestPermission).toHaveBeenCalled();

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
    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const startButton = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(startButton);
      await Promise.resolve();
    });

    expect(mockRecorder.requestPermission).toHaveBeenCalled();

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
      requestPermission: vi.fn().mockResolvedValue({} as MediaStream),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue({
        blob: new Blob(),
        duration: 5,
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
    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const button = screen.getByRole('button', { name: /record|add track/i });
    expect(button).toBeInTheDocument();
  });

  test('disables button during countdown', async () => {
    vi.useFakeTimers();

    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

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

    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const startButton = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(startButton);
      await Promise.resolve();
    });

    expect(mockRecorder.requestPermission).toHaveBeenCalled();

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

    render(<RecordButton voicePartId="soprano" onRecordingComplete={vi.fn()} />);

    const startButton = screen.getByRole('button', { name: /record|add track/i });

    await act(async () => {
      fireEvent.click(startButton);
      await Promise.resolve();
    });

    expect(mockRecorder.requestPermission).toHaveBeenCalled();

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
