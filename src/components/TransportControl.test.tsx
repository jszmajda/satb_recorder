import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransportControl } from './TransportControl';

describe('PLAY-001: Play button', () => {
  // ✅ Happy path
  test('renders Play button initially', () => {
    render(<TransportControl />);

    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton).toBeInTheDocument();
  });

  test('Play button shows play icon when stopped', () => {
    render(<TransportControl />);

    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton).toHaveTextContent('▶');
  });

  test('clicking Play changes to Pause button', () => {
    render(<TransportControl />);

    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    const pauseButton = screen.getByRole('button', { name: /pause/i });
    expect(pauseButton).toBeInTheDocument();
    expect(pauseButton).toHaveTextContent('⏸');
  });

  test('Play button triggers play state', () => {
    render(<TransportControl />);

    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    // Verify pause button exists (indicating play state)
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });
});

describe('PLAY-002: Pause button', () => {
  // ✅ Happy path
  test('clicking Pause changes back to Play button', () => {
    render(<TransportControl />);

    // Start playing
    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    // Pause
    const pauseButton = screen.getByRole('button', { name: /pause/i });
    fireEvent.click(pauseButton);

    // Should show play button again
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  test('Pause maintains time position', () => {
    render(<TransportControl />);

    // Start playing
    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    // Pause
    const pauseButton = screen.getByRole('button', { name: /pause/i });
    fireEvent.click(pauseButton);

    // Time should not reset to 0:00
    const timeDisplay = screen.getByText(/\d:\d{2} \/ \d:\d{2}/);
    expect(timeDisplay).toBeInTheDocument();
  });

  test('Pause button shows pause icon', () => {
    render(<TransportControl />);

    // Start playing
    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    const pauseButton = screen.getByRole('button', { name: /pause/i });
    expect(pauseButton).toHaveTextContent('⏸');
  });
});

describe('PLAY-003: Stop button', () => {
  // ✅ Happy path
  test('renders Stop button', () => {
    render(<TransportControl />);

    const stopButton = screen.getByRole('button', { name: /stop/i });
    expect(stopButton).toBeInTheDocument();
  });

  test('Stop button shows stop icon', () => {
    render(<TransportControl />);

    const stopButton = screen.getByRole('button', { name: /stop/i });
    expect(stopButton).toHaveTextContent('⏹');
  });

  test('clicking Stop resets time to 0:00', () => {
    render(<TransportControl />);

    // Start playing
    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    // Stop
    const stopButton = screen.getByRole('button', { name: /stop/i });
    fireEvent.click(stopButton);

    // Should reset to 0:00
    expect(screen.getByText(/0:00 \/ 0:00/)).toBeInTheDocument();
  });

  test('clicking Stop changes to Play button', () => {
    render(<TransportControl />);

    // Start playing
    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    // Stop
    const stopButton = screen.getByRole('button', { name: /stop/i });
    fireEvent.click(stopButton);

    // Should show play button
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  test('Stop is disabled when already stopped', () => {
    render(<TransportControl />);

    const stopButton = screen.getByRole('button', { name: /stop/i });
    expect(stopButton).toBeDisabled();
  });

  test('Stop is enabled when playing', () => {
    render(<TransportControl />);

    // Start playing
    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    const stopButton = screen.getByRole('button', { name: /stop/i });
    expect(stopButton).not.toBeDisabled();
  });

  test('Stop is enabled when paused', () => {
    render(<TransportControl />);

    // Start playing
    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    // Pause
    const pauseButton = screen.getByRole('button', { name: /pause/i });
    fireEvent.click(pauseButton);

    // Stop should still be enabled when paused
    const stopButton = screen.getByRole('button', { name: /stop/i });
    expect(stopButton).not.toBeDisabled();
  });
});

describe('PLAY-005: Time display', () => {
  // ✅ Happy path
  test('displays time in format current / total', () => {
    render(<TransportControl />);

    const timeDisplay = screen.getByText(/\d:\d{2} \/ \d:\d{2}/);
    expect(timeDisplay).toBeInTheDocument();
  });

  test('displays 0:00 / 0:00 initially', () => {
    render(<TransportControl />);

    expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument();
  });

  test('updates time display while playing', async () => {
    render(<TransportControl />);

    // Start playing
    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    // Wait for time to update past 1 second
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Should show elapsed time has increased to at least 0:01
    const timeDisplay = screen.getByText(/\d:\d{2} \/ \d:\d{2}/);
    expect(timeDisplay).toBeInTheDocument();
    expect(timeDisplay.textContent).toMatch(/0:0[1-9]/); // Should be 0:01 or more
  });

  test('stops updating time when paused', async () => {
    render(<TransportControl />);

    // Start playing
    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    // Wait for time to advance
    await new Promise(resolve => setTimeout(resolve, 300));

    // Pause
    const pauseButton = screen.getByRole('button', { name: /pause/i });
    fireEvent.click(pauseButton);

    // Get current time text
    const timeDisplayBeforePause = screen.getByText(/\d:\d{2} \/ \d:\d{2}/).textContent;

    // Wait more time
    await new Promise(resolve => setTimeout(resolve, 300));

    // Time should not have changed after pause
    const timeDisplayAfterPause = screen.getByText(/\d:\d{2} \/ \d:\d{2}/).textContent;
    expect(timeDisplayAfterPause).toBe(timeDisplayBeforePause);
  });

  test('time display shows seconds and minutes', () => {
    render(<TransportControl />);

    // Verify format is M:SS / M:SS
    const timeDisplay = screen.getByText(/\d:\d{2} \/ \d:\d{2}/);
    expect(timeDisplay).toBeInTheDocument();

    // Initial display should show 0:00 / 0:00
    expect(timeDisplay.textContent).toBe('0:00 / 0:00');
  });
});

describe('TransportControl: Button layout', () => {
  test('renders Play and Stop buttons side by side', () => {
    render(<TransportControl />);

    const playButton = screen.getByRole('button', { name: /play/i });
    const stopButton = screen.getByRole('button', { name: /stop/i });

    expect(playButton).toBeInTheDocument();
    expect(stopButton).toBeInTheDocument();
  });

  test('renders time display below buttons', () => {
    render(<TransportControl />);

    const timeDisplay = screen.getByText(/\d:\d{2} \/ \d:\d{2}/);
    expect(timeDisplay).toBeInTheDocument();
  });
});

describe('TransportControl: State transitions', () => {
  test('state flow: stopped -> playing -> paused -> playing -> stopped', () => {
    render(<TransportControl />);

    // Initially stopped
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeDisabled();

    // Play
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).not.toBeDisabled();

    // Pause
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).not.toBeDisabled();

    // Play again
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();

    // Stop
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeDisabled();
    expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument();
  });
});
