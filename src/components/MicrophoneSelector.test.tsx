import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MicrophoneSelector } from './MicrophoneSelector';
import { Recorder } from '../audio/recorder';

// Mock AudioContext
const mockAudioContext = {
  close: vi.fn(),
  createMediaStreamSource: vi.fn(),
};

global.AudioContext = vi.fn(function() {
  return mockAudioContext;
} as any);

// Mock Recorder class
vi.mock('../audio/recorder');

describe('MIC-002: Device enumeration display', () => {
  let mockRecorder: any;

  beforeEach(() => {
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    };

    mockRecorder = {
      enumerateDevices: vi.fn().mockResolvedValue([
        { deviceId: 'mic-1', label: 'Built-in Microphone' },
        { deviceId: 'mic-2', label: 'USB Microphone' },
        { deviceId: 'mic-3', label: 'Bluetooth Headset' },
      ]),
      getSelectedDeviceId: vi.fn().mockReturnValue(null),
      setSelectedDevice: vi.fn(),
      requestPermission: vi.fn(),
      requestMicrophoneAccess: vi.fn().mockResolvedValue(mockStream),
      dispose: vi.fn(),
    };
    vi.mocked(Recorder).mockImplementation(function() {
      return mockRecorder;
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('renders microphone selector dropdown', async () => {
    render(<MicrophoneSelector />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /microphone/i })).toBeInTheDocument();
    });
  });

  test('enumerates devices on mount', async () => {
    render(<MicrophoneSelector />);

    await waitFor(() => {
      expect(mockRecorder.enumerateDevices).toHaveBeenCalled();
    });
  });

  test('displays all enumerated devices in dropdown', async () => {
    render(<MicrophoneSelector />);

    await waitFor(() => {
      expect(screen.getByText('Built-in Microphone')).toBeInTheDocument();
      expect(screen.getByText('USB Microphone')).toBeInTheDocument();
      expect(screen.getByText('Bluetooth Headset')).toBeInTheDocument();
    });
  });

  test('displays device labels in options', async () => {
    render(<MicrophoneSelector />);

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      // +1 for "Select a microphone" default option
      expect(options).toHaveLength(4);
    });
  });

  // 🔥 Edge cases
  test('displays placeholder when no device selected', async () => {
    render(<MicrophoneSelector />);

    await waitFor(() => {
      expect(screen.getByText(/select a microphone/i)).toBeInTheDocument();
    });
  });

  test('handles empty device list', async () => {
    mockRecorder.enumerateDevices.mockResolvedValue([]);

    render(<MicrophoneSelector />);

    await waitFor(() => {
      expect(screen.getByText(/no microphones found/i)).toBeInTheDocument();
    });
  });

  test('handles enumeration error gracefully', async () => {
    mockRecorder.enumerateDevices.mockRejectedValue(new Error('Enumeration failed'));

    render(<MicrophoneSelector />);

    await waitFor(() => {
      expect(screen.getByText(/error loading microphones/i)).toBeInTheDocument();
    });
  });

  test('displays loading state during enumeration', () => {
    // Set up a promise we can control
    let resolveEnumerate: any;
    mockRecorder.enumerateDevices.mockReturnValue(
      new Promise((resolve) => {
        resolveEnumerate = resolve;
      })
    );

    render(<MicrophoneSelector />);

    expect(screen.getByText(/loading microphones/i)).toBeInTheDocument();

    // Clean up
    resolveEnumerate([]);
  });
});

