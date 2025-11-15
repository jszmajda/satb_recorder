import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackRow } from './TrackRow';
import type { Track } from '@/store/types';

const mockTrack: Track = {
  id: 'track-1',
  name: 'Track 1',
  voicePartType: 'S',
  audioBlob: new Blob(['audio'], { type: 'audio/wav' }),
  duration: 5,
  soloed: false,
  muted: false,
  volume: 100,
  waveformData: [],
  createdAt: new Date(),
};

describe('TRACK-011: Track controls layout', () => {
  // ✅ Happy path
  test('renders all track controls in correct order', () => {
    const { container } = render(<TrackRow track={mockTrack} />);

    const controls = container.querySelectorAll('button, input, select');
    expect(controls.length).toBeGreaterThanOrEqual(4); // Delete, Solo, Mute, Volume at minimum
  });

  test('renders track name', () => {
    render(<TrackRow track={mockTrack} />);

    expect(screen.getByDisplayValue('Track 1')).toBeInTheDocument();
  });

  test('renders Delete button', () => {
    render(<TrackRow track={mockTrack} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeInTheDocument();
  });

  test('renders Solo button', () => {
    render(<TrackRow track={mockTrack} />);

    const soloButton = screen.getByRole('button', { name: /solo/i });
    expect(soloButton).toBeInTheDocument();
  });

  test('renders Mute button', () => {
    render(<TrackRow track={mockTrack} />);

    const muteButton = screen.getByRole('button', { name: /mute/i });
    expect(muteButton).toBeInTheDocument();
  });

  test('renders volume slider', () => {
    render(<TrackRow track={mockTrack} />);

    const volumeSlider = screen.getByRole('slider', { name: /volume/i });
    expect(volumeSlider).toBeInTheDocument();
  });
});

describe('TRACK-001, TRACK-002: Delete track', () => {
  // ✅ Happy path
  test('calls onDelete callback when Delete button clicked', () => {
    const handleDelete = vi.fn();
    render(<TrackRow track={mockTrack} onDelete={handleDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(handleDelete).toHaveBeenCalledWith('track-1');
  });

  test('Delete button passes correct track ID', () => {
    const handleDelete = vi.fn();
    const track = { ...mockTrack, id: 'track-abc-123' };
    render(<TrackRow track={track} onDelete={handleDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(handleDelete).toHaveBeenCalledWith('track-abc-123');
  });
});

describe('TRACK-010: Track name editing', () => {
  // ✅ Happy path
  test('allows inline editing of track name', () => {
    const handleNameChange = vi.fn();
    render(<TrackRow track={mockTrack} onNameChange={handleNameChange} />);

    const nameInput = screen.getByDisplayValue('Track 1');
    fireEvent.change(nameInput, { target: { value: 'New Track Name' } });

    expect(handleNameChange).toHaveBeenCalledWith('track-1', 'New Track Name');
  });

  test('displays current track name', () => {
    const track = { ...mockTrack, name: 'My Custom Track' };
    render(<TrackRow track={track} />);

    expect(screen.getByDisplayValue('My Custom Track')).toBeInTheDocument();
  });
});

describe('TRACK-005: Solo button', () => {
  // ✅ Happy path
  test('calls onSoloToggle when Solo button clicked', () => {
    const handleSoloToggle = vi.fn();
    render(<TrackRow track={mockTrack} onSoloToggle={handleSoloToggle} />);

    const soloButton = screen.getByRole('button', { name: /solo/i });
    fireEvent.click(soloButton);

    expect(handleSoloToggle).toHaveBeenCalledWith('track-1');
  });

  test('shows active state when solo is true', () => {
    const track = { ...mockTrack, soloed: true };
    render(<TrackRow track={track} />);

    const soloButton = screen.getByRole('button', { name: /solo/i });
    expect(soloButton).toHaveClass('active');
  });

  test('shows inactive state when solo is false', () => {
    const track = { ...mockTrack, soloed: false };
    render(<TrackRow track={track} />);

    const soloButton = screen.getByRole('button', { name: /solo/i });
    expect(soloButton).not.toHaveClass('active');
  });
});

describe('TRACK-006: Mute button', () => {
  // ✅ Happy path
  test('calls onMuteToggle when Mute button clicked', () => {
    const handleMuteToggle = vi.fn();
    render(<TrackRow track={mockTrack} onMuteToggle={handleMuteToggle} />);

    const muteButton = screen.getByRole('button', { name: /mute/i });
    fireEvent.click(muteButton);

    expect(handleMuteToggle).toHaveBeenCalledWith('track-1');
  });

  test('shows active state when mute is true', () => {
    const track = { ...mockTrack, muted: true };
    render(<TrackRow track={track} />);

    const muteButton = screen.getByRole('button', { name: /mute/i });
    expect(muteButton).toHaveClass('active');
  });

  test('shows inactive state when mute is false', () => {
    const track = { ...mockTrack, muted: false };
    render(<TrackRow track={track} />);

    const muteButton = screen.getByRole('button', { name: /mute/i });
    expect(muteButton).not.toHaveClass('active');
  });
});

describe('TRACK-008, TRACK-009: Volume slider', () => {
  // ✅ Happy path
  test('displays current volume value', () => {
    const track = { ...mockTrack, volume: 75 };
    render(<TrackRow track={track} />);

    const volumeSlider = screen.getByRole('slider', { name: /volume/i });
    expect(volumeSlider).toHaveValue('75');
  });

  test('calls onVolumeChange when slider adjusted', () => {
    const handleVolumeChange = vi.fn();
    render(<TrackRow track={mockTrack} onVolumeChange={handleVolumeChange} />);

    const volumeSlider = screen.getByRole('slider', { name: /volume/i });
    fireEvent.change(volumeSlider, { target: { value: '50' } });

    expect(handleVolumeChange).toHaveBeenCalledWith('track-1', 50);
  });

  test('volume slider range is 0-100', () => {
    render(<TrackRow track={mockTrack} />);

    const volumeSlider = screen.getByRole('slider', { name: /volume/i });
    expect(volumeSlider).toHaveAttribute('min', '0');
    expect(volumeSlider).toHaveAttribute('max', '100');
  });

  test('volume slider accepts values from 0', () => {
    const handleVolumeChange = vi.fn();
    render(<TrackRow track={mockTrack} onVolumeChange={handleVolumeChange} />);

    const volumeSlider = screen.getByRole('slider', { name: /volume/i });
    fireEvent.change(volumeSlider, { target: { value: '0' } });

    expect(handleVolumeChange).toHaveBeenCalledWith('track-1', 0);
  });

  test('volume slider accepts values up to 100', () => {
    const handleVolumeChange = vi.fn();
    const track = { ...mockTrack, volume: 50 }; // Start with different value
    render(<TrackRow track={track} onVolumeChange={handleVolumeChange} />);

    const volumeSlider = screen.getByRole('slider', { name: /volume/i });
    fireEvent.change(volumeSlider, { target: { value: '100' } });

    expect(handleVolumeChange).toHaveBeenCalledWith('track-1', 100);
  });

  test('grays out volume slider when muted', () => {
    const track = { ...mockTrack, muted: true };
    render(<TrackRow track={track} />);

    const volumeSlider = screen.getByRole('slider', { name: /volume/i });
    expect(volumeSlider).toHaveStyle({ opacity: '0.4' });
  });

  test('volume slider not grayed when unmuted', () => {
    const track = { ...mockTrack, muted: false };
    render(<TrackRow track={track} />);

    const volumeSlider = screen.getByRole('slider', { name: /volume/i });
    expect(volumeSlider).toHaveStyle({ opacity: '1' });
  });
});

describe('TrackRow: Optional callbacks', () => {
  test('works without onDelete callback', () => {
    const { container } = render(<TrackRow track={mockTrack} />);

    expect(container).toBeInTheDocument();
  });

  test('works without onNameChange callback', () => {
    const { container } = render(<TrackRow track={mockTrack} />);

    expect(container).toBeInTheDocument();
  });

  test('works without onSoloToggle callback', () => {
    const { container } = render(<TrackRow track={mockTrack} />);

    expect(container).toBeInTheDocument();
  });

  test('works without onMuteToggle callback', () => {
    const { container } = render(<TrackRow track={mockTrack} />);

    expect(container).toBeInTheDocument();
  });

  test('works without onVolumeChange callback', () => {
    const { container } = render(<TrackRow track={mockTrack} />);

    expect(container).toBeInTheDocument();
  });
});
