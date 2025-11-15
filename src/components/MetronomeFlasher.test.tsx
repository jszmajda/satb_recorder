import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MetronomeFlasher } from './MetronomeFlasher';
import { Metronome } from '../audio/metronome';
import { MetronomeProvider } from '../contexts/MetronomeContext';

// Mock AudioContext
const mockAudioContext = {
  close: vi.fn(),
};

global.AudioContext = vi.fn(() => mockAudioContext) as any;

// Mock the Metronome class
vi.mock('../audio/metronome');

// Helper function to render with MetronomeProvider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MetronomeProvider>
      {component}
    </MetronomeProvider>
  );
};

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
  test('renders large visual flash indicator box', () => {
    renderWithProvider(<MetronomeFlasher />);

    const flashBox = screen.getByTestId('metronome-flasher-large');
    expect(flashBox).toBeInTheDocument();
  });

  test('registers visual callback on mount', () => {
    renderWithProvider(<MetronomeFlasher />);

    expect(mockMetronome.setVisualCallback).toHaveBeenCalledWith(expect.any(Function));
  });

  test('flash box lights up when callback triggered', async () => {
    let visualCallback: (() => void) | null = null;
    mockMetronome.setVisualCallback.mockImplementation((cb: any) => {
      visualCallback = cb;
    });

    renderWithProvider(<MetronomeFlasher />);

    const flashBox = screen.getByTestId('metronome-flasher-large');

    // Initially not flashing
    expect(flashBox).toHaveAttribute('data-flashing', 'false');

    // Trigger beat
    if (visualCallback) {
      visualCallback();
    }

    await waitFor(() => {
      // Should be flashing
      expect(flashBox).toHaveAttribute('data-flashing', 'true');
    });
  });

  test('flash deactivates after brief duration', async () => {
    let visualCallback: (() => void) | null = null;
    mockMetronome.setVisualCallback.mockImplementation((cb: any) => {
      visualCallback = cb;
    });

    renderWithProvider(<MetronomeFlasher />);

    const flashBox = screen.getByTestId('metronome-flasher-large');

    // Trigger beat
    if (visualCallback) {
      visualCallback();
    }

    await waitFor(() => {
      // Should be flashing
      expect(flashBox).toHaveAttribute('data-flashing', 'true');
    });

    // Wait for flash to deactivate (100ms + buffer)
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should return to not flashing
    expect(flashBox).toHaveAttribute('data-flashing', 'false');
  });
});
