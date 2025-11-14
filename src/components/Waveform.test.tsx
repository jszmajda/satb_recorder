import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Waveform } from './Waveform';

const mockWaveformData = [
  0.1, 0.3, 0.5, 0.7, 0.9, 0.7, 0.5, 0.3, 0.1, 0.0,
  0.2, 0.4, 0.6, 0.8, 1.0, 0.8, 0.6, 0.4, 0.2, 0.0,
];

describe('VIS-002: Sparkline waveform rendering', () => {
  // ✅ Happy path
  test('renders waveform canvas', () => {
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={0}
        duration={10}
        onSeek={vi.fn()}
      />
    );

    const canvas = screen.getByRole('img', { name: /waveform/i });
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe('CANVAS');
  });

  test('canvas has correct dimensions', () => {
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={0}
        duration={10}
        onSeek={vi.fn()}
        width={400}
        height={60}
      />
    );

    const canvas = screen.getByRole('img', { name: /waveform/i }) as HTMLCanvasElement;
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(60);
  });

  test('uses default dimensions when not specified', () => {
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={0}
        duration={10}
        onSeek={vi.fn()}
      />
    );

    const canvas = screen.getByRole('img', { name: /waveform/i }) as HTMLCanvasElement;
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
  });

  test('renders waveform when data is provided', () => {
    const { container } = render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={0}
        duration={10}
        onSeek={vi.fn()}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  // 🔥 Edge cases
  test('handles empty waveform data', () => {
    render(
      <Waveform
        waveformData={[]}
        currentTime={0}
        duration={10}
        onSeek={vi.fn()}
      />
    );

    const canvas = screen.getByRole('img', { name: /waveform/i });
    expect(canvas).toBeInTheDocument();
  });

  test('handles single data point', () => {
    render(
      <Waveform
        waveformData={[0.5]}
        currentTime={0}
        duration={10}
        onSeek={vi.fn()}
      />
    );

    const canvas = screen.getByRole('img', { name: /waveform/i });
    expect(canvas).toBeInTheDocument();
  });

  test('updates when waveform data changes', () => {
    const { rerender } = render(
      <Waveform
        waveformData={[0.1, 0.2, 0.3]}
        currentTime={0}
        duration={10}
        onSeek={vi.fn()}
      />
    );

    const canvas = screen.getByRole('img', { name: /waveform/i });
    expect(canvas).toBeInTheDocument();

    // Update with new data
    rerender(
      <Waveform
        waveformData={[0.5, 0.6, 0.7, 0.8]}
        currentTime={0}
        duration={10}
        onSeek={vi.fn()}
      />
    );

    expect(canvas).toBeInTheDocument();
  });
});

describe('VIS-004, SEEK-004: Playhead indicator', () => {
  // ✅ Happy path
  test('renders playhead indicator', () => {
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={5}
        duration={10}
        onSeek={vi.fn()}
      />
    );

    const playhead = screen.getByTestId('waveform-playhead');
    expect(playhead).toBeInTheDocument();
  });

  test('playhead position reflects current time', () => {
    const { rerender } = render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={0}
        duration={10}
        onSeek={vi.fn()}
        width={400}
      />
    );

    const playhead = screen.getByTestId('waveform-playhead');
    const initialLeft = playhead.style.left;

    // Update to 50% through
    rerender(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={5}
        duration={10}
        onSeek={vi.fn()}
        width={400}
      />
    );

    const midLeft = playhead.style.left;
    expect(midLeft).not.toBe(initialLeft);
  });

  test('playhead at start when currentTime is 0', () => {
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={0}
        duration={10}
        onSeek={vi.fn()}
        width={400}
      />
    );

    const playhead = screen.getByTestId('waveform-playhead');
    expect(playhead.style.left).toBe('0px');
  });

  test('playhead at end when currentTime equals duration', () => {
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={10}
        duration={10}
        onSeek={vi.fn()}
        width={400}
      />
    );

    const playhead = screen.getByTestId('waveform-playhead');
    expect(playhead.style.left).toBe('400px');
  });

  test('playhead at midpoint when currentTime is half duration', () => {
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={5}
        duration={10}
        onSeek={vi.fn()}
        width={400}
      />
    );

    const playhead = screen.getByTestId('waveform-playhead');
    expect(playhead.style.left).toBe('200px');
  });

  // 🔥 Edge cases
  test('handles zero duration gracefully', () => {
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={0}
        duration={0}
        onSeek={vi.fn()}
      />
    );

    const playhead = screen.getByTestId('waveform-playhead');
    expect(playhead).toBeInTheDocument();
  });

  test('playhead updates in real-time during playback', () => {
    const { rerender } = render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={0}
        duration={10}
        onSeek={vi.fn()}
        width={400}
      />
    );

    const playhead = screen.getByTestId('waveform-playhead');
    expect(playhead.style.left).toBe('0px');

    // Simulate time updates
    rerender(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={2.5}
        duration={10}
        onSeek={vi.fn()}
        width={400}
      />
    );
    expect(playhead.style.left).toBe('100px');

    rerender(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={7.5}
        duration={10}
        onSeek={vi.fn()}
        width={400}
      />
    );
    expect(playhead.style.left).toBe('300px');
  });
});

