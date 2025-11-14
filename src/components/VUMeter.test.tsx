import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VUMeter as VUMeterComponent } from './VUMeter';
import { VUMeter } from '../audio/vuMeter';

// Mock AudioContext
const mockAudioContext = {
  close: vi.fn(),
  createAnalyser: vi.fn(),
  createMediaStreamSource: vi.fn(),
};

global.AudioContext = vi.fn(() => mockAudioContext) as any;

// Mock VUMeter class
vi.mock('../audio/vuMeter');

describe('MIC-005, REC-004: VU meter display', () => {
  let mockVUMeter: any;

  beforeEach(() => {
    mockVUMeter = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
      getVolume: vi.fn().mockReturnValue(0),
    };
    vi.mocked(VUMeter).mockImplementation(function() {
      return mockVUMeter;
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Happy path
  test('renders VU meter bar', () => {
    render(<VUMeterComponent level={0.5} />);

    const meter = screen.getByRole('meter', { name: /vu meter|volume/i });
    expect(meter).toBeInTheDocument();
  });

  test('displays current level visually', () => {
    render(<VUMeterComponent level={0.5} />);

    const meter = screen.getByRole('meter', { name: /vu meter|volume/i });
    expect(meter).toHaveAttribute('aria-valuenow', '50');
  });

  test('level fills 0% when level is 0', () => {
    render(<VUMeterComponent level={0} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveStyle({ width: '0%' });
  });

  test('level fills 50% when level is 0.5', () => {
    render(<VUMeterComponent level={0.5} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveStyle({ width: '50%' });
  });

  test('level fills 100% when level is 1.0', () => {
    render(<VUMeterComponent level={1.0} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveStyle({ width: '100%' });
  });

  test('updates fill width when level changes', () => {
    const { rerender } = render(<VUMeterComponent level={0.2} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveStyle({ width: '20%' });

    rerender(<VUMeterComponent level={0.8} />);
    expect(fill).toHaveStyle({ width: '80%' });
  });

  // 🔥 Edge cases
  test('clamps negative level to 0', () => {
    render(<VUMeterComponent level={-0.5} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveStyle({ width: '0%' });
  });

  test('clamps level above 1.0', () => {
    render(<VUMeterComponent level={1.5} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveStyle({ width: '100%' });
  });

  test('handles very small level values', () => {
    render(<VUMeterComponent level={0.01} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveStyle({ width: '1%' });
  });
});

describe('VIS-003: Color coding for levels', () => {
  // ✅ Happy path
  test('shows green color for low levels (0-0.7)', () => {
    render(<VUMeterComponent level={0.5} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveClass('level-low');
  });

  test('shows yellow color for medium levels (0.7-0.9)', () => {
    render(<VUMeterComponent level={0.8} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveClass('level-medium');
  });

  test('shows red color for high levels (0.9-1.0)', () => {
    render(<VUMeterComponent level={0.95} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveClass('level-high');
  });

  test('green at boundary (0.69)', () => {
    render(<VUMeterComponent level={0.69} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveClass('level-low');
  });

  test('yellow at boundary (0.7)', () => {
    render(<VUMeterComponent level={0.7} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveClass('level-medium');
  });

  test('yellow at boundary (0.89)', () => {
    render(<VUMeterComponent level={0.89} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveClass('level-medium');
  });

  test('red at boundary (0.9)', () => {
    render(<VUMeterComponent level={0.9} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveClass('level-high');
  });

  test('color changes as level increases', () => {
    const { rerender } = render(<VUMeterComponent level={0.5} />);

    const fill = screen.getByTestId('vu-meter-fill');
    expect(fill).toHaveClass('level-low');

    rerender(<VUMeterComponent level={0.8} />);
    expect(fill).toHaveClass('level-medium');

    rerender(<VUMeterComponent level={0.95} />);
    expect(fill).toHaveClass('level-high');
  });
});

describe('VIS-003: Peak indicator', () => {
  // ✅ Happy path
  test('shows peak indicator', () => {
    render(<VUMeterComponent level={0.5} />);

    const peak = screen.getByTestId('vu-meter-peak');
    expect(peak).toBeInTheDocument();
  });

  test('peak starts at 0', () => {
    render(<VUMeterComponent level={0} />);

    const peak = screen.getByTestId('vu-meter-peak');
    expect(peak).toHaveStyle({ left: '0%' });
  });

  test('peak follows level when increasing', () => {
    const { rerender } = render(<VUMeterComponent level={0.3} />);

    const peak = screen.getByTestId('vu-meter-peak');
    expect(peak).toHaveStyle({ left: '30%' });

    rerender(<VUMeterComponent level={0.7} />);
    expect(peak).toHaveStyle({ left: '70%' });
  });

  test('peak holds maximum value when level decreases', async () => {
    const { rerender } = render(<VUMeterComponent level={0.8} />);

    const peak = screen.getByTestId('vu-meter-peak');
    expect(peak).toHaveStyle({ left: '80%' });

    // Level drops but peak holds
    rerender(<VUMeterComponent level={0.4} />);
    expect(peak).toHaveStyle({ left: '80%' });
  });
});

describe('VUMeter: Dimensions and styling', () => {
  test('renders with default dimensions', () => {
    const { container } = render(<VUMeterComponent level={0.5} />);

    const meter = container.querySelector('.vu-meter');
    expect(meter).toBeInTheDocument();
  });

  test('accepts custom width', () => {
    const { container } = render(<VUMeterComponent level={0.5} width={400} />);

    const meterContainer = container.querySelector('.vu-meter');
    expect(meterContainer).toHaveStyle({ width: '400px' });
  });

  test('accepts custom height', () => {
    const { container } = render(<VUMeterComponent level={0.5} height={40} />);

    const meterContainer = container.querySelector('.vu-meter');
    expect(meterContainer).toHaveStyle({ height: '40px' });
  });

  test('uses default dimensions when not specified', () => {
    render(<VUMeterComponent level={0.5} />);

    const meter = screen.getByRole('meter', { name: /vu meter|volume/i });
    expect(meter).toBeInTheDocument();
  });
});

describe('VUMeter: Accessibility', () => {
  test('has proper ARIA attributes', () => {
    render(<VUMeterComponent level={0.5} />);

    const meter = screen.getByRole('meter', { name: /vu meter|volume/i });
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(meter).toHaveAttribute('aria-valuenow', '50');
  });

  test('updates aria-valuenow when level changes', () => {
    const { rerender } = render(<VUMeterComponent level={0.3} />);

    const meter = screen.getByRole('meter', { name: /vu meter|volume/i });
    expect(meter).toHaveAttribute('aria-valuenow', '30');

    rerender(<VUMeterComponent level={0.9} />);
    expect(meter).toHaveAttribute('aria-valuenow', '90');
  });

  test('has descriptive label', () => {
    render(<VUMeterComponent level={0.5} />);

    const meter = screen.getByRole('meter', { name: /vu meter|volume/i });
    expect(meter).toHaveAttribute('aria-label');
  });
});

describe('VUMeter: Component lifecycle', () => {
  test('renders without errors', () => {
    const { container } = render(<VUMeterComponent level={0.5} />);
    expect(container).toBeInTheDocument();
  });

  test('updates smoothly with rapid level changes', () => {
    const { rerender } = render(<VUMeterComponent level={0.1} />);

    const fill = screen.getByTestId('vu-meter-fill');

    // Simulate rapid level changes
    for (let i = 0; i <= 10; i++) {
      rerender(<VUMeterComponent level={i / 10} />);
    }

    expect(fill).toHaveStyle({ width: '100%' });
  });

  test('handles unmount gracefully', () => {
    const { unmount } = render(<VUMeterComponent level={0.5} />);
    expect(() => unmount()).not.toThrow();
  });
});