describe('MIC-003: Device selection', () => {
  let mockRecorder: any;

  beforeEach(() => {
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    };

    mockRecorder = {
      enumerateDevices: vi.fn().mockResolvedValue([
        { deviceId: 'mic-1', label: 'Built-in Microphone' },
        { deviceId: 'mic-2', label: 'USB Microphone' },
      ]),
      getSelectedDeviceId: vi.fn().mockReturnValue(null),
      setSelectedDevice: vi.fn(),
      requestMicrophoneAccess: vi.fn().mockResolvedValue(mockStream),
      requestPermission: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(Recorder).mockImplementation(function() {
      return mockRecorder;
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('calls setSelectedDevice when device is chosen', async () => {
    render(<MicrophoneSelector />);

    await waitFor(() => {
      expect(screen.getByText('Built-in Microphone')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox', { name: /microphone/i });
    fireEvent.change(select, { target: { value: 'mic-1' } });

    expect(mockRecorder.setSelectedDevice).toHaveBeenCalledWith('mic-1');
  });

  test('displays selected device', async () => {
    mockRecorder.getSelectedDeviceId.mockReturnValue('mic-2');

    render(<MicrophoneSelector />);

    await waitFor(() => {
      const select = screen.getByRole('combobox', { name: /microphone/i }) as HTMLSelectElement;
      expect(select.value).toBe('mic-2');
    });
  });

  test('updates selection when different device chosen', async () => {
    render(<MicrophoneSelector />);

    await waitFor(() => {
      expect(screen.getByText('Built-in Microphone')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox', { name: /microphone/i });

    // Select first device
    fireEvent.change(select, { target: { value: 'mic-1' } });
    expect(mockRecorder.setSelectedDevice).toHaveBeenCalledWith('mic-1');

    // Select second device
    fireEvent.change(select, { target: { value: 'mic-2' } });
    expect(mockRecorder.setSelectedDevice).toHaveBeenCalledWith('mic-2');
  });

  test('clears selection when placeholder selected', async () => {
    render(<MicrophoneSelector />);

    await waitFor(() => {
      expect(screen.getByText('Built-in Microphone')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox', { name: /microphone/i });

    // Select a device first
    fireEvent.change(select, { target: { value: 'mic-1' } });

    // Select placeholder (empty value)
    fireEvent.change(select, { target: { value: '' } });
    expect(mockRecorder.setSelectedDevice).toHaveBeenCalledWith(null);
  });

});

describe('MIC-002: Refresh devices', () => {
  let mockRecorder: any;

  beforeEach(() => {
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    };

    mockRecorder = {
      enumerateDevices: vi.fn().mockResolvedValue([
        { deviceId: 'mic-1', label: 'Built-in Microphone' },
      ]),
      getSelectedDeviceId: vi.fn().mockReturnValue(null),
      setSelectedDevice: vi.fn(),
      requestPermission: vi.fn(),
      requestMicrophoneAccess: vi.fn().mockResolvedValue(mockStream),
      dispose: vi.fn(),
    };
    vi.mocked(Recorder).mockImplementation(function() {
      return mockRecorder;
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('renders refresh button', async () => {
    render(<MicrophoneSelector />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });

  test('re-enumerates devices when refresh clicked', async () => {
    render(<MicrophoneSelector />);

    await waitFor(() => {
      expect(mockRecorder.enumerateDevices).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRecorder.enumerateDevices).toHaveBeenCalledTimes(2);
    });
  });

  test('updates device list after refresh', async () => {
    mockRecorder.enumerateDevices
      .mockResolvedValueOnce([{ deviceId: 'mic-1', label: 'Built-in Microphone' }])
      .mockResolvedValueOnce([
        { deviceId: 'mic-1', label: 'Built-in Microphone' },
        { deviceId: 'mic-2', label: 'New USB Microphone' },
      ]);

    render(<MicrophoneSelector />);

    await waitFor(() => {
      expect(screen.getByText('Built-in Microphone')).toBeInTheDocument();
    });

    expect(screen.queryByText('New USB Microphone')).not.toBeInTheDocument();

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('New USB Microphone')).toBeInTheDocument();
    });
  });
});

describe('MicrophoneSelector: Component lifecycle', () => {
  let mockRecorder: any;

  beforeEach(() => {
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    };

    mockRecorder = {
      enumerateDevices: vi.fn().mockResolvedValue([]),
      getSelectedDeviceId: vi.fn().mockReturnValue(null),
      setSelectedDevice: vi.fn(),
      requestPermission: vi.fn(),
      requestMicrophoneAccess: vi.fn().mockResolvedValue(mockStream),
      dispose: vi.fn(),
    };
    vi.mocked(Recorder).mockImplementation(function() {
      return mockRecorder;
    } as any);
    mockAudioContext.close.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('creates Recorder instance on mount', () => {
    render(<MicrophoneSelector />);

    expect(Recorder).toHaveBeenCalledWith(expect.objectContaining({
      close: expect.any(Function),
    }));
  });

  test('disposes recorder on unmount', () => {
    const { unmount } = render(<MicrophoneSelector />);

    unmount();

    expect(mockRecorder.dispose).toHaveBeenCalled();
  });

  test('cleans up audio context on unmount', () => {
    let createdAudioContext: any = null;
    (global.AudioContext as any).mockImplementationOnce(function() {
      createdAudioContext = { ...mockAudioContext };
      return createdAudioContext;
    });

    const { unmount } = render(<MicrophoneSelector />);

    unmount();

    expect(createdAudioContext.close).toHaveBeenCalled();
  });
});
