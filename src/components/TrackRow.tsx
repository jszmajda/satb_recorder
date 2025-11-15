// [EARS: TRACK-001, TRACK-002, TRACK-005, TRACK-006, TRACK-008, TRACK-009, TRACK-010, TRACK-011]
// Track row component with delete, solo, mute, volume, and name editing controls

import React from 'react';
import type { Track } from '@/store/types';

export interface TrackRowProps {
  track: Track;
  onDelete?: (trackId: string) => void;
  onNameChange?: (trackId: string, newName: string) => void;
  onSoloToggle?: (trackId: string) => void;
  onMuteToggle?: (trackId: string) => void;
  onVolumeChange?: (trackId: string, newVolume: number) => void;
}

/**
 * TrackRow component displays controls for a single track
 * [EARS: TRACK-011] Complete track controls layout
 */
export function TrackRow({
  track,
  onDelete,
  onNameChange,
  onSoloToggle,
  onMuteToggle,
  onVolumeChange,
}: TrackRowProps) {
  /**
   * Handle delete button click
   * [EARS: TRACK-001, TRACK-002] Delete track functionality
   */
  const handleDeleteClick = () => {
    if (onDelete) {
      onDelete(track.id);
    }
  };

  /**
   * Handle track name change
   * [EARS: TRACK-010] Inline track name editing
   */
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onNameChange) {
      onNameChange(track.id, e.target.value);
    }
  };

  /**
   * Handle solo button click
   * [EARS: TRACK-005] Solo button toggle
   */
  const handleSoloClick = () => {
    if (onSoloToggle) {
      onSoloToggle(track.id);
    }
  };

  /**
   * Handle mute button click
   * [EARS: TRACK-006] Mute button toggle
   */
  const handleMuteClick = () => {
    if (onMuteToggle) {
      onMuteToggle(track.id);
    }
  };

  /**
   * Handle volume slider change
   * [EARS: TRACK-008, TRACK-009] Volume slider (0-100)
   */
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onVolumeChange) {
      const newVolume = parseInt(e.target.value, 10);
      onVolumeChange(track.id, newVolume);
    }
  };

  return (
    <div
      className="track-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem',
        backgroundColor: '#2c2c2c',
        border: '1px solid #444',
        borderRadius: '6px',
        marginBottom: '0.5rem',
      }}
    >
      {/* Delete Button */}
      {/* [EARS: TRACK-001, TRACK-002] Delete track control */}
      <button
        onClick={handleDeleteClick}
        aria-label="Delete track"
        style={{
          padding: '0.5rem 0.75rem',
          backgroundColor: '#d32f2f',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 'bold',
        }}
      >
        Delete
      </button>

      {/* Track Name Input */}
      {/* [EARS: TRACK-010] Editable track name */}
      <input
        type="text"
        value={track.name}
        onChange={handleNameChange}
        style={{
          flex: '1',
          padding: '0.5rem',
          backgroundColor: '#444',
          color: '#fff',
          border: '1px solid #666',
          borderRadius: '4px',
          fontSize: '0.95rem',
        }}
      />

      {/* Solo Button */}
      {/* [EARS: TRACK-005] Solo toggle with active state */}
      <button
        onClick={handleSoloClick}
        aria-label="Solo track"
        className={track.soloed ? 'active' : ''}
        style={{
          padding: '0.5rem 0.75rem',
          backgroundColor: track.soloed ? '#4caf50' : '#555',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          minWidth: '50px',
        }}
      >
        Solo
      </button>

      {/* Mute Button */}
      {/* [EARS: TRACK-006] Mute toggle with active state */}
      <button
        onClick={handleMuteClick}
        aria-label="Mute track"
        className={track.muted ? 'active' : ''}
        style={{
          padding: '0.5rem 0.75rem',
          backgroundColor: track.muted ? '#ff9800' : '#555',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          minWidth: '50px',
        }}
      >
        Mute
      </button>

      {/* Volume Slider */}
      {/* [EARS: TRACK-008, TRACK-009] Volume control (0-100), grayed when muted */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="range"
          min="0"
          max="100"
          value={track.volume}
          onChange={handleVolumeChange}
          aria-label="Volume slider"
          style={{
            width: '100px',
            opacity: track.muted ? 0.4 : 1,
          }}
        />
        <span
          style={{
            color: '#888',
            fontSize: '0.85rem',
            minWidth: '35px',
          }}
        >
          {track.volume}%
        </span>
      </div>
    </div>
  );
}