describe('SEEK-001: Click-to-seek', () => {
  // ✅ Happy path
  test('calls onSeek when waveform is clicked', () => {
    const handleSeek = vi.fn();
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={0}
        duration={10}
        onSeek={handleSeek}
        width={400}
      />
    );

    const canvas = screen.getByRole('img', { name: /waveform/i });

    // Click at 50% (200px out of 400px)
    fireEvent.click(canvas, { clientX: 200, currentTarget: { getBoundingClientRect: () => ({ left: 0 }) } });

    expect(handleSeek).toHaveBeenCalled();
  });

  test('seeks to correct time based on click position', () => {
    const handleSeek = vi.fn();
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={0}
        duration={10}
        onSeek={handleSeek}
        width={400}
      />
    );

    const canvas = screen.getByRole('img', { name: /waveform/i });

    // Click at start (0px)
    fireEvent.click(canvas, {
      clientX: 0,
      currentTarget: { getBoundingClientRect: () => ({ left: 0 }) }
    });
    expect(handleSeek).toHaveBeenCalledWith(0);

    handleSeek.mockClear();

    // Click at 25% (100px out of 400px = 2.5s out of 10s)
    fireEvent.click(canvas, {
      clientX: 100,
      currentTarget: { getBoundingClientRect: () => ({ left: 0 }) }
    });
    expect(handleSeek).toHaveBeenCalledWith(2.5);

    handleSeek.mockClear();

    // Click at 75% (300px out of 400px = 7.5s out of 10s)
    fireEvent.click(canvas, {
      clientX: 300,
      currentTarget: { getBoundingClientRect: () => ({ left: 0 }) }
    });
    expect(handleSeek).toHaveBeenCalledWith(7.5);
  });

  test('click at end seeks to duration', () => {
    const handleSeek = vi.fn();
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={0}
        duration={10}
        onSeek={handleSeek}
        width={400}
      />
    );

    const canvas = screen.getByRole('img', { name: /waveform/i });

    fireEvent.click(canvas, {
      clientX: 400,
      currentTarget: { getBoundingClientRect: () => ({ left: 0 }) }
    });

    expect(handleSeek).toHaveBeenCalledWith(10);
  });

  // 🔥 Edge cases
  test('handles click with canvas offset', () => {
    const handleSeek = vi.fn();
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={0}
        duration={10}
        onSeek={handleSeek}
        width={400}
      />
    );

    const canvas = screen.getByRole('img', { name: /waveform/i });

    // Mock getBoundingClientRect on the actual canvas element
    const originalGetBoundingClientRect = canvas.getBoundingClientRect;
    canvas.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      top: 0,
      right: 500,
      bottom: 60,
      width: 400,
      height: 60,
      x: 100,
      y: 0,
      toJSON: () => {},
    }));

    // Canvas starts at x=100, click at x=300 means offset of 200px (50%)
    fireEvent.click(canvas, { clientX: 300 });

    expect(handleSeek).toHaveBeenCalledWith(5);

    // Restore original
    canvas.getBoundingClientRect = originalGetBoundingClientRect;
  });

  test('clamps seek position to valid range', () => {
    const handleSeek = vi.fn();
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={0}
        duration={10}
        onSeek={handleSeek}
        width={400}
      />
    );

    const canvas = screen.getByRole('img', { name: /waveform/i });

    // Click beyond canvas width
    fireEvent.click(canvas, {
      clientX: 500,
      currentTarget: { getBoundingClientRect: () => ({ left: 0 }) }
    });

    expect(handleSeek).toHaveBeenCalledWith(10); // Clamped to duration
  });
});

