import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToneGenerator as ToneGeneratorComponent } from './ToneGenerator';
import { ToneGenerator } from '../audio/toneGenerator';

// Mock AudioContext
const mockAudioContext = {
  close: vi.fn(),
};

global.AudioContext = vi.fn(function() {
  return mockAudioContext;
} as any);

// Mock ToneGenerator class
vi.mock('../audio/toneGenerator');

describe('TONE-003, TONE-006: Tone generator UI', () => {
  let mockToneGenerator: any;

  beforeEach(() => {
    mockToneGenerator = {
      play: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(ToneGenerator).mockImplementation(function() {
      return mockToneGenerator;
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('renders all 12 tone buttons', () => {
    render(<ToneGeneratorComponent />);

    const tones = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    tones.forEach(tone => {
      expect(screen.getByRole('button', { name: tone })).toBeInTheDocument();
    });
  });

  test('renders buttons in chromatic order', () => {
    render(<ToneGeneratorComponent />);

    const buttons = screen.getAllByRole('button');
    const toneLabels = buttons.map(btn => btn.textContent);

    expect(toneLabels).toEqual(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
  });
});

describe('TONE-004: Play tone on button press', () => {
  let mockToneGenerator: any;

  beforeEach(() => {
    mockToneGenerator = {
      play: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(ToneGenerator).mockImplementation(function() {
      return mockToneGenerator;
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('plays tone when button clicked', () => {
    render(<ToneGeneratorComponent />);

    const cButton = screen.getByRole('button', { name: 'C' });
    fireEvent.click(cButton);

    expect(mockToneGenerator.play).toHaveBeenCalledWith(0); // C = semitone 0
  });

  test('plays correct tone for each button', () => {
    render(<ToneGeneratorComponent />);

    const toneMap: Record<string, number> = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
    };

    Object.entries(toneMap).forEach(([label, semitone]) => {
      mockToneGenerator.play.mockClear();
      const button = screen.getByRole('button', { name: label });
      fireEvent.click(button);
      expect(mockToneGenerator.play).toHaveBeenCalledWith(semitone);
    });
  }, 10000); // Increase timeout for testing all 12 buttons

  test('plays different tones for different buttons', () => {
    render(<ToneGeneratorComponent />);

    const cButton = screen.getByRole('button', { name: 'C' });
    fireEvent.click(cButton);
    expect(mockToneGenerator.play).toHaveBeenCalledWith(0); // C = semitone 0

    mockToneGenerator.play.mockClear();

    const gButton = screen.getByRole('button', { name: 'G' });
    fireEvent.click(gButton);
    expect(mockToneGenerator.play).toHaveBeenCalledWith(7); // G = semitone 7
  });
});

describe('TONE-005: Stop tone on release or second click', () => {
  let mockToneGenerator: any;

  beforeEach(() => {
    mockToneGenerator = {
      play: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(ToneGenerator).mockImplementation(function() {
      return mockToneGenerator;
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('stops tone when same button clicked twice', () => {
    render(<ToneGeneratorComponent />);

    const cButton = screen.getByRole('button', { name: 'C' });

    // First click - play
    fireEvent.click(cButton);
    expect(mockToneGenerator.play).toHaveBeenCalledWith(0); // C = semitone 0

    // Second click - stop
    fireEvent.click(cButton);
    expect(mockToneGenerator.stop).toHaveBeenCalled();
  });

  test('stops previous tone when different button clicked', () => {
    render(<ToneGeneratorComponent />);

    const cButton = screen.getByRole('button', { name: 'C' });
    const gButton = screen.getByRole('button', { name: 'G' });

    // Play C
    fireEvent.click(cButton);
    expect(mockToneGenerator.play).toHaveBeenCalledWith(0); // C = semitone 0

    // Play G - should stop C first
    fireEvent.click(gButton);
    expect(mockToneGenerator.stop).toHaveBeenCalled();
    expect(mockToneGenerator.play).toHaveBeenCalledWith(7); // G = semitone 7
  });

  test('button shows active state when tone is playing', () => {
    render(<ToneGeneratorComponent />);

    const cButton = screen.getByRole('button', { name: 'C' });

    // Initially not active
    expect(cButton).not.toHaveClass('active');

    // Click to play
    fireEvent.click(cButton);
    expect(cButton).toHaveClass('active');

    // Click again to stop
    fireEvent.click(cButton);
    expect(cButton).not.toHaveClass('active');
  });

  test('only one button can be active at a time', () => {
    render(<ToneGeneratorComponent />);

    const cButton = screen.getByRole('button', { name: 'C' });
    const gButton = screen.getByRole('button', { name: 'G' });

    // Play C
    fireEvent.click(cButton);
    expect(cButton).toHaveClass('active');
    expect(gButton).not.toHaveClass('active');

    // Play G
    fireEvent.click(gButton);
    expect(cButton).not.toHaveClass('active');
    expect(gButton).toHaveClass('active');
  });
});

describe('ToneGenerator: Component lifecycle', () => {
  let mockToneGenerator: any;

  beforeEach(() => {
    mockToneGenerator = {
      playTone: vi.fn(),
      stopTone: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(ToneGenerator).mockImplementation(function() {
      return mockToneGenerator;
    } as any);
    mockAudioContext.close.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('creates ToneGenerator instance on mount', () => {
    render(<ToneGeneratorComponent />);

    expect(ToneGenerator).toHaveBeenCalledWith(expect.objectContaining({
      close: expect.any(Function),
    }));
  });

  test('disposes tone generator on unmount', () => {
    const { unmount } = render(<ToneGeneratorComponent />);

    unmount();

    expect(mockToneGenerator.dispose).toHaveBeenCalled();
  });

  test('cleans up audio context on unmount', () => {
    let createdAudioContext: any = null;
    (global.AudioContext as any).mockImplementationOnce(function() {
      createdAudioContext = { ...mockAudioContext };
      return createdAudioContext;
    });

    const { unmount } = render(<ToneGeneratorComponent />);

    unmount();

    expect(createdAudioContext.close).toHaveBeenCalled();
  });

  test('stops any playing tone on unmount', () => {
    const { unmount } = render(<ToneGeneratorComponent />);

    // Play a tone
    const cButton = screen.getByRole('button', { name: 'C' });
    fireEvent.click(cButton);

    // Unmount - should stop tone
    unmount();

    expect(mockToneGenerator.stop).toHaveBeenCalled();
  });
});
