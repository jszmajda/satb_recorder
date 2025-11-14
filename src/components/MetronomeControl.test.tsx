import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MetronomeControl } from './MetronomeControl';
import { Metronome } from '../audio/metronome';

// Mock AudioContext
const mockAudioContext = {
  close: vi.fn(),
};

global.AudioContext = vi.fn(() => mockAudioContext) as any;

// Mock the Metronome class
vi.mock('../audio/metronome');

describe('MET-003: BPM input field', () => {
  let mockMetronome: any;

  beforeEach(() => {
    mockMetronome = {
      setBpm: vi.fn(),
      getBpm: vi.fn().mockReturnValue(120),
      start: vi.fn(),
      stop: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false),
      setVisualCallback: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(Metronome).mockImplementation(function() {
      return mockMetronome;
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('renders BPM input field with current value', () => {
    render(<MetronomeControl />);

    const input = screen.getByRole('spinbutton', { name: /bpm/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(120);
  });

  test('updates BPM when input value changes', async () => {
    render(<MetronomeControl />);

    const input = screen.getByRole('spinbutton', { name: /bpm/i });
    fireEvent.change(input, { target: { value: '140' } });

    await waitFor(() => {
      expect(mockMetronome.setBpm).toHaveBeenCalledWith(140);
    });
  });

  test('accepts valid BPM range (40-240)', async () => {
    render(<MetronomeControl />);

    const input = screen.getByRole('spinbutton', { name: /bpm/i });

    fireEvent.change(input, { target: { value: '40' } });
    await waitFor(() => {
      expect(mockMetronome.setBpm).toHaveBeenCalledWith(40);
    });

    fireEvent.change(input, { target: { value: '240' } });
    await waitFor(() => {
      expect(mockMetronome.setBpm).toHaveBeenCalledWith(240);
    });
  });

  // 🔥 Edge cases
  test('clamps BPM to minimum value (40)', async () => {
    render(<MetronomeControl />);

    const input = screen.getByRole('spinbutton', { name: /bpm/i });
    fireEvent.change(input, { target: { value: '30' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input).toHaveValue(40);
      expect(mockMetronome.setBpm).toHaveBeenCalledWith(40);
    });
  });

  test('clamps BPM to maximum value (240)', async () => {
    render(<MetronomeControl />);

    const input = screen.getByRole('spinbutton', { name: /bpm/i });
    fireEvent.change(input, { target: { value: '300' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input).toHaveValue(240);
      expect(mockMetronome.setBpm).toHaveBeenCalledWith(240);
    });
  });

  test('handles invalid input gracefully', async () => {
    mockMetronome.getBpm.mockReturnValue(120);
    render(<MetronomeControl />);

    const input = screen.getByRole('spinbutton', { name: /bpm/i });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input).toHaveValue(120); // Reverts to previous value
    });
  });
});

describe('MET-002: BPM increment/decrement buttons', () => {
  let mockMetronome: any;

  beforeEach(() => {
    mockMetronome = {
      setBpm: vi.fn(),
      getBpm: vi.fn().mockReturnValue(120),
      start: vi.fn(),
      stop: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false),
      setVisualCallback: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(Metronome).mockImplementation(function() {
      return mockMetronome;
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('renders increment and decrement buttons', () => {
    render(<MetronomeControl />);

    expect(screen.getByRole('button', { name: /increment|[+]/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decrement|[-]/i })).toBeInTheDocument();
  });

  test('increments BPM by 1 on increment button click', async () => {
    mockMetronome.getBpm.mockReturnValue(120);
    render(<MetronomeControl />);

    const incrementButton = screen.getByRole('button', { name: /increment|[+]/i });
    fireEvent.click(incrementButton);

    await waitFor(() => {
      expect(mockMetronome.setBpm).toHaveBeenCalledWith(121);
    });
  });

  test('decrements BPM by 1 on decrement button click', async () => {
    mockMetronome.getBpm.mockReturnValue(120);
    render(<MetronomeControl />);

    const decrementButton = screen.getByRole('button', { name: /decrement|[-]/i });
    fireEvent.click(decrementButton);

    await waitFor(() => {
      expect(mockMetronome.setBpm).toHaveBeenCalledWith(119);
    });
  });

  // 🔥 Edge cases
  test('does not increment beyond maximum BPM (240)', async () => {
    render(<MetronomeControl />);

    const input = screen.getByRole('spinbutton', { name: /bpm/i });
    const incrementButton = screen.getByRole('button', { name: /increment|[+]/i });

    // Set to max BPM
    fireEvent.change(input, { target: { value: '240' } });

    // Clear previous calls
    mockMetronome.setBpm.mockClear();

    // Try to increment beyond max
    fireEvent.click(incrementButton);

    expect(mockMetronome.setBpm).not.toHaveBeenCalled();
  });

  test('does not decrement below minimum BPM (40)', async () => {
    render(<MetronomeControl />);

    const input = screen.getByRole('spinbutton', { name: /bpm/i });
    const decrementButton = screen.getByRole('button', { name: /decrement|[-]/i });

    // Set to min BPM
    fireEvent.change(input, { target: { value: '40' } });

    // Clear previous calls
    mockMetronome.setBpm.mockClear();

    // Try to decrement below min
    fireEvent.click(decrementButton);

    expect(mockMetronome.setBpm).not.toHaveBeenCalled();
  });

  test('increment button disabled at max BPM', () => {
    render(<MetronomeControl />);

    const input = screen.getByRole('spinbutton', { name: /bpm/i });

    // Set to max BPM
    fireEvent.change(input, { target: { value: '240' } });

    const incrementButton = screen.getByRole('button', { name: /increment|[+]/i });
    expect(incrementButton).toBeDisabled();
  });

  test('decrement button disabled at min BPM', () => {
    render(<MetronomeControl />);

    const input = screen.getByRole('spinbutton', { name: /bpm/i });

    // Set to min BPM
    fireEvent.change(input, { target: { value: '40' } });

    const decrementButton = screen.getByRole('button', { name: /decrement|[-]/i });
    expect(decrementButton).toBeDisabled();
  });
});

describe('MET-005: Visual flash indicator', () => {
  let mockMetronome: any;

  beforeEach(() => {
    mockMetronome = {
      setBpm: vi.fn(),
      getBpm: vi.fn().mockReturnValue(120),
      start: vi.fn(),
      stop: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false),
      setVisualCallback: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(Metronome).mockImplementation(function() {
      return mockMetronome;
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('renders visual flash indicator box', () => {
    render(<MetronomeControl />);

    const flashBox = screen.getByTestId('metronome-flash');
    expect(flashBox).toBeInTheDocument();
  });

  test('registers visual callback on mount', () => {
    render(<MetronomeControl />);

    expect(mockMetronome.setVisualCallback).toHaveBeenCalledWith(expect.any(Function));
  });

  test('flash box lights up when callback triggered', async () => {
    let visualCallback: ((beatNumber: number) => void) | null = null;
    mockMetronome.setVisualCallback.mockImplementation((cb: any) => {
      visualCallback = cb;
    });

    render(<MetronomeControl />);

    const flashBox = screen.getByTestId('metronome-flash');

    // Initially not flashing
    expect(flashBox).not.toHaveClass('flash-active');

    // Trigger beat
    if (visualCallback) {
      visualCallback(1);
    }

    await waitFor(() => {
      expect(flashBox).toHaveClass('flash-active');
    });
  });

  test('flash deactivates after brief duration', async () => {
    let visualCallback: ((beatNumber: number) => void) | null = null;
    mockMetronome.setVisualCallback.mockImplementation((cb: any) => {
      visualCallback = cb;
    });

    render(<MetronomeControl />);

    const flashBox = screen.getByTestId('metronome-flash');

    // Trigger beat
    if (visualCallback) {
      visualCallback(1);
    }

    await waitFor(() => {
      expect(flashBox).toHaveClass('flash-active');
    });

    // Wait for flash to deactivate (100ms + buffer)
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(flashBox).not.toHaveClass('flash-active');
  });

  test('flash highlights beat 1 differently', async () => {
    let visualCallback: ((beatNumber: number) => void) | null = null;
    mockMetronome.setVisualCallback.mockImplementation((cb: any) => {
      visualCallback = cb;
    });

    render(<MetronomeControl />);

    const flashBox = screen.getByTestId('metronome-flash');

    // Trigger beat 1
    if (visualCallback) {
      visualCallback(1);
    }

    await waitFor(() => {
      expect(flashBox).toHaveClass('beat-one');
    });

    // Wait for flash to clear
    await new Promise(resolve => setTimeout(resolve, 150));

    // Trigger beat 2
    if (visualCallback) {
      visualCallback(2);
    }

    await waitFor(() => {
      expect(flashBox).not.toHaveClass('beat-one');
    });
  });
});

describe('OVER-001: Overdub toggle', () => {
  let mockMetronome: any;

  beforeEach(() => {
    mockMetronome = {
      setBpm: vi.fn(),
      getBpm: vi.fn().mockReturnValue(120),
      start: vi.fn(),
      stop: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false),
      setVisualCallback: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(Metronome).mockImplementation(function() {
      return mockMetronome;
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('renders overdub toggle switch', () => {
    render(<MetronomeControl />);

    const toggle = screen.getByRole('checkbox', { name: /overdub/i });
    expect(toggle).toBeInTheDocument();
  });

  test('overdub toggle defaults to off', () => {
    render(<MetronomeControl />);

    const toggle = screen.getByRole('checkbox', { name: /overdub/i });
    expect(toggle).not.toBeChecked();
  });

  test('toggles overdub state on click', () => {
    render(<MetronomeControl />);

    const toggle = screen.getByRole('checkbox', { name: /overdub/i });

    fireEvent.click(toggle);
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
  });

  test('displays overdub label', () => {
    render(<MetronomeControl />);

    expect(screen.getByText(/overdub/i)).toBeInTheDocument();
  });
});

describe('MetronomeControl: Component lifecycle', () => {
  let mockMetronome: any;

  beforeEach(() => {
    mockMetronome = {
      setBpm: vi.fn(),
      getBpm: vi.fn().mockReturnValue(120),
      start: vi.fn(),
      stop: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false),
      setVisualCallback: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(Metronome).mockImplementation(function() {
      return mockMetronome;
    } as any);
    mockAudioContext.close.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('creates Metronome instance on mount', () => {
    render(<MetronomeControl />);

    expect(Metronome).toHaveBeenCalledWith(120); // Initial BPM = 120
  });

  test('disposes metronome on unmount', () => {
    const { unmount } = render(<MetronomeControl />);

    unmount();

    expect(mockMetronome.dispose).toHaveBeenCalled();
  });
});