describe('SEEK-002: Drag-to-seek', () => {
  // ✅ Happy path
  test('allows dragging playhead to seek', () => {
    const handleSeek = vi.fn();
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={5}
        duration={10}
        onSeek={handleSeek}
        width={400}
      />
    );

    const playhead = screen.getByTestId('waveform-playhead');

    // Start drag
    fireEvent.mouseDown(playhead, { clientX: 200 });

    // Move to new position
    fireEvent.mouseMove(document, {
      clientX: 300,
      currentTarget: { getBoundingClientRect: () => ({ left: 0 }) }
    });

    expect(handleSeek).toHaveBeenCalled();
  });

  test('dragging playhead updates seek position', () => {
    const handleSeek = vi.fn();
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={0}
        duration={10}
        onSeek={handleSeek}
        width={400}
      />
    );

    const playhead = screen.getByTestId('waveform-playhead');
    const canvas = screen.getByRole('img', { name: /waveform/i });

    // Start drag at 0
    fireEvent.mouseDown(playhead, { clientX: 0 });

    // Drag to 50% (200px = 5s)
    fireEvent.mouseMove(canvas, {
      clientX: 200,
      currentTarget: { getBoundingClientRect: () => ({ left: 0 }) }
    });

    expect(handleSeek).toHaveBeenCalledWith(5);
  });

  test('stops dragging on mouse up', () => {
    const handleSeek = vi.fn();
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={5}
        duration={10}
        onSeek={handleSeek}
        width={400}
      />
    );

    const playhead = screen.getByTestId('waveform-playhead');

    // Start drag
    fireEvent.mouseDown(playhead, { clientX: 200 });
    handleSeek.mockClear();

    // End drag
    fireEvent.mouseUp(document);

    // Further mouse moves should not trigger seek
    fireEvent.mouseMove(document, { clientX: 300 });
    expect(handleSeek).not.toHaveBeenCalled();
  });

  test('drag works across entire waveform', () => {
    const handleSeek = vi.fn();
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={5}
        duration={10}
        onSeek={handleSeek}
        width={400}
      />
    );

    const playhead = screen.getByTestId('waveform-playhead');
    const canvas = screen.getByRole('img', { name: /waveform/i });

    fireEvent.mouseDown(playhead, { clientX: 200 });

    // Drag to start
    fireEvent.mouseMove(canvas, {
      clientX: 0,
      currentTarget: { getBoundingClientRect: () => ({ left: 0 }) }
    });
    expect(handleSeek).toHaveBeenCalledWith(0);

    // Drag to end
    fireEvent.mouseMove(canvas, {
      clientX: 400,
      currentTarget: { getBoundingClientRect: () => ({ left: 0 }) }
    });
    expect(handleSeek).toHaveBeenCalledWith(10);
  });

  // 🔥 Edge cases
  test('clamps drag position to valid range', () => {
    const handleSeek = vi.fn();
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={5}
        duration={10}
        onSeek={handleSeek}
        width={400}
      />
    );

    const playhead = screen.getByTestId('waveform-playhead');
    const canvas = screen.getByRole('img', { name: /waveform/i });

    fireEvent.mouseDown(playhead, { clientX: 200 });

    // Drag beyond end
    fireEvent.mouseMove(canvas, {
      clientX: 500,
      currentTarget: { getBoundingClientRect: () => ({ left: 0 }) }
    });

    expect(handleSeek).toHaveBeenCalledWith(10); // Clamped to duration
  });
});

describe('SEEK-003: Seek during playback', () => {
  // ✅ Happy path
  test('allows seeking while playing', () => {
    const handleSeek = vi.fn();
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={5}
        duration={10}
        onSeek={handleSeek}
        isPlaying={true}
        width={400}
      />
    );

    const canvas = screen.getByRole('img', { name: /waveform/i });

    fireEvent.click(canvas, {
      clientX: 100,
      currentTarget: { getBoundingClientRect: () => ({ left: 0 }) }
    });

    expect(handleSeek).toHaveBeenCalledWith(2.5);
  });

  test('seeking while playing updates playhead position', () => {
    const handleSeek = vi.fn();
    const { rerender } = render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={5}
        duration={10}
        onSeek={handleSeek}
        isPlaying={true}
        width={400}
      />
    );

    const canvas = screen.getByRole('img', { name: /waveform/i });

    // Seek to new position
    fireEvent.click(canvas, {
      clientX: 300,
      currentTarget: { getBoundingClientRect: () => ({ left: 0 }) }
    });

    expect(handleSeek).toHaveBeenCalledWith(7.5);

    // Playhead should update to new position
    rerender(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={7.5}
        duration={10}
        onSeek={handleSeek}
        isPlaying={true}
        width={400}
      />
    );

    const playhead = screen.getByTestId('waveform-playhead');
    expect(playhead.style.left).toBe('300px');
  });

  test('drag seek works while playing', () => {
    const handleSeek = vi.fn();
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={5}
        duration={10}
        onSeek={handleSeek}
        isPlaying={true}
        width={400}
      />
    );

    const playhead = screen.getByTestId('waveform-playhead');
    const canvas = screen.getByRole('img', { name: /waveform/i });

    fireEvent.mouseDown(playhead, { clientX: 200 });
    fireEvent.mouseMove(canvas, {
      clientX: 100,
      currentTarget: { getBoundingClientRect: () => ({ left: 0 }) }
    });

    expect(handleSeek).toHaveBeenCalledWith(2.5);
  });
});

describe('Waveform: Optional props and styling', () => {
  test('works without isPlaying prop', () => {
    const { container } = render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={5}
        duration={10}
        onSeek={vi.fn()}
      />
    );

    expect(container).toBeInTheDocument();
  });

  test('works without width/height props', () => {
    render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={5}
        duration={10}
        onSeek={vi.fn()}
      />
    );

    const canvas = screen.getByRole('img', { name: /waveform/i });
    expect(canvas).toBeInTheDocument();
  });

  test('waveform container is interactive', () => {
    const { container } = render(
      <Waveform
        waveformData={mockWaveformData}
        currentTime={5}
        duration={10}
        onSeek={vi.fn()}
      />
    );

    const waveformContainer = container.querySelector('.waveform');
    expect(waveformContainer).toBeInTheDocument();
  });
});
